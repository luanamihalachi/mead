function ok(data, meta) {
  return meta ? { data, meta } : { data };
}

module.exports = { ok };
