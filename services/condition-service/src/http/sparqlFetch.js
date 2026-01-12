function basicAuthHeader(user, pass) {
  if (!user && !pass) return null;
  const token = Buffer.from(`${user || ""}:${pass || ""}`).toString("base64");
  return `Basic ${token}`;
}

function isWikidataEndpoint(url) {
  try {
    const u = new URL(url);
    return u.hostname === "query.wikidata.org";
  } catch {
    return false;
  }
}

function userAgent() {
  return (
    process.env.WIKIDATA_USER_AGENT ||
    "mead-condition-service/1.0 (contact: local-dev)"
  );
}

async function sparqlSelect(endpointUrl, query, { user, password } = {}) {
  const auth = basicAuthHeader(user, password);

  if (isWikidataEndpoint(endpointUrl)) {
    const u = new URL(endpointUrl);
    u.searchParams.set("format", "json");
    u.searchParams.set("query", query);

    const headers = {
      accept: "application/sparql-results+json",
      "user-agent": userAgent(),
    };

    const res = await fetch(u.toString(), { method: "GET", headers });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err = new Error(
        `SPARQL SELECT failed (${res.status}): ${text || res.statusText}`
      );
      err.status = 502;
      throw err;
    }

    return res.json();
  }

  const headers = {
    accept: "application/sparql-results+json",
    "content-type": "application/sparql-query; charset=utf-8",
  };
  if (auth) headers.authorization = auth;

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: query,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `SPARQL SELECT failed (${res.status}): ${text || res.statusText}`
    );
    err.status = 502;
    throw err;
  }

  return res.json();
}

async function sparqlUpdate(endpointUrl, update, { user, password } = {}) {
  const headers = {
    "content-type": "application/sparql-update; charset=utf-8",
  };

  const auth = basicAuthHeader(user, password);
  if (auth) headers.authorization = auth;

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: update,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `SPARQL UPDATE failed (${res.status}): ${text || res.statusText}`
    );
    err.status = 502;
    throw err;
  }
}

module.exports = { sparqlSelect, sparqlUpdate };
