from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def default_ludic_metaphor_units() -> dict[str, dict[str, float]]:
    """Valores técnicos default (_default_ludic_metaphors da doc); labels ficam em constants."""
    return {
        "carbon": {
            "tree_year": 15.0,
            "burger": 2.5,
            "km_car": 0.12,
        },
        "water": {
            "shower_8min": 60.0,
            "drinking_day": 2.0,
            "flush": 6.0,
        },
        "paper": {
            "ream_a4": 500.0,
            "notebook": 50.0,
            "toilet_roll": 150.0,
        },
    }


class TechnicalSpecs(SQLModel, table=True):
    __tablename__ = "technical_specs"

    id: int | None = Field(default=None, primary_key=True)

    # ── Fatores de emissão CO₂ fóssil (kg CO₂/L ou kg CO₂/m³ ou kg CO₂/kWh) ──
    # Fonte: FGV GHG Protocol Tool / BEN 2023 / MCTIC 2016
    # Gasolina C = gasolina A pura (fração fóssil após separação E27)
    emission_factor_diesel_s10: float = Field(
        default=0, sa_column=Column(Float, nullable=False)
    )
    emission_factor_gasolina_c: float = Field(
        default=0, sa_column=Column(Float, nullable=False)
    )
    # Etanol: CO₂ é biogênico. Este campo guarda o valor biogênico (reportado separado do Escopo 1).
    # CO₂e Escopo 1 do etanol vem dos fatores CH4/N2O abaixo.
    emission_factor_etanol: float = Field(
        default=0, sa_column=Column(Float, nullable=False)
    )
    # GNV: kg CO₂/m³
    emission_factor_gnv: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )
    # Elétrico: fator médio SIN (kg CO₂/kWh) — Escopo 2
    emission_factor_eletrico_kwh: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )

    # ── Fatores CH4 (kg CH4 por unidade de combustível) ──
    # Fonte: FGV GHG Protocol Tool, BEN 2023 — Aba "Fatores de Emissão" linhas 103–117
    ch4_factor_gasolina_c: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )
    ch4_factor_diesel_s10: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )
    ch4_factor_etanol: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )
    ch4_factor_gnv: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )

    # ── Fatores N2O (kg N2O por unidade de combustível) ──
    n2o_factor_gasolina_c: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )
    n2o_factor_diesel_s10: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )
    n2o_factor_etanol: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )
    n2o_factor_gnv: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )

    # ── GWP100 (IPCC AR6 2021, Tabela 7.SM.7) ──
    gwp100_ch4: float = Field(
        default=27.9, sa_column=Column(Float, nullable=False, server_default="27.9")
    )
    gwp100_n2o: float = Field(
        default=273.0, sa_column=Column(Float, nullable=False, server_default="273.0")
    )

    # ── Percentuais de biocombustível (variáveis por ANP/CNPE) ──
    # blend_etanol_pct: fração de etanol anidro na gasolina C (0.27 = E27)
    # blend_biodiesel_pct: fração de biodiesel no diesel S10 (0.14 = B14)
    blend_etanol_pct: float = Field(
        default=0.27, sa_column=Column(Float, nullable=False, server_default="0.27")
    )
    blend_biodiesel_pct: float = Field(
        default=0.14, sa_column=Column(Float, nullable=False, server_default="0.14")
    )

    # ── Taxas de consumo em idle (L/s, m³/s ou kWh/s) ──
    idle_rate_leve: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    idle_rate_pesado: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    idle_rate_gnv: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )
    idle_rate_eletrico: float = Field(
        default=0, sa_column=Column(Float, nullable=False, server_default="0")
    )

    # ── Impacto do ticket de papel ──
    paper_co2_per_ticket: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    paper_water_per_ticket: float = Field(
        default=0, sa_column=Column(Float, nullable=False))

    # ── Metáforas lúdicas ──
    ludic_tree_year_absorption: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    ludic_phone_charge_factor: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    ludic_coffee_factor: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    ludic_metaphor_units: dict[str, Any] = Field(
        default_factory=default_ludic_metaphor_units,
        sa_column=Column(JSONB, nullable=False),
    )

    # ── Tempos baseline (segundos) ──
    baseline_pedagio_avg_wait_sec: int = Field(
        default=0, sa_column=Column(Integer, nullable=False))
    baseline_estacionamento_avg_wait_sec: int = Field(
        default=0, sa_column=Column(Integer, nullable=False)
    )

    # ── Tempos estimados COM tag (segundos) — premissa declarada ──
    # Sem Parar/ConectCar não publicam tempo médio por passagem; valores estimados.
    elapsed_pedagio_avg_sec: int = Field(
        default=15, sa_column=Column(Integer, nullable=False, server_default="15")
    )
    elapsed_estacionamento_avg_sec: int = Field(
        default=30, sa_column=Column(Integer, nullable=False, server_default="30")
    )
    elapsed_times_source: str = Field(
        default="Premissa declarada — sem dado público disponível (Sem Parar/ConectCar não publicam tempo médio por passagem)",
        sa_column=Column(String, nullable=False, server_default=""),
    )

    # ── Custos de manutenção (mantido para cálculo financeiro) ──
    maint_cost_leve: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    maint_cost_pesado: float = Field(
        default=0, sa_column=Column(Float, nullable=False))

    # ── Accel surge — extra fuel per braking+acceleration event at manual toll/parking ──
    accel_surge_leve: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    accel_surge_pesado: float = Field(
        default=0, sa_column=Column(Float, nullable=False))

    # ── Benchmarks para metáforas ──
    benchmark_kg_co2_per_km_car: float = Field(
        default=0, sa_column=Column(Float, nullable=False))
    benchmark_kg_co2_per_burger: float = Field(
        default=0, sa_column=Column(Float, nullable=False))

    # ── Source attribution (auditabilidade) ──
    emission_factors_source: str = Field(
        default="FGV GHG Protocol Tool / BEN 2023 / MCTIC 2016",
        sa_column=Column(String, nullable=False, server_default=""),
    )
    emission_factors_year: int = Field(
        default=2023, sa_column=Column(Integer, nullable=False, server_default="2023")
    )
    idle_rates_source: str = Field(
        default="U.S. DOE Fact #861 (2015) — proxy; sem equivalente CETESB/INMETRO público",
        sa_column=Column(String, nullable=False, server_default=""),
    )
    idle_rates_year: int = Field(
        default=2015, sa_column=Column(Integer, nullable=False, server_default="2015")
    )
    gwp100_source: str = Field(
        default="IPCC AR6 2021, Tabela 7.SM.7",
        sa_column=Column(String, nullable=False, server_default=""),
    )
    blend_factors_source: str = Field(
        default="ANP/CNPE: E27 por Lei 14.993/2024; B14 por Resolução CNPE 2024",
        sa_column=Column(String, nullable=False, server_default=""),
    )
    blend_factors_year: int = Field(
        default=2024, sa_column=Column(Integer, nullable=False, server_default="2024")
    )
    paper_impact_source: str = Field(
        default="Ecoinvent 3.9 — papel térmico 80g/m²",
        sa_column=Column(String, nullable=False, server_default=""),
    )
    grid_factor_source: str = Field(
        default="FGV GHG Protocol Tool, Aba Fatores Variáveis / ONS 2023–2025",
        sa_column=Column(String, nullable=False, server_default=""),
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True),
                         nullable=False, onupdate=utc_now),
    )
