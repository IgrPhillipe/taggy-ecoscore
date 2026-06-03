"""
Constrói a planilha auditável de cálculo de emissões evitadas.
5 sheets: Premissas | Passo a passo | Comparação | Sensibilidade | Escala
"""

from __future__ import annotations

import io
from typing import Any, Dict

try:
    import openpyxl
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.worksheet import Worksheet
    _HAS_OPENPYXL = True
except ImportError:
    _HAS_OPENPYXL = False

# ── Palette ───────────────────────────────────────────────────────────────────
_C_HEADER_BG   = "1A3A4A"  # azul escuro
_C_HEADER_FG   = "FFFFFF"
_C_SUB_BG      = "2E6B8A"  # azul médio (sub-header)
_C_WARN_BG     = "FFF3CD"  # amarelo — parâmetro sem fonte oficial
_C_ALT_BG      = "F5F8FA"  # cinza claro — linhas alternadas
_C_TOTAL_BG    = "D4EDDA"  # verde claro — linha de total
_C_BORDER      = "CCCCCC"

_FONT_HEADER  = lambda: Font(bold=True, color=_C_HEADER_FG, name="Calibri", size=11)
_FONT_TITLE   = lambda: Font(bold=True, name="Calibri", size=14)
_FONT_SUBHDR  = lambda: Font(bold=True, color=_C_HEADER_FG, name="Calibri", size=10)
_FONT_BOLD    = lambda: Font(bold=True, name="Calibri", size=10)
_FONT_NORMAL  = lambda: Font(name="Calibri", size=10)
_FONT_SMALL   = lambda: Font(name="Calibri", size=9, color="555555")

_FILL_HEADER  = lambda: PatternFill("solid", fgColor=_C_HEADER_BG)
_FILL_SUB     = lambda: PatternFill("solid", fgColor=_C_SUB_BG)
_FILL_WARN    = lambda: PatternFill("solid", fgColor=_C_WARN_BG)
_FILL_ALT     = lambda: PatternFill("solid", fgColor=_C_ALT_BG)
_FILL_TOTAL   = lambda: PatternFill("solid", fgColor=_C_TOTAL_BG)

_THIN = lambda: Border(
    left=Side(style="thin", color=_C_BORDER),
    right=Side(style="thin", color=_C_BORDER),
    top=Side(style="thin", color=_C_BORDER),
    bottom=Side(style="thin", color=_C_BORDER),
)


def _h(ws: "Worksheet", row: int, col: int, value, *, bold=False, fill=None, number_format=None, wrap=False, size=10):
    cell = ws.cell(row=row, column=col, value=value)
    cell.font = Font(bold=bold, name="Calibri", size=size)
    cell.border = _THIN()
    if fill:
        cell.fill = fill
    if number_format:
        cell.number_format = number_format
    cell.alignment = Alignment(wrap_text=wrap, vertical="top")
    return cell


def _header_row(ws: "Worksheet", row: int, cols: list[str]):
    for i, v in enumerate(cols, 1):
        c = ws.cell(row=row, column=i, value=v)
        c.font = _FONT_HEADER()
        c.fill = _FILL_HEADER()
        c.border = _THIN()
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)


def _set_col_widths(ws: "Worksheet", widths: list[int]):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


# ── Sheet 1: Premissas ────────────────────────────────────────────────────────

