const { sparqlSelect, sparqlUpdate } = require("../http/sparqlFetch");

const NS = "http://example.org/cache#";
const XSD_DATE = "<http://www.w3.org/2001/XMLSchema#dateTime>";

const FALLBACK_LABELS = {
  asthma: ["Asthma"],
  obesity: ["Obesity", "Obesity (medical condition)"],
  depression: [
    "Major depressive disorder",
    "Depressive disorder",
    "Clinical depression",
    "Depression (mood)",
    "Depression",
  ],
};

function fusekiEndpoints() {
  const base = process.env.FUSEKI_BASE_URL || "http://localhost:3030";
  const dataset = process.env.FUSEKI_DATASET || "mead";
  const clean = base.replace(/\/$/, "");
  return {
    query: `${clean}/${dataset}/query`,
    update: `${clean}/${dataset}/update`,
  };
}

function fusekiAuth() {
  const user = process.env.FUSEKI_USER;
  const password = process.env.FUSEKI_PASSWORD;
  return user || password ? { user, password } : {};
}

function cacheMaxAgeDays() {
  const n = Number(process.env.CACHE_MAX_AGE_DAYS || "30");
  return Number.isFinite(n) ? n : 30;
}

function isFresh(cachedAtIso) {
  if (!cachedAtIso) return false;
  const dt = new Date(cachedAtIso);
  if (Number.isNaN(dt.getTime())) return false;
  const ageDays = (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= cacheMaxAgeDays();
}

function conditionUri(key) {
  return `<${NS}condition/${encodeURIComponent(key)}>`;
}

function esc(str) {
  return String(str)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
    .replace(/\r/g, " ");
}

function litStr(s) {
  if (s == null || s === "") return null;
  return `"${esc(s)}"`;
}

function litDateTime(iso) {
  return `"${esc(iso)}"^^${XSD_DATE}`;
}

function asArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function uniqStrings(arr) {
  return Array.from(
    new Set(
      asArr(arr)
        .filter((x) => x !== null && x !== undefined)
        .map((x) => String(x).trim())
        .filter(Boolean)
    )
  );
}

function wikidataUserAgent() {
  return (
    process.env.WIKIDATA_USER_AGENT ||
    "mead-condition-service/1.0 (contact: local-dev)"
  );
}

function qidFromEntityUrl(url) {
  const m = String(url || "").match(/\/(Q\d+)$/);
  return m ? m[1] : null;
}

function stableHash(str) {
  let h = 0;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}

function skolemItemUri(key, pred, item) {
  const qid = item?.id || qidFromEntityUrl(item?.uri);
  const tail = qid ? qid : stableHash(item?.uri || item?.label || "");
  return `<${NS}ref/${encodeURIComponent(key)}/${encodeURIComponent(
    pred
  )}/${encodeURIComponent(tail)}>`;
}

function normalizeItem(uri, label) {
  const u = uri ? String(uri) : null;
  const id = u ? qidFromEntityUrl(u) : null;
  const lbl = label ? String(label) : null;
  return {
    id: id || null,
    uri: u || null,
    label: lbl || (id ? id : u || null),
  };
}

function uniqByUri(items) {
  const seen = new Set();
  const out = [];
  for (const it of items || []) {
    const u = it?.uri;
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(it);
  }
  return out;
}

async function resolveEntityQidBySearch(searchText) {
  const search = (searchText || "").trim();
  if (!search) return null;

  const url =
    "https://www.wikidata.org/w/api.php?" +
    new URLSearchParams({
      action: "wbsearchentities",
      format: "json",
      language: "en",
      uselang: "en",
      type: "item",
      limit: "5",
      search,
    }).toString();

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "user-agent": wikidataUserAgent(),
      accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `Wikidata search failed (${res.status}): ${text || res.statusText}`
    );
    err.status = 502;
    throw err;
  }

  const json = await res.json();
  return json?.search?.[0]?.id || null;
}

async function resolveWikidataEntityForCondition(key, label) {
  const candidates = uniqStrings([...(FALLBACK_LABELS[key] || []), label, key]);

  for (const cand of candidates) {
    const qid = await resolveEntityQidBySearch(cand);
    if (qid) {
      return {
        qid,
        entityUrl: `http://www.wikidata.org/entity/${qid}`,
        resolvedBy: cand,
      };
    }
  }

  return { qid: null, entityUrl: null, resolvedBy: null };
}

