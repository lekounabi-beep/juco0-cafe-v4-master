/**
 * Starts Next.js dev server (port 8080) and zrok public share.
 * Public URL: https://nixk-server.shares.zrok.io
 *
 * Skips dev/zrok when they are already running (safe to re-run).
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

function isZrokShareActive(zrokBin) {
  const result = spawnSync(zrokBin, ["overview"], {
    encoding: "utf8",
    shell: false,
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  return (
    output.includes(`${SHARE_NAME}.shares.zrok.io`) &&
    output.includes(`http://localhost:${PORT}`)
  );
}

const zrokBin = resolveZrokBin();
const children = [];
let startedDev = false;
let startedZrok = false;

function run(label, command, args) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_BASE_URL: PUBLIC_URL,
    },
  });

  child.on("exit", (code, signal) => {
    if (signal) return;

    if (label === "zrok" && code !== 0) {
      console.error(`[tunnel] zrok failed (code ${code}).`);
      if (isZrokShareActive(zrokBin)) {
        console.log(`[tunnel] Existing share is still active → ${PUBLIC_URL}`);
        return;
      }
      console.error(
        `[tunnel] Run manually: "${zrokBin}" share public http://localhost:${PORT} -n public:${SHARE_NAME}`,
      );
      return;
    }

    if (code !== 0 && code !== null) {
      console.error(`[tunnel] ${label} exited with code ${code}`);
      shutdown(code ?? 1);
    }
  });

  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    try {
      child.kill();
    } catch {
      // ignore
    }
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  const devRunning = await isPortInUse(PORT);
  const zrokRunning = isZrokShareActive(zrokBin);

  console.log("");
  console.log("  Juco Cafe tunnel");
  console.log(`  Local:  http://localhost:${PORT}`);
  console.log(`  Public: ${PUBLIC_URL}`);
  console.log(`  zrok:   ${zrokBin}`);
  console.log("");

  if (devRunning) {
    console.log(`  ✓ Dev server already on port ${PORT}`);
  }

  if (zrokRunning) {
    console.log(`  ✓ zrok share already active → ${PUBLIC_URL}`);
  }

  if (devRunning && zrokRunning) {
    console.log("");
    console.log("  Tunnel is already up. Open the public URL above.");
    console.log("");
    return;
  }

  if (!devRunning) {
    console.log("  Starting dev server...");
    run("dev", "bun", ["run", "dev"]);
    startedDev = true;
  }

  if (!zrokRunning) {
    const delay = devRunning ? 500 : 3000;
    console.log(`  Starting zrok share in ${delay / 1000}s...`);
    setTimeout(() => {
      run("zrok", zrokBin, [
        "share",
        "public",
        `http://localhost:${PORT}`,
        "-n",
        `public:${SHARE_NAME}`,
      ]);
      startedZrok = true;
    }, delay);
  }

  if (!startedDev && !startedZrok) return;

  console.log("");
  console.log("  Keep this terminal open while tunnel processes run.");
  console.log("");
}

main().catch((error) => {
  console.error("[tunnel] failed:", error);
  process.exit(1);
});
