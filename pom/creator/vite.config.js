import { defineConfig } from 'vite';
import {fileURLToPath} from 'node:url';
import {bundledFontLicenses} from '../shared/vite-plugins.js';
export default defineConfig({ base: './', build:{rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),admin:fileURLToPath(new URL('./community-admin.html',import.meta.url)),gallery:fileURLToPath(new URL('./community-gallery.html',import.meta.url))}}}, plugins:[bundledFontLicenses()],server: { fs: { allow: ['..'] } } });
