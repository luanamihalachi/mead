const express = require("express");
const cors = require("cors");
require("dotenv").config();

const geoRoutes = require("./routes/geo");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", geoRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Server error",
  });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`[geo-service] listening on :${PORT}`);
});
