require("dotenv").config();
const { createApp } = require("./app");

const port = Number(process.env.PORT || 3001);

createApp().listen(port, () => {
  console.log(`condition-service listening on http://localhost:${port}`);
});
