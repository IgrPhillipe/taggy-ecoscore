"""
Resolução de placa → dados do veículo via brasil.io (dataset RENAVAM/DENATRAN).

Retorna category (leve/pesado) e fuel_type para uso no CalcEngine.
Falha explicitamente se API indisponível — não assume valores.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

_BRASIL_IO_URL = "https://brasil.io/api/dataset/veiculos/veiculos/data/"
_REQUEST_TIMEOUT = 8.0  # seconds

# Mapeamento combustivel DENATRAN → fuel_type interno
_FUEL_MAP: dict[str, str] = {
    "GASOLINA": "gasolina_c",
    "ALCOOL": "etanol",
    "ÁLCOOL": "etanol",
    "GASOLINA/ALCOOL": "gasolina_c",   # flex: default gasolina
    "GASOLINA/ÁLCOOL": "gasolina_c",
    "FLEX": "gasolina_c",
    "GAS NATURAL": "gnv",
    "GÁS NATURAL": "gnv",
    "GNV": "gnv",
    "ELETRICO": "eletrico",
    "ELÉTRICO": "eletrico",
    "HIBRIDO": "gasolina_c",           # híbrido: conservador → gasolina
    "HÍBRIDO": "gasolina_c",
}

# Mapeamento tipo_veiculo DENATRAN → category interna
_CATEGORY_MAP: dict[str, str] = {
    "AUTOMOVEL": "leve",
    "AUTOMÓVEL": "leve",
    "CAMIONETA": "leve",
    "UTILITARIO": "leve",
    "UTILITÁRIO": "leve",
    "CAMINHONETE": "leve",
    "MOTOCICLETA": "leve",
    "CICLOMOTOR": "leve",
    "CAMINHAO": "pesado",
    "CAMINHÃO": "pesado",
    "ONIBUS": "pesado",
    "ÔNIBUS": "pesado",
    "MICROONIBUS": "pesado",
    "MICRO-ÔNIBUS": "pesado",
    "TRATOR": "pesado",
    "REBOQUE": "pesado",
    "SEMIRREBOQUE": "pesado",
}


def _normalise_plate(plate: str) -> str:
    return plate.strip().upper().replace("-", "").replace(" ", "")


def _resolve_fuel(fuel_raw: str, year: Optional[int]) -> tuple[str, bool]:
    """Returns (fuel_type, is_flex)."""
    upper = fuel_raw.upper().strip()
    is_flex = "FLEX" in upper or "ALCOOL" in upper or "ÁLCOOL" in upper

    # Diesel + ano: distingue S10 (≥2013) de S500 (pré-2013)
    if "DIESEL" in upper:
        if year is not None and year < 2013:
            return "diesel_s500", False
        return "diesel_s10", False

    for key, ft in _FUEL_MAP.items():
        if key in upper:
            return ft, is_flex

    # Fallback: desconhecido
    return "gasolina_c", False


def _resolve_category(tipo_raw: str) -> str:
    upper = tipo_raw.upper().strip()
    for key, cat in _CATEGORY_MAP.items():
        if key in upper:
            return cat
    return "leve"  # conservador


class VehicleResolution:
    def __init__(
        self,
        plate: str,
        model: Optional[str],
        year: Optional[int],
        fuel_raw: Optional[str],
        category_resolved: str,
        fuel_type_resolved: str,
        is_flex: bool,
        source: str,
        confidence: str,
    ):
        self.plate = plate
        self.model = model
        self.year = year
        self.fuel_raw = fuel_raw
        self.category_resolved = category_resolved
        self.fuel_type_resolved = fuel_type_resolved
        self.is_flex = is_flex
        self.source = source
        self.confidence = confidence

    def to_dict(self) -> dict[str, Any]:
        return {
            "plate": self.plate,
            "model": self.model,
            "year": self.year,
            "fuel_raw": self.fuel_raw,
            "category_resolved": self.category_resolved,
            "fuel_type_resolved": self.fuel_type_resolved,
            "is_flex": self.is_flex,
            "source": self.source,
            "confidence": self.confidence,
        }

    def to_vehicle_dict(self) -> dict[str, Any]:
        return {
            "category": self.category_resolved,
            "fuel_type": self.fuel_type_resolved,
            "model": self.model or "",
        }


async def lookup_vehicle(plate: str) -> Optional[VehicleResolution]:
    """
    Queries brasil.io RENAVAM dataset for vehicle data by plate.

    Returns VehicleResolution if found, None if not found.
    Raises httpx.HTTPError on connection failure (caller decides how to handle).
    """
    normalised = _normalise_plate(plate)

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        try:
            resp = await client.get(
                _BRASIL_IO_URL,
                params={"placa": normalised},
                headers={"User-Agent": "TaggyEcoScore/1.0"},
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.warning("brasil.io returned %s for plate %s", e.response.status_code, normalised)
            return None
        except httpx.RequestError as e:
            logger.warning("brasil.io request failed for plate %s: %s", normalised, e)
            raise

    data = resp.json()
    results = data.get("results") or []
    if not results:
        return None

    row = results[0]
    fuel_raw: str = row.get("combustivel") or row.get("combustivelDescricao") or ""
    tipo_raw: str = row.get("tipo") or row.get("tipoVeiculo") or ""
    model: str = " ".join(filter(None, [
        row.get("marca"),
        row.get("modelo"),
        row.get("versao"),
    ]))
    year_str = row.get("anoModelo") or row.get("ano") or ""
    try:
        year = int(str(year_str)[:4]) if year_str else None
    except (ValueError, TypeError):
        year = None

    fuel_type, is_flex = _resolve_fuel(fuel_raw, year)
    category = _resolve_category(tipo_raw)

    confidence = "high" if fuel_raw and tipo_raw else "low"

    return VehicleResolution(
        plate=normalised,
        model=model.strip() or None,
        year=year,
        fuel_raw=fuel_raw or None,
        category_resolved=category,
        fuel_type_resolved=fuel_type,
        is_flex=is_flex,
        source="brasil.io/DENATRAN",
        confidence=confidence,
    )


async def resolve_vehicle_from_plate(plate: str) -> dict[str, Any]:
    """
    High-level resolver. Returns dict with:
    - vehicle: {category, fuel_type, model}
    - resolution: full metadata
    - error: None or error message

    Never raises; caller always gets a structured response.
    """
    try:
        result = await lookup_vehicle(plate)
    except Exception as e:
        logger.error("Vehicle lookup failed for %s: %s", plate, e)
        return {
            "vehicle": None,
            "resolution": {
                "plate": _normalise_plate(plate),
                "source": "brasil.io/DENATRAN",
                "confidence": "failed",
            },
            "error": f"Lookup falhou: {type(e).__name__}. Informe category e fuel_type manualmente.",
        }

    if result is None:
        return {
            "vehicle": None,
            "resolution": {
                "plate": _normalise_plate(plate),
                "source": "brasil.io/DENATRAN",
                "confidence": "not_found",
            },
            "error": "Placa não encontrada na base DENATRAN. Informe category e fuel_type manualmente.",
        }

    return {
        "vehicle": result.to_vehicle_dict(),
        "resolution": result.to_dict(),
        "error": None,
    }
