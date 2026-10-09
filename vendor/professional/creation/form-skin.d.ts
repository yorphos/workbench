// Supplied by the app at runtime; runtime validation rejects CSS/URL injection.
export type FormSkinAdapter={displayFont?:{family:string;url:string;format?:'woff2'|'truetype'}};
export function formSkinCSS(skin:FormSkinAdapter|undefined,variant:'yrpid-v2'|'go-live'|'go-upstream'):string;
