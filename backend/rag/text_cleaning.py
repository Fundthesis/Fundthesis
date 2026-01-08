"""Text cleaning utilities for RAG preprocessing."""

import re
import unicodedata
from typing import Optional


class TextCleaner:
    """Text cleaning service for consistent preprocessing before embedding."""
    
    @staticmethod
    def clean_text(text: str, lowercase: bool = True, normalize_unicode: bool = True) -> str:
        """
        Clean text for embedding.
        
        Args:
            text: Raw text to clean
            lowercase: Whether to lowercase (default: True)
            normalize_unicode: Whether to normalize Unicode (default: True)
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Normalize Unicode (NFD normalization, remove combining marks)
        if normalize_unicode:
            text = unicodedata.normalize('NFD', text)
            text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
        
        # Lowercase
        if lowercase:
            text = text.lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        text = text.strip()
        
        return text
    
    @staticmethod
    def clean_for_embedding(text: str) -> str:
        """
        Clean text specifically for embedding generation.
        Uses same cleaning as chunks to ensure query-chunk matching.
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text ready for embedding
        """
        return TextCleaner.clean_text(text, lowercase=True, normalize_unicode=True)
    
    @staticmethod
    def clean_for_display(text: str) -> str:
        """
        Light cleaning for display purposes (preserves case).
        
        Args:
            text: Text to clean
            
        Returns:
            Cleaned text for display
        """
        # Only normalize whitespace, preserve case
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

