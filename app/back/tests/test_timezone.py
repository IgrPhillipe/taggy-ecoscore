from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from src.constants.timezone import (
    BRASILIA,
    end_of_day_brasilia_exclusive,
    start_of_day_brasilia,
)


def test_start_of_day_brasilia_is_midnight_local():
    start = start_of_day_brasilia(date(2025, 6, 1))

    assert start.tzinfo == BRASILIA
    assert start.hour == 0
    assert start.astimezone(timezone.utc) == datetime(2025, 6, 1, 3, 0, tzinfo=timezone.utc)


def test_end_of_day_brasilia_is_next_midnight_exclusive():
    end = end_of_day_brasilia_exclusive(date(2025, 6, 1))

    assert end.astimezone(timezone.utc) == datetime(2025, 6, 2, 3, 0, tzinfo=timezone.utc)
