// Two bounded page recipes, not an arbitrary DOM schema. Selector contracts live
// in the renderer; text and the explicitly supported configuration are data.
const text = { type: 'string', minLength: 1, maxLength: 2000 };
const object = properties => ({type:'object',additionalProperties:false,required:Object.keys(properties),properties});
const options = values => ({type:'array',minItems:values.length,maxItems:values.length,prefixItems:values.map(value=>object({value:{const:value},label:text})),items:false});
const common = {schemaVersion:{const:1},recipeVersion:{const:1},title:text,description:text};
export const formSchema = {
  $schema:'https://json-schema.org/draft/2020-12/schema',
  $id:'https://yrp.sh/foundation/shared-form-v1',
  oneOf:[
    object({...common,recipe:{const:'identity-entry'},variant:{const:'yrpid-v2'},
      eyebrow:text,passkeyLabel:text,emailActionLabel:text,divider:text,note:text,footer:text,
      email:object({label:text,help:text}),
      welcome:object({caption:text,description:text}),
      help:object({summary:text,paragraphs:{type:'array',items:text,minItems:1,maxItems:5}})}),
    object({...common,recipe:{const:'link-builder'},variant:{enum:['go-upstream','go-live']},
      actionLabel:text,ownershipNote:text,
      url:object({label:text,placeholder:text,maxLength:{type:'integer',minimum:1,maximum:1800}}),
      configuration:object({summary:text,legend:text,note:text,
        language:object({label:text,placeholder:text,help:text,maxLength:{const:12}}),
        mode:object({label:text,options:options(['','text','gallery','mosaic'])}),
        media:object({label:text,help:text,options:options(['','1','2','3','4'])}),
        spoilerLabel:text}),
      card:{anyOf:[{type:'null'},object({title:text,description:text,version:text,actionLabel:text,readiness:text,detailsLabel:text,sha256:{type:'string',pattern:'^[a-f0-9]{64}$'}})]}})
  ]
};
