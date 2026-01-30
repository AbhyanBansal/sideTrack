const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const db = require('./db');
const scanner = require('./scanner');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 350,
        height: 250,
        resizable: false,
        maximizable: false,
        alwaysOnTop: true,
        frame: false,       // Remove default OS frame
        transparent: true,  // Enable transparency
        hasShadow: false,   // Disable default shadow (we'll use CSS)
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
    });

    const startUrl = isDev
        ? 'http://localhost:3000'
        : `file://${path.join(__dirname, '../../build/renderer/index.html')}`;

    mainWindow.loadURL(startUrl);

    if (isDev) {
        // mainWindow.webContents.openDevTools({ mode: 'detach' });
    }

    mainWindow.on('closed', () => (mainWindow = null));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});


app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('scan-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });

    if (!result.canceled && result.filePaths.length > 0) {
        const folderPath = result.filePaths[0];
        await scanner.scanDirectory(folderPath, mainWindow);
        return db.getAllSongs();
    }
    return null;
});

ipcMain.handle('get-songs', () => {
    return db.getAllSongs();
});

ipcMain.handle('get-artists', () => db.getArtists());
ipcMain.handle('get-albums', () => db.getAlbums());
ipcMain.handle('get-folders', () => db.getFolders());

ipcMain.handle('get-songs-by-artist', (event, artist) => db.getSongsByArtist(artist));
ipcMain.handle('get-songs-by-album', (event, album) => db.getSongsByAlbum(album));
ipcMain.handle('get-songs-by-folder', (event, folder) => db.getSongsByFolder(folder));

ipcMain.handle('refresh-library', async () => {
    // 1. Sync Deletions
    const allSongs = db.getAllSongs();
    for (const song of allSongs) {
        if (!fs.existsSync(song.path)) {
            db.deleteSong(song.id);
        }
    }

    // 2. Sync Additions (Rescan existing folders)
    const folders = db.getFolders();
    for (const folder of folders) {
        if (fs.existsSync(folder)) {
            await scanner.scanDirectory(folder, mainWindow);
        }
    }

    return db.getAllSongs();
});

ipcMain.handle('clean-library', () => {
    db.clearAllSongs();
    return [];
});
