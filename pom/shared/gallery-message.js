// Keep the gallery-to-game handoff limited to the currently open gallery frame.
export function galleryImportUrl(event,frame,expectedOrigin){
  if(!frame||event.source!==frame||event.origin!==expectedOrigin||event.data?.type!=='little-ledges:gallery-import'||typeof event.data.url!=='string')return null;
  return event.data.url;
}
