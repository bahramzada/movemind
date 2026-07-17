import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("complete local training control flow", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "The state-mutating flow runs once on desktop.",
  );
  await page.goto("/");
  await expect(page).toHaveTitle(/MoveMind/);
  await expect(
    page.getByRole("heading", { name: /Watch a strategy/ }),
  ).toBeVisible();
  await expect(page.getByText("Local engine connected")).toBeVisible();

  const startButton = page.getByRole("button", { name: "Start training" });
  if (await startButton.isVisible()) {
    await startButton.click();
  } else {
    const resumeButton = page.getByRole("button", { name: "Resume training" });
    if (await resumeButton.isVisible()) await resumeButton.click();
  }

  await expect(
    page.getByRole("button", { name: "Pause and save" }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const response = await page.request.get("/api/state");
      return (await response.json()).episode as number;
    })
    .toBeGreaterThan(200);

  await page.getByRole("button", { name: /Full/ }).click();
  await expect(page.getByRole("button", { name: /Full/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: /Balanced/ }).click();
  await expect(page.getByRole("button", { name: /Balanced/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("button", { name: "Save checkpoint" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Checkpoint saved locally",
  );

  await page.getByRole("button", { name: "Pause and save" }).click();
  await expect(
    page.getByRole("button", { name: "Resume training" }),
  ).toBeVisible();
  const pausedState = await (await page.request.get("/api/state")).json();
  expect(pausedState.status).toBe("paused");
  expect(pausedState.lastCheckpointEpisode).toBe(pausedState.episode);
  expect(pausedState.checkpoints.length).toBeGreaterThan(0);

  await page.reload();
  await expect(
    page.getByRole("button", { name: "Resume training" }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const content = await page
        .locator(".episode-readout strong")
        .textContent();
      return Number(content?.replace(/\D/g, "") ?? 0);
    })
    .toBe(pausedState.episode);

  await page.getByRole("button", { name: "Resume training" }).click();
  await expect
    .poll(async () => {
      const state = await (await page.request.get("/api/state")).json();
      return state.episode as number;
    })
    .toBeGreaterThan(pausedState.episode);
  await page.getByRole("button", { name: "Pause and save" }).click();
  await expect(
    page.getByRole("button", { name: "Resume training" }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/state")).json()).status as string,
    )
    .toBe("paused");

  await page.screenshot({
    path: testInfo.outputPath("desktop-trained.png"),
    fullPage: true,
  });
});

test("primary dashboard fits and remains readable", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect
    .poll(async () => (await page.request.get("/api/health")).ok())
    .toBe(true);
  if (testInfo.project.name === "desktop") {
    await expect(page.getByText("Local engine connected")).toBeVisible();
  }
  await expect(page.locator(".board")).toBeVisible();
  await expect(page.locator(".training-console")).toBeVisible();

  const fit = await page.evaluate(() => ({
    canScrollX:
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
    boardWidth:
      document.querySelector(".board")?.getBoundingClientRect().width ?? 0,
    topbarBottom:
      document.querySelector(".topbar")?.getBoundingClientRect().bottom ?? 0,
    viewportWidth: window.innerWidth,
  }));
  expect(fit.canScrollX).toBe(false);
  expect(fit.boardWidth).toBeGreaterThan(280);
  expect(fit.topbarBottom).toBeLessThan(80);

  await page.waitForTimeout(650);
  await page.screenshot({
    path: testInfo.outputPath("dashboard.png"),
    fullPage: true,
  });
});

test("human can play against the latest checkpoint", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Interactive challenge flow runs once on desktop.",
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Play the model it just became." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Play first as X/ }).click();
  await expect(page.getByText(/You are X/)).toBeVisible();

  for (let turn = 0; turn < 5; turn += 1) {
    const playable = page.locator(".challenge-board button:enabled");
    if ((await playable.count()) === 0) break;
    await playable.first().click();
    await page.waitForTimeout(120);
  }

  const filledCells = await page
    .locator(".challenge-board button.x, .challenge-board button.o")
    .count();
  expect(filledCells).toBeGreaterThanOrEqual(2);
  await expect(page.locator(".challenge-status")).toContainText(
    /Agent X|You are X/,
  );
  await page.locator(".challenge-section").screenshot({
    path: testInfo.outputPath("checkpoint-challenge.png"),
  });
});

test("language choice is accessible and persists", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Watch a strategy/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "AZ" }).click();
  await expect(
    page.getByRole("heading", { name: /Strategiyanın necə/ }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "az");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /Strategiyanın necə/ }),
  ).toBeVisible();
});
