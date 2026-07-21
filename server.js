// Minimal static file server so `npm start` serves the app with no
// dependencies. Serves ./public and exposes src/rota.js to the browser.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = new URL("./public", import.meta.url).pathname;
const SRC_DIR = new URL("./src", import.meta.url).pathname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (path.includes("..")) {
    res.writeHead(400).end("Bad request");
    return;
  }

  // The frontend imports the same rota module the tests use.
  let file;
  if (path === "/rota.js") {
    file = join(SRC_DIR, "rota.js");
  } else {
    file = join(PUBLIC_DIR, path === "/" ? "index.html" : path);
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(PORT, () => {
  console.log(`🐕 Morning Dog Walk running at http://localhost:${PORT}`);
});
