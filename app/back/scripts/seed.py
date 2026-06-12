"""
Script de seed para popular o banco com dados realistas de desenvolvimento.

Uso:
    cd app/back
    uv run python scripts/seed.py           # insere dados
    uv run python scripts/seed.py --reset   # limpa e reinsere
"""

from __future__ import annotations
from src.models.fleet import Fleet, FleetUser

import argparse
import asyncio
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

_BACK_ROOT = Path(__file__).resolve().parents[1]
if str(_BACK_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACK_ROOT))

from dotenv import load_dotenv  # noqa: E402

load_dotenv(_BACK_ROOT / ".env")

from sqlalchemy import text  # noqa: E402
from sqlmodel import select  # noqa: E402

from src.database.connection import AsyncSessionLocal  # noqa: E402
from src.models.fuel_prices import FuelPriceByUF  # noqa: E402
from src.models.organization import Organization  # noqa: E402
from src.models.technical_specs import default_ludic_metaphor_units  # noqa: E402
from src.models.transaction import Transaction  # noqa: E402
from src.models.user import User, UserRole  # noqa: E402
from src.models.user_stats import UserStats  # noqa: E402
from src.models.vehicle import Vehicle  # noqa: E402
from src.models.weekly_goal import WeeklyGoal  # noqa: E402
from src.dto.fuel_price import (  # noqa: E402
    FUEL_PRICES_META_AGGREGATION,
    FUEL_PRICES_META_SOURCE,
    fuel_price_row_to_dto,
)
from src.engine import CalcEngine, TransactionOrchestrator  # noqa: E402
from src.repositories.fuel_prices_repository import FuelPricesRepository  # noqa: E402
from src.repositories.technical_specs_repository import TechnicalSpecsRepository  # noqa: E402
from src.services.password import hash_password  # noqa: E402
from src.services.technical_specs import get_all_specs  # noqa: E402

SEED_DEFAULT_PASSWORD = "senha@123"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_week_start() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

async def reset_all(db):
    for table in [
        "weekly_goals",
        "user_stats",
        "transactions",
        "fleet_users",
        "vehicles",
        "fleets",
        "users",
        "organizations",
        "fuel_prices_by_uf",
        "technical_specs",
    ]:
        await db.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
    print("✓ Banco resetado")


# ---------------------------------------------------------------------------
# Seeds individuais
# ---------------------------------------------------------------------------

