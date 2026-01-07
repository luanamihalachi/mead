require("dotenv").config();
const { createApp } = require("./app");

const port = Number(process.env.PORT || 3002);

createApp().listen(port, () => {
  console.log(`geo-service listening on http://localhost:${port}`);
});
