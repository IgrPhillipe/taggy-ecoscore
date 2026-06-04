from datetime import datetime

from pydantic import ConfigDict
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class TaggyTollPlace(SQLModel, table=True):
    __tablename__ = "taggy_toll_places"

    model_config = ConfigDict(from_attributes=True)

    id: int | None = Field(default=None, primary_key=True)
    name: str
    plaza_short_name: str = Field(default="")
    company_short_name: str = Field(default="")
    vicinity: str = Field(default="")
    city: str = Field(default="")
    state: str = Field(default="")
    latitude: float
    longitude: float
    payment_by_plate: bool = Field(default=False)
    raw_json: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    synced_at: datetime = Field(default_factory=datetime.utcnow)


class TaggyParkingPlace(SQLModel, table=True):
    __tablename__ = "taggy_parking_places"

    model_config = ConfigDict(from_attributes=True)

    id: int | None = Field(default=None, primary_key=True)
    name: str
    plaza_short_name: str = Field(default="")
    company_short_name: str = Field(default="")
    vicinity: str = Field(default="")
    city: str = Field(default="")
    state: str = Field(default="")
    latitude: float
    longitude: float
    payment_by_plate: bool = Field(default=False)
    raw_json: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    synced_at: datetime = Field(default_factory=datetime.utcnow)
