const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const version = '2.6.0';
const url = `https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-${version}/winCodeSign-${version}.7z`;

// Use standard cache location for electron-builder on Windows
const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Local');
const cacheDir = path.join(localAppData, 'electron-builder', 'Cache', 'winCodeSign');
const targetDir = path.join(cacheDir, `winCodeSign-${version}`);
const archivePath = path.join(cacheDir, `winCodeSign-${version}.7z`);

// Ensure cache dir exists
if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
}

if (fs.existsSync(targetDir)) {
    console.log(`winCodeSign ${version} already installed in ${targetDir}. Skipping setup.`);
    process.exit(0);
}

function extract() {
    const sevenZipPath = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');
    try {
        if (fs.existsSync(targetDir)) {
            console.log('Target directory already exists, clearing...');
            fs.rmSync(targetDir, { recursive: true, force: true });
        }

        console.log(`Extracting to ${targetDir}...`);
        execSync(`"${sevenZipPath}" x "${archivePath}" -o"${targetDir}" -y -x!darwin`, { stdio: 'inherit' });
        console.log('Extraction completed successfully.');

        try {
            fs.unlinkSync(archivePath);
            console.log('Cleaned up archive.');
        } catch (e) {
            console.warn('Failed to delete archive (might be locked), ignoring.');
        }
    } catch (error) {
        console.error('Extraction failed:', error);
        process.exit(1);
    }
}

function download(fileUrl, destPath) {
    console.log(`Downloading winCodeSign from ${fileUrl}...`);

    // Check if we are starting fresh or redirect
    const file = fs.createWriteStream(destPath);

    https.get(fileUrl, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            console.log(`Redirecting to ${response.headers.location}...`);
            file.close();
            // The file is empty at this point
            download(response.headers.location, destPath);
            return;
        }

        if (response.statusCode !== 200) {
            console.error(`Download failed with status: ${response.statusCode}`);
            file.close();
            fs.unlink(destPath, () => { });
            process.exit(1);
            return;
        }

        response.pipe(file);

        file.on('finish', () => {
            file.close(() => {
                console.log('Download completed.');
                extract();
            });
        });
    }).on('error', (err) => {
        fs.unlink(destPath, () => { });
        console.error('Download error:', err.message);
        process.exit(1);
    });
}

download(url, archivePath);
