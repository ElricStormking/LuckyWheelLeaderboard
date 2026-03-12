import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const apiEntry = path.join(rootDir, "apps", "api", "dist", "api", "src", "main.js");
const merchantApiEntry = path.join(
  rootDir,
  "apps",
  "merchant-api",
  "dist",
  "merchant-api",
  "src",
  "main.js",
);
const gameDist = path.join(rootDir, "apps", "game", "dist");
const adminDist = path.join(rootDir, "apps", "admin", "dist");
const staticServer = path.join(rootDir, "scripts", "serve-static.mjs");
const databaseFile = path.join(rootDir, "apps", "api", "prisma", "dev.db");
const apiPort = process.env.PORT ?? "4000";
const gamePort = process.env.GAME_PORT ?? "3000";
const merchantApiPort = process.env.MERCHANT_API_PORT ?? "4003";
const adminPort = process.env.ADMIN_PORT ?? "4002";

if (!existsSync(apiEntry) || !existsSync(merchantApiEntry) || !existsSync(gameDist) || !existsSync(adminDist)) {
  process.stderr.write(
    "Missing build output. Run `npm run build` before `npm run playtest`.\n",
  );
  process.exit(1);
}

if (!existsSync(databaseFile)) {
  process.stderr.write(
    "Missing Prisma database. Run `npm run db:setup` before `npm run playtest`.\n",
  );
  process.exit(1);
}

const merchantApiProcess = spawn(process.execPath, [merchantApiEntry], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: merchantApiPort,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

const apiProcess = spawn(process.execPath, [apiEntry], {
  cwd: rootDir,
  env: {
    ...process.env,
    PORT: apiPort,
    MERCHANT_API_BASE_URL: `http://localhost:${merchantApiPort}/merchant-api`,
  },
  stdio: ["ignore", "pipe", "pipe"],
});

const gameProcess = spawn(process.execPath, [staticServer, gameDist, gamePort], {
  cwd: rootDir,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

const adminProcess = spawn(process.execPath, [staticServer, adminDist, adminPort], {
  cwd: rootDir,
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
});

pipeLogs("merchant-api", merchantApiProcess);
pipeLogs("api", apiProcess);
pipeLogs("game", gameProcess);
pipeLogs("admin", adminProcess);

process.stdout.write("Lucky Wheel playtest started.\n");
process.stdout.write(`Merchant API: http://localhost:${merchantApiPort}/merchant-api/v1/health\n`);
process.stdout.write(`API:  http://localhost:${apiPort}/api/v2/events/current\n`);
process.stdout.write(`Game: http://localhost:${gamePort}\n`);
process.stdout.write(`Admin: http://localhost:${adminPort}\n`);
process.stdout.write("Press Ctrl+C to stop all processes.\n");

const shutdown = () => {
  merchantApiProcess.kill("SIGINT");
  apiProcess.kill("SIGINT");
  gameProcess.kill("SIGINT");
  adminProcess.kill("SIGINT");
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

merchantApiProcess.on("exit", (code) => {
  process.stdout.write(`[merchant-api] exited with code ${code ?? 0}\n`);
});

apiProcess.on("exit", (code) => {
  process.stdout.write(`[api] exited with code ${code ?? 0}\n`);
});

gameProcess.on("exit", (code) => {
  process.stdout.write(`[game] exited with code ${code ?? 0}\n`);
});

adminProcess.on("exit", (code) => {
  process.stdout.write(`[admin] exited with code ${code ?? 0}\n`);
});

function pipeLogs(name, child) {
  child.stdout?.on("data", (chunk) => {
    process.stdout.write(`[${name}] ${chunk.toString()}`);
  });

  child.stderr?.on("data", (chunk) => {
    process.stderr.write(`[${name}] ${chunk.toString()}`);
  });
}
