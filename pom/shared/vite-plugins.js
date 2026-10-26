import {readFileSync} from 'node:fs';

export function bundledFontLicenses(){
  return {name:'bundled-font-licenses',generateBundle(){
    const source=['dmsans','dmmono','nunito'].map(name=>`${name}\n${readFileSync(new URL(`./fonts/${name}-OFL.txt`,import.meta.url),'utf8')}`).join('\n\n');
    this.emitFile({type:'asset',fileName:'font-licenses.txt',source});
  }};
}
