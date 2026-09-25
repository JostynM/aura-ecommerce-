from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AddressCreate(BaseModel):
    label: str = Field(
        min_length=2,
        max_length=50
    )

    recipient_name: str = Field(
        min_length=2,
        max_length=200
    )

    phone: str = Field(
        min_length=9,
        max_length=20
    )

    department: str = Field(
        min_length=2,
        max_length=100
    )

    province: str = Field(
        min_length=2,
        max_length=100
    )

    district: str = Field(
        min_length=2,
        max_length=100
    )

    address_line: str = Field(
        min_length=5,
        max_length=255
    )

    reference: str | None = Field(
        default=None,
        max_length=255
    )

    is_default: bool = False

class AddressUpdate(AddressCreate):
    pass
class AddressResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int
    user_id: int

    label: str
    recipient_name: str
    phone: str

    department: str
    province: str
    district: str

    address_line: str
    reference: str | None

    is_default: bool

    created_at: datetime
    updated_at: datetime