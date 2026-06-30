const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET /api/health
// Verifies the API is up AND that it can reach MySQL.
// SELECT 1 is the cheapest possible query that proves the connection works.
router.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    // The database being unreachable is a server-side failure, so 500.
    // We respond with JSON instead of letting the error crash the process.
    res.status(500).json({ status: "error", database: "disconnected" });
  }
});

module.exports = router;
