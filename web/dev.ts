import { createWebApp } from "./app.ts";
import { loadWebConfig } from "./config.ts";

const app = createWebApp(loadWebConfig());
const port = Number(process.env.PORT ?? 3000);
const server = Bun.serve({
  hostname: "127.0.0.1",
  port,
  fetch(request) {
    if (new URL(request.url).pathname === "/catalog.js") {
      return new Response(Bun.file(new URL("../public/catalog.js", import.meta.url)), { headers: { "Content-Type": "text/javascript" } });
    }
    if (new URL(request.url).pathname === "/skills-logo.png") {
      return new Response(Bun.file(new URL("../public/skills-logo.png", import.meta.url)), { headers: { "Content-Type": "image/png" } });
    }
    if (new URL(request.url).pathname === "/style.css") {
      return new Response(Bun.file(new URL("../public/style.css", import.meta.url)), { headers: { "Content-Type": "text/css" } });
    }
    return app(request);
  },
});
console.info(`INLEVEL9 Skills 로컬 실행 주소: ${server.url}`);
