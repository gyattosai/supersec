import fs from "node:fs";
import path from "node:path";

const svgs = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "og-svgs.json"), "utf-8"));

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>OG Card Renderer</title>
</head>
<body style="background: #000; color: #fff;">
  <h2>OG Card Rasterizer</h2>
  <canvas id="c" width="1200" height="630" style="display:none;"></canvas>
  <script>
    window.__SVGS__ = ${JSON.stringify(svgs)};
    
    window.renderAll = async function() {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      const results = {};
      
      for (const [filename, svgStr] of Object.entries(window.__SVGS__)) {
        const isJpg = filename.endsWith('.jpg') || filename.endsWith('.jpeg');
        const mime = isJpg ? 'image/jpeg' : 'image/png';
        const quality = isJpg ? 0.88 : undefined;
        const dataUrl = await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, 1200, 630);
            ctx.drawImage(img, 0, 0, 1200, 630);
            resolve(canvas.toDataURL(mime, quality));
          };
          img.onerror = (err) => reject(err);
          img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
        });
        results[filename] = dataUrl;
      }
      return results;
    };
  </script>
</body>
</html>`;

fs.writeFileSync(path.resolve(process.cwd(), "scripts", "render-runner.html"), html, "utf-8");
console.log("Written scripts/render-runner.html");
