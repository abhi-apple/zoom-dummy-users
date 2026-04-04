const { chromium } = require("playwright");

// --- Configuration (CLI args or env vars) ---
const MEETING_ID = process.argv[2] || process.env.ZOOM_MEETING_ID;
const PASSCODE = process.argv[3] || process.env.ZOOM_PASSCODE || "";
const NUM_USERS = parseInt(process.argv[4] || process.env.ZOOM_NUM_USERS) || 5;

const FAKE_NAMES = [
  "Rahul Sharma",
  "Sneha Gupta",
  "Arjun Reddy",
  "Kavya Nair",
  "Vikram Singh",
  "Ananya Iyer",
  "Rohit Verma",
  "Meera Krishnan",
  "Aditya Joshi",
  "Pooja Deshmukh",
  "Karthik Rajan",
  "Divya Menon",
  "Siddharth Rao",
  "Neha Kulkarni",
  "Amit Chauhan",
  "Priya Pillai",
  "Suresh Babu",
  "Anjali Mishra",
  "Deepak Yadav",
  "Lakshmi Venkat",
  "Manish Tiwari",
  "Shruti Patil",
  "Rajesh Kumar",
  "Swati Bhatt",
  "Nikhil Hegde",
  "Ritu Agarwal",
  "Prasad Rao",
  "Tanvi Jain",
  "Harish Shetty",
  "Sanya Kapoor",
];

async function joinMeeting(name, meetingId, passcode, index) {
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

    const context = await browser.newContext({
      permissions: [],
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });

    // Block all camera/mic access so Zoom can't turn them on
    await context.route("**/*", (route) => route.continue());
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
    console.log(`[${name}] Navigating to meeting...`);
    await page.goto(joinUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Wait for and accept cookies if prompted
    try {
      const cookieBtn = page.locator("#onetrust-accept-btn-handler");
      await cookieBtn.click({ timeout: 5000 });
    } catch {
      // No cookie banner, continue
    }

    // Fill in the display name
    console.log(`[${name}] Entering name...`);
    const nameInput = page.locator('input[id="input-for-name"]');
    await nameInput.waitFor({ state: "visible", timeout: 15000 });
    await nameInput.fill(name);

    // Fill passcode if required
    if (passcode) {
      try {
        const passcodeInput = page.locator('input[id="input-for-pwd"]');
        await passcodeInput.waitFor({ state: "visible", timeout: 5000 });
        await passcodeInput.fill(passcode);
      } catch {
        // No passcode field, continue
      }
    }

    // Uncheck audio/video if checkboxes exist
    try {
      const muteCheckbox = page.locator('input[type="checkbox"]').first();
      await muteCheckbox.waitFor({ state: "visible", timeout: 3000 });
    } catch {
      // No checkbox, continue
    }

    // Click the Join button
    console.log(`[${name}] Clicking join...`);
    const joinButton = page.locator("button.zm-btn--primary, button:has-text('Join')").first();
    await joinButton.waitFor({ state: "visible", timeout: 10000 });
    await joinButton.click();

    // Wait for meeting to load
    await page.waitForTimeout(5000);

    // Handle "Join Audio by Computer" dialog if it appears
    try {
      const audioBtn = page.locator("button:has-text('Join Audio by Computer')");
      await audioBtn.click({ timeout: 8000 });
    } catch {
      // No audio dialog, continue
    }

    // Turn off video if it's on
    try {
      const stopVideoBtn = page.locator("button:has-text('Stop Video'), button[aria-label*='stop my video']").first();
      await stopVideoBtn.click({ timeout: 5000 });
    } catch {
      // Video already off or button not found
    }

    // Mute audio if not already muted
    try {
      const muteBtn = page.locator("button:has-text('Mute'), button[aria-label*='mute my audio']").first();
      await muteBtn.click({ timeout: 3000 });
    } catch {
      // Already muted or button not found
    }

    console.log(`[${name}] Successfully joined the meeting!`);
    return { browser, page, name };
  } catch (error) {
    console.error(`[${name}] Failed to join: ${error.message}`);
    if (browser) await browser.close();
    return null;
  }
}

async function main() {
  if (!MEETING_ID) {
    console.log("Usage: node index.js <meeting-id> [passcode] [num-users]");
    console.log("Example: node index.js 1234567890 myPass123 10");
    process.exit(1);
  }

  // Clean meeting ID (remove spaces/dashes)
  const cleanMeetingId = MEETING_ID.replace(/[\s-]/g, "");

  console.log(`\nSpawning ${NUM_USERS} dummy users for meeting ${cleanMeetingId}...\n`);

  const names = FAKE_NAMES.slice(0, NUM_USERS);

  // Join with a small stagger to avoid rate limiting
  const activeSessions = [];
  for (const [i, name] of names.entries()) {
    const session = await joinMeeting(name, cleanMeetingId, PASSCODE, i);
    if (session) activeSessions.push(session);

    // Small delay between joins to avoid being flagged
    if (i < names.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(`\n${activeSessions.length}/${NUM_USERS} users joined successfully.`);
  console.log("Press Ctrl+C to disconnect all users and exit.\n");

  // Keep the process alive until interrupted
  process.on("SIGINT", async () => {
    console.log("\nDisconnecting all users...");
    for (const session of activeSessions) {
      try {
        await session.browser.close();
        console.log(`[${session.name}] Disconnected.`);
      } catch {
        // Already closed
      }
    }
    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

main();