function buildWikidataScalarFactsQuery() {
  return `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX schema: <http://schema.org/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX bd: <http://www.bigdata.com/rdf#>

SELECT
  ?itemLabel
  ?desc
  ?image
  ?icd10
  ?icd11
  ?mesh
  ?umls
  ?specialtyLabel
WHERE {
  BIND(?_item AS ?item)

  OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "en") }
  OPTIONAL { ?item wdt:P18 ?image }

  OPTIONAL { ?item wdt:P494 ?icd10 }   # ICD-10
  OPTIONAL { ?item wdt:P7329 ?icd11 }  # ICD-11
  OPTIONAL { ?item wdt:P486 ?mesh }    # MeSH
  OPTIONAL { ?item wdt:P2892 ?umls }   # UMLS CUI

  OPTIONAL { ?item wdt:P1995 ?specialty }

  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
`;
}

function buildWikidataAltLabelsQuery() {
  return `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>

SELECT DISTINCT ?alt WHERE {
  BIND(?_item AS ?item)
  ?item skos:altLabel ?alt .
  FILTER(LANG(?alt) = "en")
}
LIMIT 50
`;
}

function buildWikidataListItemsQuery(propIri) {
  return `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT DISTINCT ?x ?xLabel WHERE {
  BIND(?_item AS ?item)
  ?item <${propIri}> ?x .
  OPTIONAL { ?x rdfs:label ?xLabel FILTER(LANG(?xLabel) = "en") }
}
LIMIT 200
`;
}

async function fetchConditionFromWikidata({ key, label }) {
  const wikidataSparql =
    process.env.WIKIDATA_SPARQL_URL || "https://query.wikidata.org/sparql";

  const resolved = await resolveWikidataEntityForCondition(key, label);
  if (!resolved.entityUrl) {
    const err = new Error(
      `No Wikidata match found for "${label}" (key=${key})`
    );
    err.status = 404;
    throw err;
  }

  const { qid, entityUrl, resolvedBy } = resolved;

  const str = (r, k) => (r?.[k]?.value != null ? String(r[k].value) : null);

  const scalarQuery = buildWikidataScalarFactsQuery().replace(
    /\?_item/g,
    `<${entityUrl}>`
  );
  const scalarRes = await sparqlSelect(wikidataSparql, scalarQuery);
  const scalarRows = scalarRes?.results?.bindings || [];
  const first = scalarRows[0] || {};

  const itemLabel = str(first, "itemLabel");
  const finalLabel = itemLabel || label || key;

  const description = str(first, "desc") || null;
  const imageDirect = str(first, "image") || null;

  const icd10 = uniqStrings(
    scalarRows.map((r) => str(r, "icd10")).filter(Boolean)
  );
  const icd11 = uniqStrings(
    scalarRows.map((r) => str(r, "icd11")).filter(Boolean)
  );
  const mesh = uniqStrings(
    scalarRows.map((r) => str(r, "mesh")).filter(Boolean)
  );
  const umls = uniqStrings(
    scalarRows.map((r) => str(r, "umls")).filter(Boolean)
  );

  const specialties = uniqStrings(
    scalarRows.map((r) => str(r, "specialtyLabel")).filter(Boolean)
  );

  const altQuery = buildWikidataAltLabelsQuery().replace(
    /\?_item/g,
    `<${entityUrl}>`
  );
  const altRes = await sparqlSelect(wikidataSparql, altQuery);
  const altLabels = uniqStrings(
    (altRes?.results?.bindings || []).map((b) => b?.alt?.value)
  );

  const listItems = async (prop) => {
    try {
      const q = buildWikidataListItemsQuery(prop).replace(
        /\?_item/g,
        `<${entityUrl}>`
      );
      const r = await sparqlSelect(wikidataSparql, q);
      const rows = r?.results?.bindings || [];
      const items = rows
        .map((b) => {
          const uri = b?.x?.value ? String(b.x.value) : null;
          const lbl = b?.xLabel?.value ? String(b.xLabel.value) : null;
          if (!uri) return null;
          return normalizeItem(uri, lbl);
        })
        .filter(Boolean);

      return uniqByUri(items);
    } catch {
      return [];
    }
  };

  const instanceOf = await listItems("http://www.wikidata.org/prop/direct/P31");
  const subclassOf = await listItems(
    "http://www.wikidata.org/prop/direct/P279"
  );

  const symptoms = await listItems("http://www.wikidata.org/prop/direct/P780");
  const riskFactors = await listItems(
    "http://www.wikidata.org/prop/direct/P5642"
  );

  const treatments2176 = await listItems(
    "http://www.wikidata.org/prop/direct/P2176"
  );
  const possibleTreatments = await listItems(
    "http://www.wikidata.org/prop/direct/P924"
  );
  const treatments = uniqByUri([
    ...(possibleTreatments || []),
    ...(treatments2176 || []),
  ]);

  const medications2175 = await listItems(
    "http://www.wikidata.org/prop/direct/P2175"
  );

  const causes = await listItems("http://www.wikidata.org/prop/direct/P828");

  return {
    qid,
    wikidataUrl: `https://www.wikidata.org/wiki/${qid}`,
    label: finalLabel,
    description,
    image: imageDirect,

    identifiers: {
      icd10: icd10.length ? icd10 : null,
      icd11: icd11.length ? icd11 : null,
      mesh: mesh.length ? mesh : null,
      umls: umls.length ? umls : null,
    },

    specialties: specialties.length ? specialties : null,
    altLabels: altLabels.length ? altLabels : null,

    facts: {
      instanceOf,
      subclassOf,
      symptoms,
      riskFactors,
      treatments,
      medications: medications2175,
      causes,
    },

    resolvedBy,
  };
}

