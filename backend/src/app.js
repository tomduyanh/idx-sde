const express = require("express");
const cors = require("cors");

const healthRoute = require("./routes/health");
const openHousesRoute = require("./routes/openHouses");
const propertiesRoute = require("./routes/properties");

const app = express();

function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  const timestamp = new Date().toISOString();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.log(
      `[${timestamp}] ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`
    );
  });

  next();
}

app.use(requestLogger);
// Allow the React dev server (port 3000) to call this API (port 5000).
app.use(cors());
// Parse JSON request bodies.
app.use(express.json());

app.use("/api/health", healthRoute);
app.use("/api/properties", propertiesRoute);
app.use("/api/open-houses", openHousesRoute);

module.exports = app;
