const express = require("express");
const conditions = require("../conditions");
const { getOrRefreshConditionSnapshot } = require("../risk/storage");

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "condition-service",
  });
});

router.get("/conditions", async (req, res, next) => {
  try {
    const items = Object.values(conditions);

    const enriched = await Promise.all(
      items.map(async (base) => {
        const { snapshot, source } = await getOrRefreshConditionSnapshot({
          key: base.key,
          label: base.name,
          short: base.short,
        });

        return {
          key: base.key,
          name: base.name,
          short: base.short,
          causes: base.causes,
          riskFactors: base.riskFactors,
          wikidata: snapshot,
          source,
        };
      })
    );

    res.json(enriched);
  } catch (e) {
    next(e);
  }
});

router.get("/conditions/:key", async (req, res, next) => {
  try {
    const key = String(req.params.key || "").toLowerCase();
    const base = conditions[key];
    if (!base) return res.status(404).json({ error: "Condition not found" });

    const { snapshot, source } = await getOrRefreshConditionSnapshot({
      key: base.key,
      label: base.name,
      short: base.short,
    });

    res.json({
      key: base.key,
      name: base.name,
      short: base.short,
      causes: base.causes,
      riskFactors: base.riskFactors,
      wikidata: snapshot,
      source,
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
