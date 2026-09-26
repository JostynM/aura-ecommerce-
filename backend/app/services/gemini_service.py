import json
import os
from typing import Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import (
    BaseModel,
    Field,
)


# ==========================================
# VARIABLES DE ENTORNO
# ==========================================

load_dotenv()


GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)


if not GEMINI_API_KEY:
    raise ValueError(
        "GEMINI_API_KEY no está configurada "
        "en el archivo .env"
    )


# ==========================================
# CLIENTE GEMINI
# ==========================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)


# ==========================================
# MODELO
# ==========================================

GEMINI_MODEL = (
    "gemini-3.5-flash-lite"
)


# ==========================================
# MODELOS INTERNOS PARA GEMINI
# ==========================================

class ChatIntent(BaseModel):

    action: Literal[
        "ask",
        "recommend",
    ]

    message: str

    gender: str | None = None

    occasion: str | None = None

    preferred_notes: list[str] = Field(
        default_factory=list
    )

    budget: float | None = None

    preferences_summary: str = ""


class GeminiRecommendationItem(
    BaseModel
):
    product_id: int
    reason: str


class GeminiRecommendationResult(
    BaseModel
):
    recommendations: list[
        GeminiRecommendationItem
    ]


class GeminiChatResult(
    BaseModel
):
    message: str

    recommendations: list[
        GeminiRecommendationItem
    ]


# ==========================================
# CONFIGURACIÓN GEMINI JSON
# ==========================================

def get_json_config(
    schema,
    temperature: float = 0.2,
):

    return types.GenerateContentConfig(
        response_mime_type=(
            "application/json"
        ),
        response_schema=schema,
        temperature=temperature,
        automatic_function_calling=(
            types.AutomaticFunctionCallingConfig(
                disable=True
            )
        ),
    )


# ==========================================
# PRUEBA DE CONEXIÓN
# ==========================================

def test_gemini_connection() -> str:

    response = (
        client.models.generate_content(
            model=GEMINI_MODEL,
            contents=(
                "Responde únicamente con esta frase: "
                "Gemini conectado correctamente con AURA."
            ),
            config=(
                types.GenerateContentConfig(
                    automatic_function_calling=(
                        types.AutomaticFunctionCallingConfig(
                            disable=True
                        )
                    )
                )
            ),
        )
    )

    if not response.text:
        raise ValueError(
            "Gemini no devolvió contenido."
        )

    return response.text.strip()


# ==========================================
# INTERPRETAR CHAT DEL USUARIO
# ==========================================

def analyze_chat_intent(
    message: str,
    history: list[dict],
) -> ChatIntent:

    history_text = json.dumps(
        history,
        ensure_ascii=False,
        indent=2,
    )

    prompt = f"""
Eres AURA AI, un asesor conversacional experto
en perfumes para una tienda online.

Debes analizar la conversación completa y entender
qué perfume busca el usuario.

Tu objetivo NO es recomendar todavía un producto.

Tu trabajo es decidir si ya existe suficiente
información para buscar perfumes del catálogo.

REGLAS:

1. Habla siempre en español.
2. Sé natural, breve y amable.
3. No inventes preferencias del usuario.
4. Extrae información mencionada anteriormente
   en la conversación.
5. Si el usuario proporciona nueva información,
   combínala con lo que ya había dicho.
6. El presupuesto está expresado en soles peruanos.
7. Si no menciona presupuesto, puede quedar vacío.
8. Si no menciona género, puede quedar vacío.
9. Las preferencias pueden incluir aromas como:
   vainilla, cítrico, floral, dulce, amaderado,
   fresco, especiado, almizclado, etc.
10. También debes conservar preferencias subjetivas,
    por ejemplo:
    "que llame la atención",
    "que no sea empalagoso",
    "para calor",
    "elegante",
    "juvenil",
    "para todos los días".
11. Guarda esas preferencias adicionales en
    preferences_summary.

DECISIÓN:

Usa action="ask" solamente cuando la solicitud
sea demasiado vaga para recomendar algo útil.

Ejemplo demasiado vago:
"Recomiéndame un perfume."

En ese caso realiza UNA sola pregunta corta.

No hagas un interrogatorio ni preguntes género,
presupuesto, ocasión y notas al mismo tiempo.

Si ya sabes al menos qué tipo de experiencia,
ocasión, aroma o estilo busca el usuario,
puedes utilizar action="recommend".

Cuando action sea "recommend",
message puede indicar brevemente que ya tienes
suficiente información para buscar opciones.

HISTORIAL:

{history_text}

MENSAJE ACTUAL DEL USUARIO:

{message}
"""

    response = (
        client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=get_json_config(
                ChatIntent,
                temperature=0.1,
            ),
        )
    )

    if response.parsed:

        if isinstance(
            response.parsed,
            ChatIntent,
        ):
            return response.parsed

        return ChatIntent.model_validate(
            response.parsed
        )

    if not response.text:
        raise ValueError(
            "Gemini no pudo interpretar "
            "el mensaje del usuario."
        )

    return ChatIntent.model_validate_json(
        response.text
    )


