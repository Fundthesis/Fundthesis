"""Index Learning Modules for RAG.

Reads TypeScript content files, chunks by section, generates embeddings,
and stores in the LearningModule database table.
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any

from prisma import Prisma
from rag.learning_modules import get_module_extractor
from rag.embeddings import get_embed_service
from rag.vector_search import VectorSearchService

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


async def index_learning_modules():
    """
    Index all learning modules: extract, chunk, embed, and store in database.
    """
    db = Prisma()
    embed_service = get_embed_service()
    extractor = get_module_extractor()
    
    try:
        await db.connect()
        
        # Extract and chunk all modules
        logging.info("[Index Modules] Extracting module content...")
        all_chunks = extractor.extract_and_chunk_all()
        
        if not all_chunks:
            logging.warning("[Index Modules] No chunks extracted")
            return 0
        
        logging.info(f"[Index Modules] Extracted {len(all_chunks)} chunks from modules")
        
        # Generate embeddings for all chunks
        logging.info("[Index Modules] Generating embeddings...")
        texts = []
        for chunk in all_chunks:
            # Create searchable text: title + content
            searchable_text = f"{chunk['title']}\n\n{chunk['content']}"
            texts.append(searchable_text)
        
        embeddings = await embed_service.generate_embeddings_batch(texts)
        
        if len(embeddings) != len(all_chunks):
            logging.error(f"[Index Modules] Embedding count mismatch: {len(embeddings)} != {len(all_chunks)}")
            return 0
        
        # Store in database
        logging.info("[Index Modules] Storing chunks in database...")
        vector_service = VectorSearchService()
        await vector_service.connect()
        
        indexed_count = 0
        for chunk, embedding in zip(all_chunks, embeddings):
            if not embedding:
                logging.warning(f"[Index Modules] No embedding for chunk: {chunk['title']}")
                continue
            
            try:
                # Check if chunk already exists (by module_number, section_index, chunk_type)
                existing = await db.query_raw(
                    '''
                    SELECT id FROM "learning_modules"
                    WHERE module_number = $1
                      AND (section_index IS NULL AND $2::int IS NULL OR section_index = $2)
                      AND chunk_type = $3
                    LIMIT 1
                    ''',
                    chunk['module_number'],
                    chunk['section_index'],
                    chunk['chunk_type']
                )
                
                # Format embedding for PostgreSQL
                embedding_str = '[' + ','.join(map(str, embedding)) + ']'
                
                if existing and len(existing) > 0:
                    # Update existing
                    await db.execute_raw(
                        '''
                        UPDATE "learning_modules"
                        SET title = $1,
                            content = $2,
                            section_heading = $3,
                            url_path = $4,
                            embedding = $5::vector,
                            updated_at = NOW()
                        WHERE id = $6
                        ''',
                        chunk['title'],
                        chunk['content'],
                        chunk['section_heading'],
                        chunk['url_path'],
                        embedding_str,
                        existing[0]['id']
                    )
                    logging.debug(f"[Index Modules] Updated: {chunk['title']} - {chunk['chunk_type']}")
                else:
                    # Insert new
                    await db.execute_raw(
                        '''
                        INSERT INTO "learning_modules"
                        (id, module_number, section_index, section_heading, title, content, chunk_type, url_path, embedding, created_at, updated_at)
                        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::vector, NOW(), NOW())
                        ''',
                        chunk['module_number'],
                        chunk['section_index'],
                        chunk['section_heading'],
                        chunk['title'],
                        chunk['content'],
                        chunk['chunk_type'],
                        chunk['url_path'],
                        embedding_str
                    )
                    logging.debug(f"[Index Modules] Inserted: {chunk['title']} - {chunk['chunk_type']}")
                
                indexed_count += 1
            except Exception as e:
                logging.error(f"[Index Modules] Error storing chunk {chunk['title']}: {e}")
                continue
        
        await vector_service.disconnect()
        logging.info(f"[Index Modules] Successfully indexed {indexed_count} chunks")
        return indexed_count
        
    except Exception as e:
        logging.error(f"[Index Modules] Error during indexing: {e}")
        raise
    finally:
        await db.disconnect()


async def main():
    """Main entry point for indexing."""
    print("=" * 80)
    print("Learning Module Indexer")
    print("=" * 80)
    
    try:
        count = await index_learning_modules()
        print(f"\n✓ Successfully indexed {count} learning module chunks")
        return 0
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)

