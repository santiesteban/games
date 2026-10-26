import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Keep the creator and its isolated player together during local development.
const creator=fileURLToPath(new URL('../',import.meta.url)),game=fileURLToPath(new URL('../../v4/',import.meta.url));
const children=[spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],{cwd:creator,stdio:'inherit'}),spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','playtest','--host','127.0.0.1','--port','5175','--strictPort'],{cwd:game,stdio:'inherit'})];
let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code}
for(const child of children){child.on('error',error=>{console.error(error.message);stop(1)});child.on('exit',code=>stop(code??0))}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
