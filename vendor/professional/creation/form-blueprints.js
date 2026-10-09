import validator from './form-validator.js';
export const formRecipes = [
  {id:'yrpid-v2',title:'YRPid · identity entry',recipe:'identity-entry'},
  {id:'go-upstream',title:'Go · upstream link builder',recipe:'link-builder'},
  {id:'go-live',title:'Go · server-only link builder',recipe:'link-builder'}
];
export function validateFormBlueprint(value) {
  const valid=validator(value);
  const branch=value?.recipe==='identity-entry'?0:value?.recipe==='link-builder'?1:null;
  const errors=(validator.errors||[]).filter(e=>branch===null||e.schemaPath.startsWith('#/oneOf/'+branch+'/'));
  return {valid,errors:valid?[]:(errors.length?errors:validator.errors||[]).map(e=>`${e.instancePath||'/'} ${e.message}`)};
}
export function requireFormBlueprint(value) {
  const report=validateFormBlueprint(value);
  if(!report.valid)throw new TypeError('Invalid shared-form blueprint: '+report.errors.join('; '));
  return value;
}
export function createFormBlueprint(variant='yrpid-v2') {
  if(!formRecipes.some(r=>r.id===variant))throw new TypeError('Unsupported form variant');
  const common={schemaVersion:1,recipeVersion:1};
  if(variant==='yrpid-v2')return {...common,recipe:'identity-entry',variant,
    title:'Welcome in.',description:'Sign in to your YRP account.',eyebrow:'Your YRP identity',
    passkeyLabel:'Sign in with a passkey',emailActionLabel:'Send a sign-in link',divider:'or use your email',
    email:{label:'Email address',help:'Use the email approved for your account.'},
    note:'No password needed. Email links last five minutes.',
    welcome:{caption:'A familiar way in.',description:'One identity, across your YRP apps.'},
    help:{summary:'Need a hand?',paragraphs:[
      'Open the latest sign-in link in your email. If it expires or has already been used, request a new one here.',
      'Lost a passkey? Use your verified email, then add a replacement in your account. If you cannot access that email, contact your account operator.',
      'New here? Access must be approved by the account operator. An email link also completes your first sign-in when eligible.'
    ]},footer:'One identity for YRP. Each app keeps its own access and data.'};
  return {...common,recipe:'link-builder',variant,title:'Create a short link',
    description:'Share a compact link that opens the original. Supported posts include a rich preview.',
    actionLabel:'Create short link',ownershipNote:'Only the owner can create links. Shared links open without signing in.',
    url:{label:'Original URL',placeholder:'https://x.com/example/status/123456789',maxLength:1800},
    configuration:{summary:'Preview options for X',legend:'Optional preview settings',
      language:{label:'Translate to (language code)',placeholder:'es, ja, en',maxLength:12,help:'Leave blank for the original language. Translation depends on the source.'},
      mode:{label:'Layout',options:[{value:'',label:'Standard'},{value:'text',label:'Text only'},{value:'gallery',label:'Gallery'},{value:'mosaic',label:'Mosaic when available'}]},
      media:{label:'Media selection',help:'Single media works with Standard or Gallery.',options:[{value:'',label:'All media'},...['1','2','3','4'].map(value=>({value,label:'Media '+value}))]},
      spoilerLabel:'Hide preview behind a spoiler',note:'These settings change the preview. Visitors still open the original post.'},
    card:variant==='go-live'?{"title": "Go for Android", "description": "Share links to Go from your Android phone.", "version": "Version 0.2.0 \u00b7 Android 8 or later", "actionLabel": "Download Android app", "readiness": "Download not ready. This APK is unsigned. Native sign-in and automatic sharing are inactive.", "detailsLabel": "Build details", "sha256": "6a6e481eec170e9085df785c48231e50151dab0c2e589057b3534418f124001a"}:null};
}
