from datetime import date

from src.constants.workbook_exports import (
    build_dashboard_filename,
    build_fleet_detail_filename,
    build_fleets_list_filename,
    build_transaction_detail_filename,
    build_transactions_list_filename,
    build_vehicle_detail_filename,
    build_vehicles_list_filename,
)


def test_build_dashboard_filename_with_range():
    filename = build_dashboard_filename(
        export_date=date(2025, 6, 5),
        from_date=date(2025, 3, 1),
        to_date=date(2025, 6, 1),
    )
    assert filename == "taggy_ecoscore_dashboard_20250605_20250301_20250601_v1.xlsx"


def test_build_fleets_list_filename_includes_export_date():
    filename = build_fleets_list_filename(export_date=date(2025, 6, 5))
    assert filename == "taggy_ecoscore_frotas_20250605_v1.xlsx"


def test_build_fleet_detail_filename_includes_name_and_date():
    filename = build_fleet_detail_filename(
        42,
        fleet_name="Frota Norte",
        export_date=date(2025, 6, 5),
    )
    assert filename == "taggy_ecoscore_frota_id42_FROTA_NORTE_20250605_v1.xlsx"


def test_build_vehicles_list_filename():
    filename = build_vehicles_list_filename(export_date=date(2025, 6, 5))
    assert filename == "taggy_ecoscore_veiculos_20250605_v1.xlsx"


def test_build_vehicle_detail_filename_uses_plate():
    filename = build_vehicle_detail_filename(
        7,
        license_plate="abc1d23",
        export_date=date(2025, 6, 5),
        from_date=date(2025, 1, 1),
        to_date=date(2025, 6, 1),
    )
    assert filename == "taggy_ecoscore_veiculo_ABC1D23_20250605_20250101_20250601_v1.xlsx"


def test_build_transactions_list_filename_with_range():
    filename = build_transactions_list_filename(
        export_date=date(2025, 6, 5),
        from_date=date(2025, 3, 1),
        to_date=date(2025, 6, 1),
    )
    assert filename == "taggy_ecoscore_passagens_20250605_20250301_20250601_v1.xlsx"


def test_build_transaction_detail_filename():
    filename = build_transaction_detail_filename(
        99,
        plate="XYZ9Z99",
        passage_date="2025-04-15",
        export_date=date(2025, 6, 5),
    )
    assert filename == "taggy_ecoscore_passagem_XYZ9Z99_20250415_id99_v1.xlsx"
