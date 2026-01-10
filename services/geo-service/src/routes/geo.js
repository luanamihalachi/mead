const express = require("express");
const {
  ALLOWED_DISEASES,
  normalizeIso2,
  assertAllowedDisease,
} = require("@mead/shared");
const { getOrRefreshSnapshot } = require("../risk/storage");
const { computeRisk } = require("../risk/compute");

const router = express.Router();

router.get("/health", (req, res) =>
  res.json({ ok: true, service: "geo-service" })
);

router.get("/geo/:iso2", async (req, res, next) => {
  try {
    const iso2 = normalizeIso2(req.params.iso2);
    if (!iso2 || iso2.length !== 2)
      return res
        .status(400)
        .json({ error: "ISO2 must be 2 letters (e.g. US)" });

    const { snapshot, source } = await getOrRefreshSnapshot(iso2);

    const risks = {};
    for (const d of ALLOWED_DISEASES) {
      const r = computeRisk(d, snapshot);
      risks[d] = { level: r.level, score: r.score };
    }

    res.json({
      iso2,
      source,
      cachedAt: snapshot.cachedAt,
      country: {
        label: snapshot.label,
        population: snapshot.population,
        areaKm2: snapshot.areaKm2,
        populationDensity: snapshot.populationDensity,
        gdpNominal: snapshot.gdpNominal,
        hdi: snapshot.hdi,
        gini: snapshot.gini,
        lifeExpectancy: snapshot.lifeExpectancy,
      },
      risks,
    });
  } catch (e) {
    next(e);
  }
});

router.get("/geo/:iso2/:disease", async (req, res, next) => {
  try {
    const iso2 = normalizeIso2(req.params.iso2);
    const disease = (req.params.disease || "").toLowerCase();

    if (!iso2 || iso2.length !== 2)
      return res
        .status(400)
        .json({ error: "ISO2 must be 2 letters (e.g. US)" });
    assertAllowedDisease(disease);

    const { snapshot, source } = await getOrRefreshSnapshot(iso2);
    const result = computeRisk(disease, snapshot);

    res.json({
      iso2,
      disease,
      source,
      cachedAt: snapshot.cachedAt,
      level: result.level,
      score: result.score,
      why: result.why,
      usedSignals: {
        populationDensity: snapshot.populationDensity,
        gdpNominal: snapshot.gdpNominal,
        hdi: snapshot.hdi,
        gini: snapshot.gini,
        lifeExpectancy: snapshot.lifeExpectancy,
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
