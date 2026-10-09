import type {Buffer} from 'node:buffer';
import type {FormBlueprint} from './form-recipes.js';
import type {FormSkinAdapter} from './form-skin.js';
export type FormDocumentOptions={assetBase?:string;fixtureURL?:string;nativeScriptURL?:string;skin?:FormSkinAdapter};
export function renderFormDocument(value:FormBlueprint,options?:FormDocumentOptions):string;
export function formAsset(name:string):Buffer;
export function formFixtureScript():string;
// Portable exports always use public OFL/system fonts; app-owned skin URLs stay runtime-only.
export function buildFormExport(value:FormBlueprint):Record<string,Buffer>;
