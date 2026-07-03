/**
 * Prebuild check: public/notification.mp3 must be a real, committed asset.
 * Does NOT generate audio — place or update the file manually.
 *
 * Spec: mono MP3, 48 kHz, 200–450 ms (encoder padding), 1–30 KB.
 * See public/NOTIFICATION_SOUND_LICENSE.txt for source attribution.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { spawnSync } from "child_process";

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public", "notification.mp3");

const MIN_BYTES = 500;
const MAX_BYTES = 30 * 1024;
const MIN_DURATION_SEC = 0.15;
const MAX_DURATION_SEC = 0.55;
const REQUIRED_SAMPLE_RATE = 48000;

function fail(message) {
  console.error(`[ensure-notification-sound] ${message}`);
  process.exit(1);
}

function getFfmpegPath() {
  try {
    return require("@ffmpeg-installer/ffmpeg").path;
  } catch {
    return null;
  }
}

function probeMp3(ffmpegPath, filePath) {
  const result = spawnSync(ffmpegPath, ["-hide_banner", "-i", filePath], {
    stdio: "pipe",
    encoding: "utf8",
  });
  const stderr = result.stderr ?? "";
  const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  const audioMatch = stderr.match(/Audio:\s*[^,]+,\s*(\d+)\s*Hz,\s*(mono|stereo)/i);
  if (!durationMatch || !audioMatch) {
    return null;
  }
  const hours = Number(durationMatch[1]);
  const minutes = Number(durationMatch[2]);
  const seconds = Number(durationMatch[3]);
  const durationSec = hours * 3600 + minutes * 60 + seconds;
  return {
    durationSec,
    sampleRate: Number(audioMatch[1]),
    channels: audioMatch[2].toLowerCase(),
  };
}

function main() {
  if (!fs.existsSync(outPath)) {
    fail(
      "public/notification.mp3 is missing. Add a professional notification MP3 (mono, 48 kHz, 200–400 ms, <30 KB). See public/NOTIFICATION_SOUND_LICENSE.txt.",
    );
  }

  const size = fs.statSync(outPath).size;
  if (size < MIN_BYTES) {
    fail(`public/notification.mp3 is too small (${size} bytes). Expected a real MP3 asset.`);
  }
  if (size > MAX_BYTES) {
    fail(`public/notification.mp3 is too large (${size} bytes). Max ${MAX_BYTES} bytes.`);
  }

  const ffmpegPath = getFfmpegPath();
  if (!ffmpegPath) {
    console.warn(
      "[ensure-notification-sound] ffmpeg not available; skipping duration/channel probe.",
    );
    console.log(`[ensure-notification-sound] OK (${size} bytes) ${outPath}`);
    return;
  }

  const probe = probeMp3(ffmpegPath, outPath);
  if (!probe) {
    fail("Could not probe public/notification.mp3 — file may be corrupt or not MP3.");
  }

  if (probe.channels !== "mono") {
    fail(`Expected mono MP3, got ${probe.channels}.`);
  }
  if (probe.sampleRate !== REQUIRED_SAMPLE_RATE) {
    fail(`Expected ${REQUIRED_SAMPLE_RATE} Hz, got ${probe.sampleRate} Hz.`);
  }
  if (probe.durationSec < MIN_DURATION_SEC || probe.durationSec > MAX_DURATION_SEC) {
    fail(
      `Duration ${probe.durationSec.toFixed(2)}s out of range (${MIN_DURATION_SEC}–${MAX_DURATION_SEC}s).`,
    );
  }

  console.log(
    `[ensure-notification-sound] OK (${size} bytes, ${probe.durationSec.toFixed(2)}s, mono ${probe.sampleRate} Hz) ${outPath}`,
  );
}

main();
