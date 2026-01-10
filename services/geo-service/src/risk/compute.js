const { RULES, scoreToLevel } = require("./rules");

function asNumber(maybeNumber) {
  const n = Number(maybeNumber);
  return Number.isFinite(n) ? n : 0;
}

function getRulePoints(rule, snapshot) {
  if (typeof rule.points === "function") return asNumber(rule.points(snapshot));
  return asNumber(rule.points);
}

function getRuleWhy(rule, snapshot) {
  if (typeof rule.why === "function") return rule.why(snapshot);
  return rule.why;
}

function computeRisk(diseaseKey, snapshot) {
  const rules = RULES[diseaseKey] || [];
  let score = 0;
  const why = [];

  for (const r of rules) {
    try {
      const applies = typeof r.when === "function" ? r.when(snapshot) : true;
      if (!applies) continue;

      const pts = getRulePoints(r, snapshot);
      if (pts <= 0) continue;

      score += pts;

      const reason = getRuleWhy(r, snapshot);
      if (reason) why.push(`${reason} (+${pts})`);
    } catch {}
  }

  return {
    disease: diseaseKey,
    score,
    level: scoreToLevel(score),
    why,
  };
}

module.exports = { computeRisk };
