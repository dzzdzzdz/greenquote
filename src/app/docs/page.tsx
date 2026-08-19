import Link from "next/link";
import { openApiDocument } from "@/lib/openapi";

type Operation = {
  tags?: readonly string[];
  summary?: string;
  description?: string;
  security?: readonly unknown[];
  parameters?: readonly {
    name: string;
    in: string;
    required?: boolean;
    description?: string;
  }[];
  requestBody?: { content: Record<string, { schema: { $ref?: string } }> };
  responses: Record<string, { description?: string; $ref?: string }>;
};

const METHOD_STYLES: Record<string, string> = {
  get: "bg-emerald-700",
  post: "bg-sky-700",
};

/** The last segment of a $ref, which is the schema name. */
function refName(ref: string): string {
  return ref.split("/").at(-1) ?? ref;
}

function responseLabel(
  status: string,
  response: { description?: string; $ref?: string },
): string {
  if (response.description) return response.description;
  return response.$ref ? refName(response.$ref) : status;
}

export default function DocsPage() {
  const { info, paths, components } = openApiDocument;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <h1 className="text-2xl font-semibold">{info.title}</h1>
      <p className="mt-1 text-neutral-600">{info.description}</p>
      <p className="mt-2 text-sm">
        Version {info.version} ·{" "}
        <Link href="/api/openapi" className="underline">
          OpenAPI {openApiDocument.openapi} document
        </Link>
      </p>

      <p className="mt-6 rounded-md border border-neutral-300 bg-neutral-50 p-3 text-sm">
        Every endpoint except health, registration, sign-in and sign-out needs
        the <code>{components.securitySchemes.sessionCookie.name}</code> cookie.{" "}
        {components.securitySchemes.sessionCookie.description}
      </p>

      {Object.entries(paths).map(([path, operations]) => (
        <section key={path} className="mt-8">
          <h2 className="font-mono text-lg font-semibold">{path}</h2>

          {Object.entries(operations as Record<string, Operation>).map(
            ([method, operation]) => (
              <article
                key={method}
                className="mt-3 rounded-lg border border-neutral-300 p-4"
              >
                <h3 className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-semibold tracking-wide text-white uppercase ${
                      METHOD_STYLES[method] ?? "bg-neutral-700"
                    }`}
                  >
                    {method}
                  </span>
                  <span className="font-medium">{operation.summary}</span>
                  {operation.security?.length === 0 ? (
                    <span className="text-xs text-neutral-600">
                      no session required
                    </span>
                  ) : null}
                </h3>

                {operation.description ? (
                  <p className="mt-2 text-sm text-neutral-600">
                    {operation.description}
                  </p>
                ) : null}

                {operation.parameters?.length ? (
                  <dl className="mt-3 text-sm">
                    {operation.parameters.map((parameter) => (
                      <div key={parameter.name} className="flex gap-2">
                        <dt className="font-mono">
                          {parameter.name}
                          <span className="text-neutral-600">
                            {" "}
                            ({parameter.in}
                            {parameter.required ? ", required" : ""})
                          </span>
                        </dt>
                        <dd className="text-neutral-600">
                          {parameter.description}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {operation.requestBody ? (
                  <p className="mt-3 text-sm">
                    Body:{" "}
                    <span className="font-mono">
                      {refName(
                        operation.requestBody.content["application/json"].schema
                          .$ref ?? "",
                      )}
                    </span>
                  </p>
                ) : null}

                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {Object.entries(operation.responses).map(
                    ([status, response]) => (
                      <li key={status}>
                        <span className="font-mono font-medium">{status}</span>{" "}
                        <span className="text-neutral-600">
                          {responseLabel(status, response)}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </article>
            ),
          )}
        </section>
      ))}

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Schemas</h2>
        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
          {Object.keys(components.schemas).map((name) => (
            <li
              key={name}
              className="rounded border border-neutral-300 px-2 py-1 font-mono"
            >
              {name}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-neutral-600">
          Field-level detail lives in the{" "}
          <Link href="/api/openapi" className="underline">
            OpenAPI document
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
