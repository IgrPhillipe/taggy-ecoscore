import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

logger = logging.getLogger(__name__)
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.middleware.auth import get_current_user
from src.middleware.dev_auth import apply_org_scope_for_gestor
from src.models.user import User
from src.errors import messages as err
from src.dto.transactions import (
    ProcessTransactionBody,
    TransactionIn,
    TransactionPublic,
    TransactionResultDTO,
    TransactionUpdate,
)
from src.engine import CalcEngine, CalcEngineError, TransactionOrchestrator
from src.services.goals import increment_current_week_goal_progress
from src.services.notification_builder import build_message
from src.services.realtime_notifier import notifier
from src.services.technical_specs import get_all_specs
from src.repositories.transaction_repository import TransactionRepository
from src.services.transactions import (
    create_transaction as create_transaction_svc,
    delete_transaction as delete_transaction_svc,
    get_transaction_by_id as get_transaction_by_id_svc,
    update_transaction as update_transaction_svc,
)
from src.services.user_stats import upsert_user_stats_from_transaction
from src.services.vehicle_lookup_service import resolve_vehicle_from_plate
from src.repositories.vehicle_repository import VehicleRepository
from src.services.vehicles import create_vehicle as create_vehicle_svc
from src.dto.vehicle import VehicleIn, VehicleUpdate

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.get("/")
async def list_transactions(
    vehicle_id: int | None = Query(default=None),
    user_id: int | None = Query(default=None),
    organization_id: int | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    plate: str | None = Query(default=None),
    context: str | None = Query(default=None),
    uf: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
    paginate: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from datetime import date as date_type
    parsed_from = date_type.fromisoformat(from_date) if from_date else None
    parsed_to = date_type.fromisoformat(to_date) if to_date else None
    org_scope = apply_org_scope_for_gestor(current_user, organization_id)
    repo = TransactionRepository(db)
    if vehicle_id is not None:
        items, total = await repo.get_by_vehicle_paginated(vehicle_id, page, page_size, context=context, uf=uf, from_date=parsed_from, to_date=parsed_to)
    elif user_id is not None:
        items, total = await repo.get_by_user_paginated(user_id, page, page_size, plate=plate, context=context, uf=uf, from_date=parsed_from, to_date=parsed_to)
    elif paginate or org_scope is not None or plate or context or uf or parsed_from or parsed_to:
        items, total = await repo.get_paginated(
            page,
            page_size,
            organization_id=org_scope,
            plate=plate,
            context=context,
            uf=uf,
            from_date=parsed_from,
            to_date=parsed_to,
        )
    elif organization_id is not None:
        items, total = await repo.get_by_organization_paginated(organization_id, page, page_size, context=context, uf=uf, from_date=parsed_from, to_date=parsed_to)
    else:
        items, total = await repo.get_paginated(
            page,
            page_size,
            plate=plate,
            context=context,
            uf=uf,
            from_date=parsed_from,
            to_date=parsed_to,
        )
    return {
        "items": [TransactionPublic.model_validate(t) for t in items],
        "total": total,
    }


@router.get("/{transaction_id}", response_model=TransactionPublic)
async def get_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
):
    transaction = await get_transaction_by_id_svc(db, transaction_id)

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail=err.TRANSACTION_NOT_FOUND,
        )

    return TransactionPublic.model_validate(transaction)


@router.post("/", response_model=TransactionPublic)
async def create_transaction(
    transaction_in: TransactionIn,
    db: AsyncSession = Depends(get_db),
):
    transaction = await create_transaction_svc(db, transaction_in)

    await db.commit()

    return TransactionPublic.model_validate(transaction)


@router.patch("/{transaction_id}", response_model=TransactionPublic)
async def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
):
    transaction = await update_transaction_svc(
        db,
        transaction_id,
        transaction_update,
    )

    if not transaction:
        raise HTTPException(
            status_code=404,
            detail=err.TRANSACTION_NOT_FOUND,
        )

    await db.commit()

    return TransactionPublic.model_validate(transaction)


@router.delete("/{transaction_id}", response_model=dict)
async def delete_transaction(
    transaction_id: int,
    db: AsyncSession = Depends(get_db),
):
    deleted = await delete_transaction_svc(db, transaction_id)

    if not deleted:
        raise HTTPException(
            status_code=404,
            detail=err.TRANSACTION_NOT_FOUND,
        )

    await db.commit()

    return {"message": "Transaction deleted"}


