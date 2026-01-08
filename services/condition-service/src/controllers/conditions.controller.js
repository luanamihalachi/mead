const { ok, BadRequest, assertQid } = require("@mead/shared");
const {
  wikidataSearchConditions,
  wikidataGetConditionDetails,
  wikidataGetConditionSymptoms,
} = require("../clients/wikidata");
const { cacheConditionAsRdf } = require("../rdf/fuseki");

async function searchConditions(req, res) {
  const q = String(req.query.q || "").trim();
  if (!q) throw BadRequest("Missing query param: q");
  const results = await wikidataSearchConditions(q);
  res.json(ok(results, { q }));
}

async function getCondition(req, res) {
  const id = assertQid(req.params.id);
  const data = await wikidataGetConditionDetails(id);

  cacheConditionAsRdf(data).catch((err) =>
    console.warn("Fuseki cache failed:", err.message)
  );

  res.json(ok(data));
}

async function getSymptoms(req, res) {
  const id = assertQid(req.params.id);
  const data = await wikidataGetConditionSymptoms(id);
  res.json(ok(data));
}

module.exports = { searchConditions, getCondition, getSymptoms };
