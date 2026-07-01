/**
 * Starts Next.js dev server (port 8080) and zrok public share.
 * Public URL: https://nixk-server.shares.zrok.io
 *
 * Owns both processes: Ctrl+C stops dev server and zrok together.
 * Override zrok binary: ZROK_BIN=C:\path\to\zrok2.exe bun run tunnel
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const PORT = 8080;
const SHARE_NAME = "nixk-server";
const PUBLIC_URL = `https://${SHARE_NAME}.shares.zrok.io`;
const isWin = platform() === "win32";

const zrokBin = resolveZrokBin();
const children = [];
let shuttingDown = false;
const zrokRequestCounts = new Map();
let zrokSummaryTimer = null;

function resolveZrokBin() {
  if (process.env.ZROK_BIN) return process.env.ZROK_BIN;

  const candidates = isWin
    ? [
        join(homedir(), "Desktop", "zrok_2.0.4_windows_amd64", "zrok2.exe"),
        join(process.cwd(), "zrok2.exe"),
      ]
    : [join(homedir(), "bin", "zrok2"), join(process.cwd(), "zrok2")];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return "zrok2";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });

    const done = (inUse) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(inUse);
    };

    socket.once("connect", () => done(true));
    socket.once("error", () => done(false));
    setTimeout(() => done(false), 1500);
  });
}

function isZrokShareRegistered(zrokBin) {
  const result = spawnSync(zrokBin, ["list", "shares"], {
    encoding: "utf8",
    shell: false,
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return output.includes(`${SHARE_NAME}.shares.zrok.io`);
}

function killPort(port) {
  if (isWin) {
    const result = spawnSync("netstat", ["-ano"], {
      encoding: "utf8",
      shell: false,
    });

    const pids = new Set();
    for (const line of (result.stdout ?? "").split("\n")) {
      if (!line.includes(`:${port}`) || !line.includes("LISTENING")) continue;
      const pid = Number.parseInt(line.trim().split(/\s+/).at(-1) ?? "", 10);
      if (pid > 0) pids.add(pid);
    }

    for (const pid of pids) {
      spawnSync("taskkill", ["/PID", String(pid), "/F", "/T"], {
        shell: false,
        stdio: "ignore",
      });
    }
    return;
  }

  const result = spawnSync("lsof", ["-ti", `:${port}`], {
    encoding: "utf8",
    shell: false,
  });

  for (const pid of (result.stdout ?? "").trim().split("\n").filter(Boolean)) {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      // ignore
    }
  }
}

function cleanupZrokShare(zrokBin) {
  const result = spawnSync(zrokBin, ["list", "shares"], {
    encoding: "utf8",
    shell: false,
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  for (const line of output.split("\n")) {
    if (!line.includes(SHARE_NAME)) continue;
    const token = line.split("│")[1]?.trim();
    if (!token || !/^[a-z0-9]+$/.test(token)) continue;
    spawnSync(zrokBin, ["delete", "share", token], {
      shell: false,
      stdio: "ignore",
    });
  }

  if (isWin) {
    spawnSync("taskkill", ["/IM", "zrok2.exe", "/F"], {
      shell: false,
      stdio: "ignore",
    });
    return;
  }

  spawnSync("pkill", ["-f", "zrok2 share"], {
    shell: false,
    stdio: "ignore",
  });
}

function killChild(child) {
  if (!child?.pid) return;

  if (isWin) {
    spawnSync("taskkill", ["/PID", String(child.pid), "/F", "/T"], {
      shell: false,
      stdio: "ignore",
    });
    return;
  }

  try {
    child.kill("SIGTERM");
  } catch {
    // ignore
  }
}

function parseZrokJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function extractZrokRequestMessage(line) {
  const parsed = parseZrokJsonLine(line);
  if (!parsed || typeof parsed.msg !== "string") return null;
  return parsed.msg;
}

function isZrokRequestLine(line) {
  return extractZrokRequestMessage(line)?.includes("[] -> ") ?? false;
}

function shouldIgnoreZrokRequest(pathname) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.endsWith(".js") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".mp4") ||
    pathname.endsWith(".mp3") ||
    pathname === "/favicon.ico"
  );
}

function queueZrokRequestSummary(line) {
  const message = extractZrokRequestMessage(line);
  if (!message) return false;

  const request = message.split("[] -> ")[1]?.trim();
  if (!request) return false;

  const firstSpace = request.indexOf(" ");
  if (firstSpace === -1) return false;

  const method = request.slice(0, firstSpace);
  const pathname = request.slice(firstSpace + 1);

  if (shouldIgnoreZrokRequest(pathname)) return true;

  const key = `${method} ${pathname}`;
  zrokRequestCounts.set(key, (zrokRequestCounts.get(key) ?? 0) + 1);

  if (!zrokSummaryTimer) {
    zrokSummaryTimer = setTimeout(flushZrokRequestSummary, 2500);
  }

  return true;
}

function flushZrokRequestSummary() {
  zrokSummaryTimer = null;
  if (zrokRequestCounts.size === 0) return;

  const items = [...zrokRequestCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([request, count]) => `${request} x${count}`);

  process.stdout.write(`[zrok] ${items.join(" | ")}\n`);
  zrokRequestCounts.clear();
}

function shouldHideZrokLine(line) {
  if (isZrokRequestLine(line)) {
    return queueZrokRequestSummary(line);
  }

  const parsed = parseZrokJsonLine(line);
  if (!parsed) return false;

  if (parsed.level === "INFO" && typeof parsed.msg === "string") {
    return false;
  }

  return false;
}

function pipeFilteredZrokOutput(stream, writer) {
  if (!stream) return;

  let buffer = "";
  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line || shouldHideZrokLine(line)) continue;
      writer(`${line}\n`);
    }
  });

  stream.on("end", () => {
    if (!buffer || shouldHideZrokLine(buffer)) return;
    writer(`${buffer}\n`);
  });
}

function run(label, command, args) {
  const child = spawn(command, args, {
    stdio: label === "zrok" ? ["inherit", "pipe", "pipe"] : "inherit",
    shell: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_BASE_URL: PUBLIC_URL,
    },
  });

  if (label === "zrok") {
    pipeFilteredZrokOutput(child.stdout, (line) => process.stdout.write(line));
    pipeFilteredZrokOutput(child.stderr, (line) => process.stderr.write(line));
  }

  child.on("exit", (code, signal) => {
    if (shuttingDown || signal) return;

    if (code !== 0 && code !== null) {
      console.error(`[tunnel] ${label} exited with code ${code}`);
    } else {
      console.log(`[tunnel] ${label} stopped`);
    }

    shutdown(code ?? 0);
  });

  children.push(child);
  return child;
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (zrokSummaryTimer) {
    clearTimeout(zrokSummaryTimer);
    zrokSummaryTimer = null;
  }
  flushZrokRequestSummary();

  console.log("\n[tunnel] Stopping dev server and zrok...");

  for (const child of [...children].reverse()) {
    killChild(child);
  }

  cleanupZrokShare(zrokBin);
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  const devRunning = await isPortInUse(PORT);
  const zrokRegistered = isZrokShareRegistered(zrokBin);

  console.log("");
  console.log("  Juco Cafe tunnel");
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Public: ${PUBLIC_URL}`);
  console.log(`  zrok:   ${zrokBin}`);
  console.log("");

  if (devRunning) {
    console.log(`  Stopping existing process on port ${PORT}...`);
    killPort(PORT);
    await sleep(1000);
  }

  if (zrokRegistered) {
    console.log("  Stopping existing zrok share...");
    cleanupZrokShare(zrokBin);
    await sleep(500);
  }

  console.log("  Starting dev server...");
  run("dev", "bun", ["run", "dev"]);

  console.log("  Starting zrok share in 3s...");
  setTimeout(() => {
    run("zrok", zrokBin, [
      "share",
      "public",
      `http://localhost:${PORT}`,
      "-n",
      `public:${SHARE_NAME}`,
      "--headless",
    ]);
  }, 3000);

  console.log("");
  console.log("  Press Ctrl+C to stop dev server and tunnel.");
  console.log("");
}

main().catch((error) => {
  console.error("[tunnel] failed:", error);
  process.exit(1);
});
