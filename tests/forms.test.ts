import {test} from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {config} from '../server/config.js';
import {seed,normalize} from '../shared/recipes.js';
import {createFormBlueprint} from '../vendor/professional/creation/form-blueprints.js';
import {getCatalog} from '../vendor/professional/creation/blueprint.js';
import {projectDraftKey,readProjectDraft,writeProjectDraft,clearProjectDraft} from '../vendor/professional/react/project-drafts.ts';
test('actual Workbench preview/export use canonical generated data, without a service dependency',()=>{
  for(const variant of ['yrpid-v2','go-upstream','go-live'] as const){
    const d=seed();d.formBlueprint=createFormBlueprint(variant) as any;d.formBlueprint.title='A declarative heading';
    const preview=config.formRoute({path:'/api/form-preview',base:'/',method:'POST',input:d.formBlueprint} as any)!;
    const output=config.export({data:d} as any,'form-fixture')!;
    const files=unzipSync(output.body as Uint8Array);
    assert.match(String(preview.body),/A declarative heading/);assert.match(strFromU8(files['index.html']),/A declarative heading/);
    assert.doesNotMatch(strFromU8(files['index.html']),/<iframe|workbench\/api/);
    assert.match(strFromU8(files['README.md']),/sends no mail/);
    assert.ok(files['fixture.js']);assert.ok(files['form-blueprint.json']);
    assert.equal(Object.keys(files).some(name=>name.includes('PipBreeze')),false);
    assert.doesNotMatch(strFromU8(files['index.html']),/PipBreeze-Variable|Pip Breeze|YRP Display/);
  }
});
test('public preview cannot import font URLs from saved blueprint data or serve an excluded font',()=>{
  const blueprint=createFormBlueprint('yrpid-v2');
  assert.throws(()=>config.formRoute({path:'/api/form-preview',base:'/',method:'POST',input:{...blueprint,skin:{displayFont:{family:'Private Face',url:'/private-font.woff2'}}}} as any),/Invalid shared-form/);
  assert.throws(()=>config.formRoute({path:'/api/form-assets/yrpid/fonts/PipBreeze-Variable.woff2',base:'/',method:'GET'} as any),/Unknown form asset/);
});
test('legacy review-records remains explicit, available and unchanged by choosing a shared form',()=>{
  const old=seed('Old project');delete (old as any).formBlueprint;
  const normalized=normalize(old);assert.equal(normalized.formBlueprint,null);assert.deepEqual(normalized.blueprint,old.blueprint);
  assert.equal(getCatalog().sourceDigest,'sha256:eeee133fc481f8863bef11f22d94670112002ff5eeeb8d5d29cc32ead0d0b5d0');
  const output=config.export({data:normalized} as any,'application')!;const files=unzipSync(output.body as Uint8Array);
  assert.match(strFromU8(files['server/index.ts']),/createReviewServer/);assert.equal(JSON.parse(strFromU8(files['app-blueprint.json'])).schemaVersion,1);
  assert.throws(()=>normalize({...old,formBlueprint:{recipe:'arbitrary-tree'}}),/Invalid shared-form/);
});
test('tab-local drafts require the same account, project and revision and explicit discard clears raw source',()=>{
  const values=new Map<string,string>();const previous=globalThis.sessionStorage;
  Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});
  try{
    const a=projectDraftKey('workbench','synthetic-a','p1'),b=projectDraftKey('workbench','synthetic-b','p1');
    writeProjectDraft(a,4,{title:'Local draft'});assert.deepEqual(readProjectDraft(a,4),{title:'Local draft'});assert.equal(readProjectDraft(a,5),null);assert.equal(readProjectDraft(b,4),null);
    values.set(a+':form-source','{invalid draft');clearProjectDraft(a);assert.equal(values.size,0);
  }finally{Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:previous});}
});
