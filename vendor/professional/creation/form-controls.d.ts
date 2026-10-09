export type ShapeControlKey='bodyWidth'|'bodyHeight'|'roundness';
export type ShapeControls={schemaVersion:1;recipeVersion:1;recipe:'pip-shape-controls';fields:{key:ShapeControlKey;label:string;help:string;min:number;max:number;step:1;unit:''|'%';ends:[string,string]}[]};
export type NumericHost={value(key:ShapeControlKey,owner:string):number;defaultValue(key:ShapeControlKey,owner:string):number;applicable?(key:ShapeControlKey,owner:string):boolean;input(key:ShapeControlKey,value:number,source:string,owner:string):void;commit():void;reset(key:ShapeControlKey,value:number,owner:string):void};
export type NumericHandle={setContext(source:string,owner:string):void;setOwner(owner:string):void;setValues(values:Partial<Record<ShapeControlKey,number>>):void;setHidden(key:ShapeControlKey,hidden:boolean):void;prepareExactSnapshot():{ok:boolean;message?:string;input?:HTMLInputElement};destroy():void};
export type NativeNumericAdapter={mount(container:HTMLElement,options:{fields:ShapeControls['fields'];host:NumericHost;source?:string;owner?:string}):NumericHandle;host:NumericHost;source?:string;owner?:string};
export function createShapeControls():ShapeControls;
export function validateShapeControls(value:unknown):{valid:boolean;errors:string[]};
export function mountShapeControls(container:HTMLElement,blueprint:ShapeControls,adapter:NativeNumericAdapter,signal:AbortSignal):NumericHandle;
