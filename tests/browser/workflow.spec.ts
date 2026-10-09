import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { unzipSync, strFromU8 } from "fflate";
test("public repertoire is responsive, branded, and keyboard usable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator(".hero-copy > div > h1")).toBeVisible();
  await expect(page.locator(".studio-header .pf-brand-signature")).toHaveText(
    "by YRP",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".header-links summary").click();
  await page.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Try the materials" }),
  ).toBeVisible();
  await page.keyboard.press("Tab");
  expect(await page.locator(":focus").count()).toBe(1);
  await page.screenshot({
    path: "test-results/public-" + test.info().project.name + ".png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Switch to dark appearance", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-pf-theme", "dark");
  await page
    .getByRole("button", { name: "Switch to light appearance", exact: true })
    .click();
  expect(errors).toEqual([]);
});
test("account workflow saves, publishes, comments, exports and invites safely", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("app");
  await page
    .getByRole("button", { name: "New workspace", exact: true })
    .click();
  await page.getByLabel("Workspace name").fill("QA " + Date.now());
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create a project", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Project name", exact: true })
    .fill("A coherent engagement");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  await expect(
    page
      .locator(".project-heading")
      .getByRole("heading", { level: 1, name: "A coherent engagement" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: /^(Project|Publication) name$/ })
    .fill("A considered revision");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Saved · Revision 2")).toBeVisible();
  if(await page.locator(".project-actions summary").isVisible())await page.locator(".project-actions summary").click();
  await page
    .getByRole("button", { name: "Publish for review", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review & evidence", exact: true })
    .click();
  await page
    .getByLabel("Add a comment")
    .fill("The revised materials are ready for a closer look.");
  await page.getByRole("button", { name: "Add comment", exact: true }).click();
  await expect(
    page.getByText("The revised materials are ready for a closer look."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Portable project kit", exact: true })
    .click();
  const download = await downloaded;
  const file = await download.path();
  const kit = unzipSync(await readFile(file!));
  expect(JSON.parse(strFromU8(kit["project.json"])).name).toBe(
    "A considered revision",
  );
  await page.keyboard.press("Escape");
  if (await page.locator(".workspace-drawer > summary").isVisible()) {
    await expect(page.locator(".workspace-drawer")).not.toHaveAttribute("open", "");
    await page.locator(".workspace-drawer > summary").click();
    await expect(page.locator(".workspace-drawer")).toHaveAttribute("open", "");
  }
  await page
    .getByRole("button", { name: "Team & client access", exact: true })
    .click();
  await page
    .getByLabel("Invite by Google email")
    .fill("fixture-reviewer@invalid.test");
  await page
    .getByRole("combobox", { name: "Access", exact: true })
    .selectOption("reviewer");
  await page
    .getByRole("button", { name: "Create invitation", exact: true })
    .click();
  await expect(page.getByLabel("Invitation link")).toHaveValue(/invite=/);
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() =>
        page
          .getByRole("dialog")
          .evaluate((el) => el.contains(document.activeElement)),
      )
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.screenshot({
    path: "test-results/workspace-" + test.info().project.name + ".png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("an account reviews exact email and attachments before one recorded send", async ({
  page,
}) => {
  await page.goto("app");
  await page
    .getByRole("button", { name: "New workspace", exact: true })
    .click();
  await page.getByLabel("Workspace name").fill("Mailbox workflow");
  await page
    .getByRole("button", { name: "Create workspace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create a project", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Project name", exact: true })
    .fill("Mail review");
  await page
    .getByRole("button", { name: "Create project", exact: true })
    .click();
  if (await page.locator(".workspace-drawer > summary").isVisible()) {
    await expect(page.locator(".workspace-drawer")).not.toHaveAttribute("open", "");
    await page.locator(".workspace-drawer > summary").click();
    await expect(page.locator(".workspace-drawer")).toHaveAttribute("open", "");
  }
  await page
    .getByRole("button", { name: "Mail connections", exact: true })
    .click();
  await page.getByLabel("Public SMTP hostname").fill("smtp.invalid.test");
  await page.getByLabel("SMTP username").fill("fixture");
  await page.getByLabel("SMTP password").fill("synthetic-only");
  await page.getByLabel("Sender email").fill("yorphos@gmail.com");
  await page
    .getByRole("button", { name: "Save encrypted connection", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page.locator('.project-footer input[type="file"]').setInputFiles({
    name: "evidence.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Checked source evidence"),
  });
  await expect(
    page.getByRole("link", { name: "evidence.txt", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Compose project email", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Your sender connection" })
    .selectOption({ label: "My mailbox" });
  await page
    .getByLabel("Recipients · comma separated")
    .fill("fixture-reviewer@invalid.test");
  await page.getByRole("checkbox", { name: "evidence.txt" }).check();
  await page.getByRole("button", { name: "Review exact email" }).click();
  await expect(
    page.getByText(
      "From: yorphos@gmail.com · To: fixture-reviewer@invalid.test",
    ),
  ).toBeVisible();
  await expect(page.getByTitle("Exact email preview")).toBeVisible();
  await page.getByRole("button", { name: "Confirm and send" }).click();
  await expect(page.getByRole("status")).toContainText("accepted by server");
  await page.getByRole("button", { name: "Review & evidence" }).click();
  await expect(page.locator(".review-panel")).toContainText(
    "accepted by server",
  );
});

test('blueprint export composes a real application and project links reopen the saved revision',async({page})=>{
 await page.goto('app');await page.getByRole('button',{name:'New workspace',exact:true}).click();await page.getByLabel('Workspace name').fill('Blueprint pilot');await page.getByRole('button',{name:'Create workspace',exact:true}).click();await page.getByRole('button',{name:'Create a project',exact:true}).click();await page.getByRole('textbox',{name:'Project name',exact:true}).fill('Blueprint pilot');await page.getByRole('button',{name:'Create project',exact:true}).click();
 await expect(page).toHaveURL(/project=/);const url=page.url();await page.reload();await expect(page.locator('.project-heading h1')).toHaveText('Blueprint pilot');expect(page.url()).toBe(url);
 await page.getByRole('button',{name:'Blueprint',exact:true}).click();await page.getByText('Advanced blueprint JSON',{exact:true}).click();const source=JSON.parse(await page.getByLabel('Application blueprint').inputValue());source.product.mark='◇';source.screens[0].recipe='data-table';source.screens.push({id:'settings',path:'/settings',recipe:'settings',recipeVersion:1,title:'Preferences',description:'Account-owned preferences',states:['ready','stale','error']});await page.getByLabel('Application blueprint').fill(JSON.stringify(source));await page.getByRole('button',{name:'Apply blueprint draft'}).click();await expect(page.getByText('Blueprint ready for application export.')).toBeVisible();await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByText('Saved · Revision 2')).toBeVisible();
 await page.getByRole('button',{name:'Export',exact:true}).click();const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Account-owned application · ZIP',exact:true}).click();const download=await downloadPromise;const files=unzipSync(await readFile((await download.path())!));expect(JSON.parse(strFromU8(files['app-blueprint.json'])).screens).toHaveLength(5);expect(strFromU8(files['server/index.ts'])).toContain('createReviewServer');expect(files['package-lock.json']).toBeDefined();expect(strFromU8(files['src/main.tsx'])).toMatch(/act\(\s*["']propose["']/);expect(files['vendor/foundation/web/fonts/dmsans-OFL.txt']).toBeDefined();
});

test('fixture acceptance is visibly a callback request without an applied domain outcome',async({page})=>{
 await page.goto('recipes');const area=page.locator('.documentation');await page.locator('.module-card').filter({has:page.getByRole('heading',{name:'Patterns',exact:true})}).click();await area.getByLabel('Interface recipe').selectOption('change-review');await area.getByRole('button',{name:'Accept changes',exact:true}).click();await expect(area.getByRole('status')).toContainText('Fixture callback requested: records.accept. No application effect was applied.');
});


test('structured blueprint editing preserves valid data when an advanced draft fails', async ({ page }) => {
  await page.goto('app');
  await page.getByRole('button', { name: 'New workspace', exact: true }).click();
  await page.getByLabel('Workspace name').fill('Composition editor');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await page.getByRole('button', { name: 'Create a project', exact: true }).click();
  await page.getByRole('textbox', { name: 'Project name', exact: true }).fill('Safe draft');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByRole('button', { name: 'Blueprint', exact: true }).click();
  await page.getByLabel('Screen title', { exact: true }).first().fill('Retained heading');
  await expect(page.locator('.creation-preview').getByRole('heading', { name: 'Retained heading', exact: true })).toBeVisible();
  await page.getByLabel('Preview screen', { exact: true }).selectOption('review');
  await expect(page.locator('.creation-preview').getByRole('heading', { name: 'Review changes', exact: true })).toBeVisible();
  await page.getByLabel('Preview screen', { exact: true }).selectOption('overview');
  await page.getByText('Advanced blueprint JSON', { exact: true }).click();
  const source = page.getByLabel('Application blueprint');
  const valid = JSON.parse(await source.inputValue());
  await source.fill('{broken');
  await page.getByRole('button', { name: 'Apply blueprint draft' }).click();
  await expect(page.getByRole('alert')).toHaveText('Use valid blueprint JSON.');
  await expect(page.getByLabel('Screen title', { exact: true }).first()).toHaveValue('Retained heading');
  await source.fill(JSON.stringify({ ...valid, schemaVersion: 999 }));
  await page.getByRole('button', { name: 'Apply blueprint draft' }).click();
  await expect(page.getByRole('alert')).toContainText('schemaVersion');
  await expect(page.getByLabel('Screen title', { exact: true }).first()).toHaveValue('Retained heading');
  await source.fill(JSON.stringify(valid));
  await page.getByRole('button', { name: 'Apply blueprint draft' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
