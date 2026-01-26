"""
Relationship model - connections between entities
"""
from sqlalchemy import Column, Integer, String, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Relationship(Base):
    __tablename__ = "relationships"
    
    id = Column(Integer, primary_key=True, index=True)
    source_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    target_entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    relationship_type = Column(String(100), nullable=True)  # "related_to", "prerequisite", etc.
    strength = Column(Float, nullable=True)  # 0.0 to 1.0
    ai_explanation = Column(Text, nullable=True)  # Why AI thinks they're related
    
    # Relationships
    source = relationship("Entity", foreign_keys=[source_entity_id], backref="outgoing_relationships")
    target = relationship("Entity", foreign_keys=[target_entity_id], backref="incoming_relationships")
    
    def __repr__(self):
        return f"<Relationship(id={self.id}, type='{self.relationship_type}', strength={self.strength})>"
