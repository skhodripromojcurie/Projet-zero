import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { buildHumanoidGlb } from "../fixtures/humanoid-glb.js";
async function ready(page) {
  await page.goto("./");
  await expect(page.locator("body")).toHaveAttribute("data-ready", "true");
}
async function seek(page, time) {
  await page.locator("#timeline").evaluate((input, value) => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, time);
}

test("la scène WebGL est rendue sans erreur et la notification suit la timeline", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await expect(page.locator("#webgl-error")).toBeHidden();
  await expect(page.locator("#rpg")).toHaveAttribute("aria-hidden", "true");
  await page.screenshot({
    path: "artifacts/studio-desktop.png",
    fullPage: true,
  });
  const canvas = page.locator("#scene");
  const before = await canvas.screenshot();
  await seek(page, 7);
  await expect(page.locator("#phase")).toHaveText("Le système");
  await expect(page.locator("#rpg")).toHaveAttribute("aria-hidden", "false");
  await expect(page.locator("#rpg")).toHaveCSS("opacity", "1");
  await expect(page.locator("#rpg-quest")).toHaveText(
    "Survivre à la première heure.",
  );
  await page.screenshot({
    path: "artifacts/studio-systeme.png",
    fullPage: true,
  });
  const after = await canvas.screenshot();
  expect(before.equals(after)).toBe(false);
  expect(errors).toEqual([]);
});

test("lecture, pause, reprise, fin et recommencer", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Lire", exact: true }).click();
  await expect(page.locator("#playback-state")).toHaveText("LECTURE");
  await expect
    .poll(async () => Number(await page.locator("#timeline").inputValue()))
    .toBeGreaterThan(0.1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const paused = await page.locator("#timeline").inputValue();
  await page.waitForTimeout(200);
  expect(await page.locator("#timeline").inputValue()).toBe(paused);
  await seek(page, 7.7);
  await page.getByRole("button", { name: "Lire", exact: true }).click();
  await expect(page.locator("#playback-state")).toHaveText("FIN DU PLAN");
  await expect(page.locator("#timeline")).toHaveValue("8");
  await page.getByRole("button", { name: "Recommencer", exact: true }).click();
  await expect(page.locator("#timeline")).toHaveValue("0");
  await expect(page.locator("#rpg")).toHaveAttribute("aria-hidden", "true");
});

test("les quatre caméras modifient réellement l’image et la bibliothèque fonctionne", async ({
  page,
}) => {
  await ready(page);
  const initial = await page.locator("#scene").screenshot();
  for (const camera of ["portrait", "window", "door"]) {
    await page.selectOption("#camera", camera);
    const image = await page.locator("#scene").screenshot();
    expect(initial.equals(image)).toBe(false);
  }
  await page.locator('[data-tab="cameras"]').click();
  await page.locator('[data-camera="cinematic"]').click();
  await expect(page.locator("#camera")).toHaveValue("cinematic");
  await page.locator('[data-tab="rpg"]').click();
  await expect(page.locator(".stats-list")).toContainText("Perception");
  await page.locator('[data-tab="environments"]').click();
  await expect(page.locator(".object-list")).toContainText("Lit");
});

test("les réglages modifient la scène et persistent après rechargement", async ({
  page,
}) => {
  await ready(page);
  const before = await page.locator("#scene").screenshot();
  await page.locator('[name="adamX"]').fill("0.4");
  await page.locator('[name="exposure"]').fill("1.8");
  expect(before.equals(await page.locator("#scene").screenshot())).toBe(false);
  await page.locator('[name="duration"]').fill("12");
  await page.locator('[name="quest"]').fill("<b>Atteindre le couloir</b>");
  await page.getByRole("button", { name: "Voir à l’apparition" }).click();
  await expect(page.locator("#rpg-quest")).toHaveText(
    "<b>Atteindre le couloir</b>",
  );
  await expect(page.locator("#rpg-quest b")).toHaveCount(0);
  await expect(page.locator("#timeline")).toHaveAttribute("max", "12");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await page.reload();
  await expect(page.locator('[name="duration"]')).toHaveValue("12");
  await expect(page.locator('[name="quest"]')).toHaveValue(
    "<b>Atteindre le couloir</b>",
  );
  await page
    .getByRole("button", { name: "Rétablir le plan d’origine" })
    .click();
  await expect(page.locator('[name="duration"]')).toHaveValue("8");
});

