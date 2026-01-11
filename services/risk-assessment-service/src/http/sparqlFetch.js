function basicAuthHeader(user, pass) {
  if (!user || !pass) return {};
  const token = Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
  return { Authorization: `Basic ${token}` };
}

function fusekiAuthHeaders() {
  const user = process.env.FUSEKI_USER;
  const pass = process.env.FUSEKI_PASSWORD;
  return basicAuthHeader(user, pass);
}

async function sparqlSelect(endpointUrl, query) {
  const url = new URL(endpointUrl);
  url.searchParams.set("query", query);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/sparql-results+json",
      "User-Agent": "risk-assessment-service/1.0 (educational project)",
      ...fusekiAuthHeaders(),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `SPARQL SELECT failed ${res.status}: ${text.slice(0, 300)}`
    );
  }
  return res.json();
}

async function sparqlUpdate(endpointUrl, updateQuery) {
  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/sparql-update",
      Accept: "text/plain",
      "User-Agent": "risk-assessment-service/1.0 (educational project)",
      ...fusekiAuthHeaders(),
    },
    body: updateQuery,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `SPARQL UPDATE failed ${res.status}: ${text.slice(0, 300)}`
    );
  }
  return true;
}

module.exports = { sparqlSelect, sparqlUpdate };
