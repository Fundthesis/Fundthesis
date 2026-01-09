-- Create learning_modules table for RAG
-- Ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the learning_modules table
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
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_learning_modules_module_number ON "learning_modules"(module_number);
CREATE INDEX IF NOT EXISTS idx_learning_modules_chunk_type ON "learning_modules"(chunk_type);

-- Create vector similarity index (HNSW for better performance)
CREATE INDEX IF NOT EXISTS idx_learning_modules_embedding ON "learning_modules" 
USING hnsw (embedding vector_cosine_ops);

-- Add comment
COMMENT ON TABLE "learning_modules" IS 'Learning module content chunks for RAG retrieval';