test("la recherche temporelle est reproductible visuellement", async ({
  page,
}) => {
  await ready(page);
  await seek(page, 5);
  const expected = await page.locator("#scene").screenshot();
  await seek(page, 0);
  await seek(page, 8);
  await seek(page, 5);
  expect(expected.equals(await page.locator("#scene").screenshot())).toBe(true);
});

test("le studio reste utilisable sur téléphone sans débordement horizontal", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await seek(page, 7);
  await page.screenshot({
    path: "artifacts/studio-mobile.png",
    fullPage: true,
  });
  await expect(page.locator("#rpg-title")).toBeVisible();
  await page.getByRole("button", { name: "Recommencer", exact: true }).click();
  await expect(page.locator("#timeline")).toHaveValue("0");
});

test("le plein écran et le redimensionnement préservent le rendu en pause", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Plein écran" }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean(document.fullscreenElement)))
    .toBe(true);
  await page.evaluate(() => document.exitFullscreen());
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(page.locator("#webgl-error")).toBeHidden();
  const image = await page.locator("#scene").screenshot();
  expect(image.byteLength).toBeGreaterThan(10000);
  await page
    .getByRole("button", { name: "Activer le son synthétique" })
    .click();
  await expect(page.locator("#sound")).toHaveAttribute("aria-pressed", "true");
});

test("la bibliothèque est accessible depuis le téléphone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  await page.getByRole("button", { name: "Bibliothèque", exact: true }).click();
  await page.locator('[data-tab="cameras"]').click();
  await page.locator('[data-camera="window"]').click();
  await page
    .getByRole("button", { name: "Fermer la bibliothèque" })
    .click({ position: { x: 350, y: 200 } });
  await expect(page.locator("#camera")).toHaveValue("window");
  await expect(page.locator("#library-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
});

test("les objets du décor peuvent être repositionnés et sauvegardés", async ({
  page,
}) => {
  await ready(page);
  const initial = await page.locator("#scene").screenshot();
  await page.locator("summary").filter({ hasText: "DÉCOR · POSITION" }).click();
  await page.locator("#object-x").fill("-0.3");
  await page.locator("#object-z").fill("0.3");
  expect(initial.equals(await page.locator("#scene").screenshot())).toBe(false);
  await page.selectOption("#object-selector", "nightstand");
  await expect(page.locator("#object-x")).toHaveValue("0");
  await page.locator("#object-x").fill("0.2");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await page.reload();
  await page.locator("summary").filter({ hasText: "DÉCOR · POSITION" }).click();
  await expect(page.locator("#object-x")).toHaveValue("-0.3");
  await expect(page.locator("#object-z")).toHaveValue("0.3");
  await page.selectOption("#object-selector", "nightstand");
  await expect(page.locator("#object-x")).toHaveValue("0.2");
});

test("le studio et ses assets sont servis sous le chemin GitHub Pages", async ({
  page,
  request,
  baseURL,
}) => {
  const failed = [];
  page.on("response", (response) => {
    if (response.status() >= 400)
      failed.push(`${response.status()} ${response.url()}`);
  });
  await ready(page);
  expect(new URL(page.url()).pathname).toBe("/Projet-zero/");
  for (const source of await page
    .locator('script[src], link[rel="stylesheet"]')
    .evaluateAll((elements) =>
      elements.map(
        (element) =>
          element.getAttribute("src") || element.getAttribute("href"),
      ),
    )) {
    expect(new URL(source, baseURL).pathname).toMatch(/^\/Projet-zero\//);
  }
  const asset = await request.get(new URL("assets/README.md", baseURL).href);
  expect(asset.status()).toBe(200);
  expect(await asset.text()).toContain("Assets futurs");
  expect(failed).toEqual([]);
});

test("la qualité du rendu change l’image et reste enregistrée", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await seek(page, 2.5);
  const standard = await page.locator("#scene").screenshot();
  for (const quality of ["basse", "haute"]) {
    await page.selectOption('[name="quality"]', quality);
    expect(standard.equals(await page.locator("#scene").screenshot())).toBe(
      false,
    );
  }
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await page.reload();
  await expect(page.locator('[name="quality"]')).toHaveValue("haute");
  expect(errors).toEqual([]);
});

test("un GLB riggé déclaré avec sa licence remplace le rig procédural", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/assets/models/manifest.json", (route) =>
    route.fulfill({
      json: {
        version: 1,
        characters: {
          adam: {
            url: "assets/models/fixture-test.glb",
            profile: "projet-zero",
            source: "Fixture générée par les tests",
            author: "Projet Zéro",
            license: "Fixture de test",
            commercialUse: true,
          },
        },
      },
    }),
  );
  await page.route("**/assets/models/fixture-test.glb", (route) =>
    route.fulfill({
      body: buildHumanoidGlb(),
      contentType: "model/gltf-binary",
    }),
  );
  await ready(page);
  await expect(page.locator("#status")).toHaveText("Modèle GLB d’Adam chargé");
  await expect(page.locator("#character-model-status")).toContainText(
    "Modèle GLB chargé · Fixture de test · pose · 7 os · 1 expressions",
  );
  await seek(page, 5);
  const image = await page.locator("#scene").screenshot();
  await seek(page, 1);
  await seek(page, 5);
  expect(image.equals(await page.locator("#scene").screenshot())).toBe(true);
  expect(errors).toEqual([]);
});

