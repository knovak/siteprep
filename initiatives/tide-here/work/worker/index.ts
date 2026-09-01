/** ChatGPT Sites entry point for the Tide Here Stage 5 test deployment. */
import handler from "vinext/server/app-router-entry";

import {createStageFiveApp} from "../phase-13/src/stage-five.mjs";

interface Env {
  ASSETS: Fetcher;
  TIDE_DATA: R2Bucket;
  INIT_TOKEN?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const API_PATHS = new Set([
  "/init",
  "/import/object",
  "/import/activate",
  "/health",
  "/providers",
  "/stations",
  "/resolve",
  "/forecast",
]);

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (API_PATHS.has(url.pathname)) return createStageFiveApp().fetch(request, env, ctx);
    if (url.pathname === "/") {
      return env.ASSETS.fetch(new Request(new URL("/index.html", request.url), request));
    }
    if (/^\/phase-[0-7]\//.test(url.pathname)) return env.ASSETS.fetch(request);
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
