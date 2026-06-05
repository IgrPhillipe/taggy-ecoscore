import io
from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.constants.workbook_exports import (
    build_audit_workbook_filename,
    build_dashboard_filename,
    build_driver_detail_filename,
    build_drivers_list_filename,
    build_fleet_detail_filename,
    build_fleets_list_filename,
    build_passagens_export_filename,
    build_transaction_detail_filename,
    build_transactions_list_filename,
    build_vehicle_detail_filename,
    build_vehicles_list_filename,
)
from src.database.connection import get_db
from src.engine import CalcEngine, CalcEngineError, TransactionOrchestrator
from src.engine.export_builder import (
    build_driver_detail_workbook,
    build_drivers_list_workbook,
    build_dashboard_workbook,
    build_fleet_detail_workbook,
    build_fleets_list_workbook,
    build_transaction_detail_workbook,
    build_transactions_list_workbook,
    build_vehicle_detail_workbook,
    build_vehicles_list_workbook,
)
from src.engine.report_builder import build_audit_workbook
from src.errors import messages as err
from src.middleware.auth import get_current_user
from src.middleware.dev_auth import apply_org_scope_for_gestor
from src.models.fleet import Fleet
from src.models.user import User, UserRole
from src.models.vehicle import Vehicle
from src.repositories.fleet_repository import FleetRepository
from src.repositories.transaction_repository import TransactionRepository
from src.repositories.user_repository import UserRepository
from src.repositories.vehicle_repository import VehicleRepository
from src.services.dashboard_export import collect_dashboard_export_data
from src.services.paper_savings import compute_paper_saved_meters
from src.services.technical_specs import get_all_specs
from src.services.transaction_audit import reconstruct_transaction_audit_context
from src.services.user_stats import get_user_stats
from src.services.vehicle_lookup_service import resolve_vehicle_from_plate
from src.services.vehicles import get_vehicle_by_id as get_vehicle_by_id_svc

router = APIRouter(prefix="/reports", tags=["Reports"])

XLSX_MEDIA = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


