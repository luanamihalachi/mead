const express = require("express");
const { normalizeIso2 } = require("@mead/shared");
const { getOrRefreshSnapshot } = require("../risk/storage");

const router = express.Router();

router.get("/health", (req, res) =>
  res.json({ ok: true, service: "geo-service" })
);

router.get("/geo/:iso2", async (req, res, next) => {
  try {
    const iso2 = normalizeIso2(req.params.iso2);
    if (!iso2 || iso2.length !== 2) {
      return res
        .status(400)
        .json({ error: "ISO2 must be 2 letters (e.g. US)" });
    }

    const { snapshot, source } = await getOrRefreshSnapshot(iso2);

    res.json({
      iso2,
      source,
      cachedAt: snapshot.cachedAt,
      country: {
        label: snapshot.label,
        capital: snapshot.capital,
        continent: snapshot.continent,

        population: snapshot.population,
        areaKm2: snapshot.areaKm2,
        populationDensity: snapshot.populationDensity,
        gdpNominal: snapshot.gdpNominal,
        hdi: snapshot.hdi,
        gini: snapshot.gini,
        lifeExpectancy: snapshot.lifeExpectancy,

        internetTld: snapshot.internetTld,
        callingCode: snapshot.callingCode,

        currency: {
          id: snapshot.currencyId,
          label: snapshot.currencyLabel,
        },

        officialLanguages: snapshot.officialLanguages,
        timezones: snapshot.timezones,

        flagImage: snapshot.flagImage,
        coatOfArmsImage: snapshot.coatOfArmsImage,

        capitalCoordinates: snapshot.capitalCoordinates,
        majorCities: snapshot.majorCities || [],
      },
    });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
