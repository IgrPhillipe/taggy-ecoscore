"""Labels PT-BR e ordem de exibição das metáforas ludic (US02). Valores numéricos vêm do BD."""

from __future__ import annotations

# 1 entrada por eixo — metáforas com maior clareza e fonte científica robusta.
METAPHOR_IDS_ORDER: dict[str, tuple[str, ...]] = {
    "carbon": ("tree_year",),
    "water": ("shower_8min",),
    "paper": ("ream_a4",),
}

METAPHOR_LABELS: dict[str, dict[str, str]] = {
    "carbon": {
        "tree_year": "Árvores (absorção ~1 ano)",
    },
    "water": {
        "shower_8min": "Chuveiros (~8 min)",
    },
    "paper": {
        "ream_a4": "Resmas A4 (~500 folhas)",
    },
}

# Fallback técnico se a BD não tiver chave (seed deve preencher; evita lista vazia).
DEFAULT_METAPHOR_UNITS: dict[str, dict[str, float]] = {
    "carbon": {"tree_year": 15.0},
    "water": {"shower_8min": 60.0},
    "paper": {"ream_a4": 500.0},
}

# (descrição, url) — None para URL quando não há link público direto.
METAPHOR_SOURCES: dict[str, dict[str, tuple[str, str | None]]] = {
    "carbon": {
        "tree_year": (
            "IPCC SRCCL 2019 / SFB — absorção média árvore tropical brasileira ~15 kg CO₂/ano",
            "https://www.ipcc.ch/srccl/",
        ),
    },
    "water": {
        "shower_8min": (
            "SNIS 2022 / PNUMA — chuveiro elétrico médio BR ~60 L em 8 min",
            "https://snis.gov.br/",
        ),
    },
    "paper": {
        "ream_a4": (
            "ABNT — resma A4 padrão 500 folhas (75 g/m²)",
            None,
        ),
    },
}
