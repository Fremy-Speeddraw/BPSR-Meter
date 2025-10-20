/**
 * Build script to copy assets to dist folder
 * Run after TypeScript compilation
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to copy recursively
const dirsToCopy = [
    'tables',
    'algo',
    'translations'
];

// Individual files to copy
const filesToCopy = [
    'settings.json',
    'icon.ico',
    'icon.png'
];

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
}

console.log(' Copying assets to dist folder...\n');

// Copy directories
for (const dir of dirsToCopy) {
    const srcPath = path.join(__dirname, dir);
    const destPath = path.join(__dirname, 'dist', dir);
    
    if (fs.existsSync(srcPath)) {
        try {
            fs.cpSync(srcPath, destPath, { recursive: true });
            console.log(` Copied directory: ${dir}/`);
        } catch (error) {
            console.error(` Failed to copy directory ${dir}:`, error.message);
        }
    } else {
        console.warn(` Directory not found: ${dir}/`);
    }
}

console.log('');

// Copy individual files
for (const file of filesToCopy) {
    const srcPath = path.join(__dirname, file);
    const destPath = path.join(__dirname, 'dist', file);
    
    if (fs.existsSync(srcPath)) {
        try {
            fs.copyFileSync(srcPath, destPath);
            console.log(` Copied file: ${file}`);
        } catch (error) {
            console.error(` Failed to copy file ${file}:`, error.message);
        }
    } else {
        console.warn(`  File not found: ${file}`);
    }
}

console.log('\n Asset copying complete!\n');
