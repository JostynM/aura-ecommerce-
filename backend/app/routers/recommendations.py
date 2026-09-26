from decimal import Decimal

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db

from app.models.product import (
    Product,
)

from app.schemas.recommendation import (
    ChatRecommendationRequest,
    ChatRecommendationResponse,
    RecommendedProduct,
    RecommendationRequest,
    RecommendationResponse,
)

from app.services.gemini_service import (
    analyze_chat_intent,
    generate_chat_recommendations,
    generate_perfume_recommendations,
    test_gemini_connection,
)

from app.services.recommendation_filter import (
    select_candidate_products,
)


# ==========================================
# ROUTER
# ==========================================

router = APIRouter(
    prefix="/recommendations",
    tags=["Recommendations"],
)


# ==========================================
# CONVERTIR PRODUCTOS PARA GEMINI
# ==========================================

def prepare_products_for_ai(
    products: list[Product],
) -> list[dict]:

    result = []

    for product in products:

        result.append(
            {
                "id": product.id,
                "brand": product.brand,
                "name": product.name,
                "price": float(
                    product.price
                ),
                "size_ml": product.size_ml,
                "perfume_type": (
                    product.perfume_type
                ),
                "gender": product.gender,
                "description": (
                    product.description
                ),
                "top_notes": (
                    product.top_notes
                ),
                "heart_notes": (
                    product.heart_notes
                ),
                "base_notes": (
                    product.base_notes
                ),
            }
        )

    return result


# ==========================================
# CREAR PRODUCTOS DE RESPUESTA
# ==========================================

def build_recommended_products(
    ai_recommendations: list[dict],
    products: list[Product],
) -> list[RecommendedProduct]:

    products_by_id = {
        product.id: product
        for product in products
    }

    result = []

    used_ids = set()

    for item in ai_recommendations:

        if not isinstance(
            item,
            dict,
        ):
            continue

        raw_product_id = item.get(
            "product_id"
        )

        try:

            product_id = int(
                raw_product_id
            )

        except (
            TypeError,
            ValueError,
        ):
            continue

        if product_id in used_ids:
            continue

        product = products_by_id.get(
            product_id
        )

        # Gemini nunca puede enviar
        # al frontend un ID inexistente.
        if not product:
            continue

        reason = str(
            item.get(
                "reason",
                "",
            )
        ).strip()

        if not reason:
            reason = (
                "Este perfume coincide "
                "con tus preferencias."
            )

        used_ids.add(
            product_id
        )

        result.append(
            RecommendedProduct(
                id=product.id,
                slug=product.slug,
                brand=product.brand,
                name=product.name,
                price=product.price,
                size_ml=product.size_ml,
                perfume_type=(
                    product.perfume_type
                ),
                gender=product.gender,
                image_url=(
                    product.image_url
                ),
                reason=reason,
            )
        )

        if len(result) >= 3:
            break

    return result


# ==========================================
# TEST GEMINI
# ==========================================

@router.get(
    "/test-gemini"
)
def test_gemini():

    try:

        message = (
            test_gemini_connection()
        )

        return {
            "success": True,
            "message": message,
        }

    except Exception as error:

        print(
            "ERROR GEMINI:",
            repr(error),
        )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "No fue posible comunicarse "
                "con Gemini."
            ),
        ) from error


# ==========================================
# RECOMENDACIÓN ESTRUCTURADA
# ==========================================

@router.post(
    "/ai",
    response_model=RecommendationResponse,
)
def recommend_perfumes(
    preferences: RecommendationRequest,
    db: Session = Depends(get_db),
):

    try:

        statement = (
            select(Product)
            .where(
                Product.is_active.is_(True),
                Product.stock > 0,
                Product.price
                <= preferences.budget,
            )
        )

        available_products = (
            db.execute(statement)
            .scalars()
            .all()
        )

        if not available_products:

            return RecommendationResponse(
                recommendations=[]
            )

        candidate_products = (
            select_candidate_products(
                products=available_products,
                user_gender=(
                    preferences.gender
                ),
                preferred_notes=(
                    preferences.preferred_notes
                ),
                limit=15,
            )
        )

        products_for_ai = (
            prepare_products_for_ai(
                candidate_products
            )
        )

        ai_recommendations = (
            generate_perfume_recommendations(
                products=products_for_ai,
                gender=preferences.gender,
                occasion=(
                    preferences.occasion
                ),
                preferred_notes=(
                    preferences.preferred_notes
                ),
                budget=float(
                    preferences.budget
                ),
            )
        )

        recommendations = (
            build_recommended_products(
                ai_recommendations=(
                    ai_recommendations
                ),
                products=(
                    candidate_products
                ),
            )
        )

        return RecommendationResponse(
            recommendations=(
                recommendations
            )
        )

    except Exception as error:

        print(
            "ERROR RECOMMENDATIONS:",
            repr(error),
        )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "No fue posible generar "
                "las recomendaciones."
            ),
        ) from error


