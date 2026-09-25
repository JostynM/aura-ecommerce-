from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.address import Address
from app.models.user import User
from app.schemas.address import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
)


router = APIRouter(
    prefix="/addresses",
    tags=["Addresses"]
)


@router.get(
    "",
    response_model=list[AddressResponse]
)
def get_addresses(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    addresses = db.scalars(
        select(Address)
        .where(
            Address.user_id == current_user.id
        )
        .order_by(Address.id.desc())
    ).all()

    return addresses


@router.post(
    "",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED
)
def create_address(
    address_data: AddressCreate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    if address_data.is_default:
        db.execute(
            update(Address)
            .where(
                Address.user_id
                == current_user.id
            )
            .values(
                is_default=False
            )
        )

    new_address = Address(
        user_id=current_user.id,

        label=address_data.label.strip(),

        recipient_name=(
            address_data
            .recipient_name
            .strip()
        ),

        phone=address_data.phone.strip(),

        department=(
            address_data
            .department
            .strip()
        ),

        province=(
            address_data
            .province
            .strip()
        ),

        district=(
            address_data
            .district
            .strip()
        ),

        address_line=(
            address_data
            .address_line
            .strip()
        ),

        reference=(
            address_data.reference.strip()
            if address_data.reference
            else None
        ),

        is_default=address_data.is_default
    )

    db.add(new_address)
    db.commit()
    db.refresh(new_address)

    return new_address


@router.put(
    "/{address_id}",
    response_model=AddressResponse
)
def update_address(
    address_id: int,
    address_data: AddressUpdate,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    address = db.scalar(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == current_user.id
        )
    )

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada"
        )

    if address_data.is_default:
        db.execute(
            update(Address)
            .where(
                Address.user_id == current_user.id,
                Address.id != address_id
            )
            .values(
                is_default=False
            )
        )

    address.label = (
        address_data.label.strip()
    )

    address.recipient_name = (
        address_data
        .recipient_name
        .strip()
    )

    address.phone = (
        address_data.phone.strip()
    )

    address.department = (
        address_data
        .department
        .strip()
    )

    address.province = (
        address_data
        .province
        .strip()
    )

    address.district = (
        address_data
        .district
        .strip()
    )

    address.address_line = (
        address_data
        .address_line
        .strip()
    )

    address.reference = (
        address_data.reference.strip()
        if address_data.reference
        else None
    )

    address.is_default = (
        address_data.is_default
    )

    db.commit()
    db.refresh(address)

    return address


@router.delete(
    "/{address_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_address(
    address_id: int,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    address = db.scalar(
        select(Address).where(
            Address.id == address_id,
            Address.user_id == current_user.id
        )
    )

    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dirección no encontrada"
        )

    db.delete(address)
    db.commit()

    return None