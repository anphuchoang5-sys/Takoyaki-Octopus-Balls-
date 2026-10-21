import {parseTown,exportTown} from './persistence.js';
export function createTownDocument({state,environment,assetIds,onApplied=()=>{}}) {
  let applying=false;
  const stop=state.subscribe(event=>{
    if(event.reason==='undo'&&event.undoContext?.environment)environment.set(event.undoContext.environment);
  });
  return{get applying(){return applying;},
    exportJSON:()=>exportTown(state.getLayout(),environment.get()),
    importJSON(input){
      // Both halves are fully checked before any material, layout or save changes.
      const next=parseTown(input,assetIds,environment.get()),previous=environment.get();
      applying=true;
      try{
        environment.set(next.environment);
        state.loadLayout(next.layout,{undoContext:{environment:previous}});
      }catch(error){environment.set(previous);throw error;}
      finally{applying=false;}
      onApplied();
      return next;
    },dispose:stop};
}
