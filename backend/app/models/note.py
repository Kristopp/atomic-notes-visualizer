"""
Note model - stores atomic notes and their embeddings
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from sqlalchemy.orm import relationship
from app.database import Base


class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536), nullable=True)  # OpenAI ada-002 dimension
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    source_file = Column(String(255), nullable=True)
    note_metadata = Column(JSON, nullable=True)  # Renamed from 'metadata' to avoid SQLAlchemy conflict
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    
    # Relationships
    topic = relationship("Topic", back_populates="notes")

    def __repr__(self):
        return f"<Note(id={self.id}, title='{self.title}')>"
