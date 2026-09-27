import os



from datetime import datetime, timedelta, timezone

from decimal import Decimal

from uuid import uuid4



from fastapi import (

    APIRouter,

    Depends,

    HTTPException,

    Query,

    status,

)



from sqlalchemy import (

    and_,

    case,

    func,

    or_,

    select,

)



from sqlalchemy.orm import Session



from app.database import get_db



from app.dependencies.auth import (

    get_current_admin,

    get_current_user,

)



from app.models.address import Address

from app.models.order import Order

from app.models.order_item import OrderItem

from app.models.product import Product

from app.models.user import User



from app.schemas.order import (

    AdminOrderStatsResponse,

    OrderCreate,

    OrderItemResponse,

    OrderResponse,

    OrderStatus,

    OrderStatusUpdate,

    PaginatedOrdersResponse,

    PaymentStatus,

)



from app.services.email_outbox_service import (
    enqueue_order_delivered_email,
    enqueue_order_shipped_email,
)
from app.services.stock_service import restore_order_stock





# =====================================================

# CONFIGURACIÓN

# =====================================================



FRONTEND_URL = os.getenv(

    "FRONTEND_URL",

    "http://localhost:5173",

).rstrip("/")





# =====================================================

# ROUTER

# =====================================================



router = APIRouter(

    prefix="/orders",

    tags=["Orders"],

)





# =====================================================

# OBTENER ITEMS DE VARIOS PEDIDOS

#

# Evita el problema N+1.

# =====================================================



def get_order_items_map(

    order_ids: list[int],

    db: Session,

) -> dict[int, list[OrderItem]]:



    if not order_ids:

        return {}



    items = db.scalars(

        select(OrderItem)

        .where(

            OrderItem.order_id.in_(order_ids)

        )

        .order_by(

            OrderItem.order_id.asc(),

            OrderItem.id.asc(),

        )

    ).all()



    items_by_order: dict[

        int,

        list[OrderItem],

    ] = {

        order_id: []

        for order_id in order_ids

    }



    for item in items:

        items_by_order.setdefault(

            item.order_id,

            [],

        ).append(item)



    return items_by_order





# =====================================================

# CONVERTIR ORDER → ORDER RESPONSE

#

# No ejecuta consultas SQL.

# =====================================================



def build_order_response(

    order: Order,

    items: list[OrderItem],

) -> OrderResponse:



    return OrderResponse(

        id=order.id,

        order_number=order.order_number,

        status=order.status,

        payment_status=order.payment_status,

        stock_status=order.stock_status,

        stock_reserved_until=order.stock_reserved_until,

        scheduled_processing_at=order.scheduled_processing_at,

        subtotal=order.subtotal,

        shipping_cost=order.shipping_cost,

        total=order.total,

        recipient_name=order.recipient_name,

        phone=order.phone,

        department=order.department,

        province=order.province,

        district=order.district,

        address_line=order.address_line,

        reference=order.reference,

        created_at=order.created_at,

        items=[

            OrderItemResponse.model_validate(item)

            for item in items

        ],

    )





# =====================================================

# CONVERTIR VARIOS PEDIDOS

# =====================================================



def build_order_responses(

    orders: list[Order],

    db: Session,

) -> list[OrderResponse]:



    if not orders:

        return []



    order_ids = [

        order.id

        for order in orders

    ]



    items_by_order = get_order_items_map(

        order_ids,

        db,

    )



    return [

        build_order_response(

            order,

            items_by_order.get(

                order.id,

                [],

            ),

        )

        for order in orders

    ]





# =====================================================

# CONSTRUIR RESPUESTA DE UN SOLO PEDIDO

# =====================================================



def build_single_order_response(

    order: Order,

    db: Session,

) -> OrderResponse:



    items_by_order = get_order_items_map(

        [order.id],

        db,

    )



    return build_order_response(

        order,

        items_by_order.get(

            order.id,

            [],

        ),

    )





# =====================================================

# CALCULAR TOTAL DE PÁGINAS

# =====================================================



