const { UpstreamError } = require("@mead/shared");

// Fuseki connection config (from .env)
const FUSEKI_BASE = process.env.FUSEKI_BASE || "http://localhost:3030";
const DATASET = process.env.FUSEKI_DATASET || "mead";
const USER = process.env.FUSEKI_USER;
const PASSWORD = process.env.FUSEKI_PASSWORD;

/**
 * Build SPARQL Update endpoint URL
 * Example: http://localhost:3030/mead/update
 */
function updateUrl() {
  return `${FUSEKI_BASE}/${DATASET}/update`;
}

/**
 * Build HTTP Basic Auth header if credentials exist
 */
function authHeader() {
  if (!USER || !PASSWORD) return {};
  const token = Buffer.from(`${USER}:${PASSWORD}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

/**
 * Escape string values safely for SPARQL literals
 */
function esc(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
}

/**
 * Cache a medical condition as RDF in Fuseki
 */
async function cacheConditionAsRdf({ id, label, description }) {
  const subject = `https://mead.example.org/resource/condition/${id}`;

  const sparql = `
PREFIX schema: <https://schema.org/>
PREFIX wd: <http://www.wikidata.org/entity/>

INSERT DATA {
  <${subject}>
    a schema:MedicalCondition ;
    schema:name "${esc(label)}"@en ;
    ${description ? `schema:description "${esc(description)}"@en ;` : ""}
    schema:sameAs wd:${id} .
}
`;

  const resp = await fetch(updateUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-update",
      ...authHeader(),
    },
    body: sparql,
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw UpstreamError(
      `Fuseki update failed (${resp.status})`,
      text.slice(0, 500)
    );
  }

  return true;
}

module.exports = { cacheConditionAsRdf };