def _xlsx_response(buffer: io.BytesIO, filename: str) -> StreamingResponse:
    return StreamingResponse(
        buffer,
        media_type=XLSX_MEDIA,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


def _parse_dates(from_date: str | None, to_date: str | None) -> tuple[date | None, date | None]:
    parsed_from = date.fromisoformat(from_date) if from_date else None
    parsed_to = date.fromisoformat(to_date) if to_date else None
    return parsed_from, parsed_to


def _assert_fleet_access(user: User, fleet: Fleet) -> None:
    org_scope = apply_org_scope_for_gestor(user, None)
    if org_scope is not None and fleet.organization_id != org_scope:
        raise HTTPException(status_code=403, detail=err.ACCESS_DENIED)


def _assert_vehicle_access(user: User, vehicle: Vehicle) -> None:
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.gestor_frota:
        if vehicle.organization_id != user.organization_id:
            raise HTTPException(status_code=403, detail=err.ACCESS_DENIED)


def _assert_driver_access(user: User, driver: User) -> None:
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.gestor_frota:
        if driver.organization_id not in (None, user.organization_id):
            raise HTTPException(status_code=403, detail=err.ACCESS_DENIED)


def _assert_transaction_access(user: User, txn) -> None:
    if user.role == UserRole.admin:
        return
    if user.role == UserRole.gestor_frota:
        if txn.organization_id != user.organization_id:
            raise HTTPException(status_code=403, detail=err.ACCESS_DENIED)
    if user.role == UserRole.motorista:
        if txn.user_id != user.id:
            raise HTTPException(status_code=403, detail=err.ACCESS_DENIED)


async def _vehicle_summary(session: AsyncSession, vehicle_id: int) -> dict:
    from sqlalchemy import func

    from src.models.transaction import Transaction

    result = await session.execute(
        select(
            func.count(),
            func.coalesce(func.sum(Transaction.co2_avoided_kg), 0),
            func.coalesce(func.sum(Transaction.fuel_saved_liters), 0),
            func.coalesce(func.sum(Transaction.financial_savings_brl), 0),
            func.coalesce(func.sum(Transaction.time_saved_sec), 0),
        ).where(Transaction.vehicle_id == vehicle_id)
    )
    count, co2, fuel, financial, time_sec = result.one()
    digital_count_result = await session.execute(
        select(func.count()).where(
            Transaction.vehicle_id == vehicle_id,
            Transaction.is_digital.is_(True),
        )
    )
    digital_count = int(digital_count_result.scalar_one())
    paper_saved_meters = await compute_paper_saved_meters(
        session,
        digital_transaction_count=digital_count,
    )
    return {
        "transaction_count": int(count),
        "co2_total_kg": float(co2),
        "fuel_total_liters": float(fuel),
        "financial_total_brl": float(financial),
        "time_total_sec": float(time_sec),
        "paper_saved_meters": paper_saved_meters,
    }


async def _driver_stats_dict(session: AsyncSession, user_id: int) -> dict:
    stats = await get_user_stats(session, user_id)
    if stats is None:
        return {
            "transactions_count": 0,
            "co2_total_kg": 0.0,
            "fuel_total_liters": 0.0,
            "financial_total_brl": 0.0,
            "total_time_saved_sec": 0.0,
            "paper_saved_meters": 0.0,
        }
    paper_saved_meters = await compute_paper_saved_meters(
        session,
        digital_transaction_count=stats.transactions_count,
    )
    return {
        "transactions_count": stats.transactions_count,
        "co2_total_kg": stats.co2_total_kg,
        "fuel_total_liters": stats.fuel_total_liters,
        "financial_total_brl": stats.financial_total_brl,
        "total_time_saved_sec": stats.total_time_saved_sec,
        "paper_saved_meters": paper_saved_meters,
    }


async def _plates_by_user_ids(session: AsyncSession, user_ids: list[int]) -> dict[int, str | None]:
    if not user_ids:
        return {}
    result = await session.execute(select(Vehicle).where(Vehicle.user_id.in_(user_ids)))
    plates: dict[int, str | None] = {}
    for vehicle in result.scalars().all():
        if vehicle.user_id is not None and vehicle.user_id not in plates:
            plates[vehicle.user_id] = vehicle.license_plate
    return plates


@router.get("/export")
async def export_transactions_legacy(
    user_id: int = Query(...),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    if current_user.role == UserRole.motorista and current_user.id != user_id:
        raise HTTPException(status_code=403, detail=err.ACCESS_DENIED)
    repo = TransactionRepository(db)
    transactions = await repo.get_by_user_in_range(user_id, from_date, to_date)
    buffer = build_transactions_list_workbook(transactions)
    filename = build_passagens_export_filename(
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
    )
    return _xlsx_response(buffer, filename)


@router.get("/dashboard.xlsx")
async def export_dashboard(
    organization_id: int | None = Query(default=None),
    fleet_id: int | None = Query(default=None),
    days: int = Query(default=30, ge=7, le=90),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    org_scope = apply_org_scope_for_gestor(current_user, organization_id)
    parsed_from, parsed_to = _parse_dates(from_date, to_date)
    data = await collect_dashboard_export_data(
        db,
        organization_id=org_scope,
        fleet_id=fleet_id,
        days=days,
        from_date=parsed_from,
        to_date=parsed_to,
    )
    buffer = build_dashboard_workbook(data)
    return _xlsx_response(
        buffer,
        build_dashboard_filename(from_date=parsed_from, to_date=parsed_to),
    )


@router.get("/fleets.xlsx")
async def export_fleets_list(
    organization_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    org_scope = apply_org_scope_for_gestor(current_user, organization_id)
    fleets = await FleetRepository(db).get_all(org_scope, search)
    buffer = build_fleets_list_workbook(fleets)
    return _xlsx_response(buffer, build_fleets_list_filename())


@router.get("/fleets/{fleet_id}.xlsx")
async def export_fleet_detail(
    fleet_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    repo = FleetRepository(db)
    fleet = await repo.get_by_id(fleet_id)
    if fleet is None:
        raise HTTPException(status_code=404, detail=err.FLEET_NOT_FOUND)
    _assert_fleet_access(current_user, fleet)
    summary = await repo.get_summary(fleet_id)
    vehicles = await repo.get_vehicles(fleet_id)
    drivers = await repo.get_users(fleet_id)
    transactions = await TransactionRepository(db).get_all_filtered(fleet_id=fleet_id)
    fleet_dict = {
        "id": fleet.id,
        "name": fleet.name,
        "organization_id": fleet.organization_id,
        "created_at": fleet.created_at,
    }
    buffer = build_fleet_detail_workbook(fleet_dict, summary, vehicles, drivers, transactions)
    return _xlsx_response(
        buffer,
        build_fleet_detail_filename(fleet_id, fleet_name=fleet.name),
    )


@router.get("/vehicles.xlsx")
async def export_vehicles_list(
    organization_id: int | None = Query(default=None),
    fleet_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    fuel_type: str | None = Query(default=None),
    sem_frota: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    org_scope = apply_org_scope_for_gestor(current_user, organization_id)
    if current_user.role == UserRole.gestor_frota:
        sem_frota = False
    vehicles = await VehicleRepository(db).get_all_filtered(
        search=search,
        organization_id=org_scope,
        fleet_id=fleet_id,
        fuel_type=fuel_type,
        sem_frota=sem_frota,
    )
    buffer = build_vehicles_list_workbook(vehicles)
    return _xlsx_response(buffer, build_vehicles_list_filename())


@router.get("/vehicles/{vehicle_id}.xlsx")
async def export_vehicle_detail(
    vehicle_id: int,
    context: str | None = Query(default=None),
    uf: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    vehicle = await get_vehicle_by_id_svc(db, vehicle_id)
    if vehicle is None:
        raise HTTPException(status_code=404, detail=err.VEHICLE_NOT_FOUND)
    _assert_vehicle_access(current_user, vehicle)
    parsed_from, parsed_to = _parse_dates(from_date, to_date)
    transactions = await TransactionRepository(db).get_all_filtered(
        vehicle_id=vehicle_id,
        context=context,
        uf=uf,
        from_date=parsed_from,
        to_date=parsed_to,
    )
    summary = await _vehicle_summary(db, vehicle_id)
    buffer = build_vehicle_detail_workbook(vehicle, summary, transactions)
    return _xlsx_response(
        buffer,
        build_vehicle_detail_filename(
            vehicle_id,
            license_plate=vehicle.license_plate,
            from_date=parsed_from,
            to_date=parsed_to,
        ),
    )


@router.get("/drivers.xlsx")
async def export_drivers_list(
    organization_id: int | None = Query(default=None),
    fleet_id: int | None = Query(default=None),
    search: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    org_scope = apply_org_scope_for_gestor(current_user, organization_id)
    repo = UserRepository(db)
    if current_user.role == UserRole.gestor_frota:
        org_drivers = await repo.get_all_filtered(
            role="motorista", organization_id=org_scope, search=search, fleet_id=fleet_id
        )
        common = await repo.get_all_filtered(role="motorista", organization_id=None, search=search)
        seen = {u.id for u in org_drivers}
        drivers = org_drivers + [u for u in common if u.id not in seen]
    else:
        drivers = await repo.get_all_filtered(
            role="motorista", organization_id=org_scope, search=search, fleet_id=fleet_id
        )
    user_ids = [u.id for u in drivers if u.id is not None]
    plates = await _plates_by_user_ids(db, user_ids)
    buffer = build_drivers_list_workbook(drivers, plates)
    return _xlsx_response(buffer, build_drivers_list_filename())


@router.get("/drivers/{driver_id}.xlsx")
async def export_driver_detail(
    driver_id: int,
    plate: str | None = Query(default=None),
    context: str | None = Query(default=None),
    uf: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    driver = await UserRepository(db).get_by_id(driver_id)
    if driver is None:
        raise HTTPException(status_code=404, detail=err.USER_NOT_FOUND)
    _assert_driver_access(current_user, driver)
    parsed_from, parsed_to = _parse_dates(from_date, to_date)
    transactions = await TransactionRepository(db).get_all_filtered(
        user_id=driver_id,
        plate=plate,
        context=context,
        uf=uf,
        from_date=parsed_from,
        to_date=parsed_to,
    )
    stats = await _driver_stats_dict(db, driver_id)
    buffer = build_driver_detail_workbook(driver, stats, transactions)
    return _xlsx_response(
        buffer,
        build_driver_detail_filename(
            driver_id,
            driver_name=driver.name,
            from_date=parsed_from,
            to_date=parsed_to,
        ),
    )


@router.get("/transactions.xlsx")
async def export_transactions_list(
    vehicle_id: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    organization_id: int | None = Query(default=None),
    fleet_id: int | None = Query(default=None),
    plate: str | None = Query(default=None),
    context: str | None = Query(default=None),
    uf: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    parsed_from, parsed_to = _parse_dates(from_date, to_date)
    org_scope = apply_org_scope_for_gestor(current_user, organization_id)
    if current_user.role == UserRole.motorista:
        user_id = current_user.id
    repo = TransactionRepository(db)
    if vehicle_id is not None:
        vehicle = await get_vehicle_by_id_svc(db, vehicle_id)
        if vehicle is None:
            raise HTTPException(status_code=404, detail=err.VEHICLE_NOT_FOUND)
        _assert_vehicle_access(current_user, vehicle)
    if (
        user_id is not None
        and current_user.role == UserRole.motorista
        and user_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail=err.ACCESS_DENIED)
    transactions = await repo.get_all_filtered(
        organization_id=org_scope,
        fleet_id=fleet_id,
        vehicle_id=vehicle_id,
        user_id=user_id,
        plate=plate,
        context=context,
        uf=uf,
        from_date=parsed_from,
        to_date=parsed_to,
    )
    buffer = build_transactions_list_workbook(transactions)
    return _xlsx_response(
        buffer,
        build_transactions_list_filename(from_date=parsed_from, to_date=parsed_to),
    )


@router.get("/transactions/{transaction_id}.xlsx")
async def export_transaction_detail(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    repo = TransactionRepository(db)
    txn = await repo.get_by_id(transaction_id)
    if txn is None:
        raise HTTPException(status_code=404, detail=err.TRANSACTION_NOT_FOUND)
    _assert_transaction_access(current_user, txn)
    result, specs, vehicle, params = reconstruct_transaction_audit_context(txn)
    buffer = build_transaction_detail_workbook(txn, result, specs, vehicle, params)
    passage_date = txn.created_at.strftime("%Y-%m-%d") if txn.created_at else None
    return _xlsx_response(
        buffer,
        build_transaction_detail_filename(
            transaction_id,
            plate=txn.plate,
            passage_date=passage_date,
        ),
    )


@router.get("/calculadora.xlsx")
async def export_calculadora(
    plate: str = Query(default="DEMO0001", max_length=10),
    elapsed_time: int = Query(default=30, ge=0),
    context: Literal["pedagio", "estacionamento"] = Query(default="pedagio"),
    uf: str = Query(default="SP", min_length=2, max_length=2),
    is_digital: bool = Query(default=True),
    fleet_size: int = Query(default=1, ge=1, le=100000),
    fuel_type: str | None = Query(default=None),
    category: str | None = Query(default=None),
    transaction_id: int | None = Query(default=None),
    passage_date: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StreamingResponse:
    if transaction_id is not None:
        repo = TransactionRepository(db)
        txn = await repo.get_by_id(transaction_id)
        if txn is None:
            raise HTTPException(
                status_code=404,
                detail=f"Transação {transaction_id} não encontrada.",
            )
        _assert_transaction_access(current_user, txn)
        result, specs, vehicle, params = reconstruct_transaction_audit_context(
            txn,
            plate_fallback=plate,
            elapsed_time_fallback=elapsed_time,
            context_fallback=context,
            uf_fallback=uf,
            is_digital_fallback=is_digital,
        )
        eff_plate = params["plate"]
        eff_context = params["context"]
        eff_uf = params["uf"]
        eff_passage_date = passage_date or (
            txn.created_at.strftime("%Y-%m-%d") if txn.created_at else None
        )
    else:
        if current_user.role == UserRole.motorista:
            raise HTTPException(status_code=403, detail=err.ACCESS_DENIED)
        try:
            specs = await get_all_specs(db)
        except CalcEngineError as e:
            raise HTTPException(status_code=422, detail=str(e)) from e

        if fuel_type and category:
            vehicle = {"category": category, "fuel_type": fuel_type, "model": ""}
        else:
            lookup = await resolve_vehicle_from_plate(plate)
            if lookup["error"] or lookup["vehicle"] is None:
                vehicle = {"category": "leve", "fuel_type": "gasolina_c", "model": "Veículo demo"}
            else:
                vehicle = lookup["vehicle"]

        payload = {
            "plate": plate.upper(),
            "elapsed_time": elapsed_time,
            "context": context,
            "uf_passagem": uf.upper(),
            "is_digital": is_digital,
            "vehicle": vehicle,
        }

        try:
            engine = CalcEngine(specs)
            orchestrator = TransactionOrchestrator(engine)
            result = orchestrator.handle_tag_event(payload)
        except CalcEngineError as e:
            raise HTTPException(status_code=422, detail=str(e)) from e

        pricing = (result.get("metadata") or {}).get("pricing_snapshot") or {}
        params = {
            "plate": plate.upper(),
            "elapsed_time": elapsed_time,
            "context": context,
            "uf": uf.upper(),
            "is_digital": is_digital,
            "fuel_price_brl_per_unit": pricing.get("fuel_price_brl_per_unit", 0.0),
            "fuel_price_unit": pricing.get("fuel_unit", "L"),
            "fuel_price_source": pricing.get("price_source", "ANP"),
            "fuel_price_uf": pricing.get("uf_applied", uf.upper()),
        }
        eff_plate = plate.upper()
        eff_context = context
        eff_uf = uf.upper()
        eff_passage_date = passage_date

    try:
        buffer = build_audit_workbook(result, specs, vehicle, params, fleet_size=fleet_size)
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    filename = build_audit_workbook_filename(
        transaction_id=transaction_id,
        plate=eff_plate,
        passage_date=eff_passage_date,
        context=eff_context,
        uf=eff_uf,
    )
    return _xlsx_response(buffer, filename)
