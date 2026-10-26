import { chromium } from "/Users/derya/Gemini-4/node_modules/playwright-core/index.mjs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactDir = "/Users/derya/.gemini/antigravity/brain/84c18da7-7f78-4126-bcf4-d898f4d85092";
const PORT = 8095;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const serverProc = spawn("node", ["server.mjs"], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT) },
    stdio: "pipe"
  });

  await sleep(600);

  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  const browser = await chromium.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 840 },
      deviceScaleFactor: 2
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      pageErrors.push(String(err));
    });
    page.on("requestfailed", (req) => {
      failedRequests.push(`${req.url()} (${req.failure()?.errorText})`);
    });
    page.on("response", (res) => {
      if (res.status() >= 400) {
        failedRequests.push(`${res.url()} -> HTTP ${res.status()}`);
      }
    });

    console.log(`1. Navigating to http://127.0.0.1:${PORT}/ ...`);
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForFunction(() => Boolean(window.__FISH_TANKFULLY__), { timeout: 20000 });
    await sleep(700);

    // 1. Title Screen
    await page.screenshot({ path: path.join(artifactDir, "clone_01_title.png") });
    console.log("   Captured clone_01_title.png");

    // 2. Main Gameplay HUD (Grand Biotope Tank)
    await page.click("#btn-start-game");
    await sleep(700);
    await page.screenshot({ path: path.join(artifactDir, "clone_02_main_hud.png") });
    console.log("   Captured clone_02_main_hud.png");

    // 3. Feeding & Glass Cleaning
    await page.click("#slot-btn-2");
    await sleep(500);
    await page.screenshot({ path: path.join(artifactDir, "clone_03_feeding.png") });
    console.log("   Captured clone_03_feeding.png");

    // 4. Aquarium Shop (水族店)
    await page.click("#btn-open-shop");
    await sleep(500);
    await page.screenshot({ path: path.join(artifactDir, "clone_04_shop.png") });
    console.log("   Captured clone_04_shop.png");
    await page.click("#btn-close-shop");
    await sleep(300);

    // 5. Tank Info & Fish Roster (鱼缸信息)
    await page.click("#btn-open-info");
    await sleep(500);
    await page.screenshot({ path: path.join(artifactDir, "clone_05_tank_info.png") });
    console.log("   Captured clone_05_tank_info.png");
    await page.click("#btn-close-info");
    await sleep(300);

    // 6. DIY Aquascaping Editor (随心造景)
    await page.click("#btn-open-diy");
    await sleep(500);
    await page.screenshot({ path: path.join(artifactDir, "clone_06_diy_editor.png") });
    console.log("   Captured clone_06_diy_editor.png");
    await page.click("#btn-close-diy");
    await sleep(300);

    // 7. Switch to Mecha Ruins Tank + DSLR Camera Viewfinder Mode (微距摄影)
    await page.click("#btn-tank-switcher");
    await sleep(500);
    await page.click("#btn-open-camera");
    await sleep(500);
    await page.screenshot({ path: path.join(artifactDir, "clone_07_camera_mecha.png") });
    console.log("   Captured clone_07_camera_mecha.png");
    await page.click("#btn-close-camera");
    await sleep(300);

    // 8. Wild Foraging Map & 3D Stream Hand Catch (野采地图 & 溪流野采)
    await page.click("#btn-open-foraging");
    await sleep(500);
    await page.screenshot({ path: path.join(artifactDir, "clone_08_foraging_map.png") });
    console.log("   Captured clone_08_foraging_map.png");

    // Click first polaroid card to enter 3D stream and scoop a wild fish!
    await page.click(".polaroid-card");
    await sleep(600);
    await page.mouse.click(720, 420);
    await sleep(600);
    await page.screenshot({ path: path.join(artifactDir, "clone_09_wild_caught_hand.png") });
    console.log("   Captured clone_09_wild_caught_hand.png");

    const summary = await page.evaluate(() => {
      const app = window.__FISH_TANKFULLY__;
      return {
        money: app.state.money,
        activeTank: app.state.activeTankId,
        fishCount: app.state.activeTank.fish.length,
        decorCount: app.state.activeTank.decor.length,
        metrics: app.state.computeTankMetrics()
      };
    });

    console.log("Verification Summary:", JSON.stringify({
      ...summary,
      consoleErrors: consoleErrors.length,
      pageErrors: pageErrors.length,
      failedRequests: failedRequests.length
    }, null, 2));

    if (consoleErrors.length || pageErrors.length || failedRequests.length) {
      console.error("Errors:", { consoleErrors, pageErrors, failedRequests });
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    serverProc.kill("SIGTERM");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
