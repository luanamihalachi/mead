const express = require("express");
const conditions = require("./conditions");

const router = express.Router();

router.get("/health", (req, res) =>
  res.json({ ok: true, service: "condition-service" })
);

router.get("/conditions", (req, res) => {
  res.json(Object.values(conditions));
});

router.get("/conditions/:key", (req, res) => {
  const key = (req.params.key || "").toLowerCase();
  const item = conditions[key];
  if (!item) return res.status(404).json({ error: "Condition not found" });
  res.json(item);
});

module.exports = router;
