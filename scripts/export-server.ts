import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = 3333;
const ROOT = path.resolve(process.cwd());

const server = http.createServer(async (req, res) => {
  try {
    let reqPath = req.url?.split("?")[0] || "/";
    if (reqPath === "/render-cards.html" || reqPath === "/") {
      reqPath = "/client/public/render-cards.html";
    }

    let filePath = path.join(ROOT, reqPath);
    if (!fs.existsSync(filePath) && reqPath.startsWith("/shared/")) {
      filePath = path.join(ROOT, reqPath);
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        ".html": "text/html",
        ".js": "application/javascript",
        ".ts": "application/javascript",
        ".png": "image/png",
        ".svg": "image/svg+xml"
      };
      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "text/plain",
        "Access-Control-Allow-Origin": "*"
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.writeHead(404);
    res.end("Not found");
  } catch (err: any) {
    res.writeHead(500);
    res.end(err.message);
  }
});

server.listen(PORT, () => {
  console.log(`Render server listening at http://localhost:${PORT}/render-cards.html`);
});
