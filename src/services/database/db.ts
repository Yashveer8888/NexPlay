import { open, DB } from '@op-engineering/op-sqlite';
import { VideoItem } from '../../types/video';
import { VaultVideoItem } from '../native/NexPlayFileManager';

let dbInstance: DB | null = null;

export const getDb = (): DB => {
  if (!dbInstance) {
    dbInstance = open({
      name: 'nexplay.db',
    });
  }
  return dbInstance;
};

export const initDatabase = async (): Promise<void> => {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      uri TEXT NOT NULL,
      path TEXT NOT NULL,
      filename TEXT NOT NULL,
      size REAL NOT NULL,
      duration REAL NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      mimeType TEXT NOT NULL,
      dateAdded REAL NOT NULL,
      dateModified REAL NOT NULL,
      folder TEXT NOT NULL,
      lastPosition REAL DEFAULT 0,
      isFinished INTEGER DEFAULT 0,
      lastPlayedAt REAL DEFAULT 0,
      playCount INTEGER DEFAULT 0,
      thumbnailUri TEXT
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      createdAt REAL NOT NULL,
      updatedAt REAL NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS playlist_videos (
      playlistId TEXT NOT NULL,
      videoId TEXT NOT NULL,
      addedAt REAL NOT NULL,
      orderIndex INTEGER NOT NULL,
      PRIMARY KEY (playlistId, videoId),
      FOREIGN KEY (playlistId) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (videoId) REFERENCES videos(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      videoId TEXT NOT NULL,
      timestamp REAL NOT NULL,
      title TEXT NOT NULL,
      createdAt REAL NOT NULL,
      FOREIGN KEY (videoId) REFERENCES videos(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS vault_videos (
      id TEXT PRIMARY KEY,
      originalPath TEXT NOT NULL,
      originalFolder TEXT NOT NULL,
      vaultPath TEXT NOT NULL,
      filename TEXT NOT NULL,
      size REAL NOT NULL,
      duration REAL NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      mimeType TEXT NOT NULL,
      dateAdded REAL NOT NULL,
      thumbnailUri TEXT,
      dateMoved REAL NOT NULL
    );
  `);
};

export const syncScannedVideosToDb = async (videos: VideoItem[]): Promise<void> => {
  const db = getDb();

  for (const v of videos) {
    await db.execute(
      `
      INSERT INTO videos (
        id, uri, path, filename, size, duration, width, height, mimeType, dateAdded, dateModified, folder
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        uri=excluded.uri,
        path=excluded.path,
        filename=excluded.filename,
        size=excluded.size,
        duration=excluded.duration,
        width=excluded.width,
        height=excluded.height,
        mimeType=excluded.mimeType,
        dateModified=excluded.dateModified,
        folder=excluded.folder;
    `,
      [
        v.id,
        v.uri,
        v.path,
        v.filename,
        v.size,
        v.duration,
        v.width,
        v.height,
        v.mimeType,
        v.dateAdded,
        v.dateModified,
        v.folder,
      ]
    );
  }
};

export const updateVideoPlaybackState = async (
  id: string,
  positionMs: number,
  durationMs: number
): Promise<void> => {
  const db = getDb();
  const now = Date.now();
  const isFinished = durationMs > 0 && positionMs >= durationMs - 5000 ? 1 : 0;

  await db.execute(
    `
    UPDATE videos SET
      lastPosition = ?,
      isFinished = ?,
      lastPlayedAt = ?,
      playCount = playCount + 1
    WHERE id = ?;
  `,
    [positionMs, isFinished, now, id]
  );
};

export const updateVideoThumbnail = async (id: string, thumbnailUri: string): Promise<void> => {
  const db = getDb();
  await db.execute(
    `UPDATE videos SET thumbnailUri = ? WHERE id = ?;`,
    [thumbnailUri, id]
  );
};

export const getAllSavedVideos = async (): Promise<VideoItem[]> => {
  const db = getDb();
  const res = await db.execute(`SELECT * FROM videos ORDER BY dateModified DESC;`);

  if (!res.rows) return [];

  return res.rows.map((row: any) => ({
    id: String(row.id),
    uri: String(row.uri),
    path: String(row.path),
    filename: String(row.filename),
    size: Number(row.size),
    duration: Number(row.duration),
    width: Number(row.width),
    height: Number(row.height),
    mimeType: String(row.mimeType),
    dateAdded: Number(row.dateAdded),
    dateModified: Number(row.dateModified),
    folder: String(row.folder),
    lastPosition: Number(row.lastPosition || 0),
    isFinished: Boolean(row.isFinished),
    lastPlayedAt: Number(row.lastPlayedAt || 0),
    playCount: Number(row.playCount || 0),
    thumbnailUri: row.thumbnailUri ? String(row.thumbnailUri) : undefined,
  }));
};

export const getVaultPin = async (): Promise<string | null> => {
  const db = getDb();
  const res = await db.execute(`SELECT value FROM vault_settings WHERE key = 'vault_pin';`);
  if (res.rows && res.rows.length > 0) {
    return String((res.rows[0] as any).value);
  }
  return null;
};

export const setVaultPin = async (pin: string): Promise<void> => {
  const db = getDb();
  await db.execute(
    `INSERT INTO vault_settings (key, value) VALUES ('vault_pin', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [pin]
  );
};

export const saveVideosToVaultDb = async (items: VaultVideoItem[]): Promise<void> => {
  const db = getDb();
  for (const item of items) {
    await db.execute(
      `
      INSERT INTO vault_videos (
        id, originalPath, originalFolder, vaultPath, filename, size, duration, width, height, mimeType, dateAdded, thumbnailUri, dateMoved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        vaultPath = excluded.vaultPath,
        dateMoved = excluded.dateMoved;
      `,
      [
        item.id,
        item.originalPath,
        item.originalFolder,
        item.vaultPath,
        item.filename,
        item.size,
        item.duration,
        item.width,
        item.height,
        item.mimeType,
        item.dateAdded,
        item.thumbnailUri || null,
        item.dateMoved,
      ]
    );
    await db.execute(`DELETE FROM videos WHERE id = ?;`, [item.id]);
  }
};

export const removeVideosFromVaultDb = async (ids: string[]): Promise<void> => {
  const db = getDb();
  for (const id of ids) {
    await db.execute(`DELETE FROM vault_videos WHERE id = ?;`, [id]);
  }
};

export const getAllVaultVideos = async (): Promise<VaultVideoItem[]> => {
  const db = getDb();
  const res = await db.execute(`SELECT * FROM vault_videos ORDER BY dateMoved DESC;`);
  if (!res.rows) return [];
  return res.rows.map((row: any) => ({
    id: String(row.id),
    originalPath: String(row.originalPath),
    originalFolder: String(row.originalFolder),
    vaultPath: String(row.vaultPath),
    filename: String(row.filename),
    size: Number(row.size),
    duration: Number(row.duration),
    width: Number(row.width),
    height: Number(row.height),
    mimeType: String(row.mimeType),
    dateAdded: Number(row.dateAdded),
    thumbnailUri: row.thumbnailUri ? String(row.thumbnailUri) : undefined,
    dateMoved: Number(row.dateMoved),
  }));
};

export const deleteVideosFromDb = async (ids: string[]): Promise<void> => {
  const db = getDb();
  for (const id of ids) {
    await db.execute(`DELETE FROM videos WHERE id = ?;`, [id]);
  }
};

export const deleteFoldersFromDb = async (folders: string[]): Promise<void> => {
  const db = getDb();
  for (const folder of folders) {
    await db.execute(`DELETE FROM videos WHERE folder = ?;`, [folder]);
  }
};
