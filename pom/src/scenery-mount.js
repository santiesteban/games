// Translate the complete set, including its shadow decals and inspection data.
// Puzzle coordinates and shared meshes remain untouched.
export function mountSceneryToPuzzle({objects,reference,bounds,contacts=[],pickRecords=[]},wallZ,thickness){
  // Seat the rear cardboard into the wall, leaving only a small recess behind
  // the front plane. This removes the visible stand-off at oblique views.
  const recess=Math.min(thickness,.005),offset=-recess-wallZ;
  for(const object of objects)object.pos3D.z+=offset;
  for(const point of reference.points)point.z+=offset;
  for(const contact of contacts)contact.z+=offset;
  for(const record of pickRecords)for(const point of record.corners)point.z+=offset;
  if(bounds){bounds.back+=offset;bounds.front+=offset}
  reference.authoredDistance=reference.distance;
  reference.distance=recess;
  reference.mountOffset=offset;
  reference.wallZ=wallZ+offset;
  return reference;
}
