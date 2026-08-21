/** ChatGPT Sites entry point for the bookmark sorter end-user test. */
import {
  DEFAULT_DEVICE_SIZES,
  DEFAULT_IMAGE_SIZES,
  handleImageOptimization,
} from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

import {createPileApp} from "../src/worker.mjs";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  CAPTURES?: R2Bucket;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: {format: string; quality: number}): Promise<{response(): Response}>;
      };
    };
  };
  PASS_TWO_ENABLED?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

async function transformCaptureImage(
  env: Env,
  input: {bytes: Uint8Array; contentType?: string; sourceUrl?: string; maxWidth: number; maxHeight: number},
) {
  let response: Response;
  if (env.IMAGES) {
    const body = new Blob([input.bytes], {
      type: input.contentType || "application/octet-stream",
    }).stream();
    const result = await env.IMAGES.input(body).transform({
      width: input.maxWidth,
      height: input.maxHeight,
      fit: "scale-down",
    }).output({format: "image/webp", quality: 78});
    response = result.response();
  } else {
    if (!input.sourceUrl) throw new Error("Image transform source is unavailable");
    const request = new Request(input.sourceUrl, {
      headers: {
        accept: "image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.1",
        "user-agent": "BookmarkSorterCapture/1.0 (+anonymous metadata fetch)",
      },
    });
    response = await fetch(request, {
      cf: {image: {width: input.maxWidth, height: input.maxHeight, fit: "scale-down", format: "webp", quality: 78}},
    } as RequestInit & {cf: {image: Record<string, unknown>}});
  }
  if (!response.ok) throw new Error(`Image transform failed with ${response.status}`);
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") || "image/webp",
    width: input.maxWidth,
    height: input.maxHeight,
  };
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname.startsWith("/api/")) {
      const app = createPileApp({
        transformImage: (input: {
          bytes: Uint8Array;
          contentType?: string;
          sourceUrl?: string;
          maxWidth: number;
          maxHeight: number;
        }) => transformCaptureImage(env, input),
      });
      return app.fetch(request, env, ctx);
    }

    if (url.pathname === "/_vinext/image") {
      if (!env.IMAGES) return new Response("Image optimization unavailable", {status: 503});
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, {width, format, quality}) => {
          const result = await env.IMAGES.input(body)
            .transform(width > 0 ? {width} : {})
            .output({format, quality});
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
