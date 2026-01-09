"""Create learning_modules table using Prisma raw SQL execution."""

import asyncio
import os
from prisma import Prisma

async def create_learning_modules_table():
    """Create the learning_modules table in the database."""
    db = Prisma()
    
    try:
        await db.connect()
        
        # Create pgvector extension if not exists
        await db.execute_raw("CREATE EXTENSION IF NOT EXISTS vector")
        print("✓ pgvector extension ensured")
        
        # Create the learning_modules table
        await db.execute_raw("""
            CREATE TABLE IF NOT EXISTS "learning_modules" (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                module_number INTEGER NOT NULL,
                section_index INTEGER,
                section_heading TEXT,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                chunk_type TEXT NOT NULL CHECK (chunk_type IN ('intro', 'purpose', 'section', 'keyPoints')),
                url_path TEXT NOT NULL,
                embedding vector(1536),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """)
        print("✓ learning_modules table created")
        
        # Create indexes
        await db.execute_raw("""
            CREATE INDEX IF NOT EXISTS idx_learning_modules_module_number 
            ON "learning_modules"(module_number)
        """)
        print("✓ Index on module_number created")
        
        await db.execute_raw("""
            CREATE INDEX IF NOT EXISTS idx_learning_modules_chunk_type 
            ON "learning_modules"(chunk_type)
        """)
        print("✓ Index on chunk_type created")
        
        # Create vector similarity index (HNSW for better performance)
        try:
            await db.execute_raw("""
                CREATE INDEX IF NOT EXISTS idx_learning_modules_embedding 
                ON "learning_modules" USING hnsw (embedding vector_cosine_ops)
            """)
            print("✓ Vector index created")
        except Exception as e:
            print(f"⚠ Vector index creation failed (may already exist): {e}")
            # Try with ivfflat as fallback
            try:
                await db.execute_raw("""
                    CREATE INDEX IF NOT EXISTS idx_learning_modules_embedding_ivfflat 
                    ON "learning_modules" USING ivfflat (embedding vector_cosine_ops)
                    WITH (lists = 100)
                """)
                print("✓ Vector index created with ivfflat")
            except Exception as e2:
                print(f"⚠ Fallback vector index also failed: {e2}")
        
        print("\n✓ learning_modules table and indexes created successfully!")
        return True
        
    except Exception as e:
        print(f"✗ Error creating table: {e}")
        return False
    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(create_learning_modules_table())

