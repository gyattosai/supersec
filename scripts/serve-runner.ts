import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const filePath = path.resolve(process.cwd(), "scripts", "render-runner.html");

const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/render") {
    const content = fs.readFileSync(filePath, "utf-8");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(4321, "127.0.0.1", () => {
  console.log("Renderer server listening on http://127.0.0.1:4321/");
});
