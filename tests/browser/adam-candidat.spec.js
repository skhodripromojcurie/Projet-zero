import { test, expect } from "@playwright/test";

test("candidat par défaut : corps animé, quatre vues et retour au même instant", async ({ page }) => {
  test.setTimeout(240000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("./");
  await expect(page.locator("#character-model-status")).toContainText("regard animés indisponibles", { timeout: 60000 });
  await expect(page.locator("#character-model-status")).toContainText("19 os · 0 expressions");
  const seek = async time => {
    await page.locator("#timeline").evaluate((input, value) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }, time);
  };
  for (const [index, camera] of ["cinematic", "portrait", "window", "door"].entries()) {
    await page.selectOption("#camera", camera);
    await seek(0);
    const initial = await page.locator("#scene").screenshot();
    for (const time of [0, 1, 2, 3, 5, 7.6]) {
      await seek(time);
      await page.locator("#scene").screenshot({ path: `artifacts/adam-candidat/A0${index + 1}-${time}.png` });
    }
    expect(initial.equals(await page.locator("#scene").screenshot())).toBe(false);
    await seek(0);
    expect(initial.equals(await page.locator("#scene").screenshot())).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.selectOption("#camera", "portrait");
  await seek(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "artifacts/adam-candidat/telephone.png", fullPage: true });
  expect(errors).toEqual([]);
});
