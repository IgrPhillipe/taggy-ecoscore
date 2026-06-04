from typing import Literal

from sqlmodel import SQLModel


FuelType = Literal[
    "diesel_s10",
    "diesel_s500",
    "gasolina_c",
    "etanol",
    "gnv",
    "eletrico",
]

VehicleCategory = Literal["leve", "pesado"]


class VehicleIn(SQLModel):
    id_tag: str
    user_id: int
    organization_id: int | None = None
    fleet_id: int | None = None
    assigned_driver_id: int | None = None
    license_plate: str
    model: str
    fuel_type: FuelType
    category: VehicleCategory = "leve"
    average_autonomy_km: float | None = None
    uf_emplacamento: str | None = None
    ano_fabricacao: int | None = None
    ano_modelo: int | None = None
    fipe_valor: float | None = None
    fipe_codigo: str | None = None


class VehicleUpdate(SQLModel):
    id_tag: str | None = None
    user_id: int | None = None
    organization_id: int | None = None
    fleet_id: int | None = None
    assigned_driver_id: int | None = None
    license_plate: str | None = None
    model: str | None = None
    fuel_type: FuelType | None = None
    category: VehicleCategory | None = None
    average_autonomy_km: float | None = None
    uf_emplacamento: str | None = None
    ano_fabricacao: int | None = None
    ano_modelo: int | None = None
    fipe_valor: float | None = None
    fipe_codigo: str | None = None
