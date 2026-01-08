const { sparqlQuery } = require("@mead/shared");

const WD_ENDPOINT =
  process.env.WIKIDATA_SPARQL || "https://query.wikidata.org/sparql";
const UA = process.env.USER_AGENT || "MEAD-WADe/0.1 (student project)";

async function wikidataSearchConditions(term) {
  const safe = term.toLowerCase().replace(/"/g, '\\"');

  // Search: "instance of disease" + label contains query
  const query = `
SELECT ?item ?itemLabel ?desc WHERE {
  ?item wdt:P31 wd:Q12136 .        # instance of disease
  ?item rdfs:label ?itemLabel .
  FILTER(LANG(?itemLabel) = "en")
  FILTER(CONTAINS(LCASE(?itemLabel), "${safe}"))
  OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "en") }
}
LIMIT 10
`;

  const json = await sparqlQuery(WD_ENDPOINT, query, UA);

  return json.results.bindings.map((b) => ({
    id: b.item.value.split("/entity/")[1], // Qxxxx
    label: b.itemLabel.value,
    description: b.desc ? b.desc.value : undefined,
    sameAs: { wikidata: b.item.value },
  }));
}

async function wikidataGetConditionDetails(id) {
  const query = `
SELECT ?label ?desc ?alias WHERE {
  wd:${id} rdfs:label ?label .
  FILTER(LANG(?label) = "en")

  OPTIONAL { wd:${id} schema:description ?desc FILTER(LANG(?desc) = "en") }
  OPTIONAL { wd:${id} skos:altLabel ?alias FILTER(LANG(?alias) = "en") }
}
`;

  const json = await sparqlQuery(WD_ENDPOINT, query, UA);
  const rows = json.results.bindings;

  const label = rows.find((r) => r.label)?.label?.value || id;
  const description = rows.find((r) => r.desc)?.desc?.value;

  const aliases = Array.from(
    new Set(rows.filter((r) => r.alias).map((r) => r.alias.value))
  ).slice(0, 25);

  return {
    id,
    label,
    description,
    aliases,
    sameAs: { wikidata: `https://www.wikidata.org/entity/${id}` },
  };
}

async function wikidataGetConditionSymptoms(id) {
  const query = `
SELECT ?symptom ?symptomLabel WHERE {
  wd:${id} wdt:P780 ?symptom .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
LIMIT 50
`;

  const json = await sparqlQuery(WD_ENDPOINT, query, UA);

  const symptoms = json.results.bindings.map((b) => ({
    id: b.symptom.value.split("/entity/")[1],
    label: b.symptomLabel.value,
    sameAs: { wikidata: b.symptom.value },
  }));

  return { conditionId: id, symptoms };
}

module.exports = {
  wikidataSearchConditions,
  wikidataGetConditionDetails,
  wikidataGetConditionSymptoms,
};
