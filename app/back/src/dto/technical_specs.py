from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict

from src.constants.ludic_metaphors import METAPHOR_IDS_ORDER, METAPHOR_LABELS
from src.dto.fuel_price import FuelPriceByUFDTO
from src.models.technical_specs import TechnicalSpecs


class TechnicalSpecsDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    # Emission factors
    emission_factor_diesel_s10: float
    emission_factor_gasolina_c: float
    emission_factor_etanol: float
    emission_factor_gnv: float
    emission_factor_eletrico_kwh: float
    # CH4 factors
    ch4_factor_gasolina_c: float
    ch4_factor_diesel_s10: float
    ch4_factor_etanol: float
    ch4_factor_gnv: float
    # N2O factors
    n2o_factor_gasolina_c: float
    n2o_factor_diesel_s10: float
    n2o_factor_etanol: float
    n2o_factor_gnv: float
    # GWP100
    gwp100_ch4: float
    gwp100_n2o: float
    # Blend percentages
    blend_etanol_pct: float
    blend_biodiesel_pct: float
    # Idle rates
    idle_rate_leve: float
    idle_rate_pesado: float
    idle_rate_gnv: float
    idle_rate_eletrico: float
    # Paper impact
    paper_co2_per_ticket: float
    paper_water_per_ticket: float
    # Ludic
    ludic_tree_year_absorption: float
    ludic_metaphor_units: dict[str, Any]
    # Baselines
    baseline_pedagio_avg_wait_sec: int
    baseline_estacionamento_avg_wait_sec: int
    elapsed_pedagio_avg_sec: int
    elapsed_estacionamento_avg_sec: int
    accel_surge_leve: float
    accel_surge_pesado: float
    accel_surge_source: str
    # Source attribution
    emission_factors_source: str
    emission_factors_year: int
    idle_rates_source: str
    idle_rates_year: int
    gwp100_source: str
    blend_factors_source: str
    blend_factors_year: int
    paper_impact_source: str
    grid_factor_source: str

    created_at: datetime
    updated_at: datetime


class TechnicalSpecsCreate(BaseModel):
    emission_factor_diesel_s10: float
    emission_factor_gasolina_c: float
    emission_factor_etanol: float
    emission_factor_gnv: float = 0.0
    emission_factor_eletrico_kwh: float = 0.0
    ch4_factor_gasolina_c: float = 0.0
    ch4_factor_diesel_s10: float = 0.0
    ch4_factor_etanol: float = 0.0
    ch4_factor_gnv: float = 0.0
    n2o_factor_gasolina_c: float = 0.0
    n2o_factor_diesel_s10: float = 0.0
    n2o_factor_etanol: float = 0.0
    n2o_factor_gnv: float = 0.0
    gwp100_ch4: float = 27.9
    gwp100_n2o: float = 273.0
    blend_etanol_pct: float = 0.27
    blend_biodiesel_pct: float = 0.14
    idle_rate_leve: float = 0.0
    idle_rate_pesado: float = 0.0
    idle_rate_gnv: float = 0.0
    idle_rate_eletrico: float = 0.0
    paper_co2_per_ticket: float = 0.0
    paper_water_per_ticket: float = 0.0
    ludic_tree_year_absorption: float = 0.0
    ludic_metaphor_units: dict[str, Any]
    baseline_pedagio_avg_wait_sec: int = 0
    baseline_estacionamento_avg_wait_sec: int = 0
    elapsed_pedagio_avg_sec: int = 15
    elapsed_estacionamento_avg_sec: int = 30
    accel_surge_leve: float = 0.0125
    accel_surge_pesado: float = 0.05
    accel_surge_source: str = ""
    emission_factors_source: str = ""
    emission_factors_year: int = 2023
    idle_rates_source: str = ""
    idle_rates_year: int = 2015
    gwp100_source: str = ""
    blend_factors_source: str = ""
    blend_factors_year: int = 2024
    paper_impact_source: str = ""
    grid_factor_source: str = ""


