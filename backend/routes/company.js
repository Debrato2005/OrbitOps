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
  const { noradId, name, tleLine1, tleLine2 } = req.body;
  const companyId = req.companyId;
  let newSatellite;

  try {
    const company = await Company.findOne({ companyId: companyId });
    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    if (noradId) {
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

      newSatellite = {
        noradId: noradId,
        name: satelliteDetails.NAME,
        tleLine1: satelliteTle.TLE_LINE_1,
        tleLine2: satelliteTle.TLE_LINE_2,
        details: satelliteDetails,
      };
    } else if (name && tleLine1 && tleLine2) {
      newSatellite = {
        noradId: Math.floor(100000 + Math.random() * 900000),
        name: name,
        tleLine1: tleLine1,
        tleLine2: tleLine2,
        details: { NAME: name, OBJECT_TYPE: "PAYLOAD" },
      };
    } else {
      return res
        .status(400)
        .json({
          error: "Either NORAD ID or custom satellite data is required.",
        });
    }

    company.trackedSatellites.push(newSatellite);
    await company.save();

    res.status(201).json(company);
  } catch (error) {
    console.error("Satellite import error:", error);
    res
      .status(500)
      .json({ error: "An error occurred during satellite import." });
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

router.get("/satellites/with-risk-analysis", requireAuth, async (req, res) => {
    try {
        const companyId = req.companyId;
        const company = await Company.findOne({ companyId: companyId });

        if (!company) {
            return res.status(404).json({ error: "Company not found" });
        }

        // 1. Get the list of all active conjunctions from the analysis engine
        let allConjunctions = [];
        try {
            const analysisResponse = await fetch('http://localhost:5001/api/conjunctions');
            if (analysisResponse.ok) {
                const analysisData = await analysisResponse.json();
                allConjunctions = analysisData.conjunctions || [];
            } else {
                console.error("Could not fetch conjunctions from analysis engine.");
                // We can still proceed, just won't be able to show risks.
            }
        } catch (e) {
            console.error("Network error connecting to analysis engine:", e.message);
        }

        // 2. Create a lookup map for fast risk checking
        const riskMap = new Map();
        console.log(`Processing ${allConjunctions.length} conjunctions for risk assessment...`);
        
        for (const conj of allConjunctions) {
            // Convert SCC numbers to integers for consistent comparison
            const primaryScc = parseInt(conj.primary_scc, 10);
            const secondaryScc = parseInt(conj.secondary_scc, 10);
            
            // Skip invalid SCC numbers
            if (isNaN(primaryScc) || isNaN(secondaryScc)) {
                console.warn(`Skipping conjunction with invalid SCC numbers: primary=${conj.primary_scc}, secondary=${conj.secondary_scc}`);
                continue;
            }
            
            // Map both primary and secondary satellites to the conjunction data
            if (!riskMap.has(primaryScc)) riskMap.set(primaryScc, []);
            if (!riskMap.has(secondaryScc)) riskMap.set(secondaryScc, []);
            riskMap.get(primaryScc).push(conj);
            riskMap.get(secondaryScc).push(conj);
        }
        
        console.log(`Risk map created with ${riskMap.size} unique satellites`);

        // 3. Augment the tracked satellite data with the risk information
        const trackedSatellitesWithRisk = company.trackedSatellites.map(sat => {
            const satObject = sat.toObject(); // Convert Mongoose doc to plain object
            const noradId = satObject.noradId;
            const risks = riskMap.get(noradId) || [];

            return {
                ...satObject,
                hasRisk: risks.length > 0,
                riskEvents: risks // Send the full conjunction details back
            };
        });

        res.json(trackedSatellitesWithRisk);

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