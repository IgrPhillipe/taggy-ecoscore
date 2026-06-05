"""Labels PT-BR e ordem de exibição das metáforas ludic (US02). Valores numéricos vêm do BD."""

from __future__ import annotations

# Ordem por eixo (≥3 entradas por eixo, alinhado a engine-calculo.md §4).
METAPHOR_IDS_ORDER: dict[str, tuple[str, ...]] = {
    "carbon": ("tree_year", "burger", "km_car"),
    "water": ("shower_8min", "drinking_day", "flush"),
    "paper": ("ream_a4", "notebook", "toilet_roll"),
}

METAPHOR_LABELS: dict[str, dict[str, str]] = {
    "carbon": {
        "tree_year": "Árvores (absorção ~1 ano)",
        "burger": "Hambúrgueres (pegada média)",
        "km_car": "Km carro médio (120 g/km)",
    },
    "water": {
        "shower_8min": "Chuveiros (~8 min)",
        "drinking_day": "Dias de consumo humano (2 L/dia)",
        "flush": "Descargas de vaso sanitário (~6 L)",
    },
    "paper": {
        "ream_a4": "Resmas A4 (~500 folhas)",
        "notebook": "Cadernos escolares (~50 folhas)",
        "toilet_roll": "Rolos de papel higiênico (~equivalente folhas)",
    },
}

# Fallback técnico se a BD não tiver chave (seed deve preencher; evita lista vazia).
DEFAULT_METAPHOR_UNITS: dict[str, dict[str, float]] = {
    "carbon": {"tree_year": 15.0, "burger": 2.5, "km_car": 0.12},
    "water": {"shower_8min": 60.0, "drinking_day": 2.0, "flush": 6.0},
    "paper": {"ream_a4": 500.0, "notebook": 50.0, "toilet_roll": 150.0},
}

# (descrição, url) — None para URL quando não há link público direto.
METAPHOR_SOURCES: dict[str, dict[str, tuple[str, str | None]]] = {
    "carbon": {
        "tree_year": (
            "IPCC SRCCL 2019 / SFB — absorção média árvore tropical brasileira ~15 kg CO₂/ano",
            "https://www.ipcc.ch/srccl/",
        ),
        "burger": (
            "Poore & Nemecek 2018, Science — pegada carbono média carne bovina ~2,5 kg CO₂e",
            "https://www.science.org/doi/10.1126/science.aaq0216",
        ),
        "km_car": (
            "CETESB Emissões Veiculares 2023 — frota leve brasileira ~120 g CO₂/km",
            "https://cetesb.sp.gov.br/veicular/relatorios-e-publicacoes/",
        ),
    },
    "water": {
        "shower_8min": (
            "SNIS 2022 / PNUMA — chuveiro elétrico médio BR ~60 L em 8 min",
            "https://snis.gov.br/",
        ),
        "drinking_day": (
            "OMS — recomendação mínima 2 L de água potável por pessoa por dia",
            "https://www.who.int/news-room/fact-sheets/detail/drinking-water",
        ),
        "flush": (
            "ABNT NBR 15097 / Procel — caixa acoplada padrão certificada 6 L/descarga",
            "https://www.abntcatalogo.com.br/",
        ),
    },
    "paper": {
        "ream_a4": (
            "ABNT — resma A4 padrão 500 folhas (75 g/m²)",
            None,
        ),
        "notebook": (
            "Padrão mercado BR — caderno universitário 50 folhas (1/10 de resma)",
            None,
        ),
        "toilet_roll": (
            "Estimativa por equivalência de massa de celulose — ~150 folhas por rolo",
            None,
        ),
    },
}