_PREMISES: list[dict] = [
    # key, label, unit, source_key, warn
    ("emission_factor_gasolina_c_base", "Fator CO₂ gasolina A pura (base)", "kg CO₂/L", "emission_factors", False),
    ("blend_etanol_pct", "Blend etanol na gasolina C (E27)", "%", "blend_factors", False),
    ("emission_factor_gasolina_c_comercial", "Fator CO₂ gasolina C comercial (aplicado)", "kg CO₂/L", "emission_factors", False),
    ("ch4_factor_gasolina_c", "Fator CH4 gasolina C", "kg CH4/L", "emission_factors", False),
    ("n2o_factor_gasolina_c", "Fator N2O gasolina C", "kg N2O/L", "emission_factors", False),
    ("emission_factor_diesel_s10_base", "Fator CO₂ diesel S10 puro (base)", "kg CO₂/L", "emission_factors", False),
    ("blend_biodiesel_pct", "Blend biodiesel no diesel S10 (B14)", "%", "blend_factors", False),
    ("emission_factor_diesel_s10_comercial", "Fator CO₂ diesel S10 comercial (aplicado)", "kg CO₂/L", "emission_factors", False),
    ("ch4_factor_diesel_s10", "Fator CH4 diesel S10", "kg CH4/L", "emission_factors", False),
    ("n2o_factor_diesel_s10", "Fator N2O diesel S10", "kg N2O/L", "emission_factors", False),
    ("emission_factor_etanol", "Fator CO₂ etanol (biogênico — não conta no Escopo 1)", "kg CO₂/L", "emission_factors", False),
    ("emission_factor_gnv", "Fator CO₂ GNV", "kg CO₂/m³", "emission_factors", False),
    ("emission_factor_eletrico_kwh", "Fator CO₂ rede SIN (veículo elétrico)", "kg CO₂/kWh", "emission_factors", False),
    ("gwp100_ch4", "GWP100 CH4 (IPCC AR6)", "—", "gwp100", False),
    ("gwp100_n2o", "GWP100 N2O (IPCC AR6)", "—", "gwp100", False),
    ("idle_rate_leve", "Taxa consumo idle leve", "L/s", "idle_rates", True),
    ("idle_rate_pesado", "Taxa consumo idle pesado", "L/s", "idle_rates", True),
    ("idle_rate_gnv", "Taxa consumo idle GNV", "m³/s", "idle_rates", True),
    ("idle_rate_eletrico", "Taxa consumo idle elétrico", "kWh/s", "idle_rates", True),
    ("baseline_pedagio_avg_wait_sec", "Tempo médio sem tag — pedágio", "s", None, True),
    ("baseline_estacionamento_avg_wait_sec", "Tempo médio sem tag — estacionamento", "s", None, True),
    ("paper_co2_per_ticket", "CO₂ por ticket de papel", "kg CO₂", "paper_impact", False),
    ("paper_water_per_ticket", "Água por ticket de papel", "L", "paper_impact", False),
]


