"""Chunking service for breaking documents into semantic chunks."""

import re
from typing import List, Dict, Optional


class ChunkingService:
    """Service for chunking documents into semantic pieces."""
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize chunking service.
        
        Args:
            chunk_size: Target chunk size in characters (default: 500)
            chunk_overlap: Overlap between chunks in characters (default: 50)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def chunk_by_sentences(self, text: str, min_chunk_size: int = 100) -> List[Dict[str, any]]:
        """
        Chunk text by sentences with overlap.
        
        Uses sentence boundaries to create semantically meaningful chunks.
        Recommended for unstructured content (Azure best practice).
        
        Args:
            text: Text to chunk
            min_chunk_size: Minimum chunk size (chunks smaller than this are merged)
            
        Returns:
            List of chunk dictionaries with 'content', 'start_index', 'end_index'
        """
        if not text or not text.strip():
            return []
        
        # Split by sentence boundaries (., !, ? followed by space or end)
        sentences = re.split(r'([.!?]\s+|\.$)', text)
        
        # Recombine sentences with their punctuation
        combined_sentences = []
        for i in range(0, len(sentences) - 1, 2):
            if i + 1 < len(sentences):
                combined_sentences.append(sentences[i] + sentences[i + 1])
            else:
                combined_sentences.append(sentences[i])
        
        if len(sentences) % 2 == 1:
            combined_sentences.append(sentences[-1])
        
        # Filter empty sentences
        combined_sentences = [s.strip() for s in combined_sentences if s.strip()]
        
        if not combined_sentences:
            return []
        
        chunks = []
        current_chunk = []
        current_size = 0
        start_index = 0
        
        for i, sentence in enumerate(combined_sentences):
            sentence_size = len(sentence)
            
            # If adding this sentence would exceed chunk_size, save current chunk
            if current_size + sentence_size > self.chunk_size and current_chunk:
                chunk_text = ' '.join(current_chunk)
                if len(chunk_text) >= min_chunk_size:
                    chunks.append({
                        'content': chunk_text,
                        'start_index': start_index,
                        'end_index': start_index + len(chunk_text),
                        'chunk_index': len(chunks)
                    })
                
                # Start new chunk with overlap
                # Keep last N sentences for overlap
                overlap_sentences = []
                overlap_size = 0
                for s in reversed(current_chunk):
                    if overlap_size + len(s) <= self.chunk_overlap:
                        overlap_sentences.insert(0, s)
                        overlap_size += len(s) + 1  # +1 for space
                    else:
                        break
                
                current_chunk = overlap_sentences
                current_size = sum(len(s) for s in current_chunk) + len(current_chunk) - 1
                start_index = start_index + len(' '.join(current_chunk[:len(current_chunk) - len(overlap_sentences)])) if current_chunk else start_index + len(chunk_text)
            
            current_chunk.append(sentence)
            current_size += sentence_size + 1  # +1 for space between sentences
        
        # Add final chunk
        if current_chunk:
            chunk_text = ' '.join(current_chunk)
            if len(chunk_text) >= min_chunk_size:
                chunks.append({
                    'content': chunk_text,
                    'start_index': start_index,
                    'end_index': start_index + len(chunk_text),
                    'chunk_index': len(chunks)
                })
        
        return chunks
    
    def chunk_by_paragraphs(self, text: str) -> List[Dict[str, any]]:
        """
        Chunk text by paragraphs.
        
        Useful for structured content with clear paragraph breaks.
        
        Args:
            text: Text to chunk
            
        Returns:
            List of chunk dictionaries
        """
        if not text:
            return []
        
        paragraphs = text.split('\n\n')
        chunks = []
        
        for i, para in enumerate(paragraphs):
            para = para.strip()
            if para:
                chunks.append({
                    'content': para,
                    'chunk_index': i,
                    'start_index': text.find(para),
                    'end_index': text.find(para) + len(para)
                })
        
        return chunks
    
    def chunk_fixed_size(self, text: str) -> List[Dict[str, any]]:
        """
        Chunk text into fixed-size pieces with overlap.
        
        Fallback method when sentence/paragraph boundaries aren't available.
        
        Args:
            text: Text to chunk
            
        Returns:
            List of chunk dictionaries
        """
        if not text:
            return []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = min(start + self.chunk_size, len(text))
            chunk_text = text[start:end]
            
            chunks.append({
                'content': chunk_text,
                'start_index': start,
                'end_index': end,
                'chunk_index': len(chunks)
            })
            
            # Move start forward with overlap
            start = end - self.chunk_overlap
        
        return chunks

