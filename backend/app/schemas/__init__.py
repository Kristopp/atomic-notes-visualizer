"""
Pydantic schemas for request/response validation and serialization
Following FastAPI best practices with Pydantic V2
"""
from datetime import datetime
from typing import List, Optional, Dict, Any, ForwardRef
from pydantic import BaseModel, ConfigDict, Field


# ============== Base Schema ==============
class BaseSchema(BaseModel):
    """Base schema with common configuration"""
    model_config = ConfigDict(
        from_attributes=True,  # Enable ORM mode for SQLAlchemy models
        populate_by_name=True,
        str_strip_whitespace=True
    )


# ============== Note Schemas ==============
class NoteBase(BaseSchema):
    """Base note schema with common fields"""
    title: Optional[str] = Field(None, max_length=500)
    content: str = Field(..., min_length=1)
    source_file: Optional[str] = Field(None, max_length=255)


class NoteCreate(NoteBase):
    """Schema for creating a new note"""
    pass


class NoteUpdate(BaseSchema):
    """Schema for updating a note"""
    title: Optional[str] = Field(None, max_length=500)
    content: Optional[str] = Field(None, min_length=1)
    note_metadata: Optional[Dict[str, Any]] = None


class NoteMetadata(BaseSchema):
    """Note metadata schema"""
    source: Optional[str] = None
    video_id: Optional[str] = None
    uploader: Optional[str] = None
    thumbnail: Optional[str] = None
    url: Optional[str] = None
    duration: Optional[int] = None
    summary: Optional[str] = None
    key_topics: Optional[List[str]] = None
    transcript_segments: Optional[List[Dict[str, Any]]] = None


class NoteResponse(BaseSchema):
    """Schema for note responses"""
    id: int
    title: Optional[str] = None
    content: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    source_file: Optional[str] = None
    topic_id: Optional[int] = None
    note_metadata: Optional[NoteMetadata] = None


class NoteListItem(BaseSchema):
    """Schema for note list items (lightweight)"""
    id: int
    title: Optional[str] = None
    created_at: Optional[datetime] = None
    topic_id: Optional[int] = None
    entity_count: int = 0
    note_metadata: Optional[Dict[str, Any]] = None


class NoteListResponse(BaseSchema):
    """Schema for list of notes"""
    notes: List[NoteListItem]


class NoteUploadResponse(BaseSchema):
    """Schema for note upload response"""
    note_id: int
    title: Optional[str] = None
    content_length: int
    status: str
    message: str


# ============== Entity Schemas ==============
class EntityBase(BaseSchema):
    """Base entity schema"""
    name: str = Field(..., min_length=1, max_length=255)
    entity_type: str = Field(default="concept", max_length=50)
    description: Optional[str] = None
    color: Optional[str] = Field(default="#9CA3AF", max_length=7)
    timestamp: Optional[int] = None


class EntityCreate(EntityBase):
    """Schema for creating an entity"""
    note_id: int


class EntityResponse(EntityBase):
    """Schema for entity responses"""
    id: int
    note_id: int


# ============== Relationship Schemas ==============
class RelationshipBase(BaseSchema):
    """Base relationship schema"""
    relationship_type: str = Field(default="related_to", max_length=50)
    strength: float = Field(default=0.5, ge=0.0, le=1.0)
    ai_explanation: Optional[str] = None


class RelationshipCreate(RelationshipBase):
    """Schema for creating a relationship"""
    source_entity_id: int
    target_entity_id: int


class RelationshipResponse(RelationshipBase):
    """Schema for relationship responses"""
    id: int
    source_entity_id: int
    target_entity_id: int


# ============== Graph Schemas ==============
class GraphNode(BaseSchema):
    """Schema for graph visualization nodes"""
    id: int
    name: str
    type: str
    description: Optional[str] = None
    color: Optional[str] = None
    timestamp: Optional[int] = None


class GraphEdge(BaseSchema):
    """Schema for graph visualization edges"""
    id: int
    source_entity_id: int
    target_entity_id: int
    type: str
    strength: float
    explanation: Optional[str] = None


class GraphDataResponse(BaseSchema):
    """Schema for graph data response"""
    entities: List[GraphNode]
    relationships: List[GraphEdge]


# ============== Search Schemas ==============
class SearchRequest(BaseSchema):
    """Schema for search requests"""
    query: str = Field(..., min_length=1, max_length=500)
    limit: int = Field(default=10, ge=1, le=50)
    min_similarity: float = Field(default=0.5, ge=0.0, le=1.0)


class SearchResultItem(BaseSchema):
    """Schema for search result items"""
    id: int
    name: Optional[str] = None
    title: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    similarity: float


class SearchResponse(BaseSchema):
    """Schema for search responses"""
    query: str
    results: List[SearchResultItem]
    total: int


# ============== Processing Schemas ==============
class ProcessingEvent(BaseSchema):
    """Schema for processing progress events"""
    stage: str
    message: str
    progress: int = Field(..., ge=0, le=100)


class ProcessingCompleteResponse(BaseSchema):
    """Schema for processing completion"""
    status: str
    entities_count: int
    relationships_count: int
    message: str


# ============== Annotation Schemas ==============
class AnnotationBase(BaseSchema):
    """Base annotation schema"""
    content: str = Field(..., min_length=1)
    annotation_type: str = Field(default="comment", max_length=50)
    position_data: Optional[Dict[str, Any]] = None


class AnnotationCreate(AnnotationBase):
    """Schema for creating an annotation"""
    entity_id: int


class AnnotationResponse(AnnotationBase):
    """Schema for annotation responses"""
    id: int
    entity_id: int
    created_at: datetime


# ============== YouTube Schemas ==============
class YouTubeProcessingRequest(BaseSchema):
    """Schema for YouTube processing requests"""
    youtube_url: str = Field(..., pattern=r'^https?://(www\.)?(youtube\.com|youtu\.be)/.+')


class YouTubeProcessingResponse(BaseSchema):
    """Schema for YouTube processing response"""
    note_id: int
    task_id: str
    status: str
    message: str


class YouTubeTaskStatusResponse(BaseSchema):
    """Schema for YouTube task status"""
    task_id: str
    status: str
    stage: Optional[str] = None
    progress: Optional[int] = None
    message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None


# ============== Health & Error Schemas ==============
class HealthCheckResponse(BaseSchema):
    """Schema for health check response"""
    status: str
    version: str
    database: str
    pgvector: str


class ErrorResponse(BaseSchema):
    """Schema for error responses"""
    detail: str
    request_id: Optional[str] = None


class ValidationErrorResponse(BaseSchema):
    """Schema for validation error responses"""
    detail: List[Dict[str, Any]]
    request_id: Optional[str] = None
