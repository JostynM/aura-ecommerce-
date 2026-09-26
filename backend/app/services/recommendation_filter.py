import unicodedata

from app.models.product import Product


# ==========================================
# NORMALIZAR TEXTO
# ==========================================

def normalize_text(value: str | None) -> str:
    """
    Convierte un texto a una forma comparable.

    Ejemplo:
    "Vainilla" -> "vainilla"
    "Cítrico"  -> "citrico"
    """

    if not value:
        return ""

    value = value.strip().lower()

    normalized = unicodedata.normalize(
        "NFD",
        value,
    )

    without_accents = "".join(
        character
        for character in normalized
        if unicodedata.category(character)
        != "Mn"
    )

    return without_accents


# ==========================================
# NORMALIZAR GÉNERO
# ==========================================

def normalize_gender(
    gender: str | None,
) -> str:

    value = normalize_text(
        gender
    )

    male_values = {
        "hombre",
        "masculino",
        "male",
        "man",
    }

    female_values = {
        "mujer",
        "femenino",
        "female",
        "woman",
    }

    unisex_values = {
        "unisex",
        "mixto",
    }

    if value in male_values:
        return "hombre"

    if value in female_values:
        return "mujer"

    if value in unisex_values:
        return "unisex"

    return value


# ==========================================
# OBTENER TODAS LAS NOTAS
# ==========================================

def get_product_notes(
    product: Product,
) -> list[str]:

    notes = []

    notes.extend(
        product.top_notes or []
    )

    notes.extend(
        product.heart_notes or []
    )

    notes.extend(
        product.base_notes or []
    )

    return [
        normalize_text(note)
        for note in notes
        if note
    ]


# ==========================================
# CALCULAR PUNTAJE
# ==========================================

def calculate_product_score(
    product: Product,
    user_gender: str | None,
    preferred_notes: list[str],
) -> int:

    score = 0

    # ======================================
    # GÉNERO
    # ======================================

    normalized_user_gender = (
        normalize_gender(
            user_gender
        )
    )

    normalized_product_gender = (
        normalize_gender(
            product.gender
        )
    )

    if normalized_user_gender:

        if (
            normalized_product_gender
            == normalized_user_gender
        ):
            score += 4

        elif (
            normalized_product_gender
            == "unisex"
        ):
            score += 2

    # ======================================
    # NOTAS DEL PERFUME
    # ======================================

    product_notes = (
        get_product_notes(
            product
        )
    )

    normalized_preferences = [
        normalize_text(note)
        for note in preferred_notes
        if note
    ]

    for preferred_note in (
        normalized_preferences
    ):

        for product_note in (
            product_notes
        ):

            # Coincidencia exacta
            if (
                preferred_note
                == product_note
            ):
                score += 5
                break

            # Coincidencia parcial
            if (
                preferred_note
                in product_note
                or product_note
                in preferred_note
            ):
                score += 3
                break

    return score


# ==========================================
# SELECCIONAR CANDIDATOS
# ==========================================

def select_candidate_products(
    products: list[Product],
    user_gender: str | None,
    preferred_notes: list[str],
    limit: int = 15,
) -> list[Product]:

    scored_products = []

    for product in products:

        score = (
            calculate_product_score(
                product=product,
                user_gender=user_gender,
                preferred_notes=(
                    preferred_notes
                ),
            )
        )

        scored_products.append(
            (
                product,
                score,
            )
        )

    # ======================================
    # ORDENAR POR PUNTAJE
    # ======================================

    scored_products.sort(
        key=lambda item: (
            item[1],
            -float(
                item[0].price
            ),
        ),
        reverse=True,
    )

    # ======================================
    # TOMAR LOS MEJORES
    # ======================================

    candidates = [
        product
        for product, score
        in scored_products[:limit]
    ]

    return candidates