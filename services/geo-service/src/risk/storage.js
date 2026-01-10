const { sparqlSelect, sparqlUpdate } = require("../http/sparqlFetch");

const CACHE_NS = "http://example.org/cache#";

function fusekiEndpoints() {
  const base = process.env.FUSEKI_BASE_URL || "http://localhost:3030";
  const dataset = process.env.FUSEKI_DATASET || "cache";
  return {
    query: `${base}/${dataset}/query`,
    update: `${base}/${dataset}/update`,
  };
}

function cacheMaxAgeDays() {
  const n = Number(process.env.CACHE_MAX_AGE_DAYS || "30");
  return Number.isFinite(n) ? n : 30;
}

function countryUri(iso2) {
  return `<${CACHE_NS}country/${iso2}>`;
}

function literalNum(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return `"${Number(n)}"^^<http://www.w3.org/2001/XMLSchema#decimal>`;
}

function literalStr(s) {
  if (!s) return null;
  const safe = String(s).replace(/"/g, '\\"');
  return `"${safe}"`;
}

function literalDateTime(iso) {
  const safe = String(iso).replace(/"/g, '\\"');
  return `"${safe}"^^<http://www.w3.org/2001/XMLSchema#dateTime>`;
}

function buildWikidataCountryQuery(iso2) {
  return `
SELECT ?country ?countryLabel ?population ?area ?gdp ?hdi ?gini ?lifeExp WHERE {
  ?country wdt:P297 "${iso2}" .

  OPTIONAL { ?country wdt:P1082 ?population . }         # population
  OPTIONAL { ?country wdt:P2046 ?area . }               # area (km^2)
  OPTIONAL { ?country wdt:P2131 ?gdp . }                # GDP (nominal)
  OPTIONAL { ?country wdt:P1081 ?hdi . }                # HDI
  OPTIONAL { ?country wdt:P1125 ?gini . }               # Gini coefficient
  OPTIONAL { ?country wdt:P2250 ?lifeExp . }            # life expectancy

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 1
`;
}

function parseWikidataRow(row) {
  const getNum = (k) => (row[k]?.value != null ? Number(row[k].value) : null);
  const label = row.countryLabel?.value || null;
  const population = getNum("population");
  const area = getNum("area");
  const gdpNominal = getNum("gdp");
  const hdi = getNum("hdi");
  const gini = getNum("gini");
  const lifeExpectancy = getNum("lifeExp");

  const populationDensity =
    population != null && area != null && area > 0 ? population / area : null;

  return {
    label,
    population,
    areaKm2: area,
    populationDensity,
    gdpNominal,
    hdi,
    gini,
    lifeExpectancy,
  };
}

async function getCachedSnapshot(iso2) {
  const { query } = fusekiEndpoints();
  const q = `
PREFIX c: <${CACHE_NS}>
SELECT ?label ?population ?areaKm2 ?populationDensity ?gdpNominal ?hdi ?gini ?lifeExpectancy ?cachedAt WHERE {
  ${countryUri(iso2)} a c:CountrySnapshot ;
    c:iso2 "${iso2}" ;
    c:cachedAt ?cachedAt .
  OPTIONAL { ${countryUri(iso2)} c:label ?label . }
  OPTIONAL { ${countryUri(iso2)} c:population ?population . }
  OPTIONAL { ${countryUri(iso2)} c:areaKm2 ?areaKm2 . }
  OPTIONAL { ${countryUri(iso2)} c:populationDensity ?populationDensity . }
  OPTIONAL { ${countryUri(iso2)} c:gdpNominal ?gdpNominal . }
  OPTIONAL { ${countryUri(iso2)} c:hdi ?hdi . }
  OPTIONAL { ${countryUri(iso2)} c:gini ?gini . }
  OPTIONAL { ${countryUri(iso2)} c:lifeExpectancy ?lifeExpectancy . }
}
LIMIT 1
`;
  const data = await sparqlSelect(query, q);
  const b = data?.results?.bindings || [];
  if (b.length === 0) return null;

  const row = b[0];
  const num = (k) => (row[k]?.value != null ? Number(row[k].value) : null);
  return {
    iso2,
    label: row.label?.value || null,
    population: num("population"),
    areaKm2: num("areaKm2"),
    populationDensity: num("populationDensity"),
    gdpNominal: num("gdpNominal"),
    hdi: num("hdi"),
    gini: num("gini"),
    lifeExpectancy: num("lifeExpectancy"),
    cachedAt: row.cachedAt?.value || null,
  };
}

function isFresh(cachedAtIso) {
  if (!cachedAtIso) return false;
  const cachedAt = new Date(cachedAtIso);
  if (Number.isNaN(cachedAt.getTime())) return false;

  const maxDays = cacheMaxAgeDays();
  const ageMs = Date.now() - cachedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays <= maxDays;
}

async function upsertSnapshot(iso2, snap) {
  const { update } = fusekiEndpoints();
  const now = new Date().toISOString();

  const triples = [];

  triples.push(
    `${countryUri(
      iso2
    )} a <${CACHE_NS}CountrySnapshot> ; <${CACHE_NS}iso2> "${iso2}" ; <${CACHE_NS}cachedAt> ${literalDateTime(
      now
    )} .`
  );

  const add = (predLocal, lit) => {
    if (!lit) return;
    triples.push(`${countryUri(iso2)} <${CACHE_NS}${predLocal}> ${lit} .`);
  };

  add("label", literalStr(snap.label));
  add("population", literalNum(snap.population));
  add("areaKm2", literalNum(snap.areaKm2));
  add("populationDensity", literalNum(snap.populationDensity));
  add("gdpNominal", literalNum(snap.gdpNominal));
  add("hdi", literalNum(snap.hdi));
  add("gini", literalNum(snap.gini));
  add("lifeExpectancy", literalNum(snap.lifeExpectancy));

  const updateQuery = `
DELETE WHERE { ${countryUri(iso2)} ?p ?o . };

INSERT DATA {
  ${triples.join("\n  ")}
}
`;

  await sparqlUpdate(update, updateQuery);

  return { ...snap, iso2, cachedAt: now };
}

async function fetchFromWikidata(iso2) {
  const wikidataUrl =
    process.env.WIKIDATA_SPARQL_URL || "https://query.wikidata.org/sparql";
  const query = buildWikidataCountryQuery(iso2);
  const data = await sparqlSelect(wikidataUrl, query);

  const bindings = data?.results?.bindings || [];
  if (bindings.length === 0) {
    const err = new Error(`No Wikidata country found for ISO2=${iso2}`);
    err.status = 404;
    throw err;
  }

  return parseWikidataRow(bindings[0]);
}

async function getOrRefreshSnapshot(iso2) {
  const cached = await getCachedSnapshot(iso2);
  if (cached && isFresh(cached.cachedAt)) {
    return { snapshot: cached, source: "cache" };
  }

  const fresh = await fetchFromWikidata(iso2);
  const stored = await upsertSnapshot(iso2, fresh);
  return { snapshot: stored, source: cached ? "refresh" : "wikidata" };
}

module.exports = { getOrRefreshSnapshot };
