import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const url = "http://127.0.0.1:4321";
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "hp-chrome-test4-"));
const port = 9590;
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

  // 1. Desktop Test for 23 (Creative Agency)
  await send("Emulation.setDeviceMetricsOverride", { width: 1512, height: 982, deviceScaleFactor: 2, mobile: false });
  await send("Page.navigate", { url });
  await sleep(3500);

  // Directly click a card or trigger note selection by dispatching an event
  await send("Runtime.evaluate", {
    expression: `
      // Find the card for 23 (Creative Agency) or search
      const input = document.querySelector('input[type="text"]');
      if (input) {
        const proto = Object.getPrototypeOf(input);
        const setVal = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setVal.call(input, '23 (Creative');
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `
  });
  await sleep(1500);

  // Click on the matching card
  await send("Runtime.evaluate", {
    expression: `
      const cards = Array.from(document.querySelectorAll('h3'));
      const card23 = cards.find(el => el.textContent.includes('23'));
      if (card23) card23.click();
    `
  });
  await sleep(2500);

  const desktopShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/parkjeongho/.gemini/antigravity/brain/57230a98-e841-4d36-a0af-fb81a26d73fe/preview_23_agency_v2.png", Buffer.from(desktopShot.data, "base64"));
  console.log("Captured 23 Creative Agency screenshot v2!");

  // 2. Mobile Viewport Test (iPhone 390 x 844)
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
  await send("Page.navigate", { url });
  await sleep(3000);

  const mobileShot = await send("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync("/Users/parkjeongho/.gemini/antigravity/brain/57230a98-e841-4d36-a0af-fb81a26d73fe/preview_mobile_v2.png", Buffer.from(mobileShot.data, "base64"));
  console.log("Captured Mobile screenshot v2!");

} finally {
  await new Promise((r) => { chrome.once("exit", r); chrome.kill(); setTimeout(r, 2000); });
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  process.exit(0);
}
