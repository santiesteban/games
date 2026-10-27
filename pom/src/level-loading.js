// Only the most recently requested puzzle can reveal a scene or show an error.
// Downloads can finish and remain cached after cancellation, without reopening it.
export function createLevelLoadGate(onState){
  let revision=0;
  return {
    isCurrent:id=>id===revision,
    cancel(){onState('idle',null,++revision)},
    async run(prepare){
      const id=++revision;onState('loading',null,id);
      try{await prepare();if(id===revision)onState('ready',null,id)}
      catch(error){if(id===revision)onState('error',error,id)}
    },
  };
}