def calculate_total_pages(

    total: int,

    page_size: int,

) -> int:



    if total == 0:

        return 0



    return (

        total

        + page_size

        - 1

    ) // page_size





# =====================================================

# CREAR PEDIDO

# CLIENTE

# =====================================================



@router.post(

    "",

    response_model=OrderResponse,

    status_code=status.HTTP_201_CREATED,

)

def create_order(

    order_data: OrderCreate,

    current_user: User = Depends(

        get_current_user

    ),

    db: Session = Depends(

        get_db

    ),

):



    try:

        # =============================================

        # 1. VERIFICAR DIRECCIÓN

        # =============================================



        address = db.scalar(

            select(Address)

            .where(

                Address.id

                == order_data.address_id,



                Address.user_id

                == current_user.id,

            )

        )



        if not address:

            raise HTTPException(

                status_code=(

                    status.HTTP_404_NOT_FOUND

                ),

                detail=(

                    "Dirección no encontrada."

                ),

            )



        # =============================================

        # 2. VERIFICAR PRODUCTOS

        # =============================================



        if not order_data.items:

            raise HTTPException(

                status_code=(

                    status.HTTP_400_BAD_REQUEST

                ),

                detail=(

                    "El pedido debe contener "

                    "al menos un producto."

                ),

            )



        # =============================================

        # 3. EVITAR PRODUCTOS DUPLICADOS

        # =============================================



        product_ids = [

            item.product_id

            for item in order_data.items

        ]



        if (

            len(product_ids)

            != len(set(product_ids))

        ):

            raise HTTPException(

                status_code=(

                    status.HTTP_400_BAD_REQUEST

                ),

                detail=(

                    "No puedes enviar el mismo "

                    "producto dos veces."

                ),

            )



        # =============================================

        # 4. BLOQUEAR PRODUCTOS

        #

        # Evita problemas cuando dos clientes

        # compran el mismo producto simultáneamente.

        # =============================================



        products = db.scalars(

            select(Product)

            .where(

                Product.id.in_(product_ids)

            )

            .order_by(

                Product.id.asc()

            )

            .with_for_update()

        ).all()



        products_by_id = {

            product.id: product

            for product in products

        }



        # =============================================

        # 5. VALIDAR PRODUCTOS

        # =============================================



        subtotal = Decimal("0.00")

        validated_items = []



        for item in order_data.items:



            product = products_by_id.get(

                item.product_id

            )



            if not product:

                raise HTTPException(

                    status_code=(

                        status.HTTP_404_NOT_FOUND

                    ),

                    detail=(

                        f"Producto "

                        f"{item.product_id} "

                        "no encontrado."

                    ),

                )



            if not product.is_active:

                raise HTTPException(

                    status_code=(

                        status.HTTP_400_BAD_REQUEST

                    ),

                    detail=(

                        f"{product.name} "

                        "no está disponible."

                    ),

                )



            if item.quantity <= 0:

                raise HTTPException(

                    status_code=(

                        status.HTTP_400_BAD_REQUEST

                    ),

                    detail=(

                        "La cantidad debe ser "

                        "mayor que cero."

                    ),

                )



            if (

                product.stock

                < item.quantity

            ):

                raise HTTPException(

                    status_code=(

                        status.HTTP_400_BAD_REQUEST

                    ),

                    detail=(

                        "Stock insuficiente para "

                        f"{product.name}."

                    ),

                )



            line_total = (

                product.price

                * item.quantity

            )



            subtotal += line_total



            validated_items.append({

                "product": product,

                "quantity": item.quantity,

                "line_total": line_total,

            })



        # =============================================

        # 6. CALCULAR ENVÍO

        # =============================================



        if subtotal >= Decimal("299.00"):

            shipping_cost = Decimal("0.00")

        else:

            shipping_cost = Decimal("10.00")



        total = (

            subtotal

            + shipping_cost

        )



        # =============================================

        # 7. GENERAR NÚMERO DE PEDIDO

        # =============================================



        order_number = (

            "AURA-"

            + uuid4().hex[:10].upper()

        )



        # =============================================

        # 8. CREAR PEDIDO

        # =============================================



        new_order = Order(

            order_number=order_number,

            user_id=current_user.id,

            address_id=address.id,

            status="pending",

            payment_status="pending",

            stock_status="reserved",



            stock_reserved_until=(

                datetime.now(

                    timezone.utc

                )

                + timedelta(

                    minutes=15

                )

            ),



            subtotal=subtotal,

            shipping_cost=shipping_cost,

            total=total,



            recipient_name=(

                address.recipient_name

            ),

            phone=address.phone,

            department=address.department,

            province=address.province,

            district=address.district,

            address_line=address.address_line,

            reference=address.reference,

        )



        db.add(new_order)



        # Obtener ID antes de crear OrderItem.

        db.flush()



        # =============================================

        # 9. CREAR ITEMS Y RESERVAR STOCK

        # =============================================



        for validated in validated_items:



            product = validated[

                "product"

            ]



            quantity = validated[

                "quantity"

            ]



            line_total = validated[

                "line_total"

            ]



            new_item = OrderItem(

                order_id=new_order.id,

                product_id=product.id,

                product_name=product.name,

                brand=product.brand,

                size_ml=product.size_ml,

                unit_price=product.price,

                quantity=quantity,

                line_total=line_total,

            )



            db.add(new_item)



            product.stock -= quantity



        # =============================================

        # 10. GUARDAR

        # =============================================



        db.commit()

        db.refresh(new_order)



        return build_single_order_response(

            new_order,

            db,

        )



    except HTTPException:

        db.rollback()

        raise



    except Exception as error:

        db.rollback()



        print(

            "ERROR CREANDO PEDIDO:",

            repr(error),

        )



        raise HTTPException(

            status_code=(

                status.HTTP_500_INTERNAL_SERVER_ERROR

            ),

            detail=(

                "No se pudo crear el pedido."

            ),

        ) from error





