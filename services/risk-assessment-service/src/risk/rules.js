function bandPoints(value, bands) {
  if (value == null || Number.isNaN(Number(value)))
    return { points: 0, why: null };
  const v = Number(value);

  let best = null;
  for (const b of bands) {
    if (v >= b.min && (!best || b.min > best.min)) best = b;
  }
  return best
    ? { points: best.points, why: best.why }
    : { points: 0, why: null };
}

function addBandRule({ id, field, bands }) {
  return {
    id,
    when: (s) => s[field] != null && !Number.isNaN(Number(s[field])),
    points: (s) => bandPoints(s[field], bands).points,
    why: (s) => bandPoints(s[field], bands).why,
  };
}

const RULES = {
  asthma: [
    addBandRule({
      id: "asthma_density",
      field: "populationDensity",
      bands: [
        {
          min: 50,
          points: 1,
          why: "Moderate population density can indicate more urban exposure.",
        },
        {
          min: 150,
          points: 2,
          why: "High population density can proxy higher traffic/urban pollution exposure.",
        },
        {
          min: 300,
          points: 3,
          why: "Very high population density strongly suggests urban/traffic exposure.",
        },
      ],
    }),
    addBandRule({
      id: "asthma_gdp",
      field: "gdpNominal",
      bands: [
        {
          min: 200_000_000_000,
          points: 1,
          why: "Higher GDP can proxy more industrial activity and emissions potential.",
        },
        {
          min: 1_000_000_000_000,
          points: 2,
          why: "Very high GDP can proxy stronger industrialization/transport intensity.",
        },
        {
          min: 5_000_000_000_000,
          points: 3,
          why: "Extremely high GDP can proxy very high activity and emissions exposure.",
        },
      ],
    }),
    addBandRule({
      id: "asthma_lifeexp",
      field: "lifeExpectancy",
      bands: [
        {
          min: 72,
          points: 1,
          why: "Higher life expectancy can correlate with stronger health systems and diagnosis rates.",
        },
        {
          min: 78,
          points: 2,
          why: "Very high life expectancy may correlate with better detection/reporting capacity.",
        },
        {
          min: 82,
          points: 3,
          why: "Extremely high life expectancy suggests very strong healthcare/diagnostic capacity.",
        },
      ],
    }),
  ],

  obesity: [
    addBandRule({
      id: "obesity_hdi",
      field: "hdi",
      bands: [
        {
          min: 0.7,
          points: 1,
          why: "Higher HDI can proxy lifestyle patterns linked to obesity risk.",
        },
        {
          min: 0.8,
          points: 2,
          why: "High HDI can proxy more sedentary environments and calorie-dense food availability.",
        },
        {
          min: 0.9,
          points: 3,
          why: "Very high HDI can proxy strong lifestyle/food environment risk factors.",
        },
      ],
    }),
    addBandRule({
      id: "obesity_gdp",
      field: "gdpNominal",
      bands: [
        {
          min: 200_000_000_000,
          points: 1,
          why: "Higher GDP can proxy greater food availability and sedentary work patterns.",
        },
        {
          min: 1_000_000_000_000,
          points: 2,
          why: "Very high GDP can proxy strong obesogenic environments.",
        },
        {
          min: 5_000_000_000_000,
          points: 3,
          why: "Extremely high GDP can proxy widespread access to calorie-dense diets.",
        },
      ],
    }),
    addBandRule({
      id: "obesity_gini",
      field: "gini",
      bands: [
        {
          min: 0.33,
          points: 1,
          why: "Moderate inequality can proxy uneven access to healthy food environments.",
        },
        {
          min: 0.38,
          points: 2,
          why: "High inequality can proxy stronger unhealthy food access patterns.",
        },
        {
          min: 0.45,
          points: 3,
          why: "Very high inequality can strongly proxy unequal access to healthy choices.",
        },
      ],
    }),
  ],

  depression: [
    addBandRule({
      id: "depression_gini",
      field: "gini",
      bands: [
        {
          min: 0.33,
          points: 1,
          why: "Moderate inequality can proxy chronic stress risk factors.",
        },
        {
          min: 0.38,
          points: 2,
          why: "High inequality can proxy stronger chronic stress/social pressure.",
        },
        {
          min: 0.45,
          points: 3,
          why: "Very high inequality can strongly proxy chronic stress and instability.",
        },
      ],
    }),
    addBandRule({
      id: "depression_hdi",
      field: "hdi",
      bands: [
        {
          min: 0.7,
          points: 1,
          why: "Higher HDI can proxy better access to diagnosis/reporting.",
        },
        {
          min: 0.8,
          points: 2,
          why: "High HDI can proxy stronger healthcare access and detection rates.",
        },
        {
          min: 0.9,
          points: 3,
          why: "Very high HDI can proxy very strong detection/reporting capacity.",
        },
      ],
    }),
    {
      id: "depression_lifeexp_low",
      when: (s) =>
        s.lifeExpectancy != null && !Number.isNaN(Number(s.lifeExpectancy)),
      points: (s) => {
        const v = Number(s.lifeExpectancy);
        if (v < 60) return 3;
        if (v < 66) return 2;
        if (v < 72) return 1;
        return 0;
      },
      why: (s) => {
        const v = Number(s.lifeExpectancy);
        if (v < 60)
          return "Very low life expectancy can proxy broad systemic health and social stressors.";
        if (v < 66)
          return "Low life expectancy can proxy population-level health stressors.";
        if (v < 72)
          return "Below-average life expectancy can proxy broader social/health challenges.";
        return null;
      },
    },
  ],
};

function scoreToLevel(score) {
  if (score >= 9) return "high";
  if (score >= 4) return "medium";
  return "low";
}

module.exports = { RULES, scoreToLevel };