async function getCachedConditionSnapshot(key) {
  const { query } = fusekiEndpoints();
  const subj = conditionUri(key);

  const scalarQ = `
PREFIX c: <${NS}>

SELECT
  ?cachedAt ?name ?short ?qid ?wikidataUrl ?description ?image
  ?icd10 ?icd11 ?mesh ?umls ?specialty ?altLabel
  ?resolvedBy
WHERE {
  ${subj} a c:ConditionSnapshot ;
         c:key "${esc(key)}" ;
         c:cachedAt ?cachedAt .

  OPTIONAL { ${subj} c:name ?name . }
  OPTIONAL { ${subj} c:short ?short . }

  OPTIONAL { ${subj} c:qid ?qid . }
  OPTIONAL { ${subj} c:wikidataUrl ?wikidataUrl . }
  OPTIONAL { ${subj} c:description ?description . }
  OPTIONAL { ${subj} c:image ?image . }

  OPTIONAL { ${subj} c:icd10 ?icd10 . }
  OPTIONAL { ${subj} c:icd11 ?icd11 . }
  OPTIONAL { ${subj} c:mesh ?mesh . }
  OPTIONAL { ${subj} c:umls ?umls . }

  OPTIONAL { ${subj} c:specialty ?specialty . }
  OPTIONAL { ${subj} c:altLabel ?altLabel . }

  OPTIONAL { ${subj} c:resolvedBy ?resolvedBy . }
}
`;

  const scalarRes = await sparqlSelect(query, scalarQ, fusekiAuth());
  const scalarRows = scalarRes?.results?.bindings || [];
  if (!scalarRows.length) return null;

  const first = scalarRows[0];
  const val = (r, k) => (r?.[k]?.value != null ? String(r[k].value) : null);
  const collect = (k) =>
    uniqStrings(scalarRows.map((r) => val(r, k)).filter(Boolean));

  const factsQ = `
PREFIX c: <${NS}>

SELECT ?pred ?uri ?qid ?label WHERE {
  {
    ${subj} c:instanceOf ?n .
    BIND("instanceOf" AS ?pred)
  } UNION {
    ${subj} c:subclassOf ?n .
    BIND("subclassOf" AS ?pred)
  } UNION {
    ${subj} c:symptom ?n .
    BIND("symptoms" AS ?pred)
  } UNION {
    ${subj} c:riskFactor ?n .
    BIND("riskFactors" AS ?pred)
  } UNION {
    ${subj} c:treatment ?n .
    BIND("treatments" AS ?pred)
  } UNION {
    ${subj} c:medication ?n .
    BIND("medications" AS ?pred)
  } UNION {
    ${subj} c:cause ?n .
    BIND("causes" AS ?pred)
  }

  OPTIONAL { ?n c:uri ?uri . }
  OPTIONAL { ?n c:qid ?qid . }
  OPTIONAL { ?n c:label ?label . }
}
`;

  const factsRes = await sparqlSelect(query, factsQ, fusekiAuth());
  const factRows = factsRes?.results?.bindings || [];

  const facts = {
    instanceOf: [],
    subclassOf: [],
    symptoms: [],
    riskFactors: [],
    treatments: [],
    medications: [],
    causes: [],
  };

  for (const r of factRows) {
    const pred = r?.pred?.value ? String(r.pred.value) : null;
    if (!pred || !facts[pred]) continue;

    const uri = r?.uri?.value ? String(r.uri.value) : null;
    const qid = r?.qid?.value ? String(r.qid.value) : null;
    const label = r?.label?.value ? String(r.label.value) : null;

    if (!uri && !qid && !label) continue;

    facts[pred].push({
      id: qid || (uri ? qidFromEntityUrl(uri) : null),
      uri: uri || (qid ? `http://www.wikidata.org/entity/${qid}` : null),
      label: label || qid || uri,
    });
  }

  for (const k of Object.keys(facts)) {
    facts[k] = uniqByUri(facts[k]);
  }

  return {
    key,
    cachedAt: val(first, "cachedAt"),
    name: val(first, "name"),
    short: val(first, "short"),

    qid: val(first, "qid"),
    wikidataUrl: val(first, "wikidataUrl"),
    description: val(first, "description"),
    image: val(first, "image"),

    identifiers: {
      icd10: collect("icd10").length ? collect("icd10") : null,
      icd11: collect("icd11").length ? collect("icd11") : null,
      mesh: collect("mesh").length ? collect("mesh") : null,
      umls: collect("umls").length ? collect("umls") : null,
    },

    specialties: collect("specialty").length ? collect("specialty") : null,
    altLabels: collect("altLabel").length ? collect("altLabel") : null,

    facts,

    resolvedBy: val(first, "resolvedBy"),
  };
}

