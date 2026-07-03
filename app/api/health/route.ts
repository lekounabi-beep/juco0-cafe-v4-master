import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const APP_VERSION = process.env.APP_VERSION?.trim() || "1.0.0";

function resolveGitCommit(): string | undefined {
  const raw =
    process.env.GIT_COMMIT?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim();
  return raw || undefined;
}

export async function GET() {
  const commit = resolveGitCommit();

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    ...(commit ? { commit } : {}),
    environment: process.env.NODE_ENV ?? "unknown",
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
  });
}
