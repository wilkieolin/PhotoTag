import aiosqlite

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS photos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path       TEXT NOT NULL UNIQUE,
    filename        TEXT NOT NULL,
    file_size       INTEGER NOT NULL,
    file_hash       TEXT NOT NULL,
    mime_type       TEXT NOT NULL,
    width           INTEGER,
    height          INTEGER,
    date_taken      TEXT,
    date_file       TEXT NOT NULL,
    latitude        REAL,
    longitude       REAL,
    altitude        REAL,
    camera_make     TEXT,
    camera_model    TEXT,
    lens_model      TEXT,
    focal_length    REAL,
    aperture        REAL,
    shutter_speed   TEXT,
    iso             INTEGER,
    orientation     INTEGER DEFAULT 1,
    thumbnail_path  TEXT,
    has_embedding   BOOLEAN DEFAULT FALSE,
    has_ai_tags     BOOLEAN DEFAULT FALSE,
    scan_id         INTEGER REFERENCES scans(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_photos_date_taken ON photos(date_taken);
CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(latitude, longitude)
    WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_file_hash ON photos(file_hash);
CREATE INDEX IF NOT EXISTS idx_photos_has_embedding ON photos(has_embedding);
CREATE INDEX IF NOT EXISTS idx_photos_has_ai_tags ON photos(has_ai_tags);

CREATE TABLE IF NOT EXISTS tags (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL UNIQUE COLLATE NOCASE,
    source          TEXT NOT NULL DEFAULT 'user',
    color           TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_tags_source ON tags(source);

CREATE TABLE IF NOT EXISTS photo_tags (
    photo_id        INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    tag_id          INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    confidence      REAL,
    source          TEXT NOT NULL DEFAULT 'user',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (photo_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_tags_tag_id ON photo_tags(tag_id);

CREATE TABLE IF NOT EXISTS scans (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    directory       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    total_files     INTEGER DEFAULT 0,
    processed_files INTEGER DEFAULT 0,
    new_photos      INTEGER DEFAULT 0,
    skipped_files   INTEGER DEFAULT 0,
    error_count     INTEGER DEFAULT 0,
    started_at      TEXT,
    completed_at    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS watched_directories (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    directory       TEXT NOT NULL UNIQUE,
    recursive       BOOLEAN DEFAULT TRUE,
    last_scanned    TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


async def init_database(db: aiosqlite.Connection):
    await db.executescript(SCHEMA_SQL)
    await db.commit()
