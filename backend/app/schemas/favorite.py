from datetime import datetime

from pydantic import (
    BaseModel,
    ConfigDict,
)


# ==========================================
# FAVORITO
# ==========================================

class FavoriteResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True
    )

    id: int

    user_id: int

    product_id: int

    created_at: datetime