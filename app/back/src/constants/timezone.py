from __future__ import annotations

from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import Date, cast, func

BRASILIA_TZ = "America/Sao_Paulo"
BRASILIA = ZoneInfo(BRASILIA_TZ)


def today_brasilia() -> date:
    return datetime.now(BRASILIA).date()


def start_of_day_brasilia(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=BRASILIA)


def end_of_day_brasilia_exclusive(day: date) -> datetime:
    return start_of_day_brasilia(day + timedelta(days=1))


def brasilia_day_expr(timestamp_column):
    return cast(func.timezone(BRASILIA_TZ, timestamp_column), Date)
