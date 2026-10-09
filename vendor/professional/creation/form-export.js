import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {FormPage} from './form-recipes.js';
import {requireFormBlueprint} from './form-blueprints.js';
import {bindFormCallbacks} from './form-runtime.js';
import {formSkinCSS} from './form-skin.js';
const h=React.createElement;
const manifest=JSON.parse(readFileSync(new URL('./form-assets/manifest.json',import.meta.url),'utf8'));
export function formAsset(name){
  if(!Object.hasOwn(manifest,name))throw new TypeError('Unknown form asset');
  return readFileSync(new URL('./form-assets/'+name,import.meta.url));
}
function artwork(name){
  const source=formAsset(name).toString(),match=source.match(/^<svg([^>]*)>([\s\S]*)<\/svg>$/);
  if(!match)throw new Error('Invalid trusted artwork');
  const attributes=Object.fromEntries([...match[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
  return h('svg',{...attributes,dangerouslySetInnerHTML:{__html:match[2]}});
}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
export function renderFormDocument(value,{assetBase='./assets/',fixtureURL='./fixture.js',nativeScriptURL,skin}={}){
  const b=requireFormBlueprint(value),variant=b.variant==='yrpid-v2'?'yrpid':b.variant;
  const slots=variant==='yrpid'?{welcomeArtwork:artwork('yrpid/welcome.svg')}:{brandMark:artwork(variant+'/brand.svg'),cardIcon:h('svg',{viewBox:'0 0 24 24'},h('rect',{x:6,y:2,width:12,height:20,rx:3}),h('path',{d:'M9 5h6m-3 4v7m-3-3 3 3 3-3'}))};
  const styles=variant==='yrpid'?['yrpid/style.css']:[variant+'/foundation/foundation.css',...(variant==='go-live'?['go-live/design/pip-ui.css']:[]),variant+'/style.css'];
  const theme=variant==='go-live'?`<script src="${escape(assetBase+'go-live/design/theme-boot.js')}"></script>`:'';
  const script=nativeScriptURL?`<script ${b.recipe==='identity-entry'?'type="module"':'defer'} src="${escape(nativeScriptURL)}"></script>`:`<script defer src="${escape(fixtureURL)}"></script>`;
  // YRPid's original absolute font URLs need only a transport-path substitution.
  // Public fixture skins use OFL display fallback; private/native skins stay app-owned.
  const css=variant==='yrpid'?'<style>'+formAsset('yrpid/style.css').toString().replaceAll('/assets/',assetBase+'yrpid/')+'</style>':styles.map(s=>`<link rel="stylesheet" href="${escape(assetBase+s)}">`).join('');
  const fontCSS=formSkinCSS(skin,b.variant);
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>'+escape(b.recipe==='identity-entry'?'Sign in · YRPid':'go.yrp.sh')+'</title>'+css+(fontCSS?'<style>'+fontCSS+'</style>':'')+theme+'</head><body class="'+(variant==='yrpid'?'yrpid':variant==='go-live'?'pip-ui':'')+'" data-shared-recipe="'+b.recipe+'">'+renderToStaticMarkup(h(FormPage,{blueprint:b,slots,assetBase}))+script+'</body></html>';
}
export function formFixtureScript(){
  // Classic external script also works from file://. No network or app effects.
  return `/* Generated UI fixture only. No authentication, mail or link transaction. */\nconst controller=new AbortController();\nconst fixture=async(value,signal)=>{await new Promise(resolve=>setTimeout(resolve,80));if(signal.aborted)throw new Error('Cancelled');return {message:'Fixture callback completed. No authentication or transaction was performed.'};};\nconst dispose=(${bindFormCallbacks.toString()})(document,document.body.dataset.sharedRecipe,{email:fixture,passkey:fixture,createLink:fixture},controller.signal);\nwindow.addEventListener('pagehide',()=>{controller.abort();dispose();},{once:true});\n`;
}
export function buildFormExport(value){
  const b=requireFormBlueprint(value),variant=b.variant==='yrpid-v2'?'yrpid':b.variant;
  const files={
    'index.html':Buffer.from(renderFormDocument(b)),
    'fixture.js':Buffer.from(formFixtureScript()),
    'form-blueprint.json':Buffer.from(JSON.stringify(b,null,2)+'\n'),
    'README.md':Buffer.from('# Generated shared-form fixture\n\nOpen index.html directly. This is a generated UI snapshot, with disposable fixture callbacks. It sends no mail, invokes no passkeys, performs no link transactions and needs no Workbench service. Copy stays in form-blueprint.json; regenerate through the bounded Workbench Shared forms editor.\n\nFor native integration keep the original app-owned scripts/services and attach them to the documented DOM contract. Binding names are not auth/domain adapters. Public fixtures use OFL Noto Sans/DM Sans or system fonts; YRPid and Go server-only display typography differs from their private native font. Pip Breeze binaries are excluded. Real apps may supply a validated runtime skin displayFont URL/family to renderFormDocument; runtime font URLs are never included by buildFormExport. The app supplies its own font rights, hosting and notices. Bundled OFL font notices remain in assets. Pip engine/canvas/storage remain app-owned.\n'),
    'LICENSE':readFileSync(new URL('../LICENSE',import.meta.url)),
    'asset-provenance.json':Buffer.from(JSON.stringify(Object.fromEntries(Object.entries(manifest).filter(([name])=>name.startsWith(variant+'/'))),null,2)+'\n')
  };
  for(const name of Object.keys(manifest))if(name.startsWith(variant+'/'))files['assets/'+name]=formAsset(name);
  return files;
}
