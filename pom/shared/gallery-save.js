// Do not overwrite a different revision (or reset its completion) without review.
export async function saveGalleryPuzzle(puzzle, storage, now=Date.now()){
  const existing=await storage('puzzles','get',puzzle.id);
  if(existing)return existing.puzzle.revision===puzzle.revision?'already-saved':'review-update';
  await storage('puzzles','put',{id:puzzle.id,puzzle,updatedAt:now,completed:false});
  return 'added';
}
