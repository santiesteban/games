// Build-time addresses are independent of the game renderer and native wrappers.
const env=import.meta.env??{};
const directory=value=>new URL(value.endsWith('/')?value:`${value}/`);
export function deploymentUrls(current=location){
  const web=['http:','https:'].includes(current.protocol);
  const loopback=['localhost','127.0.0.1','[::1]'].includes(current.hostname);
  const installed=globalThis.littleLedgesPlatform?.version===1;
  // Capacitor may also use localhost, but without a development-server port.
  const local=web&&loopback&&Boolean(current.port)&&!installed;
  const publicSite=directory(env.VITE_PUBLIC_SITE_URL||'https://santiesteban.github.io/games/');
  // Game, creator and player now have different path depths. Find their shared
  // /pom/ boundary rather than assuming every app is two directories deep.
  const prefix=current.pathname?.match(/^(.*)\/pom(?:\/|$)/)?.[1];
  const site=env.VITE_PUBLIC_SITE_URL?publicSite:web&&!loopback&&!installed&&prefix!==undefined?new URL(`${prefix}/`,current.href):publicSite;
  const localUrl=port=>`${current.protocol}//${current.hostname}:${port}/`;
  const game=env.VITE_GAME_URL||(local?localUrl(5173):new URL('pom/',site).href);
  const creator=env.VITE_CREATOR_URL||(local?localUrl(5174):new URL('pom/creator/',site).href);
  const playtest=env.VITE_PLAYTEST_URL||(local?localUrl(5175):new URL('pom/playtest/',site).href);
  const share=env.VITE_SHARE_GAME_URL||(local||!web?new URL('pom/',publicSite).href:game);
  for(const value of [game,creator,playtest,share])if(!['https:','http:'].includes(new URL(value).protocol))throw new Error('Website addresses must use HTTP or HTTPS.');
  return Object.freeze({game,creator,playtest,share});
}
