// Explicit effect boundary for generated fixtures/application adapters. Native
// apps may instead attach their original scripts to the same selector contract.
export function bindFormCallbacks(document,recipe,callbacks,signal) {
  const expected=recipe==='identity-entry'?['email','passkey']:recipe==='link-builder'?['createLink']:null;
  if(!expected||expected.some(key=>typeof callbacks?.[key]!=='function'))throw new TypeError('Supply real callable recipe callbacks');
  if(!signal||typeof signal.addEventListener!=='function')throw new TypeError('Supply the surface AbortSignal');
  const listeners=[];let disposed=false;
  const status=document.getElementById('status');
  const listen=(node,type,fn)=>{if(!node)throw new TypeError('Missing recipe DOM contract');node.addEventListener(type,fn);listeners.push([node,type,fn]);};
  async function invoke(button,callback,value){
    if(disposed||signal.aborted||button.disabled)return;
    const label=button.textContent;button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Please wait…';
    try{const result=await callback(value,signal);if(disposed||signal.aborted)return;status.hidden=false;status.dataset.tone='success';status.textContent=result.message;if(result.url){const a=document.getElementById('result');a.textContent=result.url;a.href=result.url;a.hidden=false;}}
    catch(error){if(disposed||signal.aborted)return;status.hidden=false;status.dataset.tone='error';status.textContent=error.message||'This request could not finish. Try again.';}
    finally{if(!disposed&&!signal.aborted){button.disabled=false;button.removeAttribute('aria-busy');button.textContent=label;}}
  }
  if(recipe==='identity-entry'){
    const form=document.getElementById('email-form');listen(form,'submit',event=>{event.preventDefault();if(form.reportValidity())invoke(document.getElementById('send-link'),callbacks.email,{email:document.getElementById('email').value.trim()});});
    listen(document.getElementById('use-passkey'),'click',()=>invoke(document.getElementById('use-passkey'),callbacks.passkey,{}));
  }else{
    const form=document.getElementById('wrap');listen(form,'submit',event=>{event.preventDefault();if(form.reportValidity())invoke(form.querySelector('button'),callbacks.createLink,{url:document.getElementById('url').value,language:document.getElementById('preview-language').value,mode:document.getElementById('preview-mode').value,media:document.getElementById('preview-media').value,spoiler:document.getElementById('preview-spoiler').checked});});
  }
  const dispose=()=>{if(disposed)return;disposed=true;for(const[node,type,fn]of listeners)node.removeEventListener(type,fn);signal.removeEventListener('abort',dispose);};
  if(signal.aborted)dispose();else signal.addEventListener('abort',dispose,{once:true});
  return dispose;
}
