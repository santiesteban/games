import {access,cp,mkdir,rm,writeFile} from 'node:fs/promises';

const repository=new URL('../../',import.meta.url),pom=new URL('../',import.meta.url);
const site=new URL('_site/',repository);
const entries=[
  ['dist/','pom/'],
  ['creator/dist/','pom/creator/'],
  ['dist-playtest/','pom/playtest/'],
  ['v0.01/','pom/v0.01/'],
  ['v0.02/dist/','pom/v0.02/'],
  ['v0.03/dist/','pom/v0.03/'],
];
// Fail before replacing a prior preview if any of the builds is missing.
for(const [source]of entries)await access(new URL(`${source}index.html`,pom));
await rm(site,{recursive:true,force:true});
await mkdir(site,{recursive:true});
for(const [source,target]of entries){
  await cp(new URL(source,pom),new URL(target,site),{recursive:true});
}

// Keep old bookmarks and QR cards working, including their query and fragment.
for(const [old,target,label]of [
  ['v1','../v0.01/','Little Ledges v0.01'],
  ['v2','../v0.02/','Little Ledges v0.02'],
  ['v3','../v0.03/','Little Ledges v0.03'],
  ['v4','../','Little Ledges'],
]){
  const directory=new URL(`pom/${old}/`,site);
  await mkdir(directory,{recursive:true});
  await writeFile(new URL('index.html',directory),`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${label}</title><style>body{margin:0;background:#b4f5de;color:#292537;font:16px sans-serif;padding:24px}a{color:inherit}</style>
<script>const destination=new URL(${JSON.stringify(target)},location.href);destination.search=location.search;destination.hash=location.hash;location.replace(destination.href);</script>
</head><body><a href="${target}">Open ${label}</a></body></html>\n`);
}
await writeFile(new URL('.nojekyll',site),'');
console.log('Staged Little Ledges, Puzzle Creator, restricted player and archives in _site/.');
