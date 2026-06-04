"""
Resolução de placa → dados do veículo via apibrasil.io (DETRAN + FIPE).

Retorna category (leve/pesado) e fuel_type para uso no CalcEngine,
além de metadados FIPE e dados DETRAN para enriquecimento do cadastro.

Requer variável de ambiente APIBRASIL_TOKEN com o Bearer token.
Falha explicitamente se API indisponível — não assume valores.
"""

from __future__ import annotations

import logging
import os
import unicodedata
from typing import Any, Optional

import httpx

logger = logging.getLogger(__name__)

_APIBRASIL_URL = "https://gateway.apibrasil.io/api/v2/consulta/veiculos/credits"
_REQUEST_TIMEOUT = 15.0  # apibrasil pode ser lento


def _strip_accents(text: str) -> str:
    """Remove acentos para normalização de combustível."""
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def _normalise_fuel_key(raw: str) -> str:
    return _strip_accents(raw.upper().strip())


# Mapeamento combustivel apibrasil/DETRAN → fuel_type interno.
# Cobre todas variações documentadas e prováveis (DENATRAN não é consistente).
_FUEL_MAP: dict[str, str] = {
    # Gasolina
    "GASOLINA": "gasolina_c",
    "GASOLINA COMUM": "gasolina_c",
    "GASOLINA ADITIVADA": "gasolina_c",
    # Flex (gasolina/álcool) — default conservador: gasolina
    "GASOLINA/ALCOOL": "gasolina_c",
    "ALCOOL/GASOLINA": "gasolina_c",
    "FLEX": "gasolina_c",
    "FLEX FUEL": "gasolina_c",
    "BICOMBUSTIVEL": "gasolina_c",
    "BICOMBUSTIVEL (FLEX)": "gasolina_c",
    # Etanol puro
    "ALCOOL": "etanol",
    "ETANOL": "etanol",
    "ETANOL HIDRATADO": "etanol",
    # GNV
    "GNV": "gnv",
    "GAS NATURAL": "gnv",
    "GAS NATURAL VEICULAR": "gnv",
    "GNV/GASOLINA": "gnv",
    "GASOLINA/GNV": "gnv",
    "GLP": "gnv",           # Gás Liquefeito — aproximação
    "GAS LIQUEFEITO": "gnv",
    # Elétrico
    "ELETRICO": "eletrico",
    "ELETRICO/HIBRIDO": "eletrico",
    "HIBRIDO ELETRICO": "eletrico",
    "PLUG-IN HIBRIDO": "eletrico",
    "PLUG IN HIBRIDO": "eletrico",
    # Híbrido sem tomada — conservador: gasolina
    "HIBRIDO": "gasolina_c",
    "MICROHIBRIDO": "gasolina_c",
    # Diesel — sem ano ainda (será tratado por substring depois)
    # Não mapear aqui; _resolve_fuel detecta via "DIESEL" substring
}

# Mapeamento tipo_veiculo DETRAN → category interna
_CATEGORY_MAP: dict[str, str] = {
    "AUTOMOVEL": "leve",
    "CAMIONETA": "leve",
    "UTILITARIO": "leve",
    "CAMINHONETE": "leve",
    "MOTOCICLETA": "leve",
    "MOTONETA": "leve",
    "CICLOMOTOR": "leve",
    "TRICICLO": "leve",
    "QUADRICICLO": "leve",
    "CAMINHAO": "pesado",
    "CAMINHAO TRATOR": "pesado",
    "ONIBUS": "pesado",
    "MICROONIBUS": "pesado",
    "MICRO ONIBUS": "pesado",
    "TRATOR": "pesado",
    "REBOQUE": "pesado",
    "SEMIRREBOQUE": "pesado",
    "SEMI REBOQUE": "pesado",
    "CHASSI PLATAFORMA": "pesado",
}


def _normalise_plate(plate: str) -> str:
    return plate.strip().upper().replace("-", "").replace(" ", "")


def _find_principal(data_list: list[dict]) -> dict | None:
    """Retorna o item com principal=true, ou o primeiro item se nenhum marcado."""
    for item in data_list:
        if item.get("principal") is True:
            return item
    return data_list[0] if data_list else None


def _resolve_fuel(fuel_raw: str, year: Optional[int]) -> tuple[str, bool]:
    """Returns (fuel_type, is_flex)."""
    normalised = _normalise_fuel_key(fuel_raw)
    is_flex = any(k in normalised for k in ("FLEX", "ALCOOL", "BICOMBUSTIVEL"))

    # Diesel: distingue S10 (≥2013) de S500 (pré-2013) por substring
    if "DIESEL" in normalised:
        if year is not None and year < 2013:
            return "diesel_s500", False
        return "diesel_s10", False

    # Lookup exato primeiro
    if normalised in _FUEL_MAP:
        return _FUEL_MAP[normalised], is_flex

    # Fallback: substring match no mapa
    for key, ft in _FUEL_MAP.items():
        if key in normalised:
            return ft, is_flex

    logger.warning(
        "combustivel desconhecido da apibrasil: %r — usando gasolina_c como fallback", fuel_raw)
    return "gasolina_c", False


