-- Trigram search (ADR-0002). Must exist before the gin_trgm_ops indexes in the next migration.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
