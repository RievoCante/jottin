CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE notes ADD COLUMN embedding vector(768);

CREATE INDEX ON notes USING hnsw (embedding vector_cosine_ops);