_TECHNICAL_SPECS_VALUES = {
    # ── Fatores CO₂ fóssil BASE (kg CO₂/L ou m³) ──
    # Gasolina C: gasolina A pura (FGV GHG Protocol, BEN 2023, linha 103)
    # O engine aplica o blend (1 − E30 = 70%) para calcular a fração fóssil comercial.
    # diesel puro; blend B15 aplicado no engine → 2.236 kg/L
    "emission_factor_diesel_s10": 2.631,
    # gasolina A pura; blend E30 aplicado no engine → 1.567 kg/L
    "emission_factor_gasolina_c": 2.239,
    # Etanol: CO₂ é biogênico — armazenamos o valor biogênico para reportar separado do Escopo 1.
    # CO₂e Escopo 1 do etanol vem apenas de CH4/N2O (muito pequeno).
    # FGV linha 117 — biogênico; NÃO entra no Escopo 1
    "emission_factor_etanol": 1.510,
    # FGV linha 105, BEN 2023 (kg CO₂/m³)
    "emission_factor_gnv": 1.999,
    # SIN média 2023-2025, FGV Aba Fatores Variáveis (kg CO₂/kWh) — calculado: 2023=0.039, 2024=0.055, 2025=0.046
    "emission_factor_eletrico_kwh": 0.046,

    # ── Fatores CH4 (kg CH4/L ou m³) — FGV GHG Protocol, BEN 2023 ──
    "ch4_factor_gasolina_c": 0.000556,     # linha 103; blend E30 aplicado no engine
    "ch4_factor_diesel_s10": 0.000185,     # linha 104; blend B15 aplicado no engine
    "ch4_factor_etanol": 0.000425,         # linha 117 (etanol hidratado)
    "ch4_factor_gnv": 0.0000184,           # linha 105

    # ── Fatores N2O (kg N2O/L ou m³) — FGV GHG Protocol, BEN 2023 ──
    "n2o_factor_gasolina_c": 0.000242,     # linha 103; blend E30 aplicado no engine
    "n2o_factor_diesel_s10": 0.0000995,    # linha 104; blend B15 aplicado no engine
    "n2o_factor_etanol": 0.000130,         # linha 117
    "n2o_factor_gnv": 0.00000368,          # linha 105

    # ── GWP100 — IPCC AR6 2021, Tabela 7.SM.7 ──
    "gwp100_ch4": 27.9,
    "gwp100_n2o": 273.0,

    # ── Percentuais de biocombustível (ANP/CNPE vigentes) ──
    # E30: Lei 14.993/2024 — em vigor desde ago/2025
    "blend_etanol_pct": 0.30,
    # B15: Resolução CNPE — em vigor desde ago/2025
    "blend_biodiesel_pct": 0.15,

    # ── Taxas de consumo em idle ──
    # Fonte: Contele Rastreador (BR) — 1,5 L/h para veículos leves
    "idle_rate_leve": 0.000417,
    # Fonte: Edenred Mobilidade (BR) — 4 L/h para veículos pesados
    "idle_rate_pesado": 0.001111,
    # 0.50 m³/h — derivado por conversão energética
    "idle_rate_gnv": 0.00014,
    # 1.0 kWh/h — estimativa; sem fonte disponível
    "idle_rate_eletrico": 0.00028,

    # ── Impacto do ticket de papel — Ecoinvent 3.9 (papel térmico 80g/m²) ──
    "paper_co2_per_ticket": 0.012,        # kg CO₂ por ticket térmico
    "paper_water_per_ticket": 0.5,        # litros de água por ticket

    # ── Metáforas lúdicas ──
    "ludic_tree_year_absorption": 15.0,
    "ludic_metaphor_units": default_ludic_metaphor_units(),

    # ── Tempos baseline (premissas declaradas — sem fonte oficial pública) ──
    # Pedágio: pagamento manual ~30–45s + fila estimada → 180s conservador (fora do pico)
    # Estacionamento: emissão de ticket + cancela → 120s
    "baseline_pedagio_avg_wait_sec": 180,
    "baseline_estacionamento_avg_wait_sec": 120,

    # ── Tempos estimados COM tag (premissas declaradas — Sem Parar/ConectCar não publicam) ──
    "elapsed_pedagio_avg_sec": 15,
    "elapsed_estacionamento_avg_sec": 30,
    "elapsed_times_source": "Premissa declarada — sem dado público disponível (Sem Parar/ConectCar não publicam tempo médio por passagem)",

    # ── Combustível extra por parada (frenagem + aceleração) ──
    # Derivado das taxas idle já fonteadas (Contele 1,5 L/h leve; Edenred 4 L/h pesado):
    # 1 ciclo parada+arranque em pedágio manual ≈ 30s leve / 45s pesado de consumo equivalente.
    # Edenred: custo do "anda e para" — blog.edenredmobilidade.com.br/gestao-de-frete/pedagio-eletronico-e-tradicional/
    # Contele: consumo em marcha lenta — blog.contelerastreador.com.br/consumo-em-marcha-lenta/
    "accel_surge_leve": 0.0125,   # 30s × 0.000417 L/s
    "accel_surge_pesado": 0.05,   # 45s × 0.001111 L/s

    # ── Source attribution ──
    "emission_factors_source": "FGV GHG Protocol Tool / BEN 2023 / MCTIC 2016",
    "emission_factors_year": 2023,
    "idle_rates_source": "Edenred Mobilidade — blog.edenredmobilidade.com.br/gestao-de-frotas/impacto-da-conducao-no-consumo-de-combustivel/ (4 L/h — pesado); Contele Rastreador — blog.contelerastreador.com.br/consumo-em-marcha-lenta/ (1,5 L/h — leve)",
    "idle_rates_year": 2024,
    "gwp100_source": "IPCC AR6 2021, Tabela 7.SM.7",
    "blend_factors_source": "ANP/CNPE: E30 por Lei 14.993/2024 (em vigor ago/2025); B15 por Resolução CNPE (em vigor ago/2025)",
    "blend_factors_year": 2025,
    "paper_impact_source": "Ecoinvent 3.9 — papel térmico 80g/m²",
    "grid_factor_source": "FGV GHG Protocol Tool, Aba Fatores Variáveis / ONS 2023–2025",
    "accel_surge_source": (
        "Derivado das taxas idle (Contele/Edenred): 1 ciclo frenagem+aceleração "
        "≈ 30s leve (0,0125 L) / 45s pesado (0,05 L) de consumo equivalente. "
        "Edenred — blog.edenredmobilidade.com.br/gestao-de-frete/pedagio-eletronico-e-tradicional/; "
        "Contele — blog.contelerastreador.com.br/consumo-em-marcha-lenta/"
    ),
}


