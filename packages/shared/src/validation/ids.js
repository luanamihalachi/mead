function assertQid(value) {
  if (typeof value !== "string" || !/^Q[1-9]\d*$/.test(value)) {
    const err = new Error("Expected a Wikidata QID like Q42");
    err.code = "INVALID_QID";
    throw err;
  }
  return value;
}

module.exports = { assertQid };