# =====================================================

# LISTAR MIS PEDIDOS

# CLIENTE

#

# /orders?page=1&page_size=10

# =====================================================



@router.get(

    "",

    response_model=PaginatedOrdersResponse,

)

def get_my_orders(

    page: int = Query(

        default=1,

        ge=1,

    ),

    page_size: int = Query(

        default=10,

        ge=1,

        le=50,

    ),

    current_user: User = Depends(

        get_current_user

    ),

    db: Session = Depends(

        get_db

    ),

):



    # =============================================

    # CONTAR PEDIDOS DEL USUARIO

    # =============================================



    total = db.scalar(

        select(

            func.count(

                Order.id

            )

        )

        .where(

            Order.user_id

            == current_user.id

        )

    ) or 0



    # =============================================

    # OFFSET

    # =============================================



    offset = (

        page - 1

    ) * page_size



    # =============================================

    # OBTENER PÁGINA

    # =============================================



    orders = db.scalars(

        select(Order)

        .where(

            Order.user_id

            == current_user.id

        )

        .order_by(

            Order.id.desc()

        )

        .offset(offset)

        .limit(page_size)

    ).all()



    # =============================================

    # CARGAR ITEMS SIN N+1

    # =============================================



    order_responses = (

        build_order_responses(

            list(orders),

            db,

        )

    )



    total_pages = (

        calculate_total_pages(

            total,

            page_size,

        )

    )



    return PaginatedOrdersResponse(

        items=order_responses,

        page=page,

        page_size=page_size,

        total=total,

        total_pages=total_pages,

    )





# =====================================================

# LISTAR TODOS LOS PEDIDOS

# ADMIN

#

# BÚSQUEDA + FILTROS + PAGINACIÓN

#

# Ejemplos:

#

# /orders/admin/all?page=1&page_size=20

# /orders/admin/all?search=AURA

# /orders/admin/all?status=pending

# /orders/admin/all?payment_status=paid

#

# IMPORTANTE:

# Esta ruta debe permanecer antes de:

#

# /admin/{order_id}

# =====================================================



