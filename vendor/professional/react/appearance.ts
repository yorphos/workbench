import {useEffect,useState} from 'react';
export type Appearance='system'|'light'|'dark';
export function resolvedAppearance(): 'light'|'dark' {
  if(typeof document==='undefined')return 'light';
  const mode=document.documentElement.dataset.pfTheme;
  return mode==='dark'||(mode!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';
}
export function useAppearance(product='workbench'){
  const [mode,setMode]=useState<Appearance>('system'),[dark,setDark]=useState(false);
  useEffect(()=>{
    const key='yrp:'+product+':appearance';
    try{const saved=localStorage.getItem(key);if(['system','light','dark'].includes(saved||''))document.documentElement.dataset.pfTheme=saved!;}catch{}
    const update=()=>{const value=document.documentElement.dataset.pfTheme;setMode(value==='dark'||value==='light'?value:'system');setDark(resolvedAppearance()==='dark');};
    const observer=new MutationObserver(update),media=matchMedia('(prefers-color-scheme: dark)');
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-pf-theme']});media.addEventListener('change',update);update();
    return ()=>{observer.disconnect();media.removeEventListener('change',update);};
  },[product]);
  const setAppearance=(value:Appearance)=>{document.documentElement.dataset.pfTheme=value;try{localStorage.setItem('yrp:'+product+':appearance',value);}catch{}};
  return {mode,dark,setAppearance};
}
