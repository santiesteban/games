export const INTERACTION_REVISION=1;
export function adoptStackedInteraction(saved,flags){
  return saved?.interactionRevision===INTERACTION_REVISION?flags:{...flags,stackedPieceButtons:true,pieceDragArrows:false};
}
