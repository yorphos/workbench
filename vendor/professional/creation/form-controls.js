import validator from './form-control-validator.js';
export function createShapeControls(){return {schemaVersion:1,recipeVersion:1,recipe:'pip-shape-controls',fields:[
  {key:'bodyWidth',label:'Width',help:'Shape proportion',min:60,max:140,step:1,unit:'%',ends:['Narrow','Wide']},
  {key:'bodyHeight',label:'Height',help:'Shape proportion',min:60,max:140,step:1,unit:'%',ends:['Squat','Tall']},
  {key:'roundness',label:'Softness',help:'Shape proportion',min:0,max:100,step:1,unit:'',ends:['Sculpted','Pillowy']}
]};}
export function validateShapeControls(value){const valid=validator(value);return {valid,errors:valid?[]:(validator.errors||[]).map(e=>`${e.instancePath||'/'} ${e.message}`)};}
// Native numeric behavior is an explicit app-owned primitive, not an opaque
// page/form. The shared data contract generates exactly three real controls;
// geometry/history/storage remain in the supplied callable host.
export function mountShapeControls(container,blueprint,adapter,signal){
  const report=validateShapeControls(blueprint);if(!report.valid)throw new TypeError('Invalid shape controls: '+report.errors.join('; '));
  if(typeof adapter?.mount!=='function'||['value','defaultValue','input','commit','reset'].some(key=>typeof adapter.host?.[key]!=='function'))throw new TypeError('Supply the native numeric primitive and real host callbacks');
  if(!signal||signal.aborted)throw new TypeError('Supply an active surface AbortSignal');
  let disposed=false;const host={...adapter.host};for(const key of ['input','commit','reset'])host[key]=(...args)=>{if(!disposed&&!signal.aborted)return adapter.host[key](...args);};
  const fields=blueprint.fields.map(field=>({...field,pairedRange:true}));
  const handle=adapter.mount(container,{fields,host,source:adapter.source,owner:adapter.owner});
  const dispose=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',dispose);handle.destroy();};
  if(signal.aborted)dispose();else signal.addEventListener('abort',dispose,{once:true});
  return {setContext:(...args)=>{if(!disposed)return handle.setContext(...args);},setOwner:(...args)=>{if(!disposed)return handle.setOwner(...args);},setValues:(...args)=>{if(!disposed)return handle.setValues(...args);},setHidden:(...args)=>{if(!disposed)return handle.setHidden(...args);},prepareExactSnapshot:()=>disposed?{ok:false,message:'Surface disposed'}:handle.prepareExactSnapshot(),destroy:dispose};
}
