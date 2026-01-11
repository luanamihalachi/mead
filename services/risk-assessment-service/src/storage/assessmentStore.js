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

function assessmentUri(iso2, disease) {
  return `<${NS}risk/${iso2}/${disease}>`;
}

function esc(str) {
  return String(str).replace(/"/g, '\\"');
}

function litStr(s) {
  if (s == null) return null;
  return `"${esc(s)}"`;
}

function litNum(n) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return `"${Number(n)}"^^<http://www.w3.org/2001/XMLSchema#decimal>`;
}

function litDateTime(iso) {
  return `"${esc(iso)}"^^<http://www.w3.org/2001/XMLSchema#dateTime>`;
}

function isFresh(cachedAtIso) {
  if (!cachedAtIso) return false;
  const dt = new Date(cachedAtIso);
  if (Number.isNaN(dt.getTime())) return false;

  const ageDays = (Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays <= cacheMaxAgeDays();
}

async function readAssessment(iso2, disease) {
  const { query } = fusekiEndpoints();
  const q = `
PREFIX c: <${NS}>
SELECT ?cachedAt ?countryCachedAt ?score ?level ?why ?usedSignalsJson WHERE {
  ${assessmentUri(iso2, disease)} a c:RiskAssessment ;
    c:iso2 "${iso2}" ;
    c:disease "${disease}" ;
    c:cachedAt ?cachedAt ;
    c:countryCachedAt ?countryCachedAt ;
    c:score ?score ;
    c:level ?level ;
    c:usedSignalsJson ?usedSignalsJson .

  OPTIONAL { ${assessmentUri(iso2, disease)} c:why ?why . }
}
`;
  const data = await sparqlSelect(query, q);
  const rows = data?.results?.bindings || [];
  if (rows.length === 0) return null;

  const base = rows[0];
  const whys = rows.map((r) => r.why?.value).filter(Boolean);

  let usedSignals = {};
  try {
    usedSignals = JSON.parse(base.usedSignalsJson?.value || "{}");
  } catch {
    usedSignals = {};
  }

  return {
    iso2,
    disease,
    cachedAt: base.cachedAt?.value || null,
    countryCachedAt: base.countryCachedAt?.value || null,
    score: Number(base.score?.value),
    level: base.level?.value || null,
    why: whys,
    usedSignals,
  };
}

async function upsertAssessment(iso2, disease, assessment) {
  const { update } = fusekiEndpoints();
  const now = new Date().toISOString();

  const subj = assessmentUri(iso2, disease);

  const triples = [];
  triples.push(`${subj} a <${NS}RiskAssessment> .`);
  triples.push(`${subj} <${NS}iso2> "${iso2}" .`);
  triples.push(`${subj} <${NS}disease> "${disease}" .`);
  triples.push(`${subj} <${NS}cachedAt> ${litDateTime(now)} .`);
  triples.push(
    `${subj} <${NS}countryCachedAt> ${litDateTime(
      assessment.countryCachedAt
    )} .`
  );
  triples.push(`${subj} <${NS}score> ${litNum(assessment.score)} .`);
  triples.push(`${subj} <${NS}level> ${litStr(assessment.level)} .`);
  triples.push(
    `${subj} <${NS}usedSignalsJson> ${litStr(
      JSON.stringify(assessment.usedSignals || {})
    )} .`
  );

  for (const w of assessment.why || []) {
    triples.push(`${subj} <${NS}why> ${litStr(w)} .`);
  }

  const updateQuery = `
DELETE WHERE { ${subj} ?p ?o . };

INSERT DATA {
  ${triples.join("\n  ")}
}
`;
  await sparqlUpdate(update, updateQuery);

  return {
    ...assessment,
    cachedAt: now,
  };
}

async function getOrRefreshAssessment({
  iso2,
  disease,
  countryCachedAt,
  compute,
}) {
  const existing = await readAssessment(iso2, disease);

  if (
    existing &&
    isFresh(existing.cachedAt) &&
    existing.countryCachedAt === countryCachedAt
  ) {
    return { assessment: existing, source: "cache" };
  }

  const computed = compute();
  const toStore = {
    countryCachedAt,
    score: computed.score,
    level: computed.level,
    why: computed.why || [],
    usedSignals: computed.usedSignals || {},
  };

  const saved = await upsertAssessment(iso2, disease, toStore);

  return {
    assessment: { iso2, disease, ...saved },
    source: existing ? "refresh" : "computed",
  };
}

module.exports = { getOrRefreshAssessment };
