import { defineConfig } from 'vite';
import {bundledFontLicenses} from '../shared/vite-plugins.js';
export default defineConfig({ base: './', plugins:[bundledFontLicenses()],server: { fs: { allow: ['..'] } } });
