const express = require("express");
const router = express.Router();
const Company = require("../models/company");
const authService = require("../services/authService");
const { requireAuth } = require("../middleware/auth");
const fetch = (...args) =>
import("node-fetch").then(({ default: fetch }) => fetch(...args));

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const authResult = await authService.login(email, password);

    res.cookie("orbitops_session", authResult.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000,
      path: "/",
    });

    res.json({
      success: true,
      user: authResult.user,
      token: authResult.token,
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: error.message,
      },
    });
  }
});

router.post("/satellites", requireAuth, async (req, res) => {
  const { noradId } = req.body;
  const companyId = req.companyId;

  if (!noradId) {
    return res.status(400).json({ error: "NORAD ID is required" });
  }

  try {
    const company = await Company.findOne({ companyId: companyId });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

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

    const newSatellite = {
      noradId: noradId,
      name: satelliteDetails.NAME,
      tleLine1: satelliteTle.TLE_LINE_1,
      tleLine2: satelliteTle.TLE_LINE_2,
      details: satelliteDetails,
    };

    company.trackedSatellites.push(newSatellite);
    await company.save();

    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/profile", requireAuth, async (req, res) => {
  try {
    const companyId = req.companyId;
    const company = await Company.findOne({ companyId: companyId });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/satellites", requireAuth, async (req, res) => {
  try {
    const companyId = req.companyId;
    const company = await Company.findOne({ companyId: companyId });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }
    res.json(company.trackedSatellites || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
