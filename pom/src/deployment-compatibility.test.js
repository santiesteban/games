import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

test('staged old Home Screen address serves the current game in place with shared assets',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'little-ledges-install-'));
 try{
  const scripts=path.join(root,'pom/scripts');fs.mkdirSync(scripts,{recursive:true});
  const script=path.join(scripts,'stage-site.mjs');fs.copyFileSync(new URL('../scripts/stage-site.mjs',import.meta.url),script);
  const html='<!doctype html><html><head><script src="./assets/game.js"></script></head><body id="current-game">Game</body></html>';
  for(const name of ['dist','creator/dist','dist-playtest','v0.01','v0.02/dist','v0.03/dist']){const dir=path.join(root,'pom',name);fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'index.html'),html)}
  execFileSync(process.execPath,[script],{cwd:root});
  const legacy=fs.readFileSync(path.join(root,'_site/pom/v4/index.html'),'utf8'),current=fs.readFileSync(path.join(root,'_site/pom/index.html'),'utf8');
  assert(legacy.includes('id="current-game"'));assert(!/location\.(replace|assign)|http-equiv=["']refresh/i.test(legacy));assert.equal(current,html);
  const entry=new URL('https://santiesteban.github.io/games/pom/v4/');
  const base=new URL(legacy.match(/<base href="([^"]+)"/)[1],entry);
  assert.equal(new URL('./assets/game.js',base).href,'https://santiesteban.github.io/games/pom/assets/game.js');
 }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test('the deployed manifest keeps the current app identity, launch URL and scope',()=>{
 const manifest=JSON.parse(fs.readFileSync(new URL('../public/manifest.webmanifest',import.meta.url))),url=new URL('https://santiesteban.github.io/games/pom/manifest.webmanifest'),start=new URL(manifest.start_url,url),scope=new URL(manifest.scope,url),id=new URL(manifest.id??start.href,start.origin);
 assert.equal(start.href,'https://santiesteban.github.io/games/pom/');assert.equal(scope.href,start.href);assert.equal(id.href,start.href);assert.equal(manifest.display,'standalone');
 assert(new URL('./v4/',url).href.startsWith(scope.href));
});
