const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const buildDir = path.join(rootDir, 'build');

const removeDir = (dir) => {
    if (fs.existsSync(dir)) {
        console.log(`Removing ${dir}...`);
        try {
            fs.rmSync(dir, { recursive: true, force: true });
            console.log(`Removed ${dir}`);
        } catch (err) {
            console.error(`Error removing ${dir}:`, err);
            process.exit(1);
        }
    } else {
        console.log(`${dir} does not exist, skipping.`);
    }
};

removeDir(distDir);
removeDir(buildDir);
