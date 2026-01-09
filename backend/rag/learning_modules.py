"""Learning Module Content Extractor.

Reads TypeScript content files directly from the frontend and extracts
structured learning module content for indexing and RAG retrieval.
"""

import os
import re
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


class LearningModuleExtractor:
    """Extracts learning module content from TypeScript files."""
    
    def __init__(self, frontend_path: Optional[str] = None):
        """
        Initialize extractor with path to frontend directory.
        
        Args:
            frontend_path: Path to Frontend directory. If None, tries to find it
                          relative to backend directory.
        """
        if frontend_path:
            self.frontend_path = Path(frontend_path)
        else:
            # Assume backend/rag/learning_modules.py, so Frontend is at ../../Frontend
            backend_dir = Path(__file__).parent.parent
            project_root = backend_dir.parent
            self.frontend_path = project_root / "Frontend"
        
        self.modules_path = self.frontend_path / "src" / "app" / "lessonmodules"
    
    def extract_module_content(self, module_number: int) -> Optional[Dict[str, Any]]:
        """
        Extract content from a single module's content.ts file.
        
        Args:
            module_number: Module number (1-9, or 10 for demo)
            
        Returns:
            Dict with module content or None if file not found
        """
        content_file = self.modules_path / str(module_number) / "content.ts"
        
        if not content_file.exists():
            logging.warning(f"Module {module_number} content file not found: {content_file}")
            return None
        
        try:
            content_text = content_file.read_text(encoding='utf-8')
            return self._parse_typescript_module(content_text, module_number)
        except Exception as e:
            logging.error(f"Error reading module {module_number}: {e}")
            return None
    
    def _parse_typescript_module(self, content: str, module_number: int) -> Dict[str, Any]:
        """
        Parse TypeScript module content into structured format.
        
        Args:
            content: Raw TypeScript file content
            module_number: Module number
            
        Returns:
            Structured module data
        """
        # Extract title
        title_match = re.search(r"title:\s*['\"]([^'\"]+)['\"]", content)
        title = title_match.group(1) if title_match else f"Module {module_number}"
        
        # Extract intro
        intro_match = re.search(r"intro:\s*['\"`]([^'\"`]+)['\"`]", content, re.DOTALL)
        intro = intro_match.group(1).strip() if intro_match else ""
        
        # Extract purpose
        purpose_match = re.search(r"purpose:\s*['\"`]([^'\"`]+)['\"`]", content, re.DOTALL)
        purpose = purpose_match.group(1).strip() if purpose_match else ""
        
        # Extract sections
        sections = []
        sections_match = re.search(r"sections:\s*\[(.*?)\]", content, re.DOTALL)
        if sections_match:
            sections_text = sections_match.group(1)
            # Find individual section objects
            section_pattern = r"\{\s*heading:\s*['\"`]([^'\"`]+)['\"`]\s*,\s*body:\s*['\"`]([^'\"`]+)['\"`]"
            for match in re.finditer(section_pattern, sections_text, re.DOTALL):
                heading = match.group(1)
                body = match.group(2).replace('\\n', '\n').strip()
                sections.append({
                    'heading': heading,
                    'body': body
                })
        
        # Extract keyPoints
        key_points = []
        keypoints_match = re.search(r"keyPoints:\s*\[(.*?)\]", content, re.DOTALL)
        if keypoints_match:
            keypoints_text = keypoints_match.group(1)
            # Extract individual key point strings
            for match in re.finditer(r"['\"`]([^'\"`]+)['\"`]", keypoints_text):
                key_points.append(match.group(1).strip())
        
        return {
            'module_number': module_number,
            'title': title,
            'intro': intro,
            'purpose': purpose,
            'sections': sections,
            'keyPoints': key_points,
            'url_path': f'/lessonmodules/{module_number}'
        }
    
    def extract_all_modules(self) -> List[Dict[str, Any]]:
        """
        Extract content from all available modules.
        
        Returns:
            List of module content dictionaries
        """
        modules = []
        
        # Extract modules 1-9 (and 10 if it has content)
        for module_num in range(1, 11):
            module_content = self.extract_module_content(module_num)
            if module_content:
                modules.append(module_content)
            else:
                logging.info(f"Skipping module {module_num} (no content file)")
        
        logging.info(f"Extracted {len(modules)} modules")
        return modules
    
    def chunk_module(self, module: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Chunk a module into separate pieces for embedding.
        
        Chunks by:
        - Module intro (separate chunk)
        - Module purpose (separate chunk)
        - Each section (heading + body as separate chunk)
        - Key points (combined into one chunk)
        
        Args:
            module: Module content dictionary
            
        Returns:
            List of chunk dictionaries with metadata
        """
        chunks = []
        module_number = module['module_number']
        title = module['title']
        url_path = module['url_path']
        
        # Chunk 1: Intro
        if module.get('intro'):
            chunks.append({
                'module_number': module_number,
                'section_index': None,
                'section_heading': None,
                'title': title,
                'content': module['intro'],
                'chunk_type': 'intro',
                'url_path': url_path
            })
        
        # Chunk 2: Purpose
        if module.get('purpose'):
            chunks.append({
                'module_number': module_number,
                'section_index': None,
                'section_heading': None,
                'title': title,
                'content': module['purpose'],
                'chunk_type': 'purpose',
                'url_path': url_path
            })
        
        # Chunks 3+: Sections
        for idx, section in enumerate(module.get('sections', [])):
            # Combine heading and body for better context
            section_content = f"{section['heading']}\n\n{section['body']}"
            chunks.append({
                'module_number': module_number,
                'section_index': idx,
                'section_heading': section['heading'],
                'title': title,
                'content': section_content,
                'chunk_type': 'section',
                'url_path': url_path
            })
        
        # Final chunk: Key Points (combined)
        if module.get('keyPoints'):
            key_points_text = '\n'.join([f"• {kp}" for kp in module['keyPoints']])
            chunks.append({
                'module_number': module_number,
                'section_index': None,
                'section_heading': None,
                'title': title,
                'content': f"Key Points:\n{key_points_text}",
                'chunk_type': 'keyPoints',
                'url_path': url_path
            })
        
        return chunks
    
    def extract_and_chunk_all(self) -> List[Dict[str, Any]]:
        """
        Extract all modules and chunk them for indexing.
        
        Returns:
            List of all chunks from all modules
        """
        modules = self.extract_all_modules()
        all_chunks = []
        
        for module in modules:
            chunks = self.chunk_module(module)
            all_chunks.extend(chunks)
            logging.info(f"Module {module['module_number']}: {len(chunks)} chunks")
        
        logging.info(f"Total chunks created: {len(all_chunks)}")
        return all_chunks


def get_module_extractor(frontend_path: Optional[str] = None) -> LearningModuleExtractor:
    """Get or create a module extractor instance."""
    return LearningModuleExtractor(frontend_path)


# Test function
if __name__ == "__main__":
    extractor = LearningModuleExtractor()
    modules = extractor.extract_all_modules()
    print(f"\nExtracted {len(modules)} modules")
    
    for module in modules:
        chunks = extractor.chunk_module(module)
        print(f"Module {module['module_number']}: {module['title']} - {len(chunks)} chunks")
        for chunk in chunks:
            print(f"  - {chunk['chunk_type']}: {chunk['content'][:50]}...")

