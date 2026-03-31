-- Create FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS "document_fts" USING fts5(
  id UNINDEXED,
  title,
  summary,
  fileName,
  content="Document",
  content_rowid="rowid"
);

-- Populate with existing documents
INSERT INTO document_fts(rowid, id, title, summary, fileName)
SELECT rowid, id, title, COALESCE(summary, ''), fileName FROM "Document";

-- Trigger: keep FTS in sync on INSERT
CREATE TRIGGER IF NOT EXISTS document_fts_insert AFTER INSERT ON "Document" BEGIN
  INSERT INTO document_fts(rowid, id, title, summary, fileName)
  VALUES (new.rowid, new.id, new.title, COALESCE(new.summary, ''), new.fileName);
END;

-- Trigger: keep FTS in sync on DELETE
CREATE TRIGGER IF NOT EXISTS document_fts_delete AFTER DELETE ON "Document" BEGIN
  INSERT INTO document_fts(document_fts, rowid, id, title, summary, fileName)
  VALUES ('delete', old.rowid, old.id, old.title, COALESCE(old.summary, ''), old.fileName);
END;

-- Trigger: keep FTS in sync on UPDATE
CREATE TRIGGER IF NOT EXISTS document_fts_update AFTER UPDATE ON "Document" BEGIN
  INSERT INTO document_fts(document_fts, rowid, id, title, summary, fileName)
  VALUES ('delete', old.rowid, old.id, old.title, COALESCE(old.summary, ''), old.fileName);
  INSERT INTO document_fts(rowid, id, title, summary, fileName)
  VALUES (new.rowid, new.id, new.title, COALESCE(new.summary, ''), new.fileName);
END;
