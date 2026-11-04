import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const url = "http://127.0.0.1:4321";
const out = "/Users/parkjeongho/.gemini/antigravity/brain/57230a98-e841-4d36-a0af-fb81a26d73fe/preview_selected.png";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hp-chrome-detail-"));
const port = 9550;
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

  // Click on the active center card to open detail panel
  await send("Runtime.evaluate", {
    expression: `
      const centerCard = document.querySelector('.shadow-\\\\[0_12px_32px_rgba\\\\(0\\\\,0\\\\,0\\\\,0\\\\.08\\\\)\\\\]');
      if (centerCard) centerCard.click();
    `
  });
  await sleep(2000);

  const shot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(shot.data, "base64"));
  console.log("Captured detail screenshot:", out);
} finally {
  await new Promise((r) => { chrome.once("exit", r); chrome.kill(); setTimeout(r, 2000); });
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
}