def _build_premises_sheet(ws: "Worksheet", specs: Dict[str, Any]):
    ws.title = "1. Premissas"

    # Title
    ws.merge_cells("A1:G1")
    tc = ws["A1"]
    tc.value = "Premissas e Fontes do Cálculo de Emissões Evitadas"
    tc.font = _FONT_TITLE()
    tc.alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 30

    ws.merge_cells("A2:G2")
    nc = ws["A2"]
    nc.value = (
        "⚠️  Linhas em amarelo = parâmetro sem fonte pública oficial brasileira disponível (estimativa declarada). "
        "Ver seção 'Limitações' na página /metodologia."
    )
    nc.font = Font(name="Calibri", size=9, italic=True, color="7D6608")
    nc.fill = PatternFill("solid", fgColor="FFF9E6")
    nc.alignment = Alignment(wrap_text=True)
    ws.row_dimensions[2].height = 28

    _header_row(ws, 3, ["Parâmetro", "Descrição", "Valor", "Unidade", "Fonte", "Ano", "Notas"])

    ef = specs.get("emission_factors", {})
    ch4 = specs.get("ch4_factors", {})
    n2o = specs.get("n2o_factors", {})
    gwp = specs.get("gwp100", {})
    idle = specs.get("idle_rates", {})
    baselines = specs.get("baselines", {})
    paper = specs.get("paper_impact", {})
    blend = specs.get("blend", {})
    sources = specs.get("sources", {})

    def _src(source_key):
        if not source_key:
            return ("Premissa declarada — sem dado público disponível", "—")
        src_text = sources.get(source_key, "—")
        src_year = sources.get(f"{source_key}_year", "—")
        return (src_text, str(src_year))

    values_map = {
        "emission_factor_gasolina_c_base": (round(ef.get("gasolina_c", 0) / (1 - blend.get("etanol_pct", 0.27)), 4) if blend.get("etanol_pct", 0) < 1 else ef.get("gasolina_c", 0), "emission_factors"),
        "blend_etanol_pct": (f"{int(blend.get('etanol_pct', 0.27) * 100)}%", "blend_factors"),
        "emission_factor_gasolina_c_comercial": (round(ef.get("gasolina_c", 0), 4), "emission_factors"),
        "ch4_factor_gasolina_c": (round(ch4.get("gasolina_c", 0), 8), "emission_factors"),
        "n2o_factor_gasolina_c": (round(n2o.get("gasolina_c", 0), 8), "emission_factors"),
        "emission_factor_diesel_s10_base": (round(ef.get("diesel_s10", 0) / (1 - blend.get("biodiesel_pct", 0.14)), 4) if blend.get("biodiesel_pct", 0) < 1 else ef.get("diesel_s10", 0), "emission_factors"),
        "blend_biodiesel_pct": (f"{int(blend.get('biodiesel_pct', 0.14) * 100)}%", "blend_factors"),
        "emission_factor_diesel_s10_comercial": (round(ef.get("diesel_s10", 0), 4), "emission_factors"),
        "ch4_factor_diesel_s10": (round(ch4.get("diesel_s10", 0), 8), "emission_factors"),
        "n2o_factor_diesel_s10": (round(n2o.get("diesel_s10", 0), 8), "emission_factors"),
        "emission_factor_etanol": (ef.get("etanol", 0), "emission_factors"),
        "emission_factor_gnv": (ef.get("gnv", 0), "emission_factors"),
        "emission_factor_eletrico_kwh": (ef.get("eletrico_kwh", 0), "emission_factors"),
        "gwp100_ch4": (gwp.get("ch4", 27.9), "gwp100"),
        "gwp100_n2o": (gwp.get("n2o", 273.0), "gwp100"),
        "idle_rate_leve": (idle.get("leve", 0), "idle_rates"),
        "idle_rate_pesado": (idle.get("pesado", 0), "idle_rates"),
        "idle_rate_gnv": (idle.get("gnv", 0), "idle_rates"),
        "idle_rate_eletrico": (idle.get("eletrico", 0), "idle_rates"),
        "baseline_pedagio_avg_wait_sec": (baselines.get("pedagio", {}).get("avg_wait_sec", 180), None),
        "baseline_estacionamento_avg_wait_sec": (baselines.get("estacionamento", {}).get("avg_wait_sec", 120), None),
        "paper_co2_per_ticket": (paper.get("co2_per_ticket", 0), "paper_impact"),
        "paper_water_per_ticket": (paper.get("water_per_ticket", 0), "paper_impact"),
    }

    notes_map = {
        "emission_factor_gasolina_c_base": "Gasolina A pura antes do blend E27",
        "emission_factor_gasolina_c_comercial": f"= base × (1 − {int(blend.get('etanol_pct',0.27)*100)}%) blend aplicado no cálculo",
        "emission_factor_diesel_s10_base": "Diesel puro antes do blend B14",
        "emission_factor_diesel_s10_comercial": f"= base × (1 − {int(blend.get('biodiesel_pct',0.14)*100)}%) blend aplicado no cálculo",
        "emission_factor_etanol": "CO₂ biogênico — reportado separado; não conta no Escopo 1",
        "idle_rate_leve": "Proxy U.S. DOE Fact #861 (2015) — sem dado CETESB/INMETRO público",
        "idle_rate_pesado": "Proxy U.S. DOE Fact #861 (2015) — sem dado CETESB/INMETRO público",
        "idle_rate_gnv": "Estimativa por conversão energética vs gasolina",
        "idle_rate_eletrico": "Estimativa — sem fonte disponível",
        "baseline_pedagio_avg_wait_sec": "Premissa: pagamento manual ~30-45s + fila estimada",
        "baseline_estacionamento_avg_wait_sec": "Premissa: emissão de ticket + cancela",
    }

    for row_i, (key, desc, unit, src_key, warn) in enumerate(_PREMISES, 4):
        val_info = values_map.get(key, (0, src_key))
        val = val_info if not isinstance(val_info, tuple) else val_info[0]
        src_text, src_year = _src(src_key)
        note = notes_map.get(key, "")
        fill = _FILL_WARN() if warn else (_FILL_ALT() if row_i % 2 == 0 else None)

        for col, v in enumerate([key, desc, val, unit, src_text, src_year, note], 1):
            c = ws.cell(row=row_i, column=col, value=v)
            c.font = Font(name="Calibri", size=10, bold=(col == 1))
            c.border = _THIN()
            c.alignment = Alignment(wrap_text=True, vertical="top")
            if fill:
                c.fill = fill

    _set_col_widths(ws, [32, 42, 12, 12, 48, 8, 48])
    ws.freeze_panes = "A4"


