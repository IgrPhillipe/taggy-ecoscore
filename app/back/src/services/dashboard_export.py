from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from sqlalchemy import cast, func, select, Date
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.transaction import Transaction
from src.models.vehicle import Vehicle
from src.services.paper_savings import compute_paper_saved_meters

DEFAULT_DAILY_STATS_DAYS = 30


def _fleet_vehicle_ids_subquery(fleet_id: int):
    return select(Vehicle.id).where(Vehicle.fleet_id == fleet_id)


def _apply_transaction_scope(
    query,
    *,
    organization_id: int | None,
    fleet_id: int | None,
):
    if fleet_id is not None:
        query = query.where(
            Transaction.vehicle_id.in_(_fleet_vehicle_ids_subquery(fleet_id))
        )
    if organization_id is not None:
        query = query.where(Transaction.organization_id == organization_id)
    return query


def _apply_date_scope(
    query,
    *,
    from_date: date | None,
    to_date: date | None,
    since: date | None = None,
):
    if from_date is not None:
        query = query.where(Transaction.created_at >= from_date)
    elif since is not None:
        query = query.where(Transaction.created_at >= since)
    if to_date is not None:
        query = query.where(Transaction.created_at <= to_date)
    return query


def _resolve_daily_range(
    *,
    days: int,
    from_date: date | None,
    to_date: date | None,
) -> tuple[date, date]:
    if from_date is not None:
        start = from_date
        end = to_date or date.today()
        return start, end
    end = to_date or date.today()
    start = end - timedelta(days=days - 1)
    return start, end


async def collect_dashboard_export_data(
    db: AsyncSession,
    *,
    organization_id: int | None,
    fleet_id: int | None,
    days: int = DEFAULT_DAILY_STATS_DAYS,
    from_date: date | None = None,
    to_date: date | None = None,
) -> dict[str, Any]:
    tx_query = select(
        func.count(),
        func.coalesce(func.sum(Transaction.co2_avoided_kg), 0),
        func.coalesce(func.sum(Transaction.fuel_saved_liters), 0),
        func.coalesce(func.sum(Transaction.financial_savings_brl), 0),
    )
    vehicle_query = select(func.count()).select_from(Vehicle)
    digital_query = select(func.count()).where(Transaction.is_digital.is_(True))

    tx_query = _apply_transaction_scope(
        tx_query,
        organization_id=organization_id,
        fleet_id=fleet_id,
    )
    digital_query = _apply_transaction_scope(
        digital_query,
        organization_id=organization_id,
        fleet_id=fleet_id,
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

    if organization_id is not None:
        vehicle_query = vehicle_query.where(
            Vehicle.organization_id == organization_id,
        )
    if fleet_id is not None:
        vehicle_query = vehicle_query.where(Vehicle.fleet_id == fleet_id)

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

    daily_start, daily_end = _resolve_daily_range(
        days=days,
        from_date=from_date,
        to_date=to_date,
    )
    daily_query = (
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
    daily_query = _apply_transaction_scope(
        daily_query,
        organization_id=organization_id,
        fleet_id=fleet_id,
    )
    daily_result = await db.execute(daily_query)
    daily_rows = daily_result.all()
    day_map = {row.day: row for row in daily_rows}

    daily_stats: list[dict[str, Any]] = []
    current = daily_start
    while current <= daily_end:
        row = day_map.get(current)
        daily_stats.append({
            "day": current.isoformat(),
            "transaction_count": int(row.transaction_count) if row else 0,
            "co2_total_kg": float(row.co2_total_kg) if row else 0.0,
        })
        current += timedelta(days=1)

    uf_query = (
        select(
            Transaction.uf,
            func.coalesce(func.sum(Transaction.co2_avoided_kg), 0).label("co2_total_kg"),
            func.count().label("transaction_count"),
        )
        .where(Transaction.uf.isnot(None))
        .group_by(Transaction.uf)
        .order_by(Transaction.uf)
    )
    uf_query = _apply_transaction_scope(
        uf_query,
        organization_id=organization_id,
        fleet_id=fleet_id,
    )
    uf_query = _apply_date_scope(
        uf_query,
        from_date=from_date,
        to_date=to_date,
    )
    uf_result = await db.execute(uf_query)
    emissions_by_uf = [
        {
            "uf": row.uf,
            "co2_total_kg": float(row.co2_total_kg),
            "transaction_count": int(row.transaction_count),
        }
        for row in uf_result.all()
    ]

    return {
        "filters": {
            "organization_id": organization_id,
            "fleet_id": fleet_id,
            "from_date": from_date.isoformat() if from_date else None,
            "to_date": to_date.isoformat() if to_date else None,
            "daily_period_start": daily_start.isoformat(),
            "daily_period_end": daily_end.isoformat(),
        },
        "summary": {
            "total_co2_avoided_kg": float(co2_total),
            "total_fuel_saved_liters": float(fuel_total),
            "accumulated_economy": float(savings_total),
            "active_tags": active_tags,
            "paper_saved_meters": paper_saved_meters,
            "transaction_count": int(transaction_count),
        },
        "daily_stats": daily_stats,
        "emissions_by_uf": emissions_by_uf,
    }
