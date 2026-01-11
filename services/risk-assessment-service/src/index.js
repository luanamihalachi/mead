const express = require("express");
const cors = require("cors");
require("dotenv").config();

const riskRoutes = require("./routes/risk");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) =>
  res.json({ ok: true, service: "risk-assessment-service" })
);
app.use("/", riskRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
  console.log(`[risk-assessment-service] listening on :${PORT}`);
});