# ── Sheet 2: Passo a passo ────────────────────────────────────────────────────

def _build_steps_sheet(ws: "Worksheet", result: Dict[str, Any], vehicle: Dict[str, Any], params: Dict[str, Any], specs: Dict[str, Any]):
    ws.title = "2. Passo a Passo"

    env = result.get("environmental", {})
    meta = result.get("metadata", {})
    baselines = specs.get("baselines", {})
    idle = specs.get("idle_rates", {})
    ch4_factors = specs.get("ch4_factors", {})
    n2o_factors = specs.get("n2o_factors", {})
    gwp = specs.get("gwp100", {})
    ef = specs.get("emission_factors", {})

    fuel_type = vehicle.get("fuel_type", "gasolina_c")
    category = vehicle.get("category", "leve")
    context = params.get("context", "pedagio")
    baseline = baselines.get(context, {}).get("avg_wait_sec", 180)
    elapsed = params.get("elapsed_time", 0)
    time_saved = max(0, baseline - elapsed)

    if fuel_type in ("eletrico",):
        idle_rate = idle.get("eletrico", 0)
        fuel_unit = "kWh"
    elif fuel_type == "gnv":
        idle_rate = idle.get("gnv", 0)
        fuel_unit = "m³"
    elif category == "pesado":
        idle_rate = idle.get("pesado", 0)
        fuel_unit = "L"
    else:
        idle_rate = idle.get("leve", 0)
        fuel_unit = "L"

    fuel_saved = time_saved * idle_rate
    co2_fossil = env.get("co2_fossil_kg", 0)
    ch4_abs = fuel_saved * ch4_factors.get(fuel_type, 0)
    n2o_abs = fuel_saved * n2o_factors.get(fuel_type, 0)
    ch4_co2e = ch4_abs * gwp.get("ch4", 27.9)
    n2o_co2e = n2o_abs * gwp.get("n2o", 273.0)
    co2e_scope1 = env.get("co2e_scope1_kg", 0)
    paper_co2 = env.get("paper_co2_avoided_kg", 0)
    co2e_scope2 = env.get("co2e_scope2_kg", 0)
    total = env.get("co2_kg", 0)

    # Title
    ws.merge_cells("A1:F1")
    ws["A1"].value = "Passo a Passo do Cálculo — Emissões Evitadas por Passagem com Tag"
    ws["A1"].font = _FONT_TITLE()
    ws["A1"].alignment = Alignment(horizontal="left", vertical="center")
    ws.row_dimensions[1].height = 28

    # Vehicle info
    ws.merge_cells("A2:F2")
    ws["A2"].value = (
        f"Veículo: {vehicle.get('model') or 'N/A'} | "
        f"Combustível: {fuel_type} | Categoria: {category} | "
        f"Contexto: {context} | UF: {params.get('uf','?')} | "
        f"Passagem: {elapsed}s | Baseline: {baseline}s"
    )
    ws["A2"].font = _FONT_SMALL()
    ws.row_dimensions[2].height = 20

    _header_row(ws, 3, ["Passo", "Descrição", "Fórmula", "Inputs", "Resultado", "Unidade"])

    steps = [
        ("baseline_sem_tag", "Tempo médio sem usar tag", "parâmetro configurável", f"{baseline} s", baseline, "s"),
        ("tempo_com_tag", "Tempo real da passagem com tag (input)", "input do sistema", f"{elapsed} s", elapsed, "s"),
        ("tempo_salvo", "Tempo economizado", "baseline − tempo_com_tag", f"{baseline} − {elapsed}", time_saved, "s"),
        ("combustivel_evitado", f"Combustível não consumido", f"tempo_salvo × idle_rate_{category}", f"{time_saved} × {idle_rate:.6f}", round(fuel_saved, 6), fuel_unit),
        ("co2_fossil", "CO₂ fóssil evitado", f"combustivel × fator_co2_{fuel_type}", f"{round(fuel_saved,6)} × {round(ef.get(fuel_type,0),4)}", round(co2_fossil, 6), "kg CO₂"),
        ("ch4_absoluto", "CH4 evitado (massa)", f"combustivel × ch4_factor_{fuel_type}", f"{round(fuel_saved,6)} × {ch4_factors.get(fuel_type,0):.8f}", round(ch4_abs, 8), "kg CH4"),
        ("ch4_co2e", "CH4 convertido em CO₂e", f"ch4_absoluto × gwp100_ch4", f"{round(ch4_abs,8)} × {gwp.get('ch4',27.9)}", round(ch4_co2e, 6), "kg CO₂e"),
        ("n2o_absoluto", "N2O evitado (massa)", f"combustivel × n2o_factor_{fuel_type}", f"{round(fuel_saved,6)} × {n2o_factors.get(fuel_type,0):.8f}", round(n2o_abs, 8), "kg N2O"),
        ("n2o_co2e", "N2O convertido em CO₂e", f"n2o_absoluto × gwp100_n2o", f"{round(n2o_abs,8)} × {gwp.get('n2o',273.0)}", round(n2o_co2e, 6), "kg CO₂e"),
        ("co2e_scope1", "CO₂e Escopo 1 (combustão direta)", "co2_fossil + ch4_co2e + n2o_co2e", f"{round(co2_fossil,4)} + {round(ch4_co2e,4)} + {round(n2o_co2e,4)}", round(co2e_scope1, 6), "kg CO₂e"),
        ("co2e_scope2", "CO₂e Escopo 2 (rede elétrica, só EV)", "combustivel_kWh × fator_SIN", "—" if fuel_type != "eletrico" else f"{round(fuel_saved,4)} × {ef.get('eletrico_kwh',0)}", round(co2e_scope2, 6), "kg CO₂e"),
        ("paper_co2_avoided", "CO₂ ticket de papel evitado", "is_digital × co2_per_ticket", f"{'Sim' if params.get('is_digital',True) else 'Não'} × 0.012", round(paper_co2, 4), "kg CO₂"),
        ("TOTAL_EVITADO", "TOTAL CO₂e EVITADO", "co2e_scope1 + co2e_scope2 + paper", f"{round(co2e_scope1,4)} + {round(co2e_scope2,4)} + {round(paper_co2,4)}", round(total, 4), "kg CO₂e"),
    ]

    for row_i, (key, desc, formula, inputs, result_val, unit) in enumerate(steps, 4):
        is_total = key == "TOTAL_EVITADO"
        fill = _FILL_TOTAL() if is_total else (_FILL_ALT() if row_i % 2 == 0 else None)
        for col, v in enumerate([key, desc, formula, inputs, result_val, unit], 1):
            c = ws.cell(row=row_i, column=col, value=v)
            c.font = Font(name="Calibri", size=10, bold=is_total)
            c.border = _THIN()
            c.alignment = Alignment(wrap_text=True, vertical="top")
            if fill:
                c.fill = fill
            if col == 5 and isinstance(v, float):
                c.number_format = "0.000000"

    _set_col_widths(ws, [24, 40, 44, 36, 14, 12])
    ws.freeze_panes = "A4"


