const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

router.get("/lookup/:noradId", requireAuth, async (req, res) => {
  const { noradId } = req.params;

  if (!noradId) {
    return res.status(400).json({ error: "NORAD ID is required" });
  }

  try {
    const satelliteDetailsResponse = await fetch(
      `https://api.keeptrack.space/v2/sat/${noradId}`
    );
    const satelliteTleResponse = await fetch(
      `https://api.keeptrack.space/v2/sat/${noradId}/tle`
    );

    if (!satelliteDetailsResponse.ok || !satelliteTleResponse.ok) {
      return res
        .status(404)
        .json({ error: "Satellite not found on KeepTrack API" });
    }

    const satelliteDetails = await satelliteDetailsResponse.json();
    const satelliteTle = await satelliteTleResponse.json();

    res.json({
      name: satelliteDetails.NAME,
      tleLine1: satelliteTle.TLE_LINE_1,
      tleLine2: satelliteTle.TLE_LINE_2,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch satellite data" });
  }
});

module.exports = router;