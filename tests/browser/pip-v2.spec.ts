import {test,expect} from '@playwright/test';
async function appearance(page:any,value:string){
 await page.locator('.header-links summary').click();await page.getByLabel('Editor appearance',{exact:true}).selectOption(value);await page.locator('.header-links summary').click();
}
async function start(page:any,name:string){
 await page.goto('app');await page.getByRole('button',{name:'New workspace',exact:true}).click();await page.getByLabel('Workspace name').fill(name);await page.getByRole('button',{name:'Create workspace',exact:true}).click();await page.getByRole('button',{name:'Create a project',exact:true}).click();await page.getByRole('textbox',{name:'Project name',exact:true}).fill(name);await page.getByRole('button',{name:'Create project',exact:true}).click();
}
test('whole Pip editor, generated preview and export share appearance, targets and responsive navigation',async({page},info)=>{
 await page.emulateMedia({reducedMotion:'reduce'});await start(page,'Pip language review '+info.project.name);
 await expect(page.getByRole('combobox',{name:'Typography',exact:true})).toHaveValue('Noto Sans');
 const first=page.getByRole('textbox',{name:'Project name',exact:true});
 await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.editor-panel')?.scrollTo(0,0);});
 const rect=await first.boundingBox();expect(rect!.y).toBeLessThan(650);expect(rect!.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await first.focus();await page.keyboard.press('Tab');
 expect(await page.evaluate(()=>getComputedStyle(document.activeElement!).outlineWidth)).toBe('3px');
 for(const tool of ['Theme','Patterns','States','Publish','Handoff','Blueprint']){
  await page.getByRole('button',{name:tool,exact:true}).click();await page.evaluate(()=>document.fonts.ready);
  if(tool==='Publish'){
   const heading=page.getByRole('img',{name:'Your composed release graphic'}).locator('foreignObject div');
   expect(await heading.evaluate(e=>getComputedStyle(e).fontFamily)).toContain('Noto Sans');
   expect(await page.evaluate(()=>document.fonts.check('700 64px "Noto Sans"'))).toBe(true);
  }
  await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.editor-panel')?.scrollTo(0,0);});
  for(const mode of ['light','dark']){await appearance(page,mode);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:info.outputPath(tool.toLowerCase()+'-'+mode+'.png'),animations:'disabled'});}
 }
 await page.getByRole('button',{name:'Patterns',exact:true}).click();
 for(const recipe of ['sign-in','settings','data-table','list-detail','navigation','multi-step','task-progress','change-review','outcome-receipt']){
  await page.getByRole('combobox',{name:'Interface recipe',exact:true}).selectOption(recipe);await expect(page.locator('.creation-preview .pf-ui')).toBeVisible();
  for(const mode of ['light','dark']){
   await appearance(page,mode);await page.getByRole('link',{name:'Preview',exact:true}).click();await page.evaluate(()=>document.fonts.ready);
   await page.locator('.creation-preview').screenshot({path:info.outputPath('recipe-'+recipe+'-'+mode+'.png'),animations:'disabled'});
  }
 }
 await page.getByRole('button',{name:'Shared forms',exact:true}).click();await page.getByLabel('Shared form recipe',{exact:true}).selectOption('go-live');
 const frame=page.frameLocator('iframe[title="Generated shared form"]');await expect(frame.locator('#wrap')).toBeVisible();
 for(const mode of ['light','dark']){
  await appearance(page,mode);await expect(frame.locator('html')).toHaveAttribute('data-pf-theme',mode);await expect(frame.locator('[data-pf-theme-label]')).toHaveText(mode==='dark'?'Dark':'Light');
  await page.evaluate(()=>document.fonts.ready);await frame.locator('body').evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>{scrollTo(0,0);document.querySelector('.editor-panel')?.scrollTo(0,0);document.querySelector('.preview-panel')?.scrollTo(0,0);});
  expect(await page.evaluate(()=>getComputedStyle(document.body).fontFamily)).toContain('Noto Sans');
  expect(await page.getByRole('button',{name:'Shared forms',exact:true}).evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgb(255, 214, 83)');
  await page.screenshot({path:info.outputPath('shared-editor-'+mode+'.png'),animations:'disabled'});
  await page.getByRole('link',{name:'Preview',exact:true}).click();await page.screenshot({path:info.outputPath('shared-preview-'+mode+'.png'),animations:'disabled'});
  if(await page.getByRole('button',{name:'Save changes',exact:true}).isEnabled())await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('button',{name:'Export',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Export',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.screenshot({path:info.outputPath('export-dialog-'+mode+'.png'),animations:'disabled'});await page.keyboard.press('Escape');
 }
 await frame.locator('[data-pf-theme-toggle]').click();await expect(page.locator('html')).toHaveAttribute('data-pf-theme','system');
 await appearance(page,'system');await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await expect(frame.locator('html')).toHaveAttribute('data-pf-theme','dark');
});
