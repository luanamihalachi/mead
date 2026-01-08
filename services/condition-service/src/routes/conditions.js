const { Router } = require("express");
const { asyncHandler } = require("@mead/shared");
const {
  searchConditions,
  getCondition,
  getSymptoms,
} = require("../controllers/conditions.controller");

const r = Router();

r.get("/", asyncHandler(searchConditions));
r.get("/:id/symptoms", asyncHandler(getSymptoms));
r.get("/:id", asyncHandler(getCondition));

module.exports = r;
