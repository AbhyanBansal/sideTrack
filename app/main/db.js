const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'library.db');
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT UNIQUE,
    title TEXT,
    artist TEXT,
    album TEXT,
    duration REAL,
    genre TEXT,
    year INTEGER,
    track_no INTEGER,
    artwork BLOB
  )
`);

// Migration: Add track_no if it doesn't exist (for existing databases)
try {
  db.exec('ALTER TABLE songs ADD COLUMN track_no INTEGER');
} catch (err) {
  // Column likely already exists or other error we can ignore for now if structure is correct
}

const stmtInsertSong = db.prepare(`
  INSERT OR REPLACE INTO songs (path, title, artist, album, duration, genre, year, track_no, artwork)
  VALUES (@path, @title, @artist, @album, @duration, @genre, @year, @track_no, @artwork)
`);

const stmtGetAllSongs = db.prepare('SELECT * FROM songs ORDER BY title ASC');

module.exports = {
  addSong: (song) => {
    try {
      stmtInsertSong.run(song);
    } catch (error) {
      console.error('Failed to add song:', error);
    }
  },
  getAllSongs: () => {
    return stmtGetAllSongs.all();
  },
  getArtists: () => {
    return db.prepare('SELECT DISTINCT artist, COUNT(*) as count FROM songs GROUP BY artist ORDER BY artist ASC').all();
  },
  getAlbums: () => {
    return db.prepare('SELECT DISTINCT album, artist, artwork FROM songs GROUP BY album ORDER BY album ASC').all();
  },
  getFolders: () => {
    // Since we don't store folder paths explicitly, we derive them from the file path
    // This is a bit expensive for large libraries, but fine for a mini player
    const songs = db.prepare('SELECT path FROM songs').all();
    const folders = new Set();
    songs.forEach(song => {
      folders.add(path.dirname(song.path));
    });
    return Array.from(folders).sort();
  },
  getSongsByArtist: (artist) => {
    return db.prepare('SELECT * FROM songs WHERE artist = ? ORDER BY title ASC').all(artist);
  },
  getSongsByAlbum: (album) => {
    return db.prepare('SELECT * FROM songs WHERE album = ? ORDER BY track_no ASC, title ASC').all(album); // Assumes we might add track_no later, but works for now
  },
  getSongsByFolder: (folderPath) => {
    // SQLite doesn't have a simple "starts with" for paths that handles directory boundaries perfectly,
    // but for now we can select all and filter in JS or use LIKE with caution.
    // Better approach: Select all songs where path starts with folderPath
    return db.prepare('SELECT * FROM songs WHERE path LIKE ? ORDER BY title ASC').all(`${folderPath}%`);
  }
};
