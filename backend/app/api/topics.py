"""
Topics API Router
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.services.topic_service import TopicService, get_topic_service
from app.schemas.topic import TopicCreate, TopicResponse
from app.schemas import GraphDataResponse, ErrorResponse

router = APIRouter(prefix="/api/topics", tags=["topics"])

@router.post("/", response_model=TopicResponse, status_code=status.HTTP_201_CREATED)
async def create_topic(
    topic: TopicCreate,
    service: TopicService = Depends(get_topic_service)
):
    """Create a new topic workspace"""
    return await service.create_topic(topic)

@router.get("/", response_model=List[TopicResponse])
async def list_topics(
    service: TopicService = Depends(get_topic_service)
):
    """List all topics"""
    return await service.list_topics()

@router.get("/{topic_id}", response_model=TopicResponse)
async def get_topic(
    topic_id: int,
    service: TopicService = Depends(get_topic_service)
):
    """Get topic details"""
    topic = await service.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic

@router.get("/{topic_id}/graph", response_model=GraphDataResponse)
async def get_topic_graph(
    topic_id: int,
    service: TopicService = Depends(get_topic_service)
):
    """Get graph data for the entire topic"""
    # Verify topic exists
    topic = await service.get_topic(topic_id)
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
        
    return await service.get_topic_graph(topic_id)