async function upsertConditionSnapshot(key, snap, { short } = {}) {
  const { update } = fusekiEndpoints();
  const now = new Date().toISOString();
  const subj = conditionUri(key);

  const triples = [];

  const add = (predLocal, lit) => {
    if (!lit) return;
    triples.push(`${subj} <${NS}${predLocal}> ${lit} .`);
  };

  const addManyLiterals = (predLocal, values) => {
    const vs = uniqStrings(values);
    for (const v of vs) {
      triples.push(`${subj} <${NS}${predLocal}> "${esc(v)}" .`);
    }
  };

  const addManyRefs = (predLocal, items) => {
    const its = uniqByUri(items || []);
    for (const it of its) {
      if (!it?.uri && !it?.id) continue;

      const normalized = {
        id: it.id || (it.uri ? qidFromEntityUrl(it.uri) : null),
        uri:
          it.uri || (it.id ? `http://www.wikidata.org/entity/${it.id}` : null),
        label: it.label || it.id || it.uri,
      };

      if (!normalized.uri) continue;

      const node = skolemItemUri(key, predLocal, normalized);
      triples.push(`${subj} <${NS}${predLocal}> ${node} .`);
      triples.push(`${node} a <${NS}WikidataRef> .`);
      triples.push(`${node} <${NS}uri> <${normalized.uri}> .`);
      if (normalized.id) {
        triples.push(`${node} <${NS}qid> "${esc(normalized.id)}" .`);
      }
      if (normalized.label) {
        triples.push(`${node} <${NS}label> "${esc(normalized.label)}" .`);
      }
    }
  };

  triples.push(`${subj} a <${NS}ConditionSnapshot> .`);
  add("key", `"${esc(key)}"`);
  add("cachedAt", litDateTime(now));

  add("name", litStr(snap.label || snap.name));
  add("short", litStr(short || snap.short || null));

  add("qid", litStr(snap.qid));
  add("wikidataUrl", litStr(snap.wikidataUrl));
  add("description", litStr(snap.description));
  add("image", litStr(snap.image));

  addManyLiterals("icd10", snap.identifiers?.icd10 || []);
  addManyLiterals("icd11", snap.identifiers?.icd11 || []);
  addManyLiterals("mesh", snap.identifiers?.mesh || []);
  addManyLiterals("umls", snap.identifiers?.umls || []);

  addManyLiterals("specialty", snap.specialties || []);
  addManyLiterals("altLabel", snap.altLabels || []);

  addManyRefs("instanceOf", snap.facts?.instanceOf || []);
  addManyRefs("subclassOf", snap.facts?.subclassOf || []);
  addManyRefs("symptom", snap.facts?.symptoms || []);
  addManyRefs("riskFactor", snap.facts?.riskFactors || []);
  addManyRefs("treatment", snap.facts?.treatments || []);
  addManyRefs("medication", snap.facts?.medications || []);
  addManyRefs("cause", snap.facts?.causes || []);

  add("resolvedBy", litStr(snap.resolvedBy || null));

  const updateQuery = `
DELETE WHERE { ${subj} ?p ?o . };

INSERT DATA {
  ${triples.join("\n  ")}
}
`;

  await sparqlUpdate(update, updateQuery, fusekiAuth());

  return {
    ...snap,
    key,
    cachedAt: now,
    short: short || snap.short || null,
  };
}

async function getOrRefreshConditionSnapshot({ key, label, short }) {
  const cached = await getCachedConditionSnapshot(key);
  if (cached && isFresh(cached.cachedAt)) {
    return { snapshot: cached, source: "cache" };
  }

  const fresh = await fetchConditionFromWikidata({ key, label });
  const stored = await upsertConditionSnapshot(key, fresh, { short });

  return { snapshot: stored, source: cached ? "refresh" : "wikidata" };
}

module.exports = { getOrRefreshConditionSnapshot };
