const express = require('express');
const router = express.Router();
const Company = require('../models/company');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const company = await Company.findOne({ email });

        if (!company) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (company.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        res.json({
            success: true,
            companyName: company.name,
            companyId: company.companyId
        });

    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});


router.post('/:companyId/satellites', async (req, res) => {
    const { noradId } = req.body;
    const { companyId } = req.params;

    if (!noradId) {
        return res.status(400).json({ error: 'NORAD ID is required' });
    }

    try {
        const company = await Company.findOne({ companyId: companyId });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }

        const satelliteDetailsResponse = await fetch(`https://api.keeptrack.space/v2/sat/${noradId}`);
        const satelliteTleResponse = await fetch(`https://api.keeptrack.space/v2/sat/${noradId}/tle`);

        if (!satelliteDetailsResponse.ok || !satelliteTleResponse.ok) {
            return res.status(404).json({ error: 'Satellite not found on KeepTrack API' });
        }

        const satelliteDetails = await satelliteDetailsResponse.json();
        const satelliteTle = await satelliteTleResponse.json();

        const newSatellite = {
            noradId: noradId,
            name: satelliteDetails.NAME,
            tleLine1: satelliteTle.TLE_LINE_1,
            tleLine2: satelliteTle.TLE_LINE_2,
            details: satelliteDetails
        };

        company.trackedSatellites.push(newSatellite);
        await company.save();

        res.status(201).json(company);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:companyId', async (req, res) => {
    try {
        const company = await Company.findOne({ companyId: req.params.companyId });
        if (!company) {
            return res.status(404).json({ error: 'Company not found' });
        }
        res.json(company);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
