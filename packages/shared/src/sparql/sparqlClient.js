const { UpstreamError } = require("../http/errors");

async function sparqlQuery(endpoint, query, userAgent) {
  const url = new URL(endpoint);
  url.searchParams.set("format", "json");
  url.searchParams.set("query", query);

  const resp = await fetch(url.toString(), {
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": userAgent,
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw UpstreamError(
      `SPARQL request failed (${resp.status})`,
      text.slice(0, 500)
    );
  }

  return resp.json();
}

module.exports = { sparqlQuery };