def _resolve_category(tipo_raw: str) -> str:
    normalised = _strip_accents(tipo_raw.upper().strip())
    for key, cat in _CATEGORY_MAP.items():
        if key in normalised:
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
        # Campos extras
        uf: Optional[str] = None,
        ano_fabricacao: Optional[int] = None,
        ano_modelo: Optional[int] = None,
        fipe_valor: Optional[float] = None,
        fipe_codigo: Optional[str] = None,
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
        self.uf = uf
        self.ano_fabricacao = ano_fabricacao
        self.ano_modelo = ano_modelo
        self.fipe_valor = fipe_valor
        self.fipe_codigo = fipe_codigo

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
            "uf": self.uf,
            "ano_fabricacao": self.ano_fabricacao,
            "ano_modelo": self.ano_modelo,
            "fipe_valor": self.fipe_valor,
            "fipe_codigo": self.fipe_codigo,
        }

    def to_vehicle_dict(self) -> dict[str, Any]:
        return {
            "category": self.category_resolved,
            "fuel_type": self.fuel_type_resolved,
            "model": self.model or "",
        }

    def to_vehicle_extra_dict(self) -> dict[str, Any]:
        """Campos extras para enriquecimento do cadastro de veículo."""
        return {
            "uf_emplacamento": self.uf,
            "ano_fabricacao": self.ano_fabricacao,
            "ano_modelo": self.ano_modelo,
            "fipe_valor": self.fipe_valor,
            "fipe_codigo": self.fipe_codigo,
        }


async def lookup_vehicle(plate: str) -> Optional[VehicleResolution]:
    """
    Consulta apibrasil.io (DETRAN + FIPE) pelo dados do veículo via placa.

    Returns VehicleResolution if found, None if not found or API returned error.
    Raises httpx.RequestError on connection failure (caller decides how to handle).
    Raises RuntimeError if APIBRASIL_TOKEN env var is not set.
    """
    token = os.environ.get("APIBRASIL_TOKEN")
    if not token:
        raise RuntimeError(
            "APIBRASIL_TOKEN não configurada. Defina a variável de ambiente.")

    normalised = _normalise_plate(plate)

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        try:
            resp = await client.post(
                _APIBRASIL_URL,
                json={"tipo": "fipe", "placa": normalised.lower(),
                      "homolog": True},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
        except httpx.HTTPStatusError as e:
            logger.warning("apibrasil.io returned %s for plate %s",
                           e.response.status_code, normalised)
            return None
        except httpx.RequestError as e:
            logger.warning(
                "apibrasil.io request failed for plate %s: %s", normalised, e)
            raise

    body = resp.json()

    # Verificar erro explícito da apibrasil
    if body.get("error") is True:
        logger.warning("apibrasil.io error for plate %s: %s",
                       normalised, body.get("message"))
        return None

    outer_data = body.get("data") or {}
    veiculo: dict = outer_data.get("veiculo") or {}
    fipe_list: list[dict] = outer_data.get("data") or []

    if not veiculo and not fipe_list:
        return None

    # --- Dados DETRAN (mais confiáveis para combustível e tipo) ---
    fuel_raw: str = veiculo.get("combustivel") or ""
    tipo_raw: str = veiculo.get("tipo_veiculo") or ""
    uf: str | None = veiculo.get("uf") or None

    # --- Dados FIPE (marca, modelo, ano, valor) ---
    principal = _find_principal(fipe_list)
    marca = (principal or {}).get("marca") or ""
    modelo_fipe = (principal or {}).get("modelo") or ""
    model = f"{marca} {modelo_fipe}".strip() or None

    ano_fabricacao: int | None = None
    ano_modelo: int | None = None
    fipe_valor: float | None = None
    fipe_codigo: str | None = None

    if principal:
        try:
            ano_fabricacao = int(str(principal.get("anoFabricacao") or "")[
                                 :4]) if principal.get("anoFabricacao") else None
        except (ValueError, TypeError):
            ano_fabricacao = None
        try:
            ano_modelo = int(str(principal.get("anoModelo") or "")[
                             :4]) if principal.get("anoModelo") else None
        except (ValueError, TypeError):
            ano_modelo = None
        fipe_raw_valor = principal.get("valor")
        try:
            fipe_valor = float(
                fipe_raw_valor) if fipe_raw_valor is not None else None
        except (ValueError, TypeError):
            fipe_valor = None
        fipe_codigo = principal.get("codigoFipe") or None

    year = ano_modelo or ano_fabricacao

    fuel_type, is_flex = _resolve_fuel(fuel_raw, year)
    category = _resolve_category(tipo_raw)

    confidence = "high" if fuel_raw and tipo_raw else "low"

    return VehicleResolution(
        plate=normalised,
        model=model,
        year=year,
        fuel_raw=fuel_raw or None,
        category_resolved=category,
        fuel_type_resolved=fuel_type,
        is_flex=is_flex,
        source="apibrasil.io",
        confidence=confidence,
        uf=uf,
        ano_fabricacao=ano_fabricacao,
        ano_modelo=ano_modelo,
        fipe_valor=fipe_valor,
        fipe_codigo=fipe_codigo,
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
                "source": "apibrasil.io",
                "confidence": "failed",
            },
            "error": f"Lookup falhou: {type(e).__name__}. Informe category e fuel_type manualmente.",
        }

    if result is None:
        return {
            "vehicle": None,
            "resolution": {
                "plate": _normalise_plate(plate),
                "source": "apibrasil.io",
                "confidence": "not_found",
            },
            "error": "Placa não encontrada na base apibrasil/DETRAN. Informe category e fuel_type manualmente.",
        }

    return {
        "vehicle": result.to_vehicle_dict(),
        "resolution": result.to_dict(),
        "extra": result.to_vehicle_extra_dict(),
        "error": None,
    }
