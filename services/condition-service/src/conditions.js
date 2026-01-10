module.exports = {
  asthma: {
    key: "asthma",
    name: "Asthma",
    short:
      "A chronic condition causing airway inflammation and breathing difficulty.",
    causes: [
      "Genetic predisposition",
      "Airway inflammation",
      "Environmental triggers",
    ],
    riskFactors: [
      "Urban air pollution exposure",
      "High population density / traffic exposure",
      "Industrial emissions (proxy)",
    ],
  },
  obesity: {
    key: "obesity",
    name: "Obesity",
    short: "Excess body fat that can increase risk of other health problems.",
    causes: [
      "Calorie surplus over time",
      "Diet quality",
      "Low physical activity",
    ],
    riskFactors: [
      "Sedentary lifestyle (proxy)",
      "High availability of ultra-processed foods (proxy)",
      "Inequality / food environment (proxy)",
    ],
  },
  depression: {
    key: "depression",
    name: "Depression",
    short: "A mood disorder causing persistent sadness and loss of interest.",
    causes: [
      "Biological factors (brain chemistry)",
      "Psychological factors",
      "Social/environment stressors",
    ],
    riskFactors: [
      "Inequality / chronic stress (proxy)",
      "Healthcare access affects diagnosis/reporting (proxy)",
      "Social isolation (not measured directly here)",
    ],
  },
};
