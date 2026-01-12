const express = require("express");
const cors = require("cors");
require("dotenv").config();

const conditionRoutes = require("./routes/cond");

const app = express();
app.use(cors());
app.use(express.json());

app.use("/", conditionRoutes);

app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Server error",
  });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
  console.log(`[condition-service] listening on :${PORT}`);
});