async def seed_technical_specs(db) -> None:
    repo = TechnicalSpecsRepository(db)
    await repo.upsert_by_id(1, _TECHNICAL_SPECS_VALUES)
    await db.flush()
    print("  technical_specs: upsert id=1")


async def seed_fuel_prices(db) -> None:
    # (diesel_s10, gasolina_c, etanol) — valores de referência ANP para dev/local
    prices_by_uf: dict[str, tuple[float, float, float]] = {
        "AC": (6.62, 5.98, 3.88),
        "AL": (6.48, 5.86, 3.76),
        "AM": (6.58, 5.94, 3.85),
        "AP": (6.65, 6.01, 3.90),
        "BA": (6.55, 5.92, 3.82),
        "CE": (6.47, 5.84, 3.75),
        "DF": (6.52, 5.90, 3.80),
        "ES": (6.44, 5.82, 3.74),
        "GO": (6.41, 5.79, 3.72),
        "MA": (6.50, 5.87, 3.77),
        "MG": (6.38, 5.75, 3.65),
        "MS": (6.40, 5.78, 3.71),
        "MT": (6.43, 5.81, 3.73),
        "PA": (6.56, 5.93, 3.84),
        "PB": (6.46, 5.85, 3.76),
        "PE": (6.49, 5.87, 3.78),
        "PI": (6.51, 5.88, 3.79),
        "PR": (6.31, 5.71, 3.61),
        "RJ": (6.72, 6.15, 3.95),
        "RN": (6.48, 5.86, 3.77),
        "RO": (6.54, 5.91, 3.81),
        "RR": (6.60, 5.96, 3.87),
        "RS": (6.29, 5.68, 3.55),
        "SC": (6.33, 5.73, 3.63),
        "SE": (6.47, 5.85, 3.76),
        "SP": (6.49, 5.89, 3.79),
        "TO": (6.45, 5.83, 3.74),
    }
    repo = FuelPricesRepository(db)
    for uf, (diesel, gasolina, etanol) in prices_by_uf.items():
        await repo.upsert_by_uf(
            uf,
            price_diesel_s10=diesel,
            price_gasolina_c=gasolina,
            price_etanol=etanol,
        )
    await db.flush()
    print(f"  fuel_prices: {len(prices_by_uf)} UFs")


async def seed_organizations(db) -> list[Organization]:
    orgs_data = [
        Organization(name="Logística ABC Ltda", cnpj="12.345.678/0001-90", razao_social="Logística ABC Ltda ME"),
        Organization(name="Frota Express XYZ", cnpj="98.765.432/0001-10", razao_social="Frota Express XYZ S.A."),
    ]
    orgs = []
    for org in orgs_data:
        existing = (await db.execute(select(Organization).where(Organization.cnpj == org.cnpj))).first()
        if existing:
            orgs.append(existing[0])
        else:
            db.add(org)
            await db.flush()
            orgs.append(org)
    print(f"  organizations: {[o.id for o in orgs]}")
    return orgs


