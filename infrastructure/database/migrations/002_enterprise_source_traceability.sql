BEGIN;

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS source_record_id text,
  ADD COLUMN IF NOT EXISTS source_version text;

CREATE INDEX IF NOT EXISTS ix_documents_source_record
  ON knowledge_documents (source_system, source_record_id)
  WHERE source_record_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_documents_source_record_version
  ON knowledge_documents (source_system, source_record_id, version)
  WHERE source_record_id IS NOT NULL;

COMMIT;
