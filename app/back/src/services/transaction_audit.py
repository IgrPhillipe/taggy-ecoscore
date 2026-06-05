"""Reconstrói contexto de auditoria a partir de uma transação persistida."""

from __future__ import annotations

from typing import Any

from src.models.transaction import Transaction


def reconstruct_transaction_audit_context(
    txn: Transaction,
    *,
    plate_fallback: str = "DEMO0001",
    elapsed_time_fallback: int = 30,
    context_fallback: str = "pedagio",
    uf_fallback: str = "SP",
    is_digital_fallback: bool = True,
) -> tuple[dict[str, Any], dict[str, Any], dict[str, Any], dict[str, Any]]:
    snap = txn.parameters_snapshot or {}
    snap_result = snap.get("result") or snap

    specs = {
        "emission_factors": snap.get("emission_factors", {}),
        "ch4_factors": snap.get("ch4_factors", {}),
        "n2o_factors": snap.get("n2o_factors", {}),
        "gwp100": snap.get("gwp100", {}),
        "blend": snap.get("blend", {}),
        "sources": snap.get("sources", {}),
        "idle_rates": snap.get("idle_rates", {}),
        "baselines": snap.get("baselines", {}),
        "paper_impact": snap.get("paper_impact", {}),
        "accel_surge": snap.get("accel_surge", {}),
        "fuel_prices_by_uf": snap.get("fuel_prices_by_uf", {}),
        "ludic_factors": snap.get("ludic_factors", {}),
        "ludic_metaphor_units": snap.get("ludic_metaphor_units", {}),
    }

    snap_payload = snap.get("payload") or {}
    vehicle_snap = (
        snap.get("vehicle_resolution", {}).get("vehicle")
        or snap_payload.get("vehicle")
        or {}
    )
    if not vehicle_snap:
        vehicle_snap = {"category": "leve", "fuel_type": "gasolina_c", "model": ""}

    pricing_snap = snap.get("pricing_snapshot") or (snap_result.get("metadata") or {}).get(
        "pricing_snapshot"
    ) or {}

    eff_plate = (snap_payload.get("plate") or txn.plate or plate_fallback).upper()
    eff_elapsed = snap_payload.get("elapsed_time", txn.elapsed_time_sec or elapsed_time_fallback)
    eff_context = snap_payload.get("context", txn.context or context_fallback)
    eff_uf = (
        snap_payload.get("uf_passagem")
        or snap_payload.get("uf")
        or txn.uf
        or uf_fallback
    ).upper()
    eff_digital = snap_payload.get(
        "is_digital",
        txn.is_digital if txn.is_digital is not None else is_digital_fallback,
    )

    result = snap_result
    params = {
        "plate": eff_plate,
        "elapsed_time": eff_elapsed,
        "context": eff_context,
        "uf": eff_uf,
        "is_digital": eff_digital,
        "fuel_price_brl_per_unit": pricing_snap.get("fuel_price_brl_per_unit", 0.0),
        "fuel_price_unit": pricing_snap.get("fuel_unit", "L"),
        "fuel_price_source": pricing_snap.get("price_source", "ANP"),
        "fuel_price_uf": pricing_snap.get("uf_applied", eff_uf),
    }
    return result, specs, vehicle_snap, params
