import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

const initialEnvKeys = new Set(Object.keys(process.env));
const envFiles = process.env.NODE_ENV === "production" ? [".env.production"] : [".env"];

for (const envFile of envFiles) {
  const envPath = resolveWorkspaceFile(envFile);
  if (!envPath) {
    continue;
  }

  const parsed = parseEnv(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!initialEnvKeys.has(key)) {
      process.env[key] = value;
    }
  }
}

function resolveWorkspaceFile(filename: string) {
  const workspaceRoot = findWorkspaceRoot(process.cwd()) ?? findWorkspaceRoot(__dirname);
  if (!workspaceRoot) {
    return undefined;
  }

  const fullPath = path.join(workspaceRoot, filename);
  return existsSync(fullPath) ? fullPath : undefined;
}

function findWorkspaceRoot(startPath: string) {
  let current = path.resolve(startPath);

  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
          workspaces?: unknown;
        };
        if (packageJson.workspaces) {
          return current;
        }
      } catch {
        return undefined;
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
}