class TechnicalSpecsUpdate(BaseModel):
    emission_factor_diesel_s10: Optional[float] = None
    emission_factor_gasolina_c: Optional[float] = None
    emission_factor_etanol: Optional[float] = None
    emission_factor_gnv: Optional[float] = None
    emission_factor_eletrico_kwh: Optional[float] = None
    ch4_factor_gasolina_c: Optional[float] = None
    ch4_factor_diesel_s10: Optional[float] = None
    ch4_factor_etanol: Optional[float] = None
    ch4_factor_gnv: Optional[float] = None
    n2o_factor_gasolina_c: Optional[float] = None
    n2o_factor_diesel_s10: Optional[float] = None
    n2o_factor_etanol: Optional[float] = None
    n2o_factor_gnv: Optional[float] = None
    gwp100_ch4: Optional[float] = None
    gwp100_n2o: Optional[float] = None
    blend_etanol_pct: Optional[float] = None
    blend_biodiesel_pct: Optional[float] = None
    idle_rate_leve: Optional[float] = None
    idle_rate_pesado: Optional[float] = None
    idle_rate_gnv: Optional[float] = None
    idle_rate_eletrico: Optional[float] = None
    paper_co2_per_ticket: Optional[float] = None
    paper_water_per_ticket: Optional[float] = None
    ludic_tree_year_absorption: Optional[float] = None
    ludic_metaphor_units: Optional[dict] = None
    baseline_pedagio_avg_wait_sec: Optional[int] = None
    baseline_estacionamento_avg_wait_sec: Optional[int] = None
    elapsed_pedagio_avg_sec: Optional[int] = None
    elapsed_estacionamento_avg_sec: Optional[int] = None
    accel_surge_leve: Optional[float] = None
    accel_surge_pesado: Optional[float] = None
    accel_surge_source: Optional[str] = None
    emission_factors_source: Optional[str] = None
    emission_factors_year: Optional[int] = None
    idle_rates_source: Optional[str] = None
    idle_rates_year: Optional[int] = None
    gwp100_source: Optional[str] = None
    blend_factors_source: Optional[str] = None
    blend_factors_year: Optional[int] = None
    paper_impact_source: Optional[str] = None
    grid_factor_source: Optional[str] = None


class TechnicalSpecsBundleDTO(BaseModel):
    specs: TechnicalSpecsDTO
    fuel_prices_by_uf: dict[str, FuelPriceByUFDTO]


