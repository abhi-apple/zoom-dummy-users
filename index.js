const { chromium } = require("playwright");
const readline = require("readline");

const sessions = [];
const browsers = [];
let nameIndex = NAME_OFFSET;
const CONTEXTS_PER_BROWSER = 10;

const MEETING_ID = process.argv[2] || process.env.ZOOM_MEETING_ID;
const PASSCODE = process.argv[3] || process.env.ZOOM_PASSCODE || "";
const NUM_USERS = parseInt(process.argv[4] || process.env.ZOOM_NUM_USERS) || 5;
const NAME_OFFSET = parseInt(process.env.ZOOM_NAME_OFFSET) || 0;

const FAKE_NAMES = [
  "Venkateswara Rao P",
  "Satyanarayana Murthy K",
  "Lakshmi Devi B",
  "Ramachandra Reddy G",
  "Padmavathi N",
  "Srinivasa Rao T",
  "Kamala Kumari D",
  "Subba Rao M",
  "Annapurna Devi K",
  "Narasimha Rao V",
  "Rajyalakshmi P",
  "Bhaskar Rao Ch",
  "Sarojini Devi M",
  "Venkata Subbaiah R",
  "Vijayalakshmi T",
  "Raghunatha Reddy B",
  "Suseela Devi G",
  "Sambashiva Rao K",
  "Parvathi Devi N",
  "Hanumantha Rao D",
  "Manga Devi P",
  "Jagannadha Rao T",
  "Seetharamamma V",
  "Mallikarjuna Rao B",
  "Ranganayaki M",
  "Purushothama Rao G",
  "Varalakshmi K",
  "Appala Naidu Ch",
  "Subbulakshmi R",
  "Ramakrishna Rao N",
  "Jayalakshmi D",
  "Veerabhadra Rao P",
  "Savithri Devi T",
  "Gopala Krishna M",
  "Tulasi Devi B",
  "Chandra Sekhar Rao K",
  "Nagamani G",
  "Damodar Rao V",
  "Santha Kumari N",
  "Balakrishna Reddy R",
  "Hymavathi D",
  "Sathyanarayana Reddy P",
  "Kamalamma T",
  "Madhusudhan Rao Ch",
  "Bharathi Devi M",
  "Nageswara Rao B",
  "Padma Devi K",
  "Tirumala Rao G",
  "Lalitha Devi V",
  "Venkata Ramana N",
  "Anantha Lakshmi R",
  "Srinivasulu D",
  "Rukmini Devi P",
  "Koteshwara Rao T",
  "Sarada Devi M",
  "Gangadhara Rao B",
  "Leela Devi K",
  "Ramamurthy G",
  "Seethamaha Lakshmi Ch",
  "Prasada Rao V",
  "Kondala Rao Ch",
  "Sugunamma T",
  "Apparao M",
  "Ratnamma B",
  "Buchchi Babu K",
  "Sooramma G",
  "Muralidhar Rao N",
  "Lakshmamma D",
  "Veera Venkata Rao P",
  "Nagalakshmi T",
  "Seshagiri Rao M",
  "Kamakshamma V",
  "Durga Prasad K",
  "Anandamma R",
  "Rajagopal Rao B",
  "Sakunthala Devi G",
  "Hari Prasad Ch",
  "Kanakadurga N",
  "Someswara Rao D",
  "Radhamma P",
  "Janardhan Rao T",
  "Subbamma M",
  "Kesava Rao B",
  "Seshamma K",
  "Rama Mohana Rao G",
  "Anasuya Devi V",
  "Veera Raghava Rao N",
  "Sitaramamma R",
  "Chinna Rao D",
  "Venkatalakshmi P",
  "Govinda Rao T",
  "Mangamma M",
  "Butchi Raju B",
  "Suryakantham K",
  "Dharma Rao G",
  "Leelavathi Ch",
  "Adinarayana Rao N",
  "Saraswathi Devi V",
  "Rambabu R",
  "Pushpavathi D",
  "Satish Babu P",
  "Devaki Devi T",
  "Kishore Babu M",
  "Jhansi Rani B",
  "Prasanna Kumar K",
  "Hemalatha G",
  "Ravindra Babu Ch",
  "Aruna Kumari N",
  "Sivaji Rao V",
  "Padmaja R",
  "Surya Prakash D",
  "Indira Devi P",
  "Ranga Rao T",
  "Suguna Devi M",
  "Madhava Rao B",
  "Ratna Kumari K",
  "Prabhakar Rao G",
  "Vasantha Devi Ch",
];

const BROWSER_ARGS = [
  "--disable-audio-output",
  "--disable-gpu",
  "--disable-dev-shm-usage",
  "--disable-software-rasterizer",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-translate",
  "--disable-logging",
  "--disable-notifications",
  "--disable-default-apps",
  "--disable-hang-monitor",
  "--disable-popup-blocking",
  "--disable-renderer-backgrounding",
  "--disable-backgrounding-occluded-windows",
  "--no-first-run",
  "--no-sandbox",
  "--js-flags=--max-old-space-size=64",
];

async function getOrCreateBrowser() {
  // Find a browser that has room for more contexts
  for (const b of browsers) {
    if (b.contexts().length < CONTEXTS_PER_BROWSER + 1) {
      return b;
    }
  }
  // All full, create a new one
  const b = await chromium.launch({ headless: true, args: BROWSER_ARGS });
  browsers.push(b);
  console.log(`  [browser] Launched browser #${browsers.length}`);
  return b;
}

