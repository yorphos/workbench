import {useEffect,useRef,useState} from 'react';
import {Field} from '../vendor/professional/react/studio';
import {createFormBlueprint,formRecipes,validateFormBlueprint} from '../vendor/professional/creation/form-blueprints.js';
import type {FormBlueprint} from '../vendor/professional/creation/form-recipes.js';
import type {EditorProps} from '../vendor/professional/react/studio';
import type {Appearance} from '../vendor/professional/react/appearance';
const base=import.meta.env.BASE_URL;
export function FormEditor({data,onChange,draftKey}:EditorProps){
  const key=draftKey?draftKey+':form-source':null;
  const initial=useRef(true);
  const [candidate,setCandidate]=useState<any>(()=>{
    try{const saved=key&&sessionStorage.getItem(key);if(saved)return JSON.parse(saved);}catch{}
    return data.formBlueprint;
  });
  const [source,setSource]=useState(()=>{try{return (key&&sessionStorage.getItem(key))||JSON.stringify(candidate,null,2);}catch{return JSON.stringify(candidate,null,2);}}),[sourceError,setSourceError]=useState('');
  useEffect(()=>{if(initial.current){initial.current=false;return;}setCandidate(data.formBlueprint);setSource(JSON.stringify(data.formBlueprint,null,2));setSourceError('');},[data.formBlueprint,key]);
  const report=candidate===null?{valid:true,errors:[]}:validateFormBlueprint(candidate);
  function edit(next:any){
    setCandidate(next);setSource(JSON.stringify(next,null,2));
    if(key)try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}
    if(validateFormBlueprint(next).valid)onChange({...data,formBlueprint:next});
  }
  const copy=(name:string,value:string)=>edit({...candidate,[name]:value});
  return <>
    <p className="editor-description">Generate a bounded native form from shared controls. The preview and export use disposable fixture callbacks.</p>
    <Field label="Shared form recipe"><select aria-label="Shared form recipe" value={data.formBlueprint?.variant||''} onChange={e=>{if(e.target.value){setSourceError('');edit(createFormBlueprint(e.target.value as any));}}}>
      <option value="">Choose a recipe</option>{formRecipes.map(r=><option key={r.id} value={r.id}>{r.title}</option>)}
    </select></Field>
    {candidate&&typeof candidate==='object'&&candidate.recipe===data.formBlueprint?.recipe&&<>
      <section className="form-section"><h3>Content</h3>
      <Field label="Generated heading"><input value={candidate.title??''} onChange={e=>copy('title',e.target.value)}/></Field>
      <Field label="Generated description"><textarea value={candidate.description??''} onChange={e=>copy('description',e.target.value)}/></Field>
      </section>
      {candidate.recipe==='identity-entry'?<section className="form-section"><h3>Identity form</h3>
        <Field label="Email field label"><input value={candidate.email?.label??''} onChange={e=>edit({...candidate,email:{...candidate.email,label:e.target.value}})}/></Field>
        <Field label="Email guidance"><textarea value={candidate.email?.help??''} onChange={e=>edit({...candidate,email:{...candidate.email,help:e.target.value}})}/></Field>
        <Field label="Passkey action label"><input value={candidate.passkeyLabel??''} onChange={e=>copy('passkeyLabel',e.target.value)}/></Field>
        <Field label="Email action label"><input value={candidate.emailActionLabel??''} onChange={e=>copy('emailActionLabel',e.target.value)}/></Field>
        <Field label="Help disclosure label"><input value={candidate.help?.summary??''} onChange={e=>edit({...candidate,help:{...candidate.help,summary:e.target.value}})}/></Field>
      </section>:<section className="form-section"><h3>Link & configuration</h3>
        <Field label="URL field label"><input value={candidate.url?.label??''} onChange={e=>edit({...candidate,url:{...candidate.url,label:e.target.value}})}/></Field>
        <Field label="URL placeholder"><input value={candidate.url?.placeholder??''} onChange={e=>edit({...candidate,url:{...candidate.url,placeholder:e.target.value}})}/></Field>
        <Field label="Create action label"><input value={candidate.actionLabel??''} onChange={e=>copy('actionLabel',e.target.value)}/></Field>
        <Field label="Configuration disclosure label"><input value={candidate.configuration?.summary??''} onChange={e=>edit({...candidate,configuration:{...candidate.configuration,summary:e.target.value}})}/></Field>
        <Field label="Language guidance"><textarea value={candidate.configuration?.language?.help??''} onChange={e=>edit({...candidate,configuration:{...candidate.configuration,language:{...candidate.configuration.language,help:e.target.value}}})}/></Field>
        {candidate.card&&<Field label="Companion card heading"><input value={candidate.card.title??''} onChange={e=>edit({...candidate,card:{...candidate.card,title:e.target.value}})}/></Field>}
      </section>}
    </>}
    {!report.valid&&<p role="alert">Draft retained; the last valid generated screen remains visible. {report.errors.join(' ')}</p>}
    {data.formBlueprint&&<details><summary>Advanced shared-form blueprint</summary>
      <Field label="Shared-form blueprint JSON"><textarea rows={12} value={source} onChange={e=>{setSource(e.target.value);if(key)try{sessionStorage.setItem(key,e.target.value);}catch{}}}/></Field>
      <button type="button" onClick={()=>{try{const next=JSON.parse(source),validation=validateFormBlueprint(next);if(!validation.valid){setSourceError(validation.errors.join(' '));return;}edit(next);setSourceError('');}catch{setSourceError('Use valid shared-form JSON.');}}}>Apply form draft</button>
      {sourceError&&<p role="alert">{sourceError} Working content was preserved.</p>}
    </details>}
  </>;
}
export function FormPreview({blueprint,appearance,onAppearanceChange}:{blueprint:FormBlueprint|null;appearance:"light"|"dark";onAppearanceChange?:(value:Appearance)=>void}){
  const [html,setHTML]=useState(''),[error,setError]=useState('');
  const frame=useRef<HTMLIFrameElement>(null),appearanceCallback=useRef(onAppearanceChange);appearanceCallback.current=onAppearanceChange;
  useEffect(()=>{const element=frame.current;if(!element)return;let observer:MutationObserver|undefined;
    const observe=()=>{observer?.disconnect();const root=element.contentDocument?.documentElement;if(!root)return;observer=new MutationObserver(()=>{const mode=root.dataset.pfTheme;if(mode==='system'||mode==='light'||mode==='dark')appearanceCallback.current?.(mode);});observer.observe(root,{attributes:true,attributeFilter:['data-pf-theme']});};
    element.addEventListener('load',observe);observe();return ()=>{observer?.disconnect();element.removeEventListener('load',observe);};
  },[html]);
  useEffect(()=>{
    if(!blueprint||!validateFormBlueprint(blueprint).valid)return;
    const abort=new AbortController();
    fetch(base+'api/form-preview?appearance='+appearance,{method:'POST',headers:{'Content-Type':'application/json','X-Studio-Request':'1'},body:JSON.stringify(blueprint),signal:abort.signal}).then(async response=>{
      if(!response.ok)throw new Error((await response.json()).error||'Could not generate this screen.');
      const body=await response.text();if(!abort.signal.aborted){setHTML(body);setError('');}
    }).catch(e=>{if(!abort.signal.aborted)setError(e.message);});
    return ()=>abort.abort();
  },[blueprint,appearance]);
  const report=blueprint&&validateFormBlueprint(blueprint);
  if(!blueprint)return <p className="creation-preview">Choose a shared form recipe to generate its screen.</p>;
  if(!report?.valid)return <p role="alert">{report?.errors.join(' ')}</p>;
  return <><p className="preview-label">Generated shared recipe · fixture callbacks · native domain adapters stay app-owned.</p>{error&&<p role="alert">{error}</p>}{html?<iframe ref={frame} className="generated-form-preview" title="Generated shared form" srcDoc={html}/>:<p role="status">Generating the shared form…</p>}</>;
}