def technical_specs_row_to_dto(row: TechnicalSpecs) -> TechnicalSpecsDTO:
    return TechnicalSpecsDTO(
        id=row.id,  # type: ignore[arg-type]
        emission_factor_diesel_s10=float(row.emission_factor_diesel_s10),
        emission_factor_gasolina_c=float(row.emission_factor_gasolina_c),
        emission_factor_etanol=float(row.emission_factor_etanol),
        emission_factor_gnv=float(row.emission_factor_gnv),
        emission_factor_eletrico_kwh=float(row.emission_factor_eletrico_kwh),
        ch4_factor_gasolina_c=float(row.ch4_factor_gasolina_c),
        ch4_factor_diesel_s10=float(row.ch4_factor_diesel_s10),
        ch4_factor_etanol=float(row.ch4_factor_etanol),
        ch4_factor_gnv=float(row.ch4_factor_gnv),
        n2o_factor_gasolina_c=float(row.n2o_factor_gasolina_c),
        n2o_factor_diesel_s10=float(row.n2o_factor_diesel_s10),
        n2o_factor_etanol=float(row.n2o_factor_etanol),
        n2o_factor_gnv=float(row.n2o_factor_gnv),
        gwp100_ch4=float(row.gwp100_ch4),
        gwp100_n2o=float(row.gwp100_n2o),
        blend_etanol_pct=float(row.blend_etanol_pct),
        blend_biodiesel_pct=float(row.blend_biodiesel_pct),
        idle_rate_leve=float(row.idle_rate_leve),
        idle_rate_pesado=float(row.idle_rate_pesado),
        idle_rate_gnv=float(row.idle_rate_gnv),
        idle_rate_eletrico=float(row.idle_rate_eletrico),
        paper_co2_per_ticket=float(row.paper_co2_per_ticket),
        paper_water_per_ticket=float(row.paper_water_per_ticket),
        ludic_tree_year_absorption=float(row.ludic_tree_year_absorption),
        ludic_metaphor_units=dict(row.ludic_metaphor_units or {}),
        baseline_pedagio_avg_wait_sec=int(row.baseline_pedagio_avg_wait_sec),
        baseline_estacionamento_avg_wait_sec=int(row.baseline_estacionamento_avg_wait_sec),
        elapsed_pedagio_avg_sec=int(row.elapsed_pedagio_avg_sec),
        elapsed_estacionamento_avg_sec=int(row.elapsed_estacionamento_avg_sec),
        accel_surge_leve=float(row.accel_surge_leve),
        accel_surge_pesado=float(row.accel_surge_pesado),
        accel_surge_source=row.accel_surge_source or "",
        emission_factors_source=row.emission_factors_source or "",
        emission_factors_year=int(row.emission_factors_year),
        idle_rates_source=row.idle_rates_source or "",
        idle_rates_year=int(row.idle_rates_year),
        gwp100_source=row.gwp100_source or "",
        blend_factors_source=row.blend_factors_source or "",
        blend_factors_year=int(row.blend_factors_year),
        paper_impact_source=row.paper_impact_source or "",
        grid_factor_source=row.grid_factor_source or "",
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


_UNIT_KEY_BY_AXIS = {
    "carbon": "kg_co2_per_unit",
    "water": "liters_per_unit",
    "paper": "tickets_per_unit",
}


def merge_ludic_metaphor_units_with_labels(
    units_from_db: dict[str, Any] | None,
) -> dict[str, list[dict[str, Any]]]:
    from src.engine.exceptions import CalcEngineError

    raw = dict(units_from_db or {})
    out: dict[str, list[dict[str, Any]]] = {
        "carbon": [],
        "water": [],
        "paper": [],
    }

    for axis in ("carbon", "water", "paper"):
        unit_key = _UNIT_KEY_BY_AXIS[axis]
        axis_units_db = raw.get(axis)
        if not isinstance(axis_units_db, dict):
            raise CalcEngineError(
                f"ludic_metaphor_units[{axis}] deve ser um objeto com ids numéricos."
            )

        for mid in METAPHOR_IDS_ORDER.get(axis, ()):
            unit_val = axis_units_db.get(mid)
            if unit_val is None:
                raise CalcEngineError(
                    f"ludic_metaphor_units incompleto: eixo {axis!r} sem id {mid!r}."
                )

            label = METAPHOR_LABELS.get(axis, {}).get(mid)
            if not label:
                raise CalcEngineError(
                    f"Constante METAPHOR_LABELS sem label: axis={axis!r} id={mid!r}."
                )

            item: dict[str, Any] = {
                "id": mid,
                "label": label,
                unit_key: float(unit_val),
            }
            out[axis].append(item)

    return out


def technical_specs_to_engine_dict(
    row: TechnicalSpecs,
    fuel_prices_by_uf: dict[str, dict[str, float]],
) -> dict[str, Any]:
    from src.dto.fuel_price import FUEL_PRICES_META_AGGREGATION, FUEL_PRICES_META_SOURCE

    ludic_metaphors = merge_ludic_metaphor_units_with_labels(row.ludic_metaphor_units)

    # Diesel S10 commercial = diesel puro × (1 − blend_biodiesel_pct)
    # Gasolina C commercial = gasolina A pura × (1 − blend_etanol_pct)
    # emission_factor_* stores the BASE (pure fossil) factor; engine applies blend here.
    blend_bio = float(row.blend_biodiesel_pct)
    blend_eth = float(row.blend_etanol_pct)

    diesel_co2 = float(row.emission_factor_diesel_s10) * (1.0 - blend_bio)
    gasolina_co2 = float(row.emission_factor_gasolina_c) * (1.0 - blend_eth)

    return {
        "emission_factors": {
            "diesel_s10": diesel_co2,
            # diesel_s500: pré-2013, fator maior (sem blend B14 que só vigorou a partir de 2019)
            "diesel_s500": float(row.emission_factor_diesel_s10) * 1.012,  # ~2.664 kg/L (diesel puro antigo)
            "gasolina_c": gasolina_co2,
            # Etanol: CO₂ é biogênico. Guardamos aqui para reportar separado do Escopo 1.
            "etanol": float(row.emission_factor_etanol),
            "gnv": float(row.emission_factor_gnv),
            "eletrico_kwh": float(row.emission_factor_eletrico_kwh),
        },
        "ch4_factors": {
            "diesel_s10": float(row.ch4_factor_diesel_s10) * (1.0 - blend_bio),
            "diesel_s500": float(row.ch4_factor_diesel_s10),  # sem blend
            "gasolina_c": float(row.ch4_factor_gasolina_c) * (1.0 - blend_eth),
            "etanol": float(row.ch4_factor_etanol),
            "gnv": float(row.ch4_factor_gnv),
        },
        "n2o_factors": {
            "diesel_s10": float(row.n2o_factor_diesel_s10) * (1.0 - blend_bio),
            "diesel_s500": float(row.n2o_factor_diesel_s10),  # sem blend
            "gasolina_c": float(row.n2o_factor_gasolina_c) * (1.0 - blend_eth),
            "etanol": float(row.n2o_factor_etanol),
            "gnv": float(row.n2o_factor_gnv),
        },
        "gwp100": {
            "ch4": float(row.gwp100_ch4),
            "n2o": float(row.gwp100_n2o),
        },
        "blend": {
            "etanol_pct": blend_eth,
            "biodiesel_pct": blend_bio,
        },
        "idle_rates": {
            "leve": float(row.idle_rate_leve),
            "pesado": float(row.idle_rate_pesado),
            "gnv": float(row.idle_rate_gnv),
            "eletrico": float(row.idle_rate_eletrico),
        },
        "paper_impact": {
            "co2_per_ticket": float(row.paper_co2_per_ticket),
            "water_per_ticket": float(row.paper_water_per_ticket),
        },
        "ludic_factors": {
            "tree_year_absorption": float(row.ludic_tree_year_absorption),
        },
        "ludic_metaphors": ludic_metaphors,
        "baselines": {
            "pedagio": {
                "avg_wait_sec": int(row.baseline_pedagio_avg_wait_sec),
                "with_tag_avg_sec": int(row.elapsed_pedagio_avg_sec),
            },
            "estacionamento": {
                "avg_wait_sec": int(row.baseline_estacionamento_avg_wait_sec),
                "with_tag_avg_sec": int(row.elapsed_estacionamento_avg_sec),
            },
        },
        "accel_surge": {
            "leve": float(row.accel_surge_leve),
            "pesado": float(row.accel_surge_pesado),
        },
        "fuel_prices_by_uf": fuel_prices_by_uf,
        "fuel_prices_meta": {
            "source": FUEL_PRICES_META_SOURCE,
            "aggregation": FUEL_PRICES_META_AGGREGATION,
            "as_of": "",
        },
        "sources": {
            "emission_factors": row.emission_factors_source or "",
            "emission_factors_year": int(row.emission_factors_year),
            "idle_rates": row.idle_rates_source or "",
            "idle_rates_year": int(row.idle_rates_year),
            "gwp100": row.gwp100_source or "",
            "blend_factors": row.blend_factors_source or "",
            "blend_factors_year": int(row.blend_factors_year),
            "paper_impact": row.paper_impact_source or "",
            "grid_factor": row.grid_factor_source or "",
            "accel_surge": row.accel_surge_source or "",
        },
    }