@router.get(

    "/admin/all",

    response_model=PaginatedOrdersResponse,

)

def get_admin_orders(

    page: int = Query(

        default=1,

        ge=1,

    ),

    page_size: int = Query(

        default=20,

        ge=1,

        le=100,

    ),

    search: str | None = Query(

        default=None,

        max_length=100,

    ),

    order_status: OrderStatus | None = Query(

        default=None,

        alias="status",

    ),

    payment_status: PaymentStatus | None = Query(

        default=None,

    ),

    _current_admin: User = Depends(

        get_current_admin_viewer

    ),

    db: Session = Depends(

        get_db

    ),

):



    filters = []



    # ==========================================

    # BÚSQUEDA

    # ==========================================



    if search:

        clean_search = search.strip()



        if clean_search:

            search_pattern = (

                f"%{clean_search}%"

            )



            filters.append(

                or_(

                    Order.order_number.ilike(

                        search_pattern

                    ),

                    Order.recipient_name.ilike(

                        search_pattern

                    ),

                    Order.phone.ilike(

                        search_pattern

                    ),

                    Order.district.ilike(

                        search_pattern

                    ),

                )

            )



    # ==========================================

    # ESTADO DEL PEDIDO

    # ==========================================



    if order_status:

        filters.append(

            Order.status

            == order_status

        )



    # ==========================================

    # ESTADO DE PAGO

    # ==========================================



    if payment_status:

        filters.append(

            Order.payment_status

            == payment_status

        )



    # ==========================================

    # CONTAR RESULTADOS FILTRADOS

    # ==========================================



    count_query = select(

        func.count(

            Order.id

        )

    )



    if filters:

        count_query = (

            count_query.where(

                *filters

            )

        )



    total = (

        db.scalar(

            count_query

        )

        or 0

    )



    # ==========================================

    # OFFSET

    # ==========================================



    offset = (

        page - 1

    ) * page_size



    # ==========================================

    # CONSULTA PRINCIPAL

    # ==========================================



    orders_query = (

        select(Order)

        .order_by(

            Order.id.desc()

        )

    )



    if filters:

        orders_query = (

            orders_query.where(

                *filters

            )

        )



    orders_query = (

        orders_query

        .offset(offset)

        .limit(page_size)

    )



    orders = db.scalars(

        orders_query

    ).all()



    # ==========================================

    # ITEMS SIN N+1

    # ==========================================



    order_responses = (

        build_order_responses(

            list(orders),

            db,

        )

    )



    total_pages = (

        calculate_total_pages(

            total,

            page_size,

        )

    )



    return PaginatedOrdersResponse(

        items=order_responses,

        page=page,

        page_size=page_size,

        total=total,

        total_pages=total_pages,

    )





# =====================================================

# ESTADÍSTICAS DE PEDIDOS

# ADMIN

# =====================================================



@router.get(

    "/admin/stats",

    response_model=AdminOrderStatsResponse,

)

def get_admin_order_stats(

    _current_admin: User = Depends(

        get_current_admin_viewer

    ),

    db: Session = Depends(

        get_db

    ),

):



    stats = db.execute(

        select(

            func.count(

                Order.id

            ).label(

                "total_orders"

            ),



            func.coalesce(

                func.sum(

                    case(

                        (

                            Order.status

                            == "pending",

                            1,

                        ),

                        else_=0,

                    )

                ),

                0,

            ).label(

                "pending_orders"

            ),



            func.coalesce(

                func.sum(

                    case(

                        (

                            and_(

                                Order.payment_status

                                == "paid",



                                Order.status

                                != "cancelled",

                            ),

                            1,

                        ),

                        else_=0,

                    )

                ),

                0,

            ).label(

                "paid_orders"

            ),



            func.coalesce(

                func.sum(

                    case(

                        (

                            and_(

                                Order.payment_status

                                == "pending",



                                Order.status

                                != "cancelled",

                            ),

                            1,

                        ),

                        else_=0,

                    )

                ),

                0,

            ).label(

                "pending_payments"

            ),



            func.coalesce(

                func.sum(

                    case(

                        (

                            and_(

                                Order.payment_status

                                == "paid",



                                Order.status

                                != "cancelled",

                            ),

                            Order.total,

                        ),

                        else_=Decimal(

                            "0.00"

                        ),

                    )

                ),

                Decimal("0.00"),

            ).label(

                "paid_revenue"

            ),

        )

    ).mappings().one()



    return AdminOrderStatsResponse(

        total_orders=int(

            stats[

                "total_orders"

            ] or 0

        ),



        pending_orders=int(

            stats[

                "pending_orders"

            ] or 0

        ),



        paid_orders=int(

            stats[

                "paid_orders"

            ] or 0

        ),



        pending_payments=int(

            stats[

                "pending_payments"

            ] or 0

        ),



        paid_revenue=(

            stats[

                "paid_revenue"

            ]

            or Decimal("0.00")

        ),

    )





