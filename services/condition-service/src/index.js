const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });

const { createApp } = require("./app");

const port = Number(process.env.PORT || 3001);

createApp().listen(port, () => {
  console.log(`condition-service listening on http://localhost:${port}`);
});
