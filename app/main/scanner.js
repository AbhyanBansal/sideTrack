const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
const db = require('./db');
const { webContents } = require('electron');

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];

async function scanDirectory(dirPath, mainWindow) {
    if (!fs.existsSync(dirPath)) return;

    const files = fs.readdirSync(dirPath);

    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            await scanDirectory(fullPath, mainWindow);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (AUDIO_EXTENSIONS.includes(ext)) {
                try {
                    const metadata = await mm.parseFile(fullPath);
                    const picture = metadata.common.picture ? metadata.common.picture[0] : null;

                    let artwork = null;
                    if (picture) {
                        // Simplify artwork storage for now - just base64 is easiest to transmit to renderer, 
                        // but for DB maybe blob is better. Let's store as Buffer (BLOB).
                        artwork = picture.data;
                    }

                    const song = {
                        path: fullPath,
                        title: metadata.common.title || path.basename(file, ext),
                        artist: metadata.common.artist || 'Unknown Artist',
                        album: metadata.common.album || 'Unknown Album',
                        duration: metadata.format.duration || 0,
                        genre: metadata.common.genre ? metadata.common.genre[0] : null,
                        year: metadata.common.year || null,
                        track_no: metadata.common.track ? metadata.common.track.no : null,
                        artwork: artwork
                    };

                    db.addSong(song);

                    // Optional: Send progress update to renderer if needed
                    if (mainWindow && !mainWindow.isDestroyed()) {
                        mainWindow.webContents.send('scan-progress', song.title);
                    }

                } catch (err) {
                    console.error(`Error parsing ${fullPath}:`, err);
                }
            }
        }
    }
}

module.exports = {
    scanDirectory
};