@router.post("/process", response_model=TransactionResultDTO)
async def process_transaction(
    body: ProcessTransactionBody,
    db: AsyncSession = Depends(get_db),
):
    try:
        specs = await get_all_specs(db)
    except CalcEngineError as e:
        raise HTTPException(status_code=422, detail=err.CALC_ENGINE_FAILED) from e

    engine = CalcEngine(specs)
    orchestrator = TransactionOrchestrator(engine)

    # Resolve vehicle data: from request body or from plate lookup
    vehicle_resolution: dict[str, Any] | None = None
    if body.vehicle is not None:
        vehicle_dict = body.vehicle.model_dump()
    else:
        lookup = await resolve_vehicle_from_plate(body.plate)
        if lookup["error"] or lookup["vehicle"] is None:
            raise HTTPException(
                status_code=422,
                detail=lookup["error"] or err.PLATE_LOOKUP_FAILED,
            )
        vehicle_dict = lookup["vehicle"]
        vehicle_resolution = lookup["resolution"]
        extra_fields: dict = lookup.get("extra") or {}

        # Auto-cadastro / enriquecimento do veículo com dados FIPE/DETRAN
        vehicle_repo = VehicleRepository(db)
        existing = await vehicle_repo.get_by_license_plate(body.plate)

        if existing:
            # Veículo já cadastrado: enriquece campos FIPE sem sobrescrever dados manuais
            patch: dict = {k: v for k, v in extra_fields.items() if v is not None and getattr(existing, k, None) is None}
            if patch:
                await vehicle_repo.update(existing.id, VehicleUpdate(**patch))
                logger.info("Enriquecidos campos FIPE para veículo id=%s placa=%s: %s", existing.id, body.plate, list(patch.keys()))
        elif body.user_id:
            # Veículo novo: cria com todos os dados disponíveis
            plate_upper = body.plate.strip().upper()
            effective_id_tag = body.id_tag or f"AUTO_{plate_upper}"
            new_vehicle = await create_vehicle_svc(
                db,
                VehicleIn(
                    id_tag=effective_id_tag,
                    user_id=body.user_id,
                    organization_id=body.organization_id,
                    license_plate=plate_upper,
                    model=vehicle_dict.get("model") or "",
                    fuel_type=vehicle_dict["fuel_type"],
                    category=vehicle_dict["category"],
                    **{k: v for k, v in extra_fields.items() if v is not None},
                ),
            )
            logger.info("Veículo auto-cadastrado: id=%s placa=%s id_tag=%s", new_vehicle.id, plate_upper, effective_id_tag)

    payload_dict: dict[str, Any] = {
        "plate": body.plate.strip().upper(),
        "context": body.context,
        "uf_passagem": body.uf.strip().upper(),
        "is_digital": body.is_digital,
        "vehicle": vehicle_dict,
    }

    if body.payback is not None:
        payload_dict["payback"] = body.payback.model_dump()

    try:
        result = orchestrator.handle_tag_event(payload_dict)
    except CalcEngineError as e:
        raise HTTPException(status_code=422, detail=err.CALC_ENGINE_FAILED) from e

    env = result.get("environmental") or {}
    meta = result.get("metadata") or {}
    fin = result.get("financial") or {}

    transaction_in = TransactionIn(
        user_id=body.user_id,
        vehicle_id=body.vehicle_id,
        organization_id=body.organization_id,
        plate=body.plate.strip().upper(),
        context=body.context,
        uf=body.uf.strip().upper(),
        elapsed_time_sec=None,
        is_digital=body.is_digital,
        co2_avoided_kg=env.get("co2_kg"),
        fuel_saved_liters=env.get("fuel_liters"),
        time_saved_sec=meta.get("time_saved_sec"),
        financial_savings_brl=fin.get("total_savings_brl"),
        water_saved_liters=env.get("water_liters"),
        parameters_snapshot={
            "payload": payload_dict,
            "emission_factors": specs.get("emission_factors"),
            "ch4_factors": specs.get("ch4_factors"),
            "n2o_factors": specs.get("n2o_factors"),
            "gwp100": specs.get("gwp100"),
            "blend": specs.get("blend"),
            "sources": specs.get("sources"),
            "vehicle_resolution": vehicle_resolution,
            "pricing_snapshot": {
                "fuel_prices_by_uf": specs.get("fuel_prices_by_uf"),
                "fuel_prices_meta": specs.get("fuel_prices_meta"),
            },
            "result": result,
        },
    )

    transaction = await create_transaction_svc(db, transaction_in)

    if body.user_id is not None:
        await upsert_user_stats_from_transaction(
            db=db,
            user_id=body.user_id,
            time_saved_sec=meta.get("time_saved_sec"),
            co2_kg=env.get("co2_kg"),
            fuel_liters=env.get("fuel_liters"),
            water_liters=env.get("water_liters"),
            financial_brl=fin.get("total_savings_brl"),
        )

        await increment_current_week_goal_progress(
            db=db,
            user_id=body.user_id,
            co2_increment_kg=env.get("co2_kg"),
        )

    await db.commit()

    # Notificação via WebSocket direcionada ao usuário da transação
    notification_message = build_message(result)
    if notification_message and body.user_id is not None:
        notifier.schedule_send(user_id=body.user_id, message=notification_message)

    return {
        "data": {
            "result": result,
            "transaction": TransactionPublic.model_validate(transaction).model_dump(),
        }
    }
