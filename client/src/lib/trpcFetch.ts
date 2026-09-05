import superjson from "superjson";
import { handleAppwriteClientProcedure } from "./appwriteAdapter";

export async function customTrpcFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const urlStr = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;

  // On localhost dev, attempt normal network server call first
  const isLocalDev = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  if (isLocalDev) {
    try {
      const originalRes = await globalThis.fetch(input, {
        ...(init ?? {}),
        credentials: "include",
      });
      const contentType = originalRes.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return originalRes;
      }
    } catch {
      // fallback to direct Appwrite Cloud execution
    }
  }

  // On Appwrite Sites, directly execute via Appwrite Cloud Database Adapter
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const url = new URL(urlStr, origin);
    const pathname = url.pathname.replace(/^\/api\/trpc\/?/, "");
    const procedurePaths = pathname.split(",").filter(Boolean);

    let bodyData: Record<string, any> = {};
    if (init?.body && typeof init.body === "string") {
      try {
        bodyData = JSON.parse(init.body);
      } catch {}
    }

    const isBatch = url.searchParams.get("batch") === "1" || procedurePaths.length > 1;
    const inputParam = url.searchParams.get("input");
    let queryInputs: Record<string, any> = {};
    if (inputParam) {
      try {
        queryInputs = JSON.parse(inputParam);
      } catch {}
    }

    const results = await Promise.all(
      procedurePaths.map(async (path, idx) => {
        let inputPayload = bodyData[String(idx)]?.json ?? queryInputs[String(idx)]?.json ?? undefined;
        if (inputPayload === undefined && !isBatch) {
          inputPayload = bodyData?.json ?? queryInputs?.json ?? undefined;
        }

        try {
          const data = await handleAppwriteClientProcedure(path, inputPayload);
          const serialized = superjson.serialize(data);
          return {
            result: {
              data: serialized,
            },
          };
        } catch (err: any) {
          console.error(`[Appwrite Client Adapter] ${path} error:`, err);
          const serializedError = superjson.serialize({
            message: err?.message || "Operation failed",
            code: -32603,
            data: {
              code: "INTERNAL_SERVER_ERROR",
              httpStatus: 500,
            },
          });
          return {
            error: serializedError,
          };
        }
      })
    );

    const responsePayload = isBatch ? results : results[0] || {};
    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (outerErr: any) {
    console.error("[Appwrite Client Fetcher Error]", outerErr);
    const serializedOuterError = superjson.serialize({
      message: outerErr?.message || "Execution error",
      code: -32603,
      data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
    });
    const isBatchReq = urlStr.includes("batch=1");
    const payload = isBatchReq ? [{ error: serializedOuterError }] : { error: serializedOuterError };
    return new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
