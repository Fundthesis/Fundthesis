"""API routes for Education Track features (Explain, Socratic, Adaptive Learning)."""

import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from typing import Optional, Dict, List
from pydantic import BaseModel

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from rag.education_rag import EducationRAG

router = APIRouter()

# Initialize Education RAG instance
education_rag = EducationRAG()


class ExplainRequest(BaseModel):
    """Request model for explain endpoint."""
    concept: str
    module_context: Optional[int] = None
    use_analogy: bool = True


class SocraticRequest(BaseModel):
    """Request model for Socratic guidance endpoint."""
    question: str
    student_context: Optional[Dict] = None


class AdaptiveLearningRequest(BaseModel):
    """Request model for adaptive learning recommendation."""
    user_performance: Dict
    current_behavior: Optional[Dict] = None


@router.post("/education/explain")
async def explain_concept(request: ExplainRequest):
    """
    Explain a concept using lesson content (for "Explain" button).
    
    Uses Azure AI Search to find relevant lesson snippets and explains using analogies.
    """
    try:
        result = await education_rag.explain_concept(
            concept=request.concept,
            module_context=request.module_context,
            use_analogy=request.use_analogy
        )
        return result
    except Exception as e:
        print(f"Error in explain_concept: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to explain concept: {str(e)}")


@router.post("/education/socratic")
async def socratic_guidance(request: SocraticRequest):
    """
    Provide Socratic method guidance (guided questions, not direct answers).
    
    The AI Coach asks questions that lead students to their own "lightbulb" moments.
    """
    try:
        result = await education_rag.socratic_guidance(
            question=request.question,
            student_context=request.student_context
        )
        return result
    except Exception as e:
        print(f"Error in socratic_guidance: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to provide Socratic guidance: {str(e)}")


@router.post("/education/adaptive-learning")
async def adaptive_learning_recommendation(request: AdaptiveLearningRequest):
    """
    Generate adaptive learning recommendations based on performance.
    
    Replaces static module list with dynamic path based on student behavior.
    """
    try:
        result = await education_rag.adaptive_learning_recommendation(
            user_performance=request.user_performance,
            current_behavior=request.current_behavior
        )
        return result
    except Exception as e:
        print(f"Error in adaptive_learning_recommendation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate adaptive learning recommendation: {str(e)}")


@router.post("/education/mentor")
async def mentor_chat(question: str, context: Optional[Dict] = None):
    """
    Full-page AI chat interface for Socratic help.
    
    Users can ask questions about their portfolio, receiving grounded, cited answers.
    """
    try:
        result = await education_rag.socratic_guidance(
            question=question,
            student_context=context
        )
        return result
    except Exception as e:
        print(f"Error in mentor_chat: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process mentor chat: {str(e)}")

