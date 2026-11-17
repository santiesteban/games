export const POM_EYE_STYLES=['classic','bright','crazy','circle'];
export function isPomEyeStyle(value){return POM_EYE_STYLES.includes(value)}
export function resolvePomEyeStyle(value,legacyBright=false){
  return isPomEyeStyle(value)?value:legacyBright?'bright':'classic';
}
