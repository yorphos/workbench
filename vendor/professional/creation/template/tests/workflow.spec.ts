import { test, expect } from "@playwright/test";
test("create, propose and apply through the actual prefixed app", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/pilot/create");
  await expect(page.locator(".pf-brand-signature")).toContainText("by YRP");
  await page.getByLabel("Item name").fill("Original evidence");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Details", { exact: true }).fill("Initial source");
  await page.getByRole("button", { name: "Create item", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Changes saved");
  await page
    .getByRole("link", { name: __PRODUCT_NAME__, exact: true })
    .last()
    .click();
  await page.getByLabel("Proposed name").fill("Reviewed evidence");
  await page.getByLabel("Proposed details").fill("Updated source");
  await page.getByRole("button", { name: "Save proposal for review" }).click();
  await expect(page.getByRole("status")).toContainText("Proposal saved");
  await page.getByRole("button", { name: "Open review", exact: true }).click();
  await page
    .getByRole("button", { name: "Accept changes", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect
    .poll(() =>
      page
        .getByRole("dialog")
        .evaluate((el) => el.contains(document.activeElement)),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Apply reviewed changes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "Reviewed changes applied",
  );
  const source = await page.request.get("/pilot/api/session");
  const original = await source.json();
  expect(original.records[0].name).toBe("Reviewed evidence");
  await context.addCookies([
    { name: "qa_account", value: "b", url: "http://127.0.0.1:4199" },
  ]);
  await page.reload();
  await expect(page.getByText("fixture-b@invalid.test")).toBeVisible();
  const foreign = await page.request.get(
    "/pilot/api/records/" + original.records[0].id,
  );
  expect(foreign.status()).toBe(404);
  expect(
    (await (await page.request.get("/pilot/api/session")).json()).records,
  ).toHaveLength(0);
  await context.addCookies([
    { name: "qa_account", value: "a", url: "http://127.0.0.1:4199" },
  ]);
  await page.goto("/pilot/");
  await expect(
    page.getByText("Reviewed evidence", { exact: true }).first(),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: "test-results/pilot-" + test.info().project.name + ".png",
    fullPage: true,
  });
});
