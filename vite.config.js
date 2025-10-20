import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Plugin to copy static assets
function copyAssetsPlugin() {
    return {
        name: 'copy-assets',
        writeBundle() {
            const publicDir = path.resolve(__dirname, 'dist/public');
            
            // Copy icons
            const srcIcons = path.resolve(__dirname, 'src/icons');
            const destIcons = path.resolve(publicDir, 'icons');
            if (fs.existsSync(srcIcons)) {
                fs.cpSync(srcIcons, destIcons, { recursive: true });
                console.log('✓ Copied icons/');
            }
            
            // Copy CSS
            const srcCss = path.resolve(__dirname, 'src/css');
            const destCss = path.resolve(publicDir, 'css');
            if (fs.existsSync(srcCss)) {
                fs.cpSync(srcCss, destCss, { recursive: true });
                console.log('✓ Copied css/');
            }
        }
    };
}

export default defineConfig({
    root: 'src',
    publicDir: false, // We'll manually copy icons and css
    build: {
        outDir: '../dist/public',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, 'src/index.html'),
                group: path.resolve(__dirname, 'src/group.html'),
                history: path.resolve(__dirname, 'src/history.html')
            },
            output: {
                entryFileNames: 'js/[name].js',
                chunkFileNames: 'js/assets/[name]-[hash].js',
                assetFileNames: 'assets/[name]-[hash][extname]'
            }
        }
    },
    plugins: [
        copyAssetsPlugin()
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/renderer')
        }
    }
});