# ── Sheet 3: Comparação ───────────────────────────────────────────────────────

def _build_comparison_sheet(ws: "Worksheet", result: Dict[str, Any]):
    ws.title = "3. Comparação"
    comp = result.get("comparison", {})
    without = comp.get("without_tag", {})
    with_tag = comp.get("with_tag", {})
    delta = comp.get("delta", {})

    ws.merge_cells("A1:D1")
    ws["A1"].value = "Cenário Sem Tag vs. Com Tag — Comparação de Emissões"
    ws["A1"].font = _FONT_TITLE()
    ws["A1"].alignment = Alignment(horizontal="left")
    ws.row_dimensions[1].height = 28

    _header_row(ws, 2, ["Métrica", "Sem Tag", "Com Tag", "Evitado (delta)"])

    rows = [
        ("Tempo na passagem (s)", without.get("time_sec"), with_tag.get("time_sec"), without.get("time_sec", 0) - with_tag.get("time_sec", 0)),
        ("Combustível consumido", without.get("fuel_amount"), with_tag.get("fuel_amount"), delta.get("fuel_amount")),
        ("Unidade combustível", without.get("fuel_unit"), with_tag.get("fuel_unit"), "—"),
        ("CO₂e Escopo 1 (kg)", without.get("co2e_scope1_kg"), with_tag.get("co2e_scope1_kg"), delta.get("co2e_scope1_kg")),
        ("CO₂ biogênico (kg)", without.get("co2_biogenic_kg"), with_tag.get("co2_biogenic_kg"), delta.get("co2_biogenic_kg")),
        ("Água (L)", without.get("water_liters"), with_tag.get("water_liters"), delta.get("water_liters")),
        ("Economia financeira (R$)", without.get("estimated_brl"), with_tag.get("estimated_brl"), delta.get("estimated_brl")),
    ]

    for row_i, (label, v_without, v_with, v_delta) in enumerate(rows, 3):
        fill = _FILL_ALT() if row_i % 2 == 0 else None
        for col, v in enumerate([label, v_without, v_with, v_delta], 1):
            c = ws.cell(row=row_i, column=col, value=v)
            c.font = Font(name="Calibri", size=10, bold=(col == 1))
            c.border = _THIN()
            if fill:
                c.fill = fill
            if isinstance(v, float) and col > 1:
                c.number_format = "0.0000"

    _set_col_widths(ws, [32, 18, 18, 18])


