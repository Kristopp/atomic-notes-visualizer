"""
Topic model - groups notes into dedicated workspaces
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base

class Topic(Base):
    __tablename__ = "topics"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    emoji = Column(String(10), nullable=True, default="📚")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    notes = relationship("Note", back_populates="topic")
    
    def __repr__(self):
        return f"<Topic(id={self.id}, name='{self.name}')>"
