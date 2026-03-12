import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";

const rootDir = path.resolve(process.argv[2] ?? ".");
const port = Number(process.argv[3] ?? 3000);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const requestPath = sanitizePath(request.url ?? "/");
    let targetPath = path.join(rootDir, requestPath);

    if (existsSync(targetPath) && (await stat(targetPath)).isDirectory()) {
      targetPath = path.join(targetPath, "index.html");
    }

    if (!existsSync(targetPath)) {
      targetPath = path.join(rootDir, "index.html");
    }

    const extension = path.extname(targetPath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(targetPath).pipe(response);
  } catch (error) {
    response.writeHead(500, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end(
      error instanceof Error ? error.message : "Static server failed unexpectedly.",
    );
  }
});

server.listen(port, () => {
  process.stdout.write(
    `[static] Serving ${rootDir} at http://localhost:${port}\n`,
  );
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

function sanitizePath(rawUrl) {
  const pathname = decodeURIComponent(new URL(rawUrl, "http://localhost").pathname);
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  return normalized === path.sep ? "index.html" : normalized.replace(/^[/\\]/, "");
}
