import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "./auth/guard";
import { logger } from "./logger";
import { InvalidQuoteInputError } from "./pricing";

/** Requested a resource that does not exist, or that the caller may not see. */
export class NotFoundError extends Error {}

export type ErrorBody = {
  error: {
    code: string;
    message: string;
    details?: { field: string; message: string }[];
  };
};

/**
 * The only place HTTP status codes are chosen. Handlers throw domain errors and
 * this decides what the outside world sees.
 */
function toErrorResponse(error: unknown): { status: number; body: ErrorBody } {
  if (error instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Some fields need attention",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
    };
  }

  if (error instanceof InvalidQuoteInputError) {
    return {
      status: 400,
      body: { error: { code: "INVALID_INPUT", message: error.message } },
    };
  }

  if (error instanceof UnauthorizedError) {
    return {
      status: 401,
      body: { error: { code: "UNAUTHORIZED", message: error.message } },
    };
  }

  if (error instanceof ForbiddenError) {
    return {
      status: 403,
      body: { error: { code: "FORBIDDEN", message: error.message } },
    };
  }

  if (error instanceof NotFoundError) {
    return {
      status: 404,
      body: { error: { code: "NOT_FOUND", message: error.message } },
    };
  }

  // Anything unrecognised is our bug. The client gets nothing describing it.
  return {
    status: 500,
    body: {
      error: { code: "INTERNAL_ERROR", message: "Something went wrong" },
    },
  };
}

type RouteHandler<Context> = (
  request: Request,
  context: Context,
) => Promise<Response>;

/**
 * Wraps a route handler with request logging and error mapping, so handlers
 * contain only their own logic and never a try/catch of their own.
 */
export function withRoute<Context>(
  handler: RouteHandler<Context>,
): RouteHandler<Context> {
  return async (request, context) => {
    const requestId = crypto.randomUUID();
    const startedAt = performance.now();
    const log = logger.child({
      requestId,
      method: request.method,
      path: new URL(request.url).pathname,
    });

    log.info("request received");

    try {
      const response = await handler(request, context);
      const durationMs = Math.round(performance.now() - startedAt);

      log.info({ status: response.status, durationMs }, "request completed");
      response.headers.set("x-request-id", requestId);

      return response;
    } catch (error) {
      const { status, body } = toErrorResponse(error);
      const durationMs = Math.round(performance.now() - startedAt);

      if (status >= 500) {
        log.error({ err: error, status, durationMs }, "request failed");
      } else {
        log.warn(
          { status, code: body.error.code, durationMs },
          "request rejected",
        );
      }

      return Response.json(body, {
        status,
        headers: { "x-request-id": requestId },
      });
    }
  };
}
