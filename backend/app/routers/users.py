from fastapi import (
    APIRouter,
    Depends,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.orm import Session

from app.database import get_db

from app.dependencies.auth import (
    get_current_admin,
)

from app.models.order import Order
from app.models.user import User

from app.schemas.user import (
    AdminUserResponse,
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.get(
    "/admin/all",
    response_model=list[AdminUserResponse]
)
def get_admin_users(
    _current_admin: User = Depends(
        get_current_admin
    ),
    db: Session = Depends(get_db)
):
    results = db.execute(
        select(
            User,

            func.count(
                Order.id
            ).label(
                "order_count"
            )
        )
        .outerjoin(
            Order,
            Order.user_id == User.id
        )
        .where(
            User.role == "customer"
        )
        .group_by(
            User.id
        )
        .order_by(
            User.id.desc()
        )
    ).all()


    return [
        AdminUserResponse(
            id=user.id,

            first_name=user.first_name,

            last_name=user.last_name,

            email=user.email,

            email_verified=(
                user.email_verified
            ),

            is_active=(
                user.is_active
            ),

            role=user.role,

            created_at=(
                user.created_at
            ),

            order_count=(
                order_count
            ),
        )

        for user, order_count
        in results
    ]