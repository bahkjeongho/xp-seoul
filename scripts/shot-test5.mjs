import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const url = "http://127.0.0.1:4321/?note=2eehyein";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hp-chrome-test5-"));
const port = 9610;
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new","--disable-gpu",`--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,"about:blank"],{stdio:"ignore"});
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pending = new Map();

try {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const t = list.find(x => x.type === "page");
      if (t) {
        ws = new WebSocket(t.webSocketDebuggerUrl);
        await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
        break;
      }
    } catch {}
    await sleep(500);
  }

  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id)(d.result ?? d.error);
      pending.delete(d.id);
    }
  };

  const send = (method, params = {}) => new Promise(res => {
    const i = ++id;
    pending.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1512, height: 982, deviceScaleFactor: 2, mobile: false });
  await send("Page.navigate", { url });
  await sleep(4000);

  const desktopShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/parkjeongho/.gemini/antigravity/brain/57230a98-e841-4d36-a0af-fb81a26d73fe/preview_2eehyein.png", Buffer.from(desktopShot.data, "base64"));
  console.log("Captured 2eehyein screenshot!");

  // Scroll down to see Portfolio and YouTube embeds
  await send("Runtime.evaluate", {
    expression: `
      const container = document.querySelector('.overflow-y-auto');
      if (container) container.scrollBy(0, 700);
    `
  });
  await sleep(1500);

  const portfolioShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/parkjeongho/.gemini/antigravity/brain/57230a98-e841-4d36-a0af-fb81a26d73fe/preview_2eehyein_portfolio.png", Buffer.from(portfolioShot.data, "base64"));
  console.log("Captured 2eehyein Portfolio screenshot!");

} finally {
  await new Promise((r) => { chrome.once("exit", r); chrome.kill(); setTimeout(r, 2000); });
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
}
