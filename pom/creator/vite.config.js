import { defineConfig } from 'vite';
import {fileURLToPath} from 'node:url';
import {bundledFontLicenses} from '../shared/vite-plugins.js';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({ base: './', build:{rollupOptions:{input:{main:fileURLToPath(new URL('./index.html',import.meta.url)),admin:fileURLToPath(new URL('./community-admin.html',import.meta.url)),gallery:fileURLToPath(new URL('./community-gallery.html',import.meta.url))}}}, plugins:[tailwindcss(),bundledFontLicenses()],server: { fs: { allow: ['..'] } } });
