const { sparqlSelect, sparqlUpdate } = require("../http/sparqlFetch");

const NS = "http://example.org/cache#";

function fusekiEndpoints() {
  const base = process.env.FUSEKI_BASE_URL || "http://localhost:3030";
  const dataset = process.env.FUSEKI_DATASET || "mead";
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
  return `<${NS}country/${iso2}>`;
}

function esc(str) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ");
}

function litStr(s) {
  if (s == null || s === "") return null;
  return `"${esc(s)}"`;
}

function litNum(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return `"${Number(n)}"^^<http://www.w3.org/2001/XMLSchema#decimal>`;
}

function litDateTime(iso) {
  return `"${esc(iso)}"^^<http://www.w3.org/2001/XMLSchema#dateTime>`;
}

function litJson(obj) {
  return litStr(JSON.stringify(obj ?? null));
}

function isFresh(cachedAtIso) {
  if (!cachedAtIso) return false;
  const dt = new Date(cachedAtIso);
  if (Number.isNaN(dt.getTime())) return false;
  const ageDays = (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= cacheMaxAgeDays();
}

function parseCoordWktToLatLon(wkt) {
  if (!wkt || typeof wkt !== "string") return null;
  const m = wkt.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { lat, lon };
}

function extractLabelList(bindings, varName) {
  const set = new Set();
  for (const b of bindings || []) {
    const v = b?.[varName]?.value;
    if (v) set.add(String(v));
  }
  return Array.from(set);
}

function buildWikidataCountryFactsQuery(iso2) {
  return `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT
  ?country ?countryLabel
  ?capitalLabel ?continentLabel
  ?population ?area ?gdp ?hdi ?gini ?lifeExp
  ?internetTldLabel ?callingCode
  ?currency ?currencyLabel
  ?flagImage ?coatOfArmsImage
  ?capitalCoord
WHERE {
  ?country wdt:P297 "${iso2}" .

  OPTIONAL { ?country wdt:P36 ?capital . }
  OPTIONAL { ?country wdt:P30 ?continent . }

  OPTIONAL { ?country wdt:P1082 ?population . }
  OPTIONAL { ?country wdt:P2046 ?area . }
  OPTIONAL { ?country wdt:P2131 ?gdp . }
  OPTIONAL { ?country wdt:P1081 ?hdi . }
  OPTIONAL { ?country wdt:P1125 ?gini . }
  OPTIONAL { ?country wdt:P2250 ?lifeExp . }

  OPTIONAL { ?country wdt:P78 ?internetTld . }
  OPTIONAL { ?country wdt:P474 ?callingCode . }

  OPTIONAL { ?country wdt:P38 ?currency . }

  OPTIONAL { ?country wdt:P41 ?flagImage . }
  OPTIONAL { ?country wdt:P94 ?coatOfArmsImage . }

  OPTIONAL {
    ?country wdt:P36 ?capitalEntity .
    ?capitalEntity wdt:P625 ?capitalCoord .
  }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 1
`;
}

function buildWikidataOfficialLanguagesQuery(iso2) {
  return `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT DISTINCT ?langLabel WHERE {
  ?country wdt:P297 "${iso2}" .
  ?country wdt:P37 ?lang .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 50
`;
}

function buildWikidataTimezonesQuery(iso2) {
  return `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT DISTINCT ?tzLabel WHERE {
  ?country wdt:P297 "${iso2}" .
  OPTIONAL { ?country wdt:P36 ?capital . }

  { ?country wdt:P421 ?tz . }
  UNION
  { ?capital wdt:P421 ?tz . }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 50
`;
}

function buildWikidataMajorCitiesIdsQuery(iso2, limit = 5) {
  const safeLimit = Number(limit) || 5;
  return `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd:  <http://www.wikidata.org/entity/>

SELECT ?city ?coord WHERE {
  ?country wdt:P297 "${iso2}" .
  ?city wdt:P17 ?country ;
        wdt:P31 wd:Q515 ;
        wdt:P625 ?coord .
}
LIMIT ${safeLimit}
`;
}

function qidFromEntityUrl(url) {
  const m = String(url || "").match(/\/(Q\d+)$/);
  return m ? m[1] : null;
}

function parseCityIdRows(bindings) {
  const out = [];
  for (const b of bindings || []) {
    const id = b?.city?.value ? String(b.city.value) : null;
    const qid = id ? qidFromEntityUrl(id) : null;
    const coord = b?.coord?.value
      ? parseCoordWktToLatLon(String(b.coord.value))
      : null;
    if (!id || !qid || !coord) continue;
    out.push({ id, qid, coord });
  }
  return out;
}

function parseLabelsMap(bindings) {
  const map = new Map();
  for (const b of bindings || []) {
    const cityUrl = b?.city?.value ? String(b.city.value) : null;
    const qid = cityUrl ? qidFromEntityUrl(cityUrl) : null;
    const label = b?.label?.value != null ? String(b.label.value) : null;
    if (qid && label) map.set(qid, label);
  }
  return map;
}

function buildWikidataLabelsForEntitiesQuery(qids) {
  const values = qids.map((q) => `wd:${q}`).join(" ");
  return `
PREFIX wd:   <http://www.wikidata.org/entity/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?city ?label WHERE {
  VALUES ?city { ${values} }
  OPTIONAL { ?city rdfs:label ?label FILTER(LANG(?label) = "en") }
}
`;
}

function parseCityRows(bindings) {
  return (bindings || []).map((b) => ({
    id: b.city.value,
    name: b.cityLabel.value,
    population: null,
    ...parseCoordWktToLatLon(b.coord.value),
  }));
}

async function fetchFromWikidata(iso2) {
  const wikidataUrl =
    process.env.WIKIDATA_SPARQL_URL || "https://query.wikidata.org/sparql";

  const factsRes = await sparqlSelect(
    wikidataUrl,
    buildWikidataCountryFactsQuery(iso2)
  );
  const factsBindings = factsRes?.results?.bindings || [];
  if (factsBindings.length === 0) {
    const err = new Error(`No Wikidata country found for ISO2=${iso2}`);
    err.status = 404;
    throw err;
  }
  const row = factsBindings[0];

  const getNum = (k) => (row[k]?.value != null ? Number(row[k].value) : null);
  const getStr = (k) => (row[k]?.value != null ? String(row[k].value) : null);

  const population = getNum("population");
  const areaKm2 = getNum("area");
  const populationDensity =
    population != null && areaKm2 != null && areaKm2 > 0
      ? population / areaKm2
      : null;

  const facts = {
    label: getStr("countryLabel"),
    capital: getStr("capitalLabel"),
    continent: getStr("continentLabel"),

    population,
    areaKm2,
    populationDensity,
    gdpNominal: getNum("gdp"),
    hdi: getNum("hdi"),
    gini: getNum("gini"),
    lifeExpectancy: getNum("lifeExp"),

    internetTld: getStr("internetTldLabel"),
    callingCode: getStr("callingCode"),

    currencyId: getStr("currency"),
    currencyLabel: getStr("currencyLabel"),

    flagImage: getStr("flagImage"),
    coatOfArmsImage: getStr("coatOfArmsImage"),

    capitalCoordinates: parseCoordWktToLatLon(getStr("capitalCoord")),
  };

  let officialLanguages = [];
  try {
    const res = await sparqlSelect(
      wikidataUrl,
      buildWikidataOfficialLanguagesQuery(iso2)
    );
    officialLanguages = extractLabelList(res?.results?.bindings, "langLabel");
  } catch {
    officialLanguages = [];
  }

  let timezones = [];
  try {
    const res = await sparqlSelect(
      wikidataUrl,
      buildWikidataTimezonesQuery(iso2)
    );
    timezones = extractLabelList(res?.results?.bindings, "tzLabel");
  } catch {
    timezones = [];
  }

  let majorCities = [];
  try {
    const limit = Number(process.env.MAJOR_CITIES_LIMIT || 5);

    const idsRes = await sparqlSelect(
      wikidataUrl,
      buildWikidataMajorCitiesIdsQuery(iso2, limit)
    );
    const cityRows = parseCityIdRows(idsRes?.results?.bindings);

    const qids = cityRows.map((r) => r.qid);
    let labels = new Map();
    if (qids.length > 0) {
      const labelsRes = await sparqlSelect(
        wikidataUrl,
        buildWikidataLabelsForEntitiesQuery(qids)
      );
      labels = parseLabelsMap(labelsRes?.results?.bindings);
    }

    majorCities = cityRows.map((r) => ({
      id: r.id,
      name: labels.get(r.qid) || r.qid,
      population: null,
      ...r.coord,
    }));
  } catch {
    console.error("Wikidata majorCities failed:", e?.message || e);
    majorCities = [];
  }

  return { ...facts, officialLanguages, timezones, majorCities };
}

async function getCachedSnapshot(iso2) {
  const { query } = fusekiEndpoints();
  const q = `
PREFIX c: <${NS}>
SELECT
  ?label ?cachedAt
  ?capital ?continent
  ?population ?areaKm2 ?populationDensity ?gdpNominal ?hdi ?gini ?lifeExpectancy
  ?internetTld ?callingCode
  ?currencyId ?currencyLabel
  ?flagImage ?coatOfArmsImage
  ?officialLanguagesJson ?timezonesJson ?capitalCoordinatesJson ?majorCitiesJson
WHERE {
  ${countryUri(iso2)} a c:CountrySnapshot ;
    c:iso2 "${iso2}" ;
    c:cachedAt ?cachedAt .

  OPTIONAL { ${countryUri(iso2)} c:label ?label . }
  OPTIONAL { ${countryUri(iso2)} c:capital ?capital . }
  OPTIONAL { ${countryUri(iso2)} c:continent ?continent . }

  OPTIONAL { ${countryUri(iso2)} c:population ?population . }
  OPTIONAL { ${countryUri(iso2)} c:areaKm2 ?areaKm2 . }
  OPTIONAL { ${countryUri(iso2)} c:populationDensity ?populationDensity . }
  OPTIONAL { ${countryUri(iso2)} c:gdpNominal ?gdpNominal . }
  OPTIONAL { ${countryUri(iso2)} c:hdi ?hdi . }
  OPTIONAL { ${countryUri(iso2)} c:gini ?gini . }
  OPTIONAL { ${countryUri(iso2)} c:lifeExpectancy ?lifeExpectancy . }

  OPTIONAL { ${countryUri(iso2)} c:internetTld ?internetTld . }
  OPTIONAL { ${countryUri(iso2)} c:callingCode ?callingCode . }

  OPTIONAL { ${countryUri(iso2)} c:currencyId ?currencyId . }
  OPTIONAL { ${countryUri(iso2)} c:currencyLabel ?currencyLabel . }

  OPTIONAL { ${countryUri(iso2)} c:flagImage ?flagImage . }
  OPTIONAL { ${countryUri(iso2)} c:coatOfArmsImage ?coatOfArmsImage . }

  OPTIONAL { ${countryUri(
    iso2
  )} c:officialLanguagesJson ?officialLanguagesJson . }
  OPTIONAL { ${countryUri(iso2)} c:timezonesJson ?timezonesJson . }
  OPTIONAL { ${countryUri(
    iso2
  )} c:capitalCoordinatesJson ?capitalCoordinatesJson . }
  OPTIONAL { ${countryUri(iso2)} c:majorCitiesJson ?majorCitiesJson . }
}
LIMIT 1
`;
  const data = await sparqlSelect(query, q);
  const b = data?.results?.bindings?.[0];
  if (!b) return null;

  const num = (k) => (b[k]?.value != null ? Number(b[k].value) : null);
  const str = (k) => (b[k]?.value != null ? String(b[k].value) : null);
  const json = (k) => {
    try {
      const v = str(k);
      return v ? JSON.parse(v) : null;
    } catch {
      return null;
    }
  };

  return {
    iso2,
    cachedAt: str("cachedAt"),
    label: str("label"),

    capital: str("capital"),
    continent: str("continent"),

    population: num("population"),
    areaKm2: num("areaKm2"),
    populationDensity: num("populationDensity"),
    gdpNominal: num("gdpNominal"),
    hdi: num("hdi"),
    gini: num("gini"),
    lifeExpectancy: num("lifeExpectancy"),

    internetTld: str("internetTld"),
    callingCode: str("callingCode"),

    currencyId: str("currencyId"),
    currencyLabel: str("currencyLabel"),

    flagImage: str("flagImage"),
    coatOfArmsImage: str("coatOfArmsImage"),

    officialLanguages: json("officialLanguagesJson") || [],
    timezones: json("timezonesJson") || [],
    capitalCoordinates: json("capitalCoordinatesJson") || null,

    majorCities: json("majorCitiesJson") || [],
  };
}

async function upsertSnapshot(iso2, snap) {
  const { update } = fusekiEndpoints();
  const now = new Date().toISOString();

  const subj = countryUri(iso2);
  const triples = [];

  triples.push(`${subj} a <${NS}CountrySnapshot> .`);
  triples.push(`${subj} <${NS}iso2> "${iso2}" .`);
  triples.push(`${subj} <${NS}cachedAt> ${litDateTime(now)} .`);

  const add = (predLocal, lit) => {
    if (!lit) return;
    triples.push(`${subj} <${NS}${predLocal}> ${lit} .`);
  };

  add("label", litStr(snap.label));
  add("capital", litStr(snap.capital));
  add("continent", litStr(snap.continent));

  add("population", litNum(snap.population));
  add("areaKm2", litNum(snap.areaKm2));
  add("populationDensity", litNum(snap.populationDensity));
  add("gdpNominal", litNum(snap.gdpNominal));
  add("hdi", litNum(snap.hdi));
  add("gini", litNum(snap.gini));
  add("lifeExpectancy", litNum(snap.lifeExpectancy));

  add("internetTld", litStr(snap.internetTld));
  add("callingCode", litStr(snap.callingCode));

  add("currencyId", litStr(snap.currencyId));
  add("currencyLabel", litStr(snap.currencyLabel));

  add("flagImage", litStr(snap.flagImage));
  add("coatOfArmsImage", litStr(snap.coatOfArmsImage));

  add("officialLanguagesJson", litJson(snap.officialLanguages || []));
  add("timezonesJson", litJson(snap.timezones || []));
  add("capitalCoordinatesJson", litJson(snap.capitalCoordinates || null));
  add("majorCitiesJson", litJson(snap.majorCities || []));

  triples.push(`${subj} a <https://schema.org/Country> .`);

  if (snap.label) {
    triples.push(`${subj} <https://schema.org/name> ${litStr(snap.label)} .`);
  }
  triples.push(`${subj} <https://schema.org/identifier> ${litStr(iso2)} .`);

  if (snap.capital) {
    triples.push(
      `${subj} <https://schema.org/capital> ${litStr(snap.capital)} .`
    );
  }
  if (snap.continent) {
    triples.push(
      `${subj} <https://schema.org/containedInPlace> ${litStr(
        snap.continent
      )} .`
    );
  }

  if (snap.population != null) {
    triples.push(
      `${subj} <https://schema.org/population> ${litNum(snap.population)} .`
    );
  }
  if (snap.areaKm2 != null) {
    triples.push(`${subj} <https://schema.org/area> ${litNum(snap.areaKm2)} .`);
  }

  if (snap.flagImage) {
    triples.push(
      `${subj} <https://schema.org/image> ${litStr(snap.flagImage)} .`
    );
  }
  if (snap.coatOfArmsImage) {
    triples.push(
      `${subj} <https://schema.org/image> ${litStr(snap.coatOfArmsImage)} .`
    );
  }

  const lat = snap?.capitalCoordinates?.lat;
  const lon = snap?.capitalCoordinates?.lon;
  if (lat != null && lon != null) {
    triples.push(
      `${subj} <https://schema.org/geo> [
        a <https://schema.org/GeoCoordinates> ;
        <https://schema.org/latitude> ${litNum(lat)} ;
        <https://schema.org/longitude> ${litNum(lon)}
      ] .`
    );
  }

  for (const l of Array.isArray(snap.officialLanguages)
    ? snap.officialLanguages
    : []) {
    if (l) {
      triples.push(`${subj} <https://schema.org/knowsLanguage> ${litStr(l)} .`);
    }
  }
  for (const tz of Array.isArray(snap.timezones) ? snap.timezones : []) {
    if (tz) {
      triples.push(`${subj} <https://schema.org/timeZone> ${litStr(tz)} .`);
    }
  }

  triples.push(
    `${subj} <http://www.w3.org/ns/prov#generatedAtTime> ${litDateTime(now)} .`
  );
  triples.push(`${subj} <http://purl.org/dc/terms/source> "wikidata" .`);

  const updateQuery = `
DELETE WHERE { ${subj} ?p ?o . };

INSERT DATA {
  ${triples.join("\n  ")}
}
`;

  await sparqlUpdate(update, updateQuery);

  return { ...snap, iso2, cachedAt: now };
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
