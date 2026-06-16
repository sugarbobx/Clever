import { NextResponse } from "next/server";

/**
 * Thrown by server helpers/handlers to short-circuit with an HTTP status.
 * `extra` is merged into the JSON body (e.g. { upgrade_required: true }).
 */
export class ApiError extends Error {
  status: number;
  extra?: Record<string, unknown>;
  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

/** Convert any thrown value into a JSON error Response (French messages). */
export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: true, message: err.message, ...(err.extra ?? {}) },
      { status: err.status }
    );
  }
  // eslint-disable-next-line no-console
  console.error("[api] unhandled error", err);
  return NextResponse.json({ error: true, message: "Erreur interne du serveur." }, { status: 500 });
}

/**
 * Wrap a route handler so any thrown ApiError (or unexpected error) becomes a
 * structured JSON response — mirrors the old Express error middleware.
 */
export function handle<Ctx = unknown>(fn: (req: Request, ctx: Ctx) => Promise<Response> | Response) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