# ==========================================
# RECOMENDACIONES ESTRUCTURADAS
# ==========================================

def generate_perfume_recommendations(
    products: list[dict],
    gender: str | None,
    occasion: str,
    preferred_notes: list[str],
    budget: float,
) -> list[dict]:

    if not products:
        return []

    products_text = json.dumps(
        products,
        ensure_ascii=False,
        indent=2,
    )

    notes_text = (
        ", ".join(
            preferred_notes
        )
        if preferred_notes
        else "Sin preferencia específica"
    )

    target_count = min(
        3,
        len(products),
    )

    prompt = f"""
Eres el asesor experto en perfumes de AURA.

Selecciona los perfumes más adecuados para
el usuario únicamente entre PRODUCTOS DISPONIBLES.

Debes intentar seleccionar exactamente
{target_count} producto(s).

REGLAS:

- No inventes productos.
- No inventes IDs.
- No repitas productos.
- Solo utiliza IDs presentes en el catálogo.
- Considera género, ocasión y notas.
- Los productos ya cumplen stock y presupuesto.
- La explicación debe ser breve y natural.
- No menciones procesos internos.

GÉNERO:
{gender or "Sin preferencia"}

OCASIÓN:
{occasion}

NOTAS:
{notes_text}

PRESUPUESTO:
S/ {budget}

PRODUCTOS DISPONIBLES:

{products_text}
"""

    response = (
        client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=get_json_config(
                GeminiRecommendationResult,
                temperature=0.2,
            ),
        )
    )

    if response.parsed:

        if isinstance(
            response.parsed,
            GeminiRecommendationResult,
        ):
            result = response.parsed

        else:
            result = (
                GeminiRecommendationResult
                .model_validate(
                    response.parsed
                )
            )

    else:

        if not response.text:
            raise ValueError(
                "Gemini no devolvió "
                "recomendaciones."
            )

        result = (
            GeminiRecommendationResult
            .model_validate_json(
                response.text
            )
        )

    return [
        item.model_dump()
        for item
        in result.recommendations[:3]
    ]


# ==========================================
# RECOMENDACIÓN CONVERSACIONAL
# ==========================================

def generate_chat_recommendations(
    products: list[dict],
    original_message: str,
    gender: str | None,
    occasion: str | None,
    preferred_notes: list[str],
    budget: float | None,
    preferences_summary: str,
) -> GeminiChatResult:

    if not products:

        return GeminiChatResult(
            message=(
                "No encontré perfumes disponibles "
                "que coincidan con lo que buscas."
            ),
            recommendations=[],
        )

    products_text = json.dumps(
        products,
        ensure_ascii=False,
        indent=2,
    )

    notes_text = (
        ", ".join(
            preferred_notes
        )
        if preferred_notes
        else "Sin preferencia específica"
    )

    budget_text = (
        f"S/ {budget}"
        if budget is not None
        else "No especificado"
    )

    target_count = min(
        3,
        len(products),
    )

    prompt = f"""
Eres AURA AI, el asesor personal de perfumes
de una tienda online.

El usuario te habló de manera natural.

Debes seleccionar los perfumes que mejor encajen
con lo que busca.

Solo puedes recomendar productos incluidos en
PRODUCTOS DISPONIBLES.

REGLAS OBLIGATORIAS:

1. No inventes perfumes.
2. No inventes IDs.
3. No recomiendes productos que no estén
   en PRODUCTOS DISPONIBLES.
4. No repitas productos.
5. Intenta recomendar exactamente
   {target_count} producto(s).
6. Considera todas las preferencias del usuario.
7. Explica de manera natural por qué encaja
   cada perfume.
8. No menciones algoritmos, filtros,
   puntuaciones, base de datos ni Gemini.
9. El campo message debe sonar como una respuesta
   de un asesor humano.
10. Mantén el mensaje principal corto.
11. No afirmes características que no aparezcan
   en los datos proporcionados.

MENSAJE ORIGINAL:

{original_message}

GÉNERO:

{gender or "No especificado"}

OCASIÓN:

{occasion or "No especificada"}

NOTAS PREFERIDAS:

{notes_text}

PRESUPUESTO:

{budget_text}

OTRAS PREFERENCIAS:

{preferences_summary or "Ninguna adicional"}

PRODUCTOS DISPONIBLES:

{products_text}
"""

    response = (
        client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=get_json_config(
                GeminiChatResult,
                temperature=0.3,
            ),
        )
    )

    if response.parsed:

        if isinstance(
            response.parsed,
            GeminiChatResult,
        ):
            return response.parsed

        return GeminiChatResult.model_validate(
            response.parsed
        )

    if not response.text:
        raise ValueError(
            "Gemini no devolvió una "
            "respuesta conversacional."
        )

    return GeminiChatResult.model_validate_json(
        response.text
    )