const { chromium } = require("playwright");
const readline = require("readline");

// Track all active sessions
const sessions = [];
const allBrowsers = [];
let nameIndex = 0;

// --- Configuration (CLI args or env vars) ---
const MEETING_ID = process.argv[2] || process.env.ZOOM_MEETING_ID;
const PASSCODE = process.argv[3] || process.env.ZOOM_PASSCODE || "";
const NUM_USERS = parseInt(process.argv[4] || process.env.ZOOM_NUM_USERS) || 5;

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
];

async function joinMeeting(name, meetingId, passcode) {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-audio-output",
        "--disable-gpu",
        "--disable-features=WebRtcHideLocalIpsWithMdns",
      ],
    });
    allBrowsers.push(browser);

    const context = await browser.newContext({
      permissions: [],
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    await context.grantPermissions([]);

    const page = await context.newPage();

    // Block camera and mic at the browser API level
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("Permission denied", "NotAllowedError");
      };
      navigator.mediaDevices.enumerateDevices = async () => [];
    });

    // Navigate to Zoom web client join page
    const joinUrl = `https://zoom.us/wc/join/${meetingId}`;
    await page.goto(joinUrl, { waitUntil: "domcontentloaded", timeout: 45000 });

    // Wait for and accept cookies if prompted
    try {
      const cookieBtn = page.locator("#onetrust-accept-btn-handler");
      await cookieBtn.click({ timeout: 5000 });
    } catch {}

    // Fill in the display name
    const nameInput = page.locator('input[id="input-for-name"]');
    await nameInput.waitFor({ state: "visible", timeout: 15000 });
    await nameInput.fill(name);

    // Fill passcode if required
    if (passcode) {
      try {
        const passcodeInput = page.locator('input[id="input-for-pwd"]');
        await passcodeInput.waitFor({ state: "visible", timeout: 5000 });
        await passcodeInput.fill(passcode);
      } catch {}
    }

    // Click the Join button
    const joinButton = page.locator("button.zm-btn--primary, button:has-text('Join')").first();
    await joinButton.waitFor({ state: "visible", timeout: 10000 });
    await joinButton.click();

    // Wait for meeting to load
    await page.waitForTimeout(5000);

    // Handle "Join Audio by Computer" dialog if it appears
    try {
      const audioBtn = page.locator("button:has-text('Join Audio by Computer')");
      await audioBtn.click({ timeout: 8000 });
    } catch {}

    // Turn off video if it's on
    try {
      const stopVideoBtn = page.locator("button:has-text('Stop Video'), button[aria-label*='stop my video']").first();
      await stopVideoBtn.click({ timeout: 5000 });
    } catch {}

    // Mute audio if not already muted
    try {
      const muteBtn = page.locator("button:has-text('Mute'), button[aria-label*='mute my audio']").first();
      await muteBtn.click({ timeout: 3000 });
    } catch {}

    console.log(`  [+] ${name} joined`);
    return { browser, page, name };
  } catch (error) {
    console.error(`  [x] ${name} failed: ${error.message}`);
    if (browser) {
      try { browser.process().kill("SIGKILL"); } catch {}
    }
    return null;
  }
}

async function addUsers(count, meetingId, passcode) {
  const BATCH_SIZE = 5;
  let added = 0;

  for (let i = 0; i < count; i += BATCH_SIZE) {
    const batchCount = Math.min(BATCH_SIZE, count - i);
    const names = [];
    for (let j = 0; j < batchCount; j++) {
      const name = nameIndex < FAKE_NAMES.length
        ? FAKE_NAMES[nameIndex]
        : `User ${nameIndex + 1}`;
      names.push(name);
      nameIndex++;
    }

    const results = await Promise.all(
      names.map((name) => joinMeeting(name, meetingId, passcode))
    );

    for (const r of results) {
      if (r) {
        sessions.push(r);
        added++;
      }
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
      session.browser.process().kill("SIGKILL");
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

  // Interactive prompt
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
        const added = await addUsers(n, cleanMeetingId, PASSCODE);
        console.log(`  Done. ${added} added. Total: ${sessions.length}`);
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

// Force kill everything on Ctrl+C
process.on("SIGINT", () => {
  console.log("\nKilling all browsers...");
  for (const b of allBrowsers) {
    try { b.process().kill("SIGKILL"); } catch {}
  }
  console.log("All disconnected.");
  process.exit(0);
});
process.on("SIGTERM", () => process.exit(0));

main();
