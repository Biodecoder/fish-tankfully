import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8095);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".glb": "model/gltf-binary"
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/favicon.ico" || urlPath === "/favicon.svg") {
    res.writeHead(204);
    res.end();
    return;
  }

  const relPath = urlPath === "/" ? "/index.html" : urlPath;
  let filePath = path.resolve(__dirname, "." + relPath);

  // Allow resolving shared node_modules from workspace root (/Users/derya/Gemini-4/node_modules)
  if (relPath.startsWith("/node_modules/") && !fs.existsSync(filePath)) {
    filePath = path.resolve(ROOT_DIR, "." + relPath);
  }

  if (!filePath.startsWith(__dirname) && !filePath.startsWith(path.join(ROOT_DIR, "node_modules"))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found: " + relPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Fish Tankfully (缸好有鱼) server listening on http://127.0.0.1:${PORT}`);
});