async function joinMeeting(name, meetingId, passcode) {
  try {
    const b = await getOrCreateBrowser();

    const context = await b.newContext({
      permissions: [],
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 320, height: 240 },
    });

    await context.grantPermissions([]);
    const page = await context.newPage();

    // Block camera/mic
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      };
      navigator.mediaDevices.enumerateDevices = async () => [];
    });

    // Block heavy resources
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["image", "font", "stylesheet", "media"].includes(type)) {
        return route.abort();
      }
      const url = route.request().url();
      if (url.endsWith(".wasm") || url.includes("video_") || url.includes("audio_")) {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(`https://zoom.us/wc/join/${meetingId}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Accept cookies
    try {
      await page.locator("#onetrust-accept-btn-handler").click({ timeout: 3000 });
    } catch {}

    // Fill name
    const nameInput = page.locator('input[id="input-for-name"]');
    await nameInput.waitFor({ state: "visible", timeout: 15000 });
    await nameInput.fill(name);

    // Fill passcode
    if (passcode) {
      try {
        const pwd = page.locator('input[id="input-for-pwd"]');
        await pwd.waitFor({ state: "visible", timeout: 5000 });
        await pwd.fill(passcode);
      } catch {}
    }

    // Join
    const joinBtn = page.locator("button.zm-btn--primary, button:has-text('Join')").first();
    await joinBtn.waitFor({ state: "visible", timeout: 10000 });
    await joinBtn.click();

    await page.waitForTimeout(5000);

    // Handle audio dialog
    try {
      await page.locator("button:has-text('Join Audio by Computer')").click({ timeout: 8000 });
    } catch {}

    // Stop video
    try {
      await page.locator("button:has-text('Stop Video'), button[aria-label*='stop my video']").first().click({ timeout: 5000 });
    } catch {}

    // Mute
    try {
      await page.locator("button:has-text('Mute'), button[aria-label*='mute my audio']").first().click({ timeout: 3000 });
    } catch {}

    // Reduce memory after joining — hide UI, remove heavy elements
    await page.evaluate(() => {
      document.querySelectorAll("video, canvas, img, svg").forEach((el) => el.remove());
      document.body.style.display = "none";
      const s = document.createElement("style");
      s.textContent = "* { animation: none !important; transition: none !important; }";
      document.head.appendChild(s);
    });

    console.log(`  [+] ${name} joined`);
    return { context, page, name, browser: b };
  } catch (error) {
    console.error(`  [x] ${name} failed: ${error.message}`);
    return null;
  }
}

async function addUsers(count, meetingId, passcode) {
  let added = 0;
  for (let i = 0; i < count; i++) {
    const name = nameIndex < FAKE_NAMES.length
      ? FAKE_NAMES[nameIndex]
      : `User ${nameIndex + 1}`;
    nameIndex++;

    const result = await joinMeeting(name, meetingId, passcode);
    if (result) {
      sessions.push(result);
      added++;
    }
  }
  return added;
}

async function removeUsers(count) {
  let removed = 0;
  const toRemove = Math.min(count, sessions.length);
  for (let i = 0; i < toRemove; i++) {
    const session = sessions.pop();
    try {
      await session.context.close();
      console.log(`  [-] ${session.name} removed`);
      removed++;
    } catch {}
  }
  return removed;
}

function showHelp() {
  console.log(`
  Commands:
    +N       Add N users       (e.g. +10)
    -N       Remove N users    (e.g. -5)
    count    Show active users
    list     List all user names
    exit     Remove all and quit
  `);
}

async function main() {
  if (!MEETING_ID) {
    console.log("Usage: node index.js <meeting-id> [passcode] [num-users]");
    console.log("Example: node index.js 1234567890 myPass123 10");
    process.exit(1);
  }

  const cleanMeetingId = MEETING_ID.replace(/[\s-]/g, "");
  console.log(`\nAdding ${NUM_USERS} users to meeting ${cleanMeetingId}...\n`);

  const added = await addUsers(NUM_USERS, cleanMeetingId, PASSCODE);

  console.log(`\n${added} users in meeting.`);
  showHelp();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });
  rl.prompt();

  rl.on("line", async (line) => {
    const cmd = line.trim();
    if (cmd.startsWith("+")) {
      const n = parseInt(cmd.slice(1));
      if (n > 0) {
        console.log(`  Adding ${n} users...`);
        const a = await addUsers(n, cleanMeetingId, PASSCODE);
        console.log(`  Done. ${a} added. Total: ${sessions.length}`);
      }
    } else if (cmd.startsWith("-")) {
      const n = parseInt(cmd.slice(1));
      if (n > 0) {
        const removed = await removeUsers(n);
        console.log(`  Done. ${removed} removed. Total: ${sessions.length}`);
      }
    } else if (cmd === "count") {
      console.log(`  Active users: ${sessions.length}`);
    } else if (cmd === "list") {
      sessions.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));
      if (sessions.length === 0) console.log("  No active users.");
    } else if (cmd === "exit" || cmd === "quit") {
      console.log("  Removing all users...");
      await removeUsers(sessions.length);
      for (const b of browsers) await b.close().catch(() => {});
      console.log("  Done. Bye!");
      process.exit(0);
    } else if (cmd === "help") {
      showHelp();
    } else if (cmd) {
      console.log(`  Unknown command. Type "help" for commands.`);
    }
    rl.prompt();
  });
}

process.on("SIGINT", () => {
  console.log("\nKilling all browsers...");
  for (const b of browsers) try { b.process().kill("SIGKILL"); } catch {}
  console.log("All disconnected.");
  process.exit(0);
});
process.on("SIGTERM", () => {
  for (const b of browsers) try { b.process().kill("SIGKILL"); } catch {}
  process.exit(0);
});

main();