async def seed_users(db, orgs: list[Organization]) -> list[User]:
    password_hash = hash_password(SEED_DEFAULT_PASSWORD)
    users_data = [
        User(name="Admin Sistema", email="admin@taggy.com.br",
             password_hash=password_hash, role=UserRole.admin, organization_id=None),
        User(name="Carlos Gestor", email="carlos@taggy.com.br", password_hash=password_hash,
             role=UserRole.gestor_frota, organization_id=orgs[0].id),
        User(name="Fernanda Gestora", email="fernanda@taggy.com.br",
             password_hash=password_hash, role=UserRole.gestor_frota, organization_id=orgs[1].id),
        User(name="João Motorista", email="joao@taggy.com.br", password_hash=password_hash,
             role=UserRole.motorista, organization_id=orgs[0].id),
        User(name="Ana Motorista", email="ana@taggy.com.br", password_hash=password_hash,
             role=UserRole.motorista, organization_id=orgs[1].id),
        User(name="Pedro Motorista", email="pedro@taggy.com.br",
             password_hash=password_hash, role=UserRole.motorista, organization_id=None),
    ]
    users = []
    for u in users_data:
        existing = (await db.execute(select(User).where(User.email == u.email))).first()
        if existing:
            row = existing[0]
            row.password_hash = password_hash
            users.append(row)
        else:
            db.add(u)
            await db.flush()
            users.append(u)
    print(f"  users: {[u.id for u in users]}")
    return users


async def seed_fleets(db, orgs: list[Organization]) -> list[Fleet]:
    fleets_data = [
        Fleet(name="Frota Principal ABC", organization_id=orgs[0].id),
        Fleet(name="Frota Secundária ABC", organization_id=orgs[0].id),
        Fleet(name="Frota Express Norte", organization_id=orgs[1].id),
    ]
    fleets = []
    for f in fleets_data:
        existing = (
            await db.execute(
                select(Fleet).where(
                    Fleet.name == f.name,
                    Fleet.organization_id == f.organization_id,
                )
            )
        ).first()
        if existing:
            fleets.append(existing[0])
        else:
            db.add(f)
            await db.flush()
            fleets.append(f)
    print(f"  fleets: {[f.id for f in fleets]}")
    return fleets


async def seed_vehicles(
    db, users: list[User], orgs: list[Organization], fleets: list[Fleet]
) -> list[Vehicle]:
    pedro = next(u for u in users if u.email == "pedro@taggy.com.br")
    vehicles_data = [
        Vehicle(
            id_tag="TAG-001-ABC",
            user_id=users[1].id,
            organization_id=orgs[0].id,
            fleet_id=fleets[0].id,
            assigned_driver_id=users[3].id,
            license_plate="ABC-1234",
            model="Volkswagen Delivery 9.170",
            fuel_type="diesel_s10",
            category="pesado",
        ),
        Vehicle(
            id_tag="TAG-002-DEF",
            user_id=users[1].id,
            organization_id=orgs[0].id,
            fleet_id=fleets[0].id,
            assigned_driver_id=None,
            license_plate="DEF-5678",
            model="Mercedes-Benz Atego 1719",
            fuel_type="diesel_s10",
            category="pesado",
        ),
        Vehicle(
            id_tag="TAG-003-GHI",
            user_id=users[2].id,
            organization_id=orgs[1].id,
            fleet_id=fleets[2].id,
            assigned_driver_id=users[4].id,
            license_plate="GHI-9012",
            model="Fiat Cronos 1.3",
            fuel_type="gasolina_c",
            category="leve",
        ),
        Vehicle(
            id_tag="TAG-005-MNO",
            user_id=pedro.id,
            organization_id=None,
            fleet_id=None,
            assigned_driver_id=pedro.id,
            license_plate="MNO-7890",
            model="Honda Civic Flex",
            fuel_type="etanol",
            category="leve",
        ),
        Vehicle(
            id_tag="TAG-006-PQR",
            user_id=pedro.id,
            organization_id=None,
            fleet_id=None,
            assigned_driver_id=pedro.id,
            license_plate="PQR-1122",
            model="Hyundai HB20",
            fuel_type="gasolina_c",
            category="leve",
        ),
    ]
    vehicles = []
    for v in vehicles_data:
        existing = (await db.execute(select(Vehicle).where(Vehicle.id_tag == v.id_tag))).first()
        if existing:
            vehicles.append(existing[0])
        else:
            db.add(v)
            await db.flush()
            vehicles.append(v)
    print(f"  vehicles: {[v.id for v in vehicles]}")
    return vehicles


