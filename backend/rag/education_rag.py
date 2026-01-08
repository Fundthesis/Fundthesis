"""Education-focused RAG implementation with Socratic method and lesson retrieval."""

from __future__ import annotations

import re
from typing import Optional, List, Dict, Literal
from .rag import RAG
from .query_translation import QueryTranslationService
from .text_cleaning import TextCleaner


class EducationRAG(RAG):
    """
    Enhanced RAG for Education Track with Socratic method coaching.
    
    Features:
    - Socratic method (guided questions, not direct answers)
    - Lesson content retrieval (for "Explain" button)
    - Query augmentation for better retrieval
    - Grounded citations from curriculum
    """
    
    def __init__(self):
        """Initialize Education RAG with additional services."""
        super().__init__()
        self._query_translation: Optional[QueryTranslationService] = None
        self._text_cleaner = TextCleaner()
    
    @property
    def query_translation(self) -> QueryTranslationService:
        """Lazy initialization of query translation service."""
        if self._query_translation is None:
            self._query_translation = QueryTranslationService()
        return self._query_translation
    
    async def explain_concept(
        self,
        concept: str,
        module_context: Optional[int] = None,
        use_analogy: bool = True
    ) -> Dict[str, any]:
        """
        Explain a concept using lesson content (for "Explain" button).
        
        Uses Azure AI Search to find relevant lesson snippets and explains using analogies.
        
        Args:
            concept: Concept to explain (e.g., "diversification", "beta")
            module_context: Optional module number for context
            use_analogy: Whether to use portfolio-based analogies
            
        Returns:
            Dictionary with 'explanation', 'source_module', 'citations'
        """
        # Clean the concept query
        cleaned_concept = self._text_cleaner.clean_for_embedding(concept)
        
        # Generate embedding for concept
        query_embedding = await self.embeddings.generate_embedding(cleaned_concept)
        
        if not query_embedding:
            return {
                'explanation': f"I couldn't generate an explanation for '{concept}'. Please try rephrasing your question.",
                'source_module': None,
                'citations': []
            }
        
        # Search lesson content (we'll need to index lesson modules)
        try:
            await self.vector_search.connect()
            # Search in lesson content (we'll implement lesson content indexing)
            similar_content = await self.vector_search.search_similar(
                query_embedding,
                top_k=5,
                similarity_threshold=0.6
            )
        except Exception as e:
            print(f"Error searching lesson content: {e}")
            similar_content = []
        finally:
            await self.vector_search.disconnect()
        
        if not similar_content:
            return {
                'explanation': f"I couldn't find information about '{concept}' in the curriculum. Please check the module content or ask your instructor.",
                'source_module': None,
                'citations': []
            }
        
        # Format context from lesson content
        context = self._format_lesson_context(similar_content)
        
        # Generate explanation with analogy if requested
        system_prompt = """You are a financial education assistant using the Socratic method. 
Explain concepts using analogies related to the student's portfolio when possible.
Always cite the specific module or lesson where the information comes from.
Be clear, educational, and encourage critical thinking."""

        analogy_instruction = "Use a portfolio-based analogy to explain this concept." if use_analogy else ""
        
        user_prompt = f"""Based on the following lesson content from the curriculum, explain the concept "{concept}".

{analogy_instruction}

Lesson Content:
{context}

Provide a clear explanation that:
1. Uses the lesson content as the primary source
2. {f"Includes a portfolio-based analogy (e.g., 'Think of diversification like...')" if use_analogy else "Explains the concept clearly"}
3. Cites which module(s) the information comes from
4. Encourages the student to think critically about the concept

Explanation:"""

        explanation = await self.llm.a_call(user_prompt, system_prompt=system_prompt)
        
        # Extract citations
        citations = [
            {
                'module': content.get('module_id'),
                'section': content.get('section_title'),
                'relevance': content.get('similarity', 0)
            }
            for content in similar_content[:3]
        ]
        
        return {
            'explanation': explanation,
            'source_module': similar_content[0].get('module_id') if similar_content else None,
            'citations': citations
        }
    
    async def socratic_guidance(
        self,
        question: str,
        student_context: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Provide Socratic method guidance (guided questions, not direct answers).
        
        The AI Coach asks questions that lead students to their own "lightbulb" moments.
        
        Args:
            question: Student's question
            student_context: Optional context (portfolio state, recent trades, current module)
            
        Returns:
            Dictionary with 'guidance' (Socratic question), 'hints', 'related_concepts'
        """
        # First, retrieve relevant lesson content
        cleaned_question = self._text_cleaner.clean_for_embedding(question)
        query_embedding = await self.embeddings.generate_embedding(cleaned_question)
        
        if not query_embedding:
            return {
                'guidance': "I'd like to help you think through this. Can you tell me more about what you're trying to understand?",
                'hints': [],
                'related_concepts': []
            }
        
        # Search for relevant content
        try:
            await self.vector_search.connect()
            relevant_content = await self.vector_search.search_similar(
                query_embedding,
                top_k=3,
                similarity_threshold=0.6
            )
        except Exception as e:
            print(f"Error in Socratic search: {e}")
            relevant_content = []
        finally:
            await self.vector_search.disconnect()
        
        # Build context string
        context_str = ""
        if student_context:
            portfolio_info = student_context.get('portfolio', {})
            recent_trades = student_context.get('recent_trades', [])
            current_module = student_context.get('current_module')
            
            context_parts = []
            if portfolio_info:
                context_parts.append(f"Student's portfolio: {portfolio_info}")
            if recent_trades:
                context_parts.append(f"Recent trades: {recent_trades}")
            if current_module:
                context_parts.append(f"Current module: {current_module}")
            
            if context_parts:
                context_str = "\n".join(context_parts)
        
        lesson_context = self._format_lesson_context(relevant_content) if relevant_content else "No specific lesson content found."
        
        system_prompt = """You are a Socratic financial education coach. Your role is to guide students to discover answers themselves through thoughtful questions, NOT to give direct answers.

Rules:
1. NEVER give the "right" answer immediately
2. Ask probing questions that lead the student to think
3. Use analogies from their portfolio or recent experiences when possible
4. Reference lesson content to guide thinking
5. Encourage critical thinking and self-discovery
6. Provide hints, not solutions"""

        user_prompt = f"""A student asks: "{question}"

{context_str}

Relevant Lesson Content:
{lesson_context}

Provide Socratic guidance:
1. Ask 1-2 thoughtful questions that guide the student to discover the answer
2. Provide 1-2 hints (not direct answers) based on the lesson content
3. Reference their portfolio or recent experiences if relevant
4. Encourage them to think critically

Format your response as:
GUIDANCE: [Your Socratic questions]
HINTS: [1-2 hints based on lessons]
THINK ABOUT: [What they should consider]

Response:"""

        response = await self.llm.a_call(user_prompt, system_prompt=system_prompt)
        
        # Parse response into structured format
        guidance = self._parse_socratic_response(response)
        
        # Extract related concepts from retrieved content
        related_concepts = [content.get('concept', '') for content in relevant_content[:3] if content.get('concept')]
        
        return {
            'guidance': guidance.get('guidance', response),
            'hints': guidance.get('hints', []),
            'related_concepts': list(set(related_concepts)),
            'think_about': guidance.get('think_about', [])
        }
    
    async def adaptive_learning_recommendation(
        self,
        user_performance: Dict,
        current_behavior: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Generate adaptive learning recommendations based on performance.
        
        Replaces static module list with dynamic path based on student behavior.
        
        Args:
            user_performance: Dict with quiz results, module completion, etc.
            current_behavior: Optional current behavior (e.g., looking at penny stocks)
            
        Returns:
            Dictionary with 'recommended_modules', 'mini_quest', 'coach_prompt'
        """
        # Analyze performance gaps
        missed_concepts = []
        weak_areas = []
        
        # Extract missed concepts from quiz results
        quiz_results = user_performance.get('quiz_results', [])
        for result in quiz_results:
            if not result.get('correct', True):
                concept = result.get('concept') or result.get('topic')
                if concept:
                    missed_concepts.append(concept)
        
        # Detect behavioral patterns
        behavior_prompt = ""
        if current_behavior:
            if current_behavior.get('viewing_high_risk_stocks'):
                behavior_prompt = "Student has been viewing high-risk 'Penny Stocks' on the Discover page."
                weak_areas.append("Risk and Volatility")
            if current_behavior.get('impulsive_trading'):
                behavior_prompt += " Student's last trade in the sandbox was impulsive."
                weak_areas.append("Risk Management")
        
        # Generate recommendation
        system_prompt = """You are an adaptive learning AI coach. Analyze student performance and behavior to recommend personalized learning paths.

Provide:
1. Specific module recommendations (not just "Module X", but why)
2. Mini-quest suggestions based on behavior
3. A personalized coach prompt that's engaging and actionable"""

        user_prompt = f"""Student Performance Data:
- Missed Concepts: {', '.join(missed_concepts) if missed_concepts else 'None identified'}
- Weak Areas: {', '.join(weak_areas) if weak_areas else 'None identified'}
- Completed Modules: {user_performance.get('completed_modules', [])}
- Current Module: {user_performance.get('current_module', 'Unknown')}

{behavior_prompt}

Generate:
1. 2-3 specific module recommendations with reasons
2. A mini-quest suggestion (e.g., "Risk and Volatility" quest)
3. A personalized coach prompt (e.g., "I noticed you were looking at high-dividend stocks. Want to see how inflation affects them in a 5-minute mission?")

Format as JSON:
{{
  "recommended_modules": [{{"module_id": 4, "reason": "..."}}],
  "mini_quest": {{"title": "...", "description": "..."}},
  "coach_prompt": "..."
}}"""

        try:
            response = await self.llm.a_call(user_prompt, system_prompt=system_prompt)
            # Parse JSON from response
            import json
            json_match = re.search(r'\{[^}]+\}', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except Exception as e:
            print(f"Error generating adaptive recommendation: {e}")
        
        # Fallback
        return {
            'recommended_modules': [
                {'module_id': 4, 'reason': 'Focus on risk management based on your recent activity'}
            ],
            'mini_quest': {
                'title': 'Risk and Volatility',
                'description': 'Learn how to identify and manage high-risk investments'
            },
            'coach_prompt': "I noticed you've been exploring different investment strategies. Let's dive deeper into risk management!"
        }
    
    def _format_lesson_context(self, content: List[Dict]) -> str:
        """Format lesson content as context string."""
        if not content:
            return "No relevant lesson content found."
        
        formatted = []
        for i, item in enumerate(content, 1):
            module_id = item.get('module_id', 'Unknown')
            section = item.get('section_title', item.get('headline', 'Content'))
            text = item.get('content') or item.get('summary', '')[:300]
            similarity = item.get('similarity', 0)
            
            formatted.append(
                f"[Module {module_id}] {section} (Relevance: {similarity:.1%})\n"
                f"{text}\n"
                f"---"
            )
        return "\n\n".join(formatted)
    
    def _parse_socratic_response(self, response: str) -> Dict[str, any]:
        """Parse Socratic response into structured format."""
        import re
        
        result = {
            'guidance': '',
            'hints': [],
            'think_about': []
        }
        
        # Extract GUIDANCE section
        guidance_match = re.search(r'GUIDANCE:\s*(.+?)(?=HINTS:|THINK ABOUT:|$)', response, re.DOTALL | re.IGNORECASE)
        if guidance_match:
            result['guidance'] = guidance_match.group(1).strip()
        else:
            result['guidance'] = response  # Fallback to full response
        
        # Extract HINTS section
        hints_match = re.search(r'HINTS:\s*(.+?)(?=THINK ABOUT:|$)', response, re.DOTALL | re.IGNORECASE)
        if hints_match:
            hints_text = hints_match.group(1).strip()
            # Split by numbered list or dashes
            hints = re.split(r'\d+\.|[-•]', hints_text)
            result['hints'] = [h.strip() for h in hints if h.strip()]
        
        # Extract THINK ABOUT section
        think_match = re.search(r'THINK ABOUT:\s*(.+?)$', response, re.DOTALL | re.IGNORECASE)
        if think_match:
            think_text = think_match.group(1).strip()
            result['think_about'] = [think_text]
        
        return result