# ── Sheet 4: Sensibilidade ────────────────────────────────────────────────────

def _build_sensitivity_sheet(ws: "Worksheet", result: Dict[str, Any]):
    ws.title = "4. Sensibilidade"
    sensitivity = result.get("sensitivity", {})
    base_co2e = sensitivity.get("base_co2e_kg", result.get("environmental", {}).get("co2_kg", 0))
    params = sensitivity.get("parameters", [])

    ws.merge_cells("A1:F1")
    ws["A1"].value = "Análise de Sensibilidade — Variação ±20% e ±50% nos Parâmetros Principais"
    ws["A1"].font = _FONT_TITLE()
    ws["A1"].alignment = Alignment(horizontal="left")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:F2")
    ws["A2"].value = f"CO₂e base: {base_co2e} kg | Parâmetros ⚠️ = premissa sem fonte pública oficial"
    ws["A2"].font = _FONT_SMALL()

    _header_row(ws, 3, ["Parâmetro", "Valor Base", "−50%", "−20%", "+20%", "+50%"])
    _header_row(ws, 4, ["", "(kg CO₂e)", "(kg CO₂e)", "(kg CO₂e)", "(kg CO₂e)", "(kg CO₂e)"])

    for row_i, p in enumerate(params, 5):
        warn = "⚠️ " if "premissa" in p.get("note", "").lower() or "proxy" in p.get("note", "").lower() else ""
        fill = _FILL_WARN() if warn else (_FILL_ALT() if row_i % 2 == 0 else None)
        vals = [
            f"{warn}{p.get('label', p.get('key', ''))}",
            p.get("base", 0),
            p.get("low_50pct", 0),
            p.get("low_20pct", 0),
            p.get("high_20pct", 0),
            p.get("high_50pct", 0),
        ]
        for col, v in enumerate(vals, 1):
            c = ws.cell(row=row_i, column=col, value=v)
            c.font = Font(name="Calibri", size=10, bold=(col == 1))
            c.border = _THIN()
            if fill:
                c.fill = fill
            if isinstance(v, float) and col > 1:
                c.number_format = "0.0000"

    # Note
    note_row = 5 + len(params) + 1
    ws.merge_cells(f"A{note_row}:F{note_row}")
    ws[f"A{note_row}"].value = (
        "Nota: 'baseline_wait_sec' (tempo médio sem tag) é o parâmetro de maior sensibilidade. "
        "Não existe dado público brasileiro para validação — ANTT/ABCR/CCR não publicam este dado. "
        "Recomenda-se medição de campo para inventários GHG formais."
    )
    ws[f"A{note_row}"].font = Font(name="Calibri", size=9, italic=True, color="7D6608")
    ws[f"A{note_row}"].fill = PatternFill("solid", fgColor="FFF9E6")
    ws[f"A{note_row}"].alignment = Alignment(wrap_text=True)
    ws.row_dimensions[note_row].height = 40

    _set_col_widths(ws, [44, 14, 14, 14, 14, 14])


