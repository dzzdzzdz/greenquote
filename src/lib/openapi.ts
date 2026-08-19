/**
 * The OpenAPI description of this API, as data rather than a YAML file, so the
 * JSON endpoint and the rendered docs page cannot describe different things.
 * Paste the output of /api/openapi into editor.swagger.io to browse it there.
 */
export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "GreenQuote API",
    version: "1.0.0",
    description:
      "Solar financing pre-qualification. Money is expressed in integer cents and interest in basis points, matching how both are stored.",
  },
  servers: [{ url: "/", description: "This deployment" }],
  tags: [{ name: "Health" }, { name: "Authentication" }, { name: "Quotes" }],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        description:
          "Reports that the process can serve a request. Deliberately does not touch the database.",
        security: [],
        responses: {
          "200": {
            description: "The process is alive",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", const: "ok" },
                    uptimeSeconds: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Create an account and sign in",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "Created, with the session cookie set",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserEnvelope" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "409": { $ref: "#/components/responses/Conflict" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Sign in",
        description:
          "Answers identically for an unknown address and a wrong password, in the same time.",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
            },
          },
        },
        responses: {
          "200": {
            description: "Signed in, with the session cookie set",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserEnvelope" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Sign out",
        description: "Succeeds whether or not a session exists.",
        security: [],
        responses: { "204": { description: "The session cookie is cleared" } },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "The signed-in user",
        description:
          "Read from the session token, so the role is as of the moment the token was issued.",
        responses: {
          "200": {
            description: "The session user",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserEnvelope" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/quotes": {
      post: {
        tags: ["Quotes"],
        summary: "Request a pre-qualification",
        description:
          "Ownership comes from the session, never from the payload. A userId in the body is ignored.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QuoteInput" },
            },
          },
        },
        responses: {
          "201": {
            description: "The stored quote and its offers",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuoteEnvelope" },
              },
            },
          },
          "400": { $ref: "#/components/responses/ValidationError" },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
      get: {
        tags: ["Quotes"],
        summary: "List quotes",
        description:
          "Your own quotes. Administrators may widen the scope with search or userId. Capped at 100 results.",
        parameters: [
          {
            name: "search",
            in: "query",
            required: false,
            schema: { type: "string" },
            description:
              "Administrators only. Matches customer name or email. Case folding depends on the database.",
          },
          {
            name: "userId",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Administrators only. Exact owner.",
          },
        ],
        responses: {
          "200": {
            description: "The matching quotes, newest first",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    quotes: {
                      type: "array",
                      items: { $ref: "#/components/schemas/Quote" },
                    },
                  },
                },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/quotes/{id}": {
      get: {
        tags: ["Quotes"],
        summary: "Fetch one quote",
        description:
          "A quote belonging to someone else answers 404, identically to one that does not exist, so the endpoint never confirms an id.",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": {
            description: "The quote",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/QuoteEnvelope" },
              },
            },
          },
          "401": { $ref: "#/components/responses/Unauthorized" },
          "404": { $ref: "#/components/responses/NotFound" },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "gq_session",
        description: "Signed JWT, httpOnly, SameSite=Lax, valid for 24 hours.",
      },
    },
    schemas: {
      RegisterInput: {
        type: "object",
        required: ["fullName", "email", "password"],
        properties: {
          fullName: { type: "string", minLength: 1 },
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      LoginInput: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 1 },
        },
      },
      QuoteInput: {
        type: "object",
        required: [
          "fullName",
          "email",
          "address",
          "monthlyConsumptionKwh",
          "systemSizeKw",
        ],
        properties: {
          fullName: { type: "string", minLength: 1 },
          email: { type: "string", format: "email" },
          address: { type: "string", minLength: 1 },
          monthlyConsumptionKwh: {
            type: "integer",
            minimum: 1,
            maximum: 100000,
          },
          systemSizeKw: { type: "number", exclusiveMinimum: 0, maximum: 1000 },
          downPaymentCents: {
            type: "integer",
            minimum: 0,
            description: "Cents. 100000 is 1,000.00 EUR. Defaults to 0.",
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          fullName: { type: "string" },
          role: { type: "string", enum: ["USER", "ADMIN"] },
        },
      },
      UserEnvelope: {
        type: "object",
        properties: { user: { $ref: "#/components/schemas/User" } },
      },
      Offer: {
        type: "object",
        properties: {
          termYears: { type: "integer", enum: [5, 10, 15] },
          aprBps: {
            type: "integer",
            description: "Basis points. 690 is 6.9%.",
          },
          principalCents: { type: "integer" },
          monthlyPaymentCents: { type: "integer" },
        },
      },
      Quote: {
        type: "object",
        properties: {
          id: { type: "string" },
          createdAt: { type: "string", format: "date-time" },
          inputs: {
            type: "object",
            properties: {
              fullName: { type: "string" },
              email: { type: "string", format: "email" },
              address: { type: "string" },
              monthlyConsumptionKwh: { type: "integer" },
              systemSizeKw: { type: "number" },
              downPaymentCents: { type: "integer" },
            },
          },
          derived: {
            type: "object",
            properties: {
              systemPriceCents: { type: "integer" },
              principalCents: { type: "integer" },
              riskBand: { type: "string", enum: ["A", "B", "C"] },
              aprBps: { type: "integer" },
            },
          },
          offers: {
            type: "array",
            items: { $ref: "#/components/schemas/Offer" },
          },
        },
      },
      QuoteEnvelope: {
        type: "object",
        properties: { quote: { $ref: "#/components/schemas/Quote" } },
      },
      Error: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    field: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      ValidationError: {
        description: "The request body failed validation",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Unauthorized: {
        description: "No valid session",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      NotFound: {
        description: "No such quote, or not yours",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
      Conflict: {
        description: "That email already has an account",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Error" },
          },
        },
      },
    },
  },
  security: [{ sessionCookie: [] }],
} as const;
