// App-owned runtime input, never a blueprint field or an exported font bundle.
// Fixed selectors/roles avoid arbitrary CSS. Validate before serializing CSS.
export function formSkinCSS(skin,variant){
  if(skin===undefined)return '';
  if(!skin||typeof skin!=='object'||Array.isArray(skin)||Object.keys(skin).some(k=>k!=='displayFont'))throw new TypeError('Invalid form skin adapter');
  if(skin.displayFont===undefined)return '';
  const font=skin.displayFont;
  if(!font||typeof font!=='object'||Array.isArray(font)||Object.keys(font).some(k=>!['family','url','format'].includes(k)))throw new TypeError('Invalid app-owned display font');
  const {family,url,format='woff2'}=font;
  if(typeof family!=='string'||! /^[A-Za-z][A-Za-z0-9 -]{0,63}$/.test(family)||family!==family.trim())throw new TypeError('Invalid display font family');
  if(typeof url!=='string'||!url||url.length>2048||! /^[A-Za-z0-9._~:/?&=+%\[\]-]+$/.test(url)||url.startsWith('//')||/%(?:0[0-9a-f]|1[0-9a-f]|7f|22|27|3c|3e|5c)/i.test(url))throw new TypeError('Invalid display font URL');
  const absolute=/^[a-z][a-z0-9+.-]*:/i.test(url),parsed=new URL(url,'https://app.invalid/');
  if(parsed.username||parsed.password||parsed.hash||(!absolute&&url.includes(':'))||!(parsed.protocol==='https:'||(parsed.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(parsed.hostname))))throw new TypeError('Use an app-owned HTTPS, loopback or relative font URL');
  if(!['woff2','truetype'].includes(format))throw new TypeError('Unsupported display font format');
  const role=variant==='yrpid-v2'?'.yrpid{--id-font-display:':variant==='go-live'?'.pip-ui{--pip-font-display:':null;
  if(!role)throw new TypeError('This form variant has no display-font adapter');
  return '@font-face{font-family:'+JSON.stringify(family)+';src:url('+JSON.stringify(url)+') format('+JSON.stringify(format)+');font-weight:300 700;font-style:normal;font-display:swap}'+role+JSON.stringify(family)+',system-ui,sans-serif}';
}
