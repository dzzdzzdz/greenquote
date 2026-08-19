import { withRoute } from "@/lib/http";
import { openApiDocument } from "@/lib/openapi";

/** The machine-readable spec. Paste it into editor.swagger.io to browse it. */
export const GET = withRoute(async () => {
  return Response.json(openApiDocument);
});