# ==========================================
# CHAT CONVERSACIONAL
# ==========================================

@router.post(
    "/chat",
    response_model=(
        ChatRecommendationResponse
    ),
)
def recommendation_chat(
    request: ChatRecommendationRequest,
    db: Session = Depends(get_db),
):

    try:

        # ==================================
        # 1. PREPARAR HISTORIAL
        # ==================================

        history = [
            {
                "role": item.role,
                "content": item.content,
            }
            for item in request.history
        ]

        # ==================================
        # 2. GEMINI INTERPRETA EL MENSAJE
        # ==================================

        intent = analyze_chat_intent(
            message=request.message,
            history=history,
        )

        # ==================================
        # 3. SI FALTA INFORMACIÓN
        # ==================================

        if intent.action == "ask":

            return (
                ChatRecommendationResponse(
                    type="question",
                    message=intent.message,
                    recommendations=[],
                )
            )

        # ==================================
        # 4. FILTROS DE BASE DE DATOS
        # ==================================

        conditions = [
            Product.is_active.is_(True),
            Product.stock > 0,
        ]

        if intent.budget is not None:

            conditions.append(
                Product.price
                <= Decimal(
                    str(intent.budget)
                )
            )

        statement = (
            select(Product)
            .where(
                *conditions
            )
        )

        available_products = (
            db.execute(statement)
            .scalars()
            .all()
        )

        # ==================================
        # 5. SIN PRODUCTOS
        # ==================================

        if not available_products:

            message = (
                "No encontré perfumes disponibles "
                "con esas condiciones. "
                "Si quieres, podemos probar con "
                "otro presupuesto o estilo."
            )

            return (
                ChatRecommendationResponse(
                    type="question",
                    message=message,
                    recommendations=[],
                )
            )

        # ==================================
        # 6. PREFILTRO LOCAL
        # ==================================

        candidate_products = (
            select_candidate_products(
                products=(
                    available_products
                ),
                user_gender=(
                    intent.gender
                ),
                preferred_notes=(
                    intent.preferred_notes
                ),
                limit=15,
            )
        )

        # ==================================
        # 7. DATOS PARA GEMINI
        # ==================================

        products_for_ai = (
            prepare_products_for_ai(
                candidate_products
            )
        )

        # ==================================
        # 8. GEMINI ELIGE LOS MEJORES
        # ==================================

        gemini_result = (
            generate_chat_recommendations(
                products=(
                    products_for_ai
                ),
                original_message=(
                    request.message
                ),
                gender=(
                    intent.gender
                ),
                occasion=(
                    intent.occasion
                ),
                preferred_notes=(
                    intent.preferred_notes
                ),
                budget=(
                    intent.budget
                ),
                preferences_summary=(
                    intent.preferences_summary
                ),
            )
        )

        # ==================================
        # 9. CONVERTIR RESPUESTA GEMINI
        # ==================================

        raw_recommendations = [
            item.model_dump()
            for item
            in gemini_result.recommendations
        ]

        recommendations = (
            build_recommended_products(
                ai_recommendations=(
                    raw_recommendations
                ),
                products=(
                    candidate_products
                ),
            )
        )

        # ==================================
        # 10. RESPUESTA FINAL
        # ==================================

        return (
            ChatRecommendationResponse(
                type="recommendations",
                message=(
                    gemini_result.message
                ),
                recommendations=(
                    recommendations
                ),
            )
        )

    except Exception as error:

        print(
            "ERROR RECOMMENDATION CHAT:",
            repr(error),
        )

        raise HTTPException(
            status_code=(
                status.HTTP_502_BAD_GATEWAY
            ),
            detail=(
                "No fue posible procesar "
                "la conversación con AURA."
            ),
        ) from error