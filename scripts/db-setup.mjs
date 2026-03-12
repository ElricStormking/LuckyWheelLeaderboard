import { mkdirSync } from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";

const rootDir = process.cwd();
const apiDir = path.join(rootDir, "apps", "api");
const tempDir = path.join(rootDir, ".tmp");

mkdirSync(tempDir, { recursive: true });

const commandSteps = [
  "npx prisma generate --schema prisma/schema.prisma",
  "npx prisma db push --schema prisma/schema.prisma",
  `"${process.execPath}" prisma/seed.js`,
];

for (const command of commandSteps) {
  const result = spawnSync(command, {
    cwd: apiDir,
    env: {
      ...process.env,
      TEMP: tempDir,
      TMP: tempDir,
      RUST_LOG: process.env.RUST_LOG ?? "info",
    },
    shell: true,
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    maybePrintPrismaWindowsLockHelp(result.stdout, result.stderr);
    process.exit(result.status ?? 1);
  }
}

function maybePrintPrismaWindowsLockHelp(stdout = "", stderr = "") {
  if (process.platform !== "win32") {
    return;
  }

  const combinedOutput = `${stdout}\n${stderr}`;
  const isLockedEngineError =
    combinedOutput.includes("query_engine-windows.dll.node") &&
    combinedOutput.includes("EPERM: operation not permitted, rename");

  if (!isLockedEngineError) {
    return;
  }

  process.stderr.write("\nPrisma client regeneration is blocked by a locked Windows engine DLL.\n");
  process.stderr.write(
    "This usually means the Lucky Wheel API, a previous playtest stack, or Prisma Studio is still running.\n",
  );

  const listeners = getWindowsListeners();
  if (listeners) {
    process.stderr.write("\nCurrent listeners on common local ports:\n");
    process.stderr.write(`${listeners}\n`);
  }

  process.stderr.write("\nClose Prisma Studio and stop any running local servers first, then rerun:\n");
  process.stderr.write("  npm run db:setup\n");
  process.stderr.write("\nHelpful commands:\n");
  process.stderr.write("  cmd /c netstat -ano | findstr \":3000 :4000 :4002 :4003\"\n");
  process.stderr.write("  Stop-Process -Id <PID> -Force\n");
}

function getWindowsListeners() {
  try {
    return execSync('cmd /c netstat -ano | findstr ":3000 :4000 :4002 :4003"', {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}
