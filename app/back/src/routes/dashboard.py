from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import cast, func, select, Date
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.middleware.auth import get_current_user
from src.middleware.dev_auth import apply_org_scope_for_gestor
from src.models.transaction import Transaction
from src.models.user import User
from src.models.vehicle import Vehicle
from src.services.dashboard_export import (
    DEFAULT_DAILY_STATS_DAYS,
    _apply_date_scope,
    _apply_transaction_scope,
    _apply_vehicle_scope,
    _resolve_daily_range,
)
from src.services.paper_savings import compute_paper_saved_meters

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_dashboard_summary(
    organization_id: int | None = Query(default=None),
    fleet_id: int | None = Query(default=None),
    fuel_type: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = apply_org_scope_for_gestor(current_user, organization_id)

    tx_query = select(
        func.count(),
        func.coalesce(func.sum(Transaction.co2_avoided_kg), 0),
        func.coalesce(func.sum(Transaction.fuel_saved_liters), 0),
        func.coalesce(func.sum(Transaction.financial_savings_brl), 0),
    )
    vehicle_query = select(func.count()).select_from(Vehicle)
    digital_query = select(func.count()).where(
        Transaction.is_digital.is_(True),
    )

    tx_query = _apply_transaction_scope(
        tx_query,
        organization_id=organization_id,
        fleet_id=fleet_id,
        fuel_type=fuel_type,
    )
    digital_query = _apply_transaction_scope(
        digital_query,
        organization_id=organization_id,
        fleet_id=fleet_id,
        fuel_type=fuel_type,
    )
    tx_query = _apply_date_scope(
        tx_query,
        from_date=from_date,
        to_date=to_date,
    )
    digital_query = _apply_date_scope(
        digital_query,
        from_date=from_date,
        to_date=to_date,
    )

    vehicle_query = _apply_vehicle_scope(
        vehicle_query,
        organization_id=organization_id,
        fleet_id=fleet_id,
        fuel_type=fuel_type,
    )

    tx_result = await db.execute(tx_query)
    transaction_count, co2_total, fuel_total, savings_total = tx_result.one()

    vehicle_count_result = await db.execute(vehicle_query)
    active_tags = int(vehicle_count_result.scalar_one())

    digital_count_result = await db.execute(digital_query)
    digital_count = int(digital_count_result.scalar_one())
    paper_saved_meters = await compute_paper_saved_meters(
        db,
        digital_transaction_count=digital_count,
    )

    return {
        "total_co2_avoided_kg": float(co2_total),
        "total_fuel_saved_liters": float(fuel_total),
        "accumulated_economy": float(savings_total),
        "active_tags": active_tags,
        "paper_saved_meters": paper_saved_meters,
        "transaction_count": int(transaction_count),
    }


@router.get("/daily-stats")
async def get_daily_stats(
    days: int = Query(default=DEFAULT_DAILY_STATS_DAYS, ge=7, le=90),
    organization_id: int | None = Query(default=None),
    fleet_id: int | None = Query(default=None),
    fuel_type: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = apply_org_scope_for_gestor(current_user, organization_id)
    daily_start, daily_end = _resolve_daily_range(
        days=days,
        from_date=from_date,
        to_date=to_date,
    )

    query = (
        select(
            cast(Transaction.created_at, Date).label("day"),
            func.count().label("transaction_count"),
            func.coalesce(func.sum(Transaction.co2_avoided_kg), 0).label("co2_total_kg"),
        )
        .where(
            cast(Transaction.created_at, Date) >= daily_start,
            cast(Transaction.created_at, Date) <= daily_end,
        )
        .group_by(cast(Transaction.created_at, Date))
        .order_by(cast(Transaction.created_at, Date))
    )

    query = _apply_transaction_scope(
        query,
        organization_id=organization_id,
        fleet_id=fleet_id,
        fuel_type=fuel_type,
    )

    result = await db.execute(query)
    rows = result.all()

    day_map = {row.day: row for row in rows}
    data = []
    current = daily_start

    while current <= daily_end:
        row = day_map.get(current)
        data.append({
            "day": current.isoformat(),
            "transaction_count": row.transaction_count if row else 0,
            "co2_total_kg": float(row.co2_total_kg) if row else 0.0,
        })
        current += timedelta(days=1)

    return {"items": data}


@router.get("/emissions-by-uf")
async def get_emissions_by_uf(
    organization_id: int | None = Query(default=None),
    fleet_id: int | None = Query(default=None),
    fuel_type: str | None = Query(default=None),
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    organization_id = apply_org_scope_for_gestor(current_user, organization_id)

    query = (
        select(
            Transaction.uf,
            func.coalesce(func.sum(Transaction.co2_avoided_kg), 0).label("co2_total_kg"),
            func.count().label("transaction_count"),
        )
        .where(Transaction.uf.isnot(None))
        .group_by(Transaction.uf)
        .order_by(Transaction.uf)
    )

    query = _apply_transaction_scope(
        query,
        organization_id=organization_id,
        fleet_id=fleet_id,
        fuel_type=fuel_type,
    )
    query = _apply_date_scope(
        query,
        from_date=from_date,
        to_date=to_date,
    )

    result = await db.execute(query)
    rows = result.all()

    return {
        "items": [
            {
                "uf": row.uf,
                "co2_total_kg": float(row.co2_total_kg),
                "transaction_count": int(row.transaction_count),
            }
            for row in rows
        ]
    }