# =====================================================

# VER PEDIDO

# ADMIN

# =====================================================



@router.get(

    "/admin/{order_id}",

    response_model=OrderResponse,

)

def get_admin_order(

    order_id: int,

    _current_admin: User = Depends(

        get_current_admin_viewer

    ),

    db: Session = Depends(

        get_db

    ),

):



    order = db.scalar(

        select(Order)

        .where(

            Order.id == order_id

        )

    )



    if not order:

        raise HTTPException(

            status_code=(

                status.HTTP_404_NOT_FOUND

            ),

            detail=(

                "Pedido no encontrado."

            ),

        )



    return build_single_order_response(

        order,

        db,

    )





# =====================================================

# CAMBIAR ESTADO DEL PEDIDO

# ADMIN

# =====================================================



@router.patch(

    "/admin/{order_id}/status",

    response_model=OrderResponse,

)

def update_order_status(

    order_id: int,

    status_data: OrderStatusUpdate,

    _current_admin: User = Depends(

        get_current_admin

    ),

    db: Session = Depends(

        get_db

    ),

):



    try:

        # =============================================

        # 1. BUSCAR Y BLOQUEAR PEDIDO

        # =============================================



        order = db.scalar(

            select(Order)

            .where(

                Order.id == order_id

            )

            .with_for_update()

        )



        if not order:

            raise HTTPException(

                status_code=(

                    status.HTTP_404_NOT_FOUND

                ),

                detail=(

                    "Pedido no encontrado."

                ),

            )



        current_status = order.status

        new_status = status_data.status



        # =============================================

        # 2. SIN CAMBIO

        # =============================================



        if current_status == new_status:

            return build_single_order_response(

                order,

                db,

            )



        # =============================================

        # 3. ESTADOS PERMITIDOS

        # =============================================



        allowed_statuses = {

            "pending",

            "confirmed",

            "processing",

            "shipped",

            "delivered",

            "cancelled",

        }



        if new_status not in allowed_statuses:

            raise HTTPException(

                status_code=(

                    status.HTTP_400_BAD_REQUEST

                ),

                detail=(

                    "Estado de pedido "

                    "no válido."

                ),

            )



        # =============================================

        # 4. CANCELADO ES FINAL

        # =============================================



        if current_status == "cancelled":

            raise HTTPException(

                status_code=(

                    status.HTTP_409_CONFLICT

                ),

                detail=(

                    "Un pedido cancelado "

                    "no puede reabrirse."

                ),

            )



        # =============================================

        # 5. ENTREGADO ES FINAL

        # =============================================



        if current_status == "delivered":

            raise HTTPException(

                status_code=(

                    status.HTTP_409_CONFLICT

                ),

                detail=(

                    "Un pedido entregado "

                    "no puede cambiar de estado."

                ),

            )



        # =============================================

        # 6. TRANSICIONES PERMITIDAS

        # =============================================



        allowed_transitions = {

            "pending": {

                "confirmed",

                "cancelled",

            },



            "confirmed": {

                "processing",

            },



            "processing": {

                "shipped",

            },



            "shipped": {

                "delivered",

            },



            "delivered": set(),

            "cancelled": set(),

        }



        valid_next_statuses = (

            allowed_transitions.get(

                current_status,

                set(),

            )

        )



        if (

            new_status

            not in valid_next_statuses

        ):

            raise HTTPException(

                status_code=(

                    status.HTTP_409_CONFLICT

                ),

                detail=(

                    f"No se puede cambiar "

                    f"el pedido de "

                    f"'{current_status}' "

                    f"a '{new_status}'."

                ),

            )



        # =============================================

        # 7. SOLO PAGADOS PUEDEN AVANZAR

        # =============================================



        if (

            new_status

            in {

                "confirmed",

                "processing",

                "shipped",

                "delivered",

            }

            and

            order.payment_status

            != "paid"

        ):

            raise HTTPException(

                status_code=(

                    status.HTTP_409_CONFLICT

                ),

                detail=(

                    "No puedes avanzar un "

                    "pedido que todavía "

                    "no ha sido pagado."

                ),

            )



        # =============================================

        # 8. CANCELAR PEDIDO

        # =============================================



        if new_status == "cancelled":



            if (

                order.payment_status

                == "paid"

            ):

                raise HTTPException(

                    status_code=(

                        status.HTTP_409_CONFLICT

                    ),

                    detail=(

                        "Un pedido pagado no puede "

                        "cancelarse directamente. "

                        "Primero debe procesarse "

                        "un reembolso."

                    ),

                )



            if (

                order.stock_status

                == "reserved"

            ):

                restore_order_stock(

                    order,

                    db,

                )



        # =============================================
        # 9. ACTUALIZAR
        # =============================================

        order.status = new_status

        # =============================================
        # 10. REGISTRAR NOTIFICACIÓN EN OUTBOX
        # =============================================

        if new_status in {"shipped", "delivered"}:
            customer = db.scalar(
                select(User).where(User.id == order.user_id)
            )

            if customer:
                account_url = f"{FRONTEND_URL}/cuenta"

                if new_status == "shipped":
                    enqueue_order_shipped_email(
                        db=db,
                        order_id=order.id,
                        recipient_email=customer.email,
                        first_name=customer.first_name,
                        order_number=order.order_number,
                        account_url=account_url,
                    )
                else:
                    enqueue_order_delivered_email(
                        db=db,
                        order_id=order.id,
                        recipient_email=customer.email,
                        first_name=customer.first_name,
                        order_number=order.order_number,
                        account_url=account_url,
                    )
            else:
                print(
                    "ALERTA AURA: no se encontró el cliente para "
                    "registrar el correo de estado del pedido:",
                    order.order_number,
                )

        # =============================================
        # 11. GUARDAR PEDIDO + OUTBOX
        # =============================================

        db.commit()
        db.refresh(order)

        # =============================================
        # 12. RESPONDER
        # =============================================



        return build_single_order_response(

            order,

            db,

        )



    except HTTPException:

        db.rollback()

        raise



    except Exception as error:

        db.rollback()



        print(

            "ERROR ACTUALIZANDO PEDIDO:",

            repr(error),

        )



        raise HTTPException(

            status_code=(

                status.HTTP_500_INTERNAL_SERVER_ERROR

            ),

            detail=(

                "No se pudo actualizar "

                "el pedido."

            ),

        ) from error





# =====================================================

# VER MI PEDIDO

# CLIENTE

#

# DEBE PERMANECER AL FINAL.

# =====================================================



@router.get(

    "/{order_id}",

    response_model=OrderResponse,

)

def get_my_order(

    order_id: int,

    current_user: User = Depends(

        get_current_user

    ),

    db: Session = Depends(

        get_db

    ),

):



    order = db.scalar(

        select(Order)

        .where(

            Order.id == order_id,

            Order.user_id

            == current_user.id,

        )

    )



    if not order:

        raise HTTPException(

            status_code=(

                status.HTTP_404_NOT_FOUND

            ),

            detail=(

                "Pedido no encontrado."

            ),

        )



    return build_single_order_response(

        order,

        db,

    )