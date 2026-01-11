const express = require("express");
const { normalizeIso2, assertAllowedDisease } = require("@mead/shared");
const { fetchJson } = require("../http/jsonFetch");
const { getOrRefreshAssessment } = require("../storage/assessmentStore");
const { computeRisk } = require("../risk/compute");

const router = express.Router();

function geoBase() {
  return process.env.GEO_SERVICE_BASE_URL || "http://localhost:4002";
}

function condBase() {
  return process.env.CONDITION_SERVICE_BASE_URL || "http://localhost:4001";
}

router.get("/risk/:iso2/:disease", async (req, res, next) => {
  try {
    const iso2 = normalizeIso2(req.params.iso2);
    const disease = (req.params.disease || "").toLowerCase();

    if (!iso2 || iso2.length !== 2) {
      return res
        .status(400)
        .json({ error: "ISO2 must be 2 letters (e.g. US)" });
    }
    assertAllowedDisease(disease);

    const geo = await fetchJson(`${geoBase()}/geo/${iso2}`);

    await fetchJson(`${condBase()}/conditions/${disease}`);

    const { assessment, source } = await getOrRefreshAssessment({
      iso2,
      disease,
      countryCachedAt: geo.cachedAt,
      compute: () => computeRisk(disease, geo.country),
    });

    res.json({
      iso2,
      disease,
      source,
      cachedAt: assessment.cachedAt,
      countryCachedAt: assessment.countryCachedAt,
      level: assessment.level,
      score: assessment.score,
      why: assessment.why,
      usedSignals: assessment.usedSignals,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