def _engine_specs_for_calc(specs: dict) -> dict:
    """Garante fuel_prices_meta exigido pela CalcEngine (ausente no dict cru do provider)."""
    out = dict(specs)
    out.setdefault(
        "fuel_prices_meta",
        {
            "source": FUEL_PRICES_META_SOURCE,
            "aggregation": FUEL_PRICES_META_AGGREGATION,
            "as_of": utc_now().isoformat(),
        },
    )
    return out


def _metrics_from_calc_result(result: dict) -> dict:
    env = result.get("environmental") or {}
    meta = result.get("metadata") or {}
    fin = result.get("financial") or {}
    return {
        "co2_avoided_kg": env.get("co2_kg"),
        "fuel_saved_liters": env.get("fuel_liters"),
        "water_saved_liters": env.get("water_liters"),
        "time_saved_sec": meta.get("time_saved_sec"),
        "financial_savings_brl": fin.get("total_savings_brl"),
    }


def _build_parameters_snapshot(
    *,
    plate: str,
    elapsed_time_sec: float,
    context: str,
    uf: str,
    is_digital: bool,
    vehicle: Vehicle,
    specs: dict,
    fuel_prices_all: dict,
) -> dict:
    payload_dict = {
        "plate": plate.strip().upper(),
        "elapsed_time": int(elapsed_time_sec),
        "context": context,
        "uf_passagem": uf.strip().upper(),
        "is_digital": is_digital,
        "vehicle": {
            "category": vehicle.category,
            "fuel_type": vehicle.fuel_type,
            "model": vehicle.model,
        },
    }
    engine_specs = _engine_specs_for_calc(specs)
    result = TransactionOrchestrator(CalcEngine(
        engine_specs)).handle_tag_event(payload_dict)
    return {
        "payload": payload_dict,
        "emission_factors": specs.get("emission_factors"),
        "ch4_factors": specs.get("ch4_factors"),
        "n2o_factors": specs.get("n2o_factors"),
        "gwp100": specs.get("gwp100"),
        "blend": specs.get("blend"),
        "sources": specs.get("sources"),
        "idle_rates": specs.get("idle_rates"),
        "accel_surge": specs.get("accel_surge"),
        "baselines": specs.get("baselines"),
        "paper_impact": specs.get("paper_impact"),
        "ludic_metaphor_units": specs.get("ludic_metaphor_units"),
        "vehicle_resolution": {
            "vehicle": payload_dict.get("vehicle"),
        },
        "pricing_snapshot": {
            "fuel_prices": fuel_prices_all,
            "fuel_prices_by_uf": specs.get("fuel_prices_by_uf"),
            "fuel_prices_meta": engine_specs.get("fuel_prices_meta"),
        },
        "result": result,
    }


async def seed_fleet_users(db, users: list[User], fleets: list[Fleet]) -> None:
    links = [
        (fleets[0].id, users[1].id),
        (fleets[0].id, users[3].id),
        (fleets[2].id, users[2].id),
        (fleets[2].id, users[4].id),
    ]
    for fleet_id, user_id in links:
        existing = (
            await db.execute(
                select(FleetUser).where(
                    FleetUser.fleet_id == fleet_id,
                    FleetUser.user_id == user_id,
                )
            )
        ).first()
        if not existing:
            db.add(FleetUser(fleet_id=fleet_id, user_id=user_id))
    await db.flush()
    print(f"  fleet_users: {len(links)} links")


