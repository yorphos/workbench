export type CallbackResult={message:string;url?:string};
export type IdentityCallbacks={email(value:{email:string},signal:AbortSignal):Promise<CallbackResult>;passkey(value:Record<string,never>,signal:AbortSignal):Promise<CallbackResult>};
export type LinkCallbacks={createLink(value:{url:string;language:string;mode:string;media:string;spoiler:boolean},signal:AbortSignal):Promise<CallbackResult>};
export function bindFormCallbacks(document:Document,recipe:'identity-entry',callbacks:IdentityCallbacks,signal:AbortSignal):()=>void;
export function bindFormCallbacks(document:Document,recipe:'link-builder',callbacks:LinkCallbacks,signal:AbortSignal):()=>void;
