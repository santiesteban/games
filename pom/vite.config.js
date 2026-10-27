import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {bundledFontLicenses} from './shared/vite-plugins.js';
export default defineConfig(({mode,command})=>{
  const playtest=mode==='playtest';
  const number=process.env.GITHUB_RUN_NUMBER??new Date().toISOString().replace(/[-:]/g,'').replace('T','.').slice(0,15);
  let revision=process.env.GITHUB_SHA?.slice(0,7);
  if(!revision)try{revision=execFileSync('git',['rev-parse','--short','HEAD'],{cwd:fileURLToPath(new URL('.',import.meta.url)),encoding:'utf8'}).trim()}catch{revision='local'}
  const build={number,revision,development:command==='serve'};
  return {base:'./',cacheDir:`node_modules/.vite-${playtest?'playtest':'game'}`,define:{__PLAYTEST_BUILD__:JSON.stringify(playtest),__BUILD_INFO__:JSON.stringify(build)},
    resolve:{alias:{'#level-catalog':fileURLToPath(new URL(playtest?'./src/playtest-catalog.js':'./src/game-catalog.js',import.meta.url))}},
    server:{fs:{allow:['.']}},build:{outDir:playtest?'dist-playtest':'dist'},
    plugins:[bundledFontLicenses(),{name:'playtest-entry',transformIndexHtml:{order:'pre',handler(html){return playtest?html.replace('./src/game-entry.js','./src/playtest-entry.js').replace('<title>Little Ledges</title>','<title>Puzzle Playtest · Little Ledges</title>'):html}}}]};
});
