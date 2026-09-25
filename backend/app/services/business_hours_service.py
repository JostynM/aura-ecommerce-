from datetime import (
    datetime,
    timedelta,
    timezone,
)

from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.business_hour import BusinessHour


# ==========================================
# ZONA HORARIA DE LA TIENDA
# ==========================================

LIMA_TIMEZONE = ZoneInfo(
    "America/Lima"
)


# ==========================================
# CALCULAR PRÓXIMO HORARIO DE PROCESAMIENTO
# ==========================================

def calculate_scheduled_processing_at(
    db: Session,
    reference_datetime: datetime | None = None,
) -> datetime:

    # ======================================
    # 1. TOMAR FECHA/HORA ACTUAL
    # ======================================

    if reference_datetime is None:

        reference_datetime = (
            datetime.now(timezone.utc)
        )


    # Por seguridad, si llega una fecha sin
    # zona horaria asumimos UTC.

    if reference_datetime.tzinfo is None:

        reference_datetime = (
            reference_datetime.replace(
                tzinfo=timezone.utc
            )
        )


    # ======================================
    # 2. CONVERTIR A HORA DE PERÚ
    # ======================================

    local_datetime = (
        reference_datetime.astimezone(
            LIMA_TIMEZONE
        )
    )


    # ======================================
    # 3. CARGAR HORARIOS DE LA TIENDA
    # ======================================

    business_hours = db.scalars(
        select(BusinessHour)
    ).all()


    hours_by_day = {

        business_hour.day_of_week:
            business_hour

        for business_hour
        in business_hours
    }


    # ======================================
    # 4. BUSCAR PRÓXIMO HORARIO DISPONIBLE
    # ======================================
    #
    # Revisamos hoy + los próximos 7 días.
    #
    # Esto permite encontrar incluso el
    # mismo día de la siguiente semana.
    # ======================================

    for days_ahead in range(8):

        target_date = (
            local_datetime.date()
            + timedelta(
                days=days_ahead
            )
        )


        weekday = (
            target_date.weekday()
        )


        business_hour = (
            hours_by_day.get(
                weekday
            )
        )


        # Si el día no existe en configuración
        # o está cerrado, seguimos buscando.

        if (
            not business_hour
            or not business_hour.is_open
            or business_hour.open_time is None
            or business_hour.close_time is None
        ):

            continue


        # ==================================
        # HORA DE APERTURA
        # ==================================

        opening_datetime = datetime.combine(
            target_date,
            business_hour.open_time,
            tzinfo=LIMA_TIMEZONE,
        )


        # ==================================
        # HORA DE CIERRE
        # ==================================

        closing_datetime = datetime.combine(
            target_date,
            business_hour.close_time,
            tzinfo=LIMA_TIMEZONE,
        )


        # ==================================
        # SI ES HOY
        # ==================================

        if days_ahead == 0:

            # Antes de abrir:
            # se programa para la apertura.

            if local_datetime < opening_datetime:

                return (
                    opening_datetime.astimezone(
                        timezone.utc
                    )
                )


            # Dentro del horario:
            # puede procesarse inmediatamente.

            if (
                opening_datetime
                <= local_datetime
                < closing_datetime
            ):

                return (
                    local_datetime.astimezone(
                        timezone.utc
                    )
                )


            # Si ya cerró, continuamos
            # buscando el siguiente día.

            continue


        # ==================================
        # DÍA FUTURO ABIERTO
        # ==================================

        return (
            opening_datetime.astimezone(
                timezone.utc
            )
        )


    # ======================================
    # 5. SIN HORARIO DISPONIBLE
    # ======================================

    raise ValueError(
        "No hay ningún horario de atención "
        "disponible configurado."
    )