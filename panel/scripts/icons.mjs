// Genera los PNG de la PWA a partir de web/public/icon.svg (usa el Chromium del entorno).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { readFileSync } from "node:fs";
const svg = readFileSync("web/public/icon.svg", "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
for (const size of [180, 192, 512]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:#121212">${svg.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: `web/public/icon-${size}.png`, omitBackground: false });
}
await browser.close();