# ── Sheet 5: Escala ───────────────────────────────────────────────────────────

def _build_scale_sheet(ws: "Worksheet", co2e_per_passage: float, fleet_size: int = 1):
    ws.title = "5. Escala"

    ws.merge_cells("A1:C1")
    ws["A1"].value = "Projeção de Escala — Emissões Evitadas por Período"
    ws["A1"].font = _FONT_TITLE()
    ws["A1"].alignment = Alignment(horizontal="left")
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:C2")
    ws["A2"].value = f"Base: {co2e_per_passage} kg CO₂e por passagem | Frota configurável: {fleet_size} veículo(s)"
    ws["A2"].font = _FONT_SMALL()

    _header_row(ws, 3, ["Escala", "Passagens", "CO₂e Evitado"])

    passages_per_day = 2  # conservador
    work_days_month = 20
    months = 12
    national_daily = 5_000_000  # estimativa ANP

    scenarios = [
        ("Por passagem", 1, co2e_per_passage, "kg"),
        (f"Diário (frota {fleet_size}v × {passages_per_day} passagens)", fleet_size * passages_per_day, fleet_size * passages_per_day * co2e_per_passage, "kg"),
        (f"Mensal ({work_days_month} dias úteis)", fleet_size * passages_per_day * work_days_month, fleet_size * passages_per_day * work_days_month * co2e_per_passage, "kg"),
        (f"Anual ({months} meses)", fleet_size * passages_per_day * work_days_month * months, fleet_size * passages_per_day * work_days_month * months * co2e_per_passage, "kg"),
        ("Nacional por dia (est. 5M passagens/dia)", national_daily, national_daily * co2e_per_passage / 1000, "ton"),
        ("Nacional por ano", national_daily * 365, national_daily * 365 * co2e_per_passage / 1000, "ton"),
    ]

    for row_i, (label, passagens, co2e, unit) in enumerate(scenarios, 4):
        is_national = "Nacional" in label
        fill = _FILL_TOTAL() if is_national else (_FILL_ALT() if row_i % 2 == 0 else None)
        for col, v in enumerate([label, passagens, f"{round(co2e, 2):,.2f} {unit}"], 1):
            c = ws.cell(row=row_i, column=col, value=v)
            c.font = Font(name="Calibri", size=10, bold=is_national)
            c.border = _THIN()
            if fill:
                c.fill = fill

    note_row = 4 + len(scenarios) + 1
    ws.merge_cells(f"A{note_row}:C{note_row}")
    ws[f"A{note_row}"].value = (
        "Nota: Volume nacional baseado em estimativa do fluxo diário de pedágios no Brasil. "
        "Dado real disponível via ANTT/ABCR mediante solicitação."
    )
    ws[f"A{note_row}"].font = Font(name="Calibri", size=9, italic=True)
    ws.row_dimensions[note_row].height = 32

    _set_col_widths(ws, [52, 20, 28])


# ── Public API ────────────────────────────────────────────────────────────────

def build_audit_workbook(
    result: Dict[str, Any],
    specs: Dict[str, Any],
    vehicle: Dict[str, Any],
    params: Dict[str, Any],
    fleet_size: int = 1,
) -> "io.BytesIO":
    if not _HAS_OPENPYXL:
        raise RuntimeError("openpyxl não está instalado. Execute: uv add openpyxl")

    wb = openpyxl.Workbook()
    sheets = wb.worksheets

    ws1 = wb.active
    _build_premises_sheet(ws1, specs)

    ws2 = wb.create_sheet()
    _build_steps_sheet(ws2, result, vehicle, params, specs)

    ws3 = wb.create_sheet()
    _build_comparison_sheet(ws3, result)

    ws4 = wb.create_sheet()
    _build_sensitivity_sheet(ws4, result)

    ws5 = wb.create_sheet()
    co2e = result.get("environmental", {}).get("co2_kg", 0)
    _build_scale_sheet(ws5, co2e, fleet_size)

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer
