import type {FormBlueprint} from './form-recipes.js';
export const formRecipes:{id:'yrpid-v2'|'go-upstream'|'go-live';title:string;recipe:string}[];
export function createFormBlueprint(variant?:'yrpid-v2'|'go-upstream'|'go-live'):FormBlueprint;
export function validateFormBlueprint(value:unknown):{valid:boolean;errors:string[]};
export function requireFormBlueprint(value:unknown):FormBlueprint;
