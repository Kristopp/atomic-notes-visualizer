from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field

# Base Schema (copied from __init__.py for standalone usage, or could import)
class BaseSchema(BaseModel):
    """Base schema with common configuration"""
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True
    )

class TopicBase(BaseSchema):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    emoji: Optional[str] = Field(default="📚", max_length=10)

class TopicCreate(TopicBase):
    pass

class TopicUpdate(BaseSchema):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    emoji: Optional[str] = Field(None, max_length=10)

class TopicResponse(TopicBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

class TopicWithNotesResponse(TopicResponse):
    # Avoid circular import by using ForwardRef if needed, but for now we just return basic note info or just the list
    # We will define a lightweight note schema here or import it if safe
    pass
