from __future__ import annotations

from typing import Any, Dict, List, Optional

from src.engine.exceptions import CalcEngineError

# Fuel types that consume in m³ (not liters)
_GAS_FUELS = {"gnv"}
# Fuel types that consume in kWh (Scope 2 only)
_ELECTRIC_FUELS = {"eletrico"}



class CalcEngine:
    def __init__(self, technical_specs: Dict[str, Any]):
        self.specs = technical_specs

    # ── Unit helpers ──────────────────────────────────────────────────────────

    def fuel_unit(self, fuel_type: str) -> str:
        if fuel_type in _GAS_FUELS:
            return "m3"
        if fuel_type in _ELECTRIC_FUELS:
            return "kWh"
        return "L"

    # ── CO₂e calculation (replaces calculate_emissions_from_fuel) ─────────────

    def calculate_co2e_from_fuel(self, amount: float, fuel_type: str) -> Dict[str, float]:
        """
        Returns CO₂e breakdown for a given fuel amount.

        For electric vehicles: Scope 2 only (grid factor).
        For ethanol: CO₂ is biogenic (not Scope 1); only CH4+N2O contribute to Scope 1.
        For all others: CO₂ fossil (Scope 1) + CH4 CO₂e + N2O CO₂e.
        """
        if fuel_type in _ELECTRIC_FUELS:
            grid = float(self.specs["emission_factors"].get("eletrico_kwh", 0.0))
            co2_scope2 = amount * grid
            return {
                "co2_fossil_kg": 0.0,
                "co2_biogenic_kg": 0.0,
                "ch4_kg_co2e": 0.0,
                "n2o_kg_co2e": 0.0,
                "co2e_scope1_kg": 0.0,
                "co2e_scope2_kg": round(co2_scope2, 6),
                "co2e_total_kg": round(co2_scope2, 6),
            }

        ef = self.specs["emission_factors"]
        if fuel_type not in ef:
            raise CalcEngineError(f"emission_factors sem tipo de combustível: {fuel_type!r}.")

        ch4_factors = self.specs.get("ch4_factors", {})
        n2o_factors = self.specs.get("n2o_factors", {})
        gwp = self.specs.get("gwp100", {"ch4": 27.9, "n2o": 273.0})

        if fuel_type == "etanol":
            # Etanol: CO₂ é biogênico — não entra no Escopo 1 (GHG Protocol Brasil)
            co2_fossil = 0.0
            co2_biogenic = amount * float(ef["etanol"])
        else:
            co2_fossil = amount * float(ef[fuel_type])
            co2_biogenic = 0.0

        ch4_kg = amount * float(ch4_factors.get(fuel_type, 0.0))
        n2o_kg = amount * float(n2o_factors.get(fuel_type, 0.0))
        ch4_co2e = ch4_kg * float(gwp["ch4"])
        n2o_co2e = n2o_kg * float(gwp["n2o"])

        co2e_scope1 = co2_fossil + ch4_co2e + n2o_co2e

        return {
            "co2_fossil_kg": round(co2_fossil, 6),
            "co2_biogenic_kg": round(co2_biogenic, 6),
            "ch4_kg_co2e": round(ch4_co2e, 6),
            "n2o_kg_co2e": round(n2o_co2e, 6),
            "co2e_scope1_kg": round(co2e_scope1, 6),
            "co2e_scope2_kg": 0.0,
            "co2e_total_kg": round(co2e_scope1, 6),
        }

    def calculate_emissions_from_fuel(self, liters: float, fuel_type: str) -> float:
        """Backward-compat shim → returns total CO₂e (scope1+scope2)."""
        return self.calculate_co2e_from_fuel(liters, fuel_type)["co2e_total_kg"]

    # ── Idle fuel ──────────────────────────────────────────────────────────────

    def _accel_surge_fuel(self, category: str, fuel_type: str) -> float:
        """Extra fuel (liters) from braking+acceleration cycle at manual toll/parking.
        Only applies to combustion vehicles — EV and GNV return 0."""
        if fuel_type in _GAS_FUELS or fuel_type in _ELECTRIC_FUELS:
            return 0.0
        surge = self.specs.get("accel_surge", {})
        if category not in surge:
            return 0.0
        return float(surge[category])

    def calculate_avoided_idle_fuel(self, time_saved_sec: int, category: str, fuel_type: str) -> float:
        """
        Returns fuel amount saved from not idling (L, m³, or kWh depending on fuel_type).
        Idle rate is per-second; category drives the rate for combustion vehicles.
        GNV uses its own idle rate; electric uses its own kWh rate.
        """
        rates = self.specs["idle_rates"]

        if fuel_type in _GAS_FUELS:
            rate_key = "gnv"
        elif fuel_type in _ELECTRIC_FUELS:
            rate_key = "eletrico"
        else:
            if category not in rates:
                raise CalcEngineError(f"idle_rates sem categoria: {category!r}.")
            return time_saved_sec * float(rates[category])

        if rate_key not in rates:
            raise CalcEngineError(f"idle_rates sem chave: {rate_key!r}.")
        return time_saved_sec * float(rates[rate_key])

    # ── Paper/water savings ────────────────────────────────────────────────────

    def calculate_paper_and_water_savings(self, is_digital: bool, context: str = "estacionamento") -> Dict[str, float]:
        # Paper tickets only exist at estacionamento — pedagio has no physical ticket
        if not is_digital or context != "estacionamento":
            return {"co2": 0.0, "water": 0.0, "paper_tickets": 0.0}
        pi = self.specs["paper_impact"]
        return {
            "co2": float(pi["co2_per_ticket"]),
            "water": float(pi["water_per_ticket"]),
            "paper_tickets": 1.0,
        }

    # ── Financial savings ──────────────────────────────────────────────────────

    def resolve_fuel_price_brl_per_liter(
        self, uf_passagem: str, fuel_type: str
    ) -> tuple[float, str]:
        by_uf: Dict[str, Any] = self.specs["fuel_prices_by_uf"]
        uf = (uf_passagem or "").strip().upper()
        if len(uf) != 2:
            raise CalcEngineError(
                f"uf_passagem inválida (esperada sigla de 2 letras): {uf_passagem!r}."
            )
        row = by_uf.get(uf)
        if not isinstance(row, dict):
            # Fallback: média nacional (média simples das UFs disponíveis)
            available = [v for v in by_uf.values() if isinstance(v, dict)]
            if not available:
                raise CalcEngineError(f"Sem preços de combustível para a UF {uf} e sem fallback nacional.")
            row = {k: sum(r[k] for r in available if k in r) / len(available) for k in available[0]}
            uf = "NACIONAL"
        if fuel_type not in row:
            # EV and GNV may not have price data; return 0 gracefully
            if fuel_type in _ELECTRIC_FUELS or fuel_type in _GAS_FUELS:
                return 0.0, uf
            raise CalcEngineError(
                f"Sem preço para combustível {fuel_type!r} na UF {uf}."
            )
        price = float(row[fuel_type])
        if price < 0:
            raise CalcEngineError(
                f"Preço inválido (< 0) para {fuel_type} na UF {uf}."
            )
        return price, uf

    def calculate_financial_savings(
        self,
        idle_fuel_amount: float,
        fuel_type: str,
        category: str,
        fuel_price_brl_per_unit: float,
    ) -> Dict[str, Any]:
        fuel_savings_brl = round(idle_fuel_amount * fuel_price_brl_per_unit, 2)
        return {
            "fuel_savings_brl": fuel_savings_brl,
            "total_savings_brl": fuel_savings_brl,
        }

    # ── Comparison (scenario with/without tag) ────────────────────────────────

    def build_comparison(
        self,
        baseline_time_sec: int,
        real_time_sec: int,
        vehicle_data: Dict[str, Any],
        is_digital: bool,
        fuel_price_brl_per_unit: float,
        context: str = "estacionamento",
    ) -> Dict[str, Any]:
        cat = vehicle_data["category"]
        fuel_type = vehicle_data["fuel_type"]
        rates = self.specs["idle_rates"]

        def _get_rate() -> float:
            if fuel_type in _GAS_FUELS:
                return float(rates.get("gnv", 0.0))
            if fuel_type in _ELECTRIC_FUELS:
                return float(rates.get("eletrico", 0.0))
            if cat not in rates:
                raise CalcEngineError(f"idle_rates sem categoria: {cat!r}.")
            return float(rates[cat])

        rate = _get_rate()
        accel_surge = self._accel_surge_fuel(cat, fuel_type)
        without_fuel = baseline_time_sec * rate + accel_surge
        with_fuel = max(0, real_time_sec) * rate

        paper_without = self.calculate_paper_and_water_savings(is_digital=False, context=context)
        paper_with = self.calculate_paper_and_water_savings(is_digital=is_digital, context=context)

        co2e_without = self.calculate_co2e_from_fuel(without_fuel, fuel_type)
        co2e_with = self.calculate_co2e_from_fuel(with_fuel, fuel_type)

        fin_without = self.calculate_financial_savings(without_fuel, fuel_type, cat, fuel_price_brl_per_unit)
        fin_with = self.calculate_financial_savings(with_fuel, fuel_type, cat, fuel_price_brl_per_unit)

        unit = self.fuel_unit(fuel_type)

        return {
            "without_tag": {
                "time_sec": baseline_time_sec,
                "fuel_amount": round(without_fuel, 4),
                "fuel_unit": unit,
                "fuel_liters": round(without_fuel, 4) if unit == "L" else 0.0,
                "co2e_scope1_kg": co2e_without["co2e_scope1_kg"],
                "co2_biogenic_kg": co2e_without["co2_biogenic_kg"],
                "co2e_scope2_kg": co2e_without["co2e_scope2_kg"],
                "water_liters": paper_without["water"],
                "estimated_brl": fin_without["total_savings_brl"],
            },
            "with_tag": {
                "time_sec": real_time_sec,
                "fuel_amount": round(with_fuel, 4),
                "fuel_unit": unit,
                "fuel_liters": round(with_fuel, 4) if unit == "L" else 0.0,
                "co2e_scope1_kg": co2e_with["co2e_scope1_kg"],
                "co2_biogenic_kg": co2e_with["co2_biogenic_kg"],
                "co2e_scope2_kg": co2e_with["co2e_scope2_kg"],
                "water_liters": paper_with["water"],
                "estimated_brl": fin_with["total_savings_brl"],
            },
            "delta": {
                "fuel_amount": round(without_fuel - with_fuel, 4),
                "fuel_unit": unit,
                "fuel_liters": round(without_fuel - with_fuel, 4) if unit == "L" else 0.0,
                "co2e_scope1_kg": round(
                    co2e_without["co2e_scope1_kg"] - co2e_with["co2e_scope1_kg"], 4
                ),
                "co2_biogenic_kg": round(
                    co2e_without["co2_biogenic_kg"] - co2e_with["co2_biogenic_kg"], 4
                ),
                "water_liters": round(paper_with["water"] - paper_without["water"], 4),
                "estimated_brl": round(
                    fin_without["total_savings_brl"] - fin_with["total_savings_brl"], 2
                ),
            },
        }

    # ── Ludic metrics ──────────────────────────────────────────────────────────

    def get_ludic_metrics(self, total_co2_avoided: float) -> Dict[str, Any]:
        factors = self.specs["ludic_factors"]
        tree = float(factors["tree_year_absorption"])
        if tree <= 0:
            raise CalcEngineError("ludic_factors.tree_year_absorption deve ser > 0.")
        return {
            "trees_saved": round(total_co2_avoided / tree, 2),
            "smartphone_charges": int(total_co2_avoided * float(factors["phone_charge_factor"])),
            "coffee_filters": int(total_co2_avoided * float(factors["coffee_factor"])),
        }

    def get_ludic_metrics_by_axis(
        self,
        total_co2_kg: float,
        water_liters: float,
        paper_tickets: float,
    ) -> Dict[str, List[Dict[str, Any]]]:
        raw = self.specs["ludic_metaphors"]
        out: Dict[str, List[Dict[str, Any]]] = {"carbon": [], "water": [], "paper": []}
        for m in raw["carbon"]:
            kg = float(m["kg_co2_per_unit"])
            out["carbon"].append({"id": m["id"], "label": m["label"], "value": round(total_co2_kg / kg, 4)})
        for m in raw["water"]:
            lu = float(m["liters_per_unit"])
            out["water"].append({"id": m["id"], "label": m["label"], "value": round(water_liters / lu, 4)})
        for m in raw["paper"]:
            tu = float(m["tickets_per_unit"])
            out["paper"].append({"id": m["id"], "label": m["label"], "value": round(paper_tickets / tu, 4)})
        return out

    # ── Payback ───────────────────────────────────────────────────────────────

    @staticmethod
    def calculate_payback_snapshot(
        accumulated_savings_brl: float,
        monthly_tag_fee_brl: float,
        billing_months: float,
    ) -> Dict[str, Any]:
        fees = monthly_tag_fee_brl * billing_months
        net = round(accumulated_savings_brl - fees, 2)
        return {
            "accumulated_savings_brl": round(accumulated_savings_brl, 2),
            "monthly_tag_fee_brl": monthly_tag_fee_brl,
            "billing_months": billing_months,
            "fees_total_brl": round(fees, 2),
            "net_brl": net,
            "status": "tag_paga" if net >= 0 else "em_payback",
        }

    # ── Sensitivity ───────────────────────────────────────────────────────────

    def calculate_sensitivity(
        self,
        real_time_sec: int,
        vehicle_data: Dict[str, Any],
        context: str,
        base_co2e_kg: float,
    ) -> Dict[str, Any]:
        """Returns sensitivity table varying key parameters ±50%."""
        baselines = self.specs["baselines"]
        baseline_base = int(baselines[context]["avg_wait_sec"])
        cat = vehicle_data["category"]
        fuel_type = vehicle_data["fuel_type"]
        rates = self.specs["idle_rates"]

        def _rate() -> float:
            if fuel_type in _GAS_FUELS:
                return float(rates.get("gnv", 0.0))
            if fuel_type in _ELECTRIC_FUELS:
                return float(rates.get("eletrico", 0.0))
            return float(rates.get(cat, 0.0))

        rate_base = _rate()

        def _co2e(baseline_s: int, rate: float) -> float:
            time_saved = max(0, baseline_s - real_time_sec)
            fuel = time_saved * rate
            return self.calculate_co2e_from_fuel(fuel, fuel_type)["co2e_total_kg"]

        def _variants(base_val: float, compute_fn):
            return {
                "base": round(base_val, 4),
                "low_50pct": round(compute_fn(base_val * 0.5), 4),
                "low_20pct": round(compute_fn(base_val * 0.8), 4),
                "high_20pct": round(compute_fn(base_val * 1.2), 4),
                "high_50pct": round(compute_fn(base_val * 1.5), 4),
            }

        return {
            "base_co2e_kg": round(base_co2e_kg, 4),
            "parameters": [
                {
                    "key": "baseline_wait_sec",
                    "label": "Tempo médio sem tag (s)",
                    "note": "Parâmetro de maior sensibilidade — premissa declarada sem fonte oficial",
                    **_variants(float(baseline_base), lambda v: _co2e(int(v), rate_base)),
                },
                {
                    "key": "idle_rate",
                    "label": f"Taxa idle {cat} (L ou m³/s)",
                    "note": "U.S. DOE Fact #861 (2015) — proxy",
                    **_variants(rate_base, lambda v: _co2e(baseline_base, v)),
                },
            ],
        }

    # ── Main transaction processor ─────────────────────────────────────────────

    def process_transaction(
        self,
        vehicle_data: Dict[str, Any],
        context: str,
        uf_passagem: str,
        *,
        is_digital: bool = True,
        payback: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        baselines = self.specs["baselines"]
        if context not in baselines:
            raise CalcEngineError(f"context desconhecido: {context!r}.")
        for key in ("category", "fuel_type"):
            if key not in vehicle_data:
                raise CalcEngineError(f"vehicle_data sem campo obrigatório: {key}.")

        fuel_type = vehicle_data["fuel_type"]
        category = vehicle_data["category"]
        baseline_time = int(baselines[context]["avg_wait_sec"])
        _fallback = {"pedagio": 15, "estacionamento": 30}
        real_time_sec = int(baselines[context].get("with_tag_avg_sec", _fallback.get(context, 15)))
        time_saved = max(0, baseline_time - real_time_sec)

        idle_fuel_saved = self.calculate_avoided_idle_fuel(time_saved, category, fuel_type)
        accel_fuel_saved = self._accel_surge_fuel(category, fuel_type)
        total_fuel_saved = idle_fuel_saved + accel_fuel_saved

        # CO₂e evitado (Escopo 1 + biogênico separado + Escopo 2 para EV)
        co2e = self.calculate_co2e_from_fuel(total_fuel_saved, fuel_type)

        # Papel/água — ticket físico só existe em estacionamento
        paper_water = self.calculate_paper_and_water_savings(is_digital, context)

        # CO₂e total evitado = emissão de combustível + emissão do ticket de papel
        total_co2e_avoided = co2e["co2e_total_kg"] + paper_water["co2"]

        # Preço do combustível para cálculo financeiro
        price_per_unit, uf_applied = self.resolve_fuel_price_brl_per_liter(uf_passagem, fuel_type)
        meta = self.specs["fuel_prices_meta"]
        pricing_snapshot = {
            "fuel_price_brl_per_unit": round(price_per_unit, 4),
            "fuel_unit": self.fuel_unit(fuel_type),
            "fuel_type_applied": fuel_type,
            "uf_applied": uf_applied,
            "currency": "BRL",
            "price_as_of": meta["as_of"],
            "price_source": meta["source"],
        }

        financial = self.calculate_financial_savings(
            total_fuel_saved, fuel_type, category, price_per_unit
        )

        comparison = self.build_comparison(
            baseline_time_sec=baseline_time,
            real_time_sec=real_time_sec,
            vehicle_data=vehicle_data,
            is_digital=is_digital,
            fuel_price_brl_per_unit=price_per_unit,
            context=context,
        )

        storytelling = {
            "legacy": self.get_ludic_metrics(total_co2e_avoided),
            "by_axis": self.get_ludic_metrics_by_axis(
                total_co2e_avoided,
                paper_water["water"],
                paper_water["paper_tickets"],
            ),
        }

        unit = self.fuel_unit(fuel_type)

        environmental = {
            # Backward-compat: total CO₂e avoided (combustion + paper)
            "co2_kg": round(total_co2e_avoided, 4),
            # Full CO₂e breakdown (combustion only — not paper)
            "co2_fossil_kg": round(co2e["co2_fossil_kg"], 4),
            "co2_biogenic_kg": round(co2e["co2_biogenic_kg"], 4),
            "ch4_kg_co2e": round(co2e["ch4_kg_co2e"], 4),
            "n2o_kg_co2e": round(co2e["n2o_kg_co2e"], 4),
            # Scope 1 = direct combustion CO₂e (excludes paper, which is upstream/Scope 3)
            "co2e_scope1_kg": round(co2e["co2e_scope1_kg"], 4),
            # Scope 2 = grid electricity (EV only)
            "co2e_scope2_kg": round(co2e["co2e_scope2_kg"], 4),
            # Paper ticket lifecycle CO₂ avoided (upstream/Scope 3 proxy)
            "paper_co2_avoided_kg": round(paper_water["co2"], 4),
            # Fuel
            "fuel_amount": round(total_fuel_saved, 4),
            "fuel_unit": unit,
            "fuel_liters": round(total_fuel_saved, 4) if unit == "L" else 0.0,
            # Paper/water
            "water_liters": paper_water["water"],
            "paper_tickets": paper_water["paper_tickets"],
        }

        sensitivity = self.calculate_sensitivity(
            real_time_sec=real_time_sec,
            vehicle_data=vehicle_data,
            context=context,
            base_co2e_kg=total_co2e_avoided,
        )

        payload: Dict[str, Any] = {
            "environmental": environmental,
            "financial": financial,
            "comparison": comparison,
            "storytelling": storytelling,
            "sensitivity": sensitivity,
            "metadata": {
                "time_saved_sec": time_saved,
                "baseline_wait_sec": baseline_time,
                "context": context,
                "is_digital": is_digital,
                "uf_passagem": (uf_passagem or "").strip().upper(),
                "pricing_snapshot": pricing_snapshot,
            },
        }

        if payback is not None:
            required = ("accumulated_savings_brl", "monthly_tag_fee_brl", "billing_months")
            for k in required:
                if k not in payback:
                    raise CalcEngineError(f"payback em falta: campo obrigatório {k!r}.")
            payload["payback"] = self.calculate_payback_snapshot(
                float(payback["accumulated_savings_brl"]),
                float(payback["monthly_tag_fee_brl"]),
                float(payback["billing_months"]),
            )

        return payload

    # ── Legacy convert helpers (backward compat) ──────────────────────────────

    def convert_to_co2(self, value: float, unit: str) -> float:
        if unit == "water_liters":
            wpt = float(self.specs["paper_impact"]["water_per_ticket"])
            if wpt == 0:
                raise CalcEngineError("paper_impact.water_per_ticket não pode ser zero.")
            tickets = value / wpt
            return tickets * float(self.specs["paper_impact"]["co2_per_ticket"])
        if unit == "paper_tickets":
            return value * float(self.specs["paper_impact"]["co2_per_ticket"])
        if unit.startswith("fuel_liters_"):
            fuel_type = unit.replace("fuel_liters_", "")
            return self.calculate_emissions_from_fuel(value, fuel_type)
        raise CalcEngineError(f"Unidade desconhecida para convert_to_co2: {unit!r}.")

    def convert_from_co2(self, co2_kg: float, target_unit: str) -> float:
        bench = self.specs["benchmarks"]
        factors = self.specs["ludic_factors"]
        cpt = float(self.specs["paper_impact"]["co2_per_ticket"])
        wpt = float(self.specs["paper_impact"]["water_per_ticket"])
        mapping: Dict[str, float] = {
            "trees": co2_kg / float(factors["tree_year_absorption"]),
            "water": (co2_kg / cpt) * wpt,
            "smartphone": co2_kg * float(factors["phone_charge_factor"]),
            "km_driven": co2_kg / float(bench["kg_co2_per_km_car"]),
            "burgers": co2_kg / float(bench["kg_co2_per_burger"]),
        }
        if target_unit not in mapping:
            raise CalcEngineError(
                f"Unidade destino desconhecida para convert_from_co2: {target_unit!r}."
            )
        return mapping[target_unit]