test("un modèle sans licence déclarée est refusé et le rig procédural reste actif", async ({
  page,
}) => {
  await page.route("**/assets/models/manifest.json", (route) =>
    route.fulfill({
      json: {
        version: 1,
        characters: {
          adam: { url: "assets/models/inconnu.glb", profile: "mixamo" },
        },
      },
    }),
  );
  await ready(page);
  await expect(page.locator("#character-model-status")).toContainText(
    "rig procédural conservé",
  );
  await expect(page.locator("#toast")).toContainText("Modèle GLB non chargé");
});

test("un GLB local s’évalue en pied et en gros plan sans quitter l’appareil", async ({
  page,
}) => {
  const errors = [];
  const uploads = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.method() !== "GET") uploads.push(request.url());
  });
  await ready(page);
  const body = await readFile(
    new URL("../fixtures/mannequin-mpfb.glb", import.meta.url),
  );
  await page.locator("#evaluate-glb").setInputFiles({
    name: "mannequin-mpfb.glb",
    mimeType: "model/gltf-binary",
    buffer: body,
  });
  await expect(page.locator("#evaluator")).toHaveAttribute(
    "data-ready",
    "true",
  );
  await expect(page.locator("#evaluator-facts")).toContainText("19 / 19");
  await expect(page.locator("#evaluator-facts")).toContainText("MPFB 2");
  await expect(page.locator("#evaluator-warnings")).toContainText("ARKit");
  await page.screenshot({ path: "artifacts/evaluation-glb.png" });
  const rest = await page.locator("#evaluator-canvas").screenshot();
  await page.selectOption("#evaluator-pose", "shot");
  await expect
    .poll(async () =>
      rest.equals(await page.locator("#evaluator-canvas").screenshot()),
    )
    .toBe(false);
  await page.getByRole("button", { name: "Fermer l’évaluation" }).click();
  await expect(page.locator("#evaluator")).toBeHidden();
  // Adam procédural reste dans le plan.
  await expect(page.locator("#character-model-status")).toContainText(
    "Rig procédural v2 actif",
  );
  expect(uploads).toEqual([]);
  expect(errors).toEqual([]);
});