async def seed_transactions(db, users: list[User], vehicles: list[Vehicle], orgs: list[Organization]) -> None:
    existing_count = (await db.execute(select(Transaction))).all()
    if len(existing_count) >= 20:
        print("  transactions: já existem, pulando")
        return

    specs = await get_all_specs(db)
    fuel_rows = await FuelPricesRepository(db).get_all()
    fuel_prices_all = {
        row.uf: fuel_price_row_to_dto(row).model_dump(mode="json") for row in fuel_rows
    }
    vehicle_by_id = {v.id: v for v in vehicles}

    base_date = utc_now() - timedelta(days=30)

    records = [
        # João motorista — ABC-1234
        dict(user_id=users[3].id, vehicle_id=vehicles[0].id, organization_id=orgs[0].id, plate="ABC-1234",
             context="pedagio", uf="SP", elapsed_time_sec=145.0, is_digital=True,
             created_at=base_date + timedelta(days=0, hours=7, minutes=15)),
        dict(user_id=users[3].id, vehicle_id=vehicles[0].id, organization_id=orgs[0].id, plate="ABC-1234",
             context="pedagio", uf="SP", elapsed_time_sec=162.0, is_digital=True,
             created_at=base_date + timedelta(days=1, hours=8, minutes=30)),
        dict(user_id=users[3].id, vehicle_id=vehicles[0].id, organization_id=orgs[0].id, plate="ABC-1234",
             context="estacionamento", uf="SP", elapsed_time_sec=285.0, is_digital=True,
             created_at=base_date + timedelta(days=2, hours=9, minutes=0)),
        dict(user_id=users[3].id, vehicle_id=vehicles[0].id, organization_id=orgs[0].id, plate="ABC-1234",
             context="pedagio", uf="MG", elapsed_time_sec=130.0, is_digital=True,
             created_at=base_date + timedelta(days=4, hours=6, minutes=45)),
        dict(user_id=users[3].id, vehicle_id=vehicles[0].id, organization_id=orgs[0].id, plate="ABC-1234",
             context="pedagio", uf="MG", elapsed_time_sec=155.0, is_digital=True,
             created_at=base_date + timedelta(days=5, hours=7, minutes=20)),
        # Veículo DEF-5678
        dict(user_id=users[1].id, vehicle_id=vehicles[1].id, organization_id=orgs[0].id, plate="DEF-5678",
             context="pedagio", uf="SP", elapsed_time_sec=170.0, is_digital=True,
             created_at=base_date + timedelta(days=3, hours=10, minutes=0)),
        dict(user_id=users[1].id, vehicle_id=vehicles[1].id, organization_id=orgs[0].id, plate="DEF-5678",
             context="estacionamento", uf="RS", elapsed_time_sec=310.0, is_digital=True,
             created_at=base_date + timedelta(days=6, hours=11, minutes=15)),
        dict(user_id=users[1].id, vehicle_id=vehicles[1].id, organization_id=orgs[0].id, plate="DEF-5678",
             context="pedagio", uf="RS", elapsed_time_sec=140.0, is_digital=True,
             created_at=base_date + timedelta(days=8, hours=7, minutes=0)),
        # Ana motorista — GHI-9012
        dict(user_id=users[4].id, vehicle_id=vehicles[2].id, organization_id=orgs[1].id, plate="GHI-9012",
             context="pedagio", uf="RJ", elapsed_time_sec=125.0, is_digital=True,
             created_at=base_date + timedelta(days=0, hours=8, minutes=0)),
        dict(user_id=users[4].id, vehicle_id=vehicles[2].id, organization_id=orgs[1].id, plate="GHI-9012",
             context="estacionamento", uf="RJ", elapsed_time_sec=260.0, is_digital=True,
             created_at=base_date + timedelta(days=1, hours=12, minutes=30)),
        dict(user_id=users[4].id, vehicle_id=vehicles[2].id, organization_id=orgs[1].id, plate="GHI-9012",
             context="pedagio", uf="RJ", elapsed_time_sec=138.0, is_digital=True,
             created_at=base_date + timedelta(days=3, hours=9, minutes=15)),
        dict(user_id=users[4].id, vehicle_id=vehicles[2].id, organization_id=orgs[1].id, plate="GHI-9012",
             context="pedagio", uf="BA", elapsed_time_sec=148.0, is_digital=True,
             created_at=base_date + timedelta(days=5, hours=8, minutes=45)),
        dict(user_id=users[4].id, vehicle_id=vehicles[2].id, organization_id=orgs[1].id, plate="GHI-9012",
             context="estacionamento", uf="BA", elapsed_time_sec=290.0, is_digital=True,
             created_at=base_date + timedelta(days=7, hours=10, minutes=0)),
        # Admin — veículo pessoal MNO-7890 (etanol)
        dict(user_id=users[0].id, vehicle_id=vehicles[3].id, organization_id=None, plate="MNO-7890",
             context="pedagio", uf="SP", elapsed_time_sec=120.0, is_digital=True,
             created_at=base_date + timedelta(days=2, hours=7, minutes=30)),
        dict(user_id=users[0].id, vehicle_id=vehicles[3].id, organization_id=None, plate="MNO-7890",
             context="pedagio", uf="SP", elapsed_time_sec=135.0, is_digital=True,
             created_at=base_date + timedelta(days=9, hours=8, minutes=0)),
        # Semana atual — João
        dict(user_id=users[3].id, vehicle_id=vehicles[0].id, organization_id=orgs[0].id, plate="ABC-1234",
             context="pedagio", uf="SP", elapsed_time_sec=150.0, is_digital=True,
             created_at=utc_now() - timedelta(days=1, hours=7)),
        dict(user_id=users[3].id, vehicle_id=vehicles[0].id, organization_id=orgs[0].id, plate="ABC-1234",
             context="estacionamento", uf="SP", elapsed_time_sec=275.0, is_digital=True,
             created_at=utc_now() - timedelta(hours=5)),
        # Recentes — Ana
        dict(user_id=users[4].id, vehicle_id=vehicles[2].id, organization_id=orgs[1].id, plate="GHI-9012",
             context="pedagio", uf="RJ", elapsed_time_sec=130.0, is_digital=True,
             created_at=utc_now() - timedelta(days=2, hours=8)),
        dict(user_id=users[4].id, vehicle_id=vehicles[2].id, organization_id=orgs[1].id, plate="GHI-9012",
             context="pedagio", uf="RJ", elapsed_time_sec=142.0, is_digital=True,
             created_at=utc_now() - timedelta(hours=3)),
        # Carlos gestor — DEF-5678
        dict(user_id=users[1].id, vehicle_id=vehicles[1].id, organization_id=orgs[0].id, plate="DEF-5678",
             context="pedagio", uf="PR", elapsed_time_sec=155.0, is_digital=True,
             created_at=utc_now() - timedelta(days=1, hours=6)),
        # Pedro motorista — MNO-7890 (etanol)
        dict(user_id=users[5].id, vehicle_id=vehicles[3].id, organization_id=None, plate="MNO-7890",
             context="pedagio", uf="SP", elapsed_time_sec=118.0, is_digital=True,
             created_at=base_date + timedelta(days=1, hours=7, minutes=10)),
        dict(user_id=users[5].id, vehicle_id=vehicles[3].id, organization_id=None, plate="MNO-7890",
             context="estacionamento", uf="SP", elapsed_time_sec=265.0, is_digital=True,
             created_at=base_date + timedelta(days=3, hours=9, minutes=0)),
        dict(user_id=users[5].id, vehicle_id=vehicles[3].id, organization_id=None, plate="MNO-7890",
             context="pedagio", uf="SP", elapsed_time_sec=132.0, is_digital=True,
             created_at=base_date + timedelta(days=6, hours=8, minutes=45)),
        # Pedro motorista — PQR-1122 (gasolina)
        dict(user_id=users[5].id, vehicle_id=vehicles[4].id, organization_id=None, plate="PQR-1122",
             context="pedagio", uf="RJ", elapsed_time_sec=140.0, is_digital=True,
             created_at=base_date + timedelta(days=10, hours=7, minutes=30)),
        dict(user_id=users[5].id, vehicle_id=vehicles[4].id, organization_id=None, plate="PQR-1122",
             context="estacionamento", uf="RJ", elapsed_time_sec=295.0, is_digital=True,
             created_at=base_date + timedelta(days=12, hours=10, minutes=0)),
        # Pedro — semana atual
        dict(user_id=users[5].id, vehicle_id=vehicles[3].id, organization_id=None, plate="MNO-7890",
             context="pedagio", uf="SP", elapsed_time_sec=125.0, is_digital=True,
             created_at=utc_now() - timedelta(days=1, hours=8)),
        dict(user_id=users[5].id, vehicle_id=vehicles[4].id, organization_id=None, plate="PQR-1122",
             context="pedagio", uf="SP", elapsed_time_sec=138.0, is_digital=True,
             created_at=utc_now() - timedelta(hours=4)),
    ]

    for r in records:
        vehicle = vehicle_by_id[r["vehicle_id"]]
        snapshot = _build_parameters_snapshot(
            plate=r["plate"],
            elapsed_time_sec=r["elapsed_time_sec"],
            context=r["context"],
            uf=r["uf"],
            is_digital=r["is_digital"],
            vehicle=vehicle,
            specs=specs,
            fuel_prices_all=fuel_prices_all,
        )
        t = Transaction(
            parameters_snapshot=snapshot,
            **_metrics_from_calc_result(snapshot["result"]),
            **r,
        )
        db.add(t)

    await db.flush()
    print(f"  transactions: {len(records)} registros")


