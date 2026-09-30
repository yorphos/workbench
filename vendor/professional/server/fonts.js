import {readFileSync} from 'node:fs';
import {escapeHTML} from '../shared/model.js';
const fonts=[400,500,600,700].map((weight,index)=>({weight,index,bytes:readFileSync(new URL(`../web/fonts/font-${index}.ttf`,import.meta.url))}));
const license=readFileSync(new URL('../web/fonts/dmsans-OFL.txt',import.meta.url),'utf8');
export const fontStyles=fonts.map(font=>`@font-face{font-family:"DM Sans";src:url(data:font/ttf;base64,${font.bytes.toString('base64')}) format("truetype");font-weight:${font.weight};font-style:normal}`).join('\n');
export function embedHTMLFonts(html){return html.replace('</head>',`<style>${fontStyles}</style><meta name="font-license" content="${escapeHTML(license)}"></head>`);}
export function embedSVGFonts(svg){return svg.replace(/(<svg[^>]*>)/,`$1<style>${fontStyles}</style><metadata>${escapeHTML(license)}</metadata>`);}
export function starterFonts(){return {...Object.fromEntries(fonts.map(font=>[`src/fonts/font-${font.index}.ttf`,new Uint8Array(font.bytes)])), 'src/fonts/OFL.txt':new TextEncoder().encode(license)};}
export const starterFontStyles=fonts.map(font=>`@font-face{font-family:"DM Sans";src:url(./fonts/font-${font.index}.ttf) format("truetype");font-weight:${font.weight};font-style:normal}`).join('\n');
