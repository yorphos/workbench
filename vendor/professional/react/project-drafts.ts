// Opt-in tab-local draft recovery. Never keys by email, never writes server data,
// and never applies a draft to a different account/project or source revision.
export const projectDraftKey=(product:string,account:string,project:string)=>`yrp:draft:${product}:${account}:${project}`;
export function readProjectDraft(key:string,revision:number){
  try{const text=sessionStorage.getItem(key);if(!text)return null;const value=JSON.parse(text);return value.revision===revision&&value.data&&typeof value.data==='object'&&!Array.isArray(value.data)?value.data:null;}catch{return null;}
}
export function writeProjectDraft(key:string,revision:number,data:any){
  try{const text=JSON.stringify({revision,data});if(text.length<=100000)sessionStorage.setItem(key,text);}catch{}
}
export function clearProjectDraft(key:string,revision?:number){try{sessionStorage.removeItem(key);sessionStorage.removeItem(key+':form-source');if(revision!==undefined)sessionStorage.removeItem(key+':r'+revision+':form-source');}catch{}}
