import React from 'react';
import {requireFormBlueprint} from './form-blueprints.js';
const h=React.createElement;
export function FormAction({label,...props}){return h('button',props,label);}
export function FormStatus(props){return h('p',{role:'status',...props});}
export function FormDisclosure({summary,children,...props}){return h('details',props,h('summary',null,summary),children);}
export function FormCard({children,...props}){return h('section',props,children);}
export function FormField({id,label,help,helpTag='small',helpClass,helpId,...control}) {
  const described=help?(helpId||id+'-hint'):undefined;
  const {options,...props}=control;
  const field=options?h('select',{id,name:id,'aria-describedby':described,...props},options.map(o=>h('option',{key:o.value,value:o.value},o.label))):h('input',{id,name:id,'aria-describedby':described,...props});
  return h(React.Fragment,null,h('label',{htmlFor:id},label),field,help&&h(helpTag,{id:described,className:helpClass},help));
}
// Only artwork/brand marks are trusted native slots. Forms, controls, actions,
// statuses, help, configuration and cards are always canonical generated nodes.
export function FormPage({blueprint,slots={},assetBase=''}) {
  const b=requireFormBlueprint(blueprint);
  if(b.recipe==='identity-entry')return h(React.Fragment,null,
    h('a',{className:'skip-link',href:'#main'},'Skip to content'),
    h('header',null,h('a',{className:'brand',href:'/', 'aria-label':'YRPid home'},h('img',{className:'brand-mark',src:assetBase+'yrpid/identity-mark.svg',width:44,height:44,alt:'','aria-hidden':true}),h('span',null,'YRPid',h('small',null,'by ',h('b',null,'YRP')))),h('button',{className:'theme-toggle',type:'button','data-pf-theme-toggle':''},h('span',{'aria-hidden':true},'◐'),' ',h('span',{'data-pf-theme-label':''},'System')),h('nav',{id:'account-nav','aria-label':'Account',hidden:true})),
    h('main',{id:'main',tabIndex:-1,className:'sign-in-layout'},
      h('div',{className:'welcome-art','aria-hidden':true},slots.welcomeArtwork,h('p',null,b.welcome.caption),h('span',null,b.welcome.description)),
      h(FormCard,{className:'sign-in-form','aria-labelledby':'title'},
        h('p',{className:'eyebrow'},h('span',{className:'status-dot','aria-hidden':true}),b.eyebrow),h('h1',{id:'title'},b.title),h('p',{id:'destination',className:'intro'},b.description),
        h('div',{id:'signed-in-state',hidden:true}),
        h('div',{id:'sign-in-controls'},h(FormAction,{id:'use-passkey',className:'primary',type:'button',label:b.passkeyLabel}),h('div',{className:'divider'},h('span',null,b.divider)),
          h('form',{id:'email-form'},h(FormField,{id:'email',type:'email',inputMode:'email',autoComplete:'username webauthn',required:true,...b.email,helpId:'email-help',helpTag:'p',helpClass:'field-help'}),h(FormAction,{id:'send-link',type:'submit',label:b.emailActionLabel})),h('p',{className:'sign-in-note'},b.note)),
        h(FormStatus,{id:'status',className:'notice','aria-live':'polite','aria-atomic':true,hidden:true}),
        h(FormDisclosure,{className:'sign-in-help',summary:b.help.summary},b.help.paragraphs.map((p,i)=>h('p',{key:i},p))))),h('footer',null,b.footer));
  const c=b.configuration;
  return h('main',null,
    h('button',{className:'theme-toggle',type:'button','data-pf-theme-toggle':''},h('span',{'aria-hidden':true},'◐'),' ',h('span',{'data-pf-theme-label':''},'System')),
    h('a',{className:'brand pf-brand',href:'/'},slots.brandMark,h('span',{className:'pf-brand-copy'},h('span',{className:'pf-brand-name'},'go.yrp.sh'),h('span',{className:'pf-brand-signature'},h('span',null,'by'),' ',h('b',null,'YRP')))),
    h('h1',null,b.title),h('p',null,b.description),
    h('form',{id:'wrap','data-api':'/api/links'},
      h(FormField,{id:'url',type:'url',label:b.url.label,placeholder:b.url.placeholder,required:true,maxLength:b.url.maxLength}),
      h(FormDisclosure,{className:'share-options',summary:c.summary},h('fieldset',null,h('legend',null,c.legend),
        h(FormField,{id:'preview-language',type:'text',...c.language}),h(FormField,{id:'preview-mode',...c.mode}),h(FormField,{id:'preview-media',...c.media}),
        h('label',{className:'spoiler-option',htmlFor:'preview-spoiler'},h('input',{id:'preview-spoiler',name:'preview-spoiler',type:'checkbox'}),c.spoilerLabel),h('small',null,c.note))),
      h(FormAction,{type:'submit',label:b.actionLabel})),
    h(FormStatus,{id:'status'}),h('a',{id:'result',hidden:true}),h('p',null,b.ownershipNote),
    b.card&&h(FormCard,{className:'android-card card','aria-labelledby':'android-title'},h('div',{className:'android-heading'},h('span',{className:'android-icon','aria-hidden':true},slots.cardIcon),h('h2',{id:'android-title'},b.card.title)),h('p',{className:'android-description'},b.card.description),h('p',{className:'android-version'},b.card.version),h(FormAction,{className:'android-download primary',type:'button',disabled:true,'aria-describedby':'android-readiness',label:b.card.actionLabel}),h('p',{id:'android-readiness',className:'android-note'},b.card.readiness),h(FormDisclosure,{className:'android-details',summary:b.card.detailsLabel},h('p',null,'SHA-256',h('br'),h('code',{className:'artifact-hash'},b.card.sha256)))));
}
