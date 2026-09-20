/**
 * Smoke test: validates the swagger-jsdoc output without starting the server
 * or touching MongoDB. Usage: node scripts/check-swagger.js
 */
import swaggerJsdoc from "swagger-jsdoc";
import swaggerDefinition from "../src/docs/swagger.js";

process.env.PORT = process.env.PORT || "5000";

let spec;
try {
  spec = swaggerJsdoc(swaggerDefinition);
} catch (err) {
  console.error("SPEC GENERATION FAILED:", err.message);
  process.exit(1);
}

const pathCount = Object.keys(spec.paths || {}).length;
let opCount = 0;
for (const methods of Object.values(spec.paths || {})) {
  opCount += Object.keys(methods).filter((m) =>
    ["get", "post", "put", "delete", "patch"].includes(m)
  ).length;
}

console.log(`OpenAPI ${spec.openapi} — ${spec.info.title} v${spec.info.version}`);
console.log(`Paths: ${pathCount}  Operations: ${opCount}`);

const missing = [];
for (const [route, methods] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(methods)) {
    if (!op.tags?.length) missing.push(`${method.toUpperCase()} ${route} (no tags)`);
  }
}
console.log(missing.length ? `Untagged ops:\n  ${missing.join("\n  ")}` : "All operations tagged ✓");

if (pathCount === 0) {
  console.error("No paths found — check apis glob in src/docs/swagger.js");
  process.exit(1);
}
