const ALLOWED_DISEASES = ["asthma", "obesity", "depression"];

function normalizeIso2(iso2) {
  if (!iso2 || typeof iso2 !== "string") return "";
  return iso2.trim().toUpperCase();
}

function assertAllowedDisease(disease) {
  if (!ALLOWED_DISEASES.includes(disease)) {
    const err = new Error(
      `Unknown disease '${disease}'. Allowed: ${ALLOWED_DISEASES.join(", ")}`
    );
    err.status = 400;
    throw err;
  }
}

module.exports = {
  ALLOWED_DISEASES,
  normalizeIso2,
  assertAllowedDisease,
};
