from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any

from src.database.connection import get_db
from src.engine import CalcEngine, CalcEngineError
from src.services.technical_specs import get_all_specs
from src.services.vehicle_lookup_service import resolve_vehicle_from_plate

router = APIRouter(prefix="/public", tags=["Public"])

_DEFAULT_VEHICLE = {
    "category": "leve",
    "fuel_type": "gasolina_c",
    "model": None,
}


class PublicCalculatorRequest(BaseModel):
    plate: str
    monthly_pedagio: int = Field(ge=1, le=100)
    uf: str = "SP"
    monthly_estacionamento: int = Field(default=0, ge=0, le=100)


class ProjectionMetrics(BaseModel):
    financial_brl: float
    co2_kg: float
    time_min: float
    fuel_liters: float


class PublicCalculatorResponse(BaseModel):
    monthly: ProjectionMetrics
    annual: ProjectionMetrics
    vehicle_model: str | None
    fuel_type: str
    category: str
    ludic: dict[str, Any]
    vehicle_fallback: bool
    fallback_reason: str | None


@router.post("/calculator", response_model=PublicCalculatorResponse)
async def public_calculator(
    body: PublicCalculatorRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        specs = await get_all_specs(db)
    except CalcEngineError as e:
        raise HTTPException(status_code=422, detail="Erro ao carregar especificações técnicas.") from e

    engine = CalcEngine(specs)

    # Resolve vehicle from plate; fall back to default profile if not found
    fallback = False
    fallback_reason: str | None = None
    vehicle_model: str | None = None

    lookup = await resolve_vehicle_from_plate(body.plate)
    if lookup["error"] or lookup["vehicle"] is None:
        fallback = True
        fallback_reason = "Placa não encontrada — estimativa baseada em perfil padrão (leve, gasolina)."
        vehicle_dict = _DEFAULT_VEHICLE.copy()
    else:
        vehicle_dict = lookup["vehicle"]
        vehicle_model = vehicle_dict.get("model")

    uf = body.uf.strip().upper() or "SP"

    def _run_context(context: str, count: int) -> dict[str, Any]:
        try:
            return engine.process_transaction(
                vehicle_data=vehicle_dict,
                context=context,
                uf_passagem=uf,
                is_digital=True,
            )
        except CalcEngineError as e:
            raise HTTPException(status_code=422, detail=str(e)) from e

    # Per-passage results
    pedagio_result = _run_context("pedagio", body.monthly_pedagio)
    estac_result = _run_context("estacionamento", body.monthly_estacionamento) if body.monthly_estacionamento > 0 else None

    def _extract(result: dict, count: int) -> tuple[float, float, float, float]:
        env = result.get("environmental") or {}
        fin = result.get("financial") or {}
        meta = result.get("metadata") or {}
        return (
            float(fin.get("total_savings_brl") or 0) * count,
            float(env.get("co2_kg") or 0) * count,
            float(meta.get("time_saved_sec") or 0) * count / 60,
            float(env.get("fuel_liters") or 0) * count,
        )

    fin_p, co2_p, time_p, fuel_p = _extract(pedagio_result, body.monthly_pedagio)
    fin_e = co2_e = time_e = fuel_e = 0.0
    if estac_result:
        fin_e, co2_e, time_e, fuel_e = _extract(estac_result, body.monthly_estacionamento)

    monthly_fin = round(fin_p + fin_e, 2)
    monthly_co2 = round(co2_p + co2_e, 4)
    monthly_time = round(time_p + time_e, 1)
    monthly_fuel = round(fuel_p + fuel_e, 4)

    monthly = ProjectionMetrics(
        financial_brl=monthly_fin,
        co2_kg=monthly_co2,
        time_min=monthly_time,
        fuel_liters=monthly_fuel,
    )
    annual = ProjectionMetrics(
        financial_brl=round(monthly_fin * 12, 2),
        co2_kg=round(monthly_co2 * 12, 4),
        time_min=round(monthly_time * 12, 1),
        fuel_liters=round(monthly_fuel * 12, 4),
    )

    ludic = engine.get_ludic_metrics(monthly_co2 * 12)

    return PublicCalculatorResponse(
        monthly=monthly,
        annual=annual,
        vehicle_model=vehicle_model,
        fuel_type=vehicle_dict["fuel_type"],
        category=vehicle_dict["category"],
        ludic=ludic,
        vehicle_fallback=fallback,
        fallback_reason=fallback_reason,
    )
