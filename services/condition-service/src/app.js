const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { ApiError } = require("@mead/shared");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "condition-service" });
  });

  app.use((err, _req, res, _next) => {
    if (err instanceof ApiError) {
      return res.status(err.status).json(err.toBody());
    }
    if (err && err.code === "INVALID_QID") {
      return res
        .status(400)
        .json({ error: { code: "BAD_REQUEST", message: err.message } });
    }
    console.error(err);
    return res
      .status(500)
      .json({ error: { code: "INTERNAL", message: "Internal server error" } });
  });

  return app;
}

module.exports = { createApp };
