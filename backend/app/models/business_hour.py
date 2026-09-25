from datetime import time

from sqlalchemy import (
    Boolean,
    Integer,
    Time,
)

from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.database import Base


class BusinessHour(Base):
    __tablename__ = "business_hours"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    # 0 = lunes
    # 1 = martes
    # 2 = miércoles
    # 3 = jueves
    # 4 = viernes
    # 5 = sábado
    # 6 = domingo

    day_of_week: Mapped[int] = mapped_column(
        Integer,
        unique=True,
        nullable=False,
    )

    open_time: Mapped[time | None] = mapped_column(
        Time,
        nullable=True,
    )

    close_time: Mapped[time | None] = mapped_column(
        Time,
        nullable=True,
    )

    is_open: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )