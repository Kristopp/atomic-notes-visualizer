"""
Entity model - AI-extracted concepts/entities from notes
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base


class Entity(Base):
    __tablename__ = "entities"
    
    id = Column(Integer, primary_key=True, index=True)
    note_id = Column(Integer, ForeignKey("notes.id"), nullable=False)
    name = Column(String(255), nullable=False, index=True)
    entity_type = Column(String(50), nullable=True)  # concept, technology, person, etc.
    description = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # Hex color for visualization
    embedding = Column(Vector(1536), nullable=True)
    
    # Relationships
    note = relationship("Note", backref="entities")
    
    def __repr__(self):
        return f"<Entity(id={self.id}, name='{self.name}', type='{self.entity_type}')>"
