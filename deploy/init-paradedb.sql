-- ParadeDB initial setup
-- This runs once when the database volume is first created.
-- Extensions are idempotent via IF NOT EXISTS.

CREATE EXTENSION IF NOT EXISTS pg_search;