async def seed_user_stats(db, users: list[User]) -> None:
    # Acumular a partir das transações existentes
    for user in users:
        existing = (await db.execute(select(UserStats).where(UserStats.user_id == user.id))).first()
        if existing:
            continue

        txs = (await db.execute(
            select(Transaction).where(Transaction.user_id == user.id)
        )).scalars().all()

        stats = UserStats(
            user_id=user.id,
            total_time_saved_sec=sum((t.time_saved_sec or 0) for t in txs),
            co2_total_kg=sum((t.co2_avoided_kg or 0) for t in txs),
            fuel_total_liters=sum((t.fuel_saved_liters or 0) for t in txs),
            water_total_liters=sum((t.water_saved_liters or 0) for t in txs),
            financial_total_brl=sum(
                (t.financial_savings_brl or 0) for t in txs),
            transactions_count=len(txs),
        )
        db.add(stats)

    await db.flush()
    print(f"  user_stats: {len(users)} usuários")


async def seed_weekly_goals(db, users: list[User]) -> None:
    week_start = get_week_start()

    goals_data = [
        # admin
        dict(user_id=users[0].id, week_start_date=week_start, target_transactions=5, current_transactions=1,
             target_co2_kg=1.0, current_co2_kg=0.19, is_completed=False),
        # Carlos gestor
        dict(user_id=users[1].id, week_start_date=week_start, target_transactions=10, current_transactions=1,
             target_co2_kg=3.0, current_co2_kg=0.57, is_completed=False),
        # Fernanda gestora
        dict(user_id=users[2].id, week_start_date=week_start, target_transactions=8, current_transactions=0,
             target_co2_kg=2.0, current_co2_kg=0.0, is_completed=False),
        # João motorista
        dict(user_id=users[3].id, week_start_date=week_start, target_transactions=15, current_transactions=2,
             target_co2_kg=4.0, current_co2_kg=0.62, is_completed=False),
        # Ana motorista
        dict(user_id=users[4].id, week_start_date=week_start, target_transactions=12, current_transactions=2,
             target_co2_kg=3.0, current_co2_kg=0.30, is_completed=False),
        # Pedro motorista
        dict(user_id=users[5].id, week_start_date=week_start, target_transactions=10, current_transactions=2,
             target_co2_kg=2.5, current_co2_kg=0.28, is_completed=False),
    ]

    for g in goals_data:
        existing = (await db.execute(
            select(WeeklyGoal).where(
                WeeklyGoal.user_id == g["user_id"],
                WeeklyGoal.week_start_date == week_start,
            )
        )).first()
        if not existing:
            db.add(WeeklyGoal(**g))

    await db.flush()
    print(f"  weekly_goals: {len(goals_data)} metas")


# ---------------------------------------------------------------------------
# Orquestrador
# ---------------------------------------------------------------------------

async def seed_all(reset: bool = False):
    async with AsyncSessionLocal() as db:
        async with db.begin():
            if reset:
                await reset_all(db)

            print("Seedando banco...")
            await seed_technical_specs(db)
            await seed_fuel_prices(db)
            orgs = await seed_organizations(db)
            users = await seed_users(db, orgs)
            fleets = await seed_fleets(db, orgs)
            vehicles = await seed_vehicles(db, users, orgs, fleets)
            await seed_fleet_users(db, users, fleets)
            await seed_transactions(db, users, vehicles, orgs)
            await seed_user_stats(db, users)
            await seed_weekly_goals(db, users)
            print("✓ Seed concluído")


async def _main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true",
                        help="Limpa dados antes de inserir")
    args = parser.parse_args()
    await seed_all(reset=args.reset)


if __name__ == "__main__":
    asyncio.run(_main())
