import path from "node:path";

function resolveWorkspaceRoot() {
  const cwd = process.cwd();
  const normalizedCwd = cwd.replace(/\\/g, "/");

  if (normalizedCwd.endsWith("/apps/api")) {
    return path.resolve(cwd, "..", "..");
  }

  return cwd;
}

export function resolveUploadRoot() {
  return process.env.UPLOAD_ROOT || path.join(resolveWorkspaceRoot(), ".uploads");
}

export function resolveUploadPublicBaseUrl() {
  if (process.env.UPLOAD_PUBLIC_BASE_URL) {
    return process.env.UPLOAD_PUBLIC_BASE_URL.replace(/\/+$/, "");
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  return `http://localhost:${port}/api/uploads`;
}

