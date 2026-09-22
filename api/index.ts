import { createWebApp } from "../web/app.ts";
import { loadWebConfig } from "../web/config.ts";

export default { fetch: createWebApp(loadWebConfig()) };
