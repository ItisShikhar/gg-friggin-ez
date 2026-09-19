const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const CHROME_PATH = process.env.CHROME_BIN || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEMO_URL = pathToFileURL(path.resolve(__dirname, '../demo/index.html')).href;

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (e) => reject(e);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Spawning Chrome...');
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9444',
    '--window-size=1280,720',
    '--force-device-scale-factor=1',
    '--hide-scrollbars',
    'about:blank'
  ]);

  await sleep(1500);

  try {
    const res = await fetch('http://127.0.0.1:9444/json');
    const targets = await res.json();
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    console.log('Connected to CDP');

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating to demo...');
    await client.send('Page.navigate', { url: DEMO_URL });
    await sleep(2500);

    // Get header height and dimensions
    const dims = await client.evaluate(`
      (() => {
        const header = document.querySelector('.app-header');
        const headerRect = header ? header.getBoundingClientRect() : { height: 45 };
        return {
          headerHeight: Math.ceil(headerRect.height),
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight
        };
      })()
    `);
    console.log('Page dimensions:', dims);

    const clipY = dims.headerHeight;
    const clipHeight = 720 - clipY;

    // --- 1. Valorant Screenshot ---
    console.log('Setting up Valorant view...');
    await client.evaluate(`
      (async () => {
        window.switchView('valorant');
        window.dismissApiKeyTooltip();
        
        // Populate a toxic message to show enforcement card
        const valInput = document.getElementById('val-chat-input');
        if (valInput) {
          valInput.value = "You are absolute dog sh1t, uninstall and never queue again";
          window.sendValMessage();
        }
      })()
    `);
    await sleep(1500);

    // Scroll valorant chat to bottom
    await client.evaluate(`
      (() => {
        const logs = document.getElementById('val-chat-logs');
        if (logs) logs.scrollTop = logs.scrollHeight;
      })()
    `);
    await sleep(500);

    console.log(`Capturing Valorant screenshot (1280x${clipHeight})...`);
    const valShot = await client.send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: 0,
        y: clipY,
        width: 1280,
        height: clipHeight,
        scale: 1
      }
    });

    const valPath = path.resolve(__dirname, '../docs/images/demo-valorant.png');
    fs.writeFileSync(valPath, Buffer.from(valShot.data, 'base64'));
    console.log('Saved Valorant screenshot to', valPath);

    // --- 2. Twitch Screenshot ---
    console.log('Setting up Twitch view...');
    await client.evaluate(`
      (async () => {
        window.switchView('twitch');
        window.dismissApiKeyTooltip();
        
        // Trigger a couple presets if needed or let existing chat settle
        const presets = document.querySelectorAll('#twitch-presets-vertical-list button');
        if (presets.length > 2) {
          presets[1].click(); // click a toxic preset
        }
      })()
    `);
    await sleep(2000);

    // Scroll twitch chat
    const twitchLayout = await client.evaluate(`
      (() => {
        const toObj = (r) => r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null;
        return {
          streamArea: toObj(document.querySelector('.twitch-stream-area')?.getBoundingClientRect()),
          video: toObj(document.querySelector('.stream-video-placeholder')?.getBoundingClientRect()),
          presets: toObj(document.querySelector('.twitch-presets-sidebar')?.getBoundingClientRect()),
          chat: toObj(document.querySelector('.twitch-chat-sidebar')?.getBoundingClientRect()),
        };
      })()
    `);
    console.log('Twitch layout rects:', twitchLayout);
    await sleep(500);

    console.log(`Capturing Twitch screenshot (1280x${clipHeight})...`);
    const twitchShot = await client.send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: 0,
        y: clipY,
        width: 1280,
        height: clipHeight,
        scale: 1
      }
    });

    const twitchPath = path.resolve(__dirname, '../docs/images/demo-twitch.png');
    fs.writeFileSync(twitchPath, Buffer.from(twitchShot.data, 'base64'));
    console.log('Saved Twitch screenshot to', twitchPath);

    console.log('All screenshots captured successfully!');
  } finally {
    chrome.kill();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
