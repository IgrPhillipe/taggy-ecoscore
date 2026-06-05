"""Convenção de nomes para exports XLSX da aplicação."""

from __future__ import annotations

from datetime import date

WORKBOOK_EXPORT_PREFIX = "taggy_ecoscore"
WORKBOOK_EXPORT_VERSION = 1

CALCULOS_TEMPLATE_SLUG = "calculos_template"
PASSAGENS_USUARIO_SLUG = "passagens_usuario"
FROTAS_SLUG = "frotas"
FROTA_SLUG = "frota"
VEICULOS_SLUG = "veiculos"
VEICULO_SLUG = "veiculo"
MOTORISTAS_SLUG = "motoristas"
MOTORISTA_SLUG = "motorista"
PASSAGENS_SLUG = "passagens"
PASSAGEM_SLUG = "passagem"


def workbook_export_version_label() -> str:
    return f"v{WORKBOOK_EXPORT_VERSION}"


def workbook_template_label(slug: str) -> str:
    return f"{WORKBOOK_EXPORT_PREFIX}_{slug}"


def _sanitize_segment(value: str | int | None) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return "".join(ch if ch.isalnum() else "_" for ch in text).strip("_").upper()


def _format_date_segment(value: date | str | None) -> str | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value.strftime("%Y%m%d")
    return str(value)[:10].replace("-", "") or None


def _export_date_segment(export_date: date | None = None) -> str:
    return (export_date or date.today()).strftime("%Y%m%d")


def _date_range_segments(
    from_date: date | None = None,
    to_date: date | None = None,
) -> list[str]:
    from_seg = _format_date_segment(from_date)
    to_seg = _format_date_segment(to_date)
    if from_seg or to_seg:
        return [from_seg or "inicio", to_seg or "fim"]
    return []


def build_workbook_export_filename(slug: str, *segments: str | int) -> str:
    parts = [WORKBOOK_EXPORT_PREFIX, slug]
    parts.extend(str(segment) for segment in segments if segment is not None and str(segment))
    parts.append(workbook_export_version_label())
    return "_".join(parts) + ".xlsx"


def build_audit_workbook_filename(
    *,
    transaction_id: int | None,
    plate: str,
    passage_date: str | None,
    context: str,
    uf: str,
) -> str:
    if transaction_id is None:
        return build_workbook_export_filename(
            CALCULOS_TEMPLATE_SLUG,
            _export_date_segment(),
        )

    date_str = _format_date_segment(passage_date) or "sem_data"
    return build_workbook_export_filename(
        "calculos",
        plate.upper(),
        date_str,
        f"id{transaction_id}",
        context,
        uf.upper(),
    )


def build_passagens_export_filename(
    *,
    user_id: int,
    from_date: date | None = None,
    to_date: date | None = None,
    export_date: date | None = None,
) -> str:
    segments: list[str | int] = [user_id, _export_date_segment(export_date)]
    segments.extend(_date_range_segments(from_date, to_date))
    return build_workbook_export_filename(PASSAGENS_USUARIO_SLUG, *segments)


def build_fleets_list_filename(
    *,
    export_date: date | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> str:
    segments: list[str | int] = [_export_date_segment(export_date)]
    segments.extend(_date_range_segments(from_date, to_date))
    return build_workbook_export_filename(FROTAS_SLUG, *segments)


def build_fleet_detail_filename(
    fleet_id: int,
    *,
    fleet_name: str | None = None,
    export_date: date | None = None,
) -> str:
    name_seg = _sanitize_segment(fleet_name)
    segments: list[str | int] = [f"id{fleet_id}"]
    if name_seg:
        segments.append(name_seg)
    segments.append(_export_date_segment(export_date))
    return build_workbook_export_filename(FROTA_SLUG, *segments)


def build_vehicles_list_filename(
    *,
    export_date: date | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> str:
    segments: list[str | int] = [_export_date_segment(export_date)]
    segments.extend(_date_range_segments(from_date, to_date))
    return build_workbook_export_filename(VEICULOS_SLUG, *segments)


def build_vehicle_detail_filename(
    vehicle_id: int,
    *,
    license_plate: str | None = None,
    export_date: date | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> str:
    plate_seg = _sanitize_segment(license_plate)
    segments: list[str | int] = [plate_seg or f"id{vehicle_id}"]
    segments.append(_export_date_segment(export_date))
    segments.extend(_date_range_segments(from_date, to_date))
    return build_workbook_export_filename(VEICULO_SLUG, *segments)


def build_drivers_list_filename(
    *,
    export_date: date | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> str:
    segments: list[str | int] = [_export_date_segment(export_date)]
    segments.extend(_date_range_segments(from_date, to_date))
    return build_workbook_export_filename(MOTORISTAS_SLUG, *segments)


def build_driver_detail_filename(
    driver_id: int,
    *,
    driver_name: str | None = None,
    export_date: date | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> str:
    name_seg = _sanitize_segment(driver_name)
    segments: list[str | int] = [name_seg or f"id{driver_id}"]
    segments.append(_export_date_segment(export_date))
    segments.extend(_date_range_segments(from_date, to_date))
    return build_workbook_export_filename(MOTORISTA_SLUG, *segments)


def build_transactions_list_filename(
    *,
    export_date: date | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
) -> str:
    segments: list[str | int] = [_export_date_segment(export_date)]
    segments.extend(_date_range_segments(from_date, to_date))
    return build_workbook_export_filename(PASSAGENS_SLUG, *segments)


def build_transaction_detail_filename(
    transaction_id: int,
    *,
    plate: str | None = None,
    passage_date: str | None = None,
    export_date: date | None = None,
) -> str:
    plate_seg = _sanitize_segment(plate) or "sem_placa"
    date_seg = _format_date_segment(passage_date) or _export_date_segment(export_date)
    return build_workbook_export_filename(
        PASSAGEM_SLUG,
        plate_seg,
        date_seg,
        f"id{transaction_id}",
    )
