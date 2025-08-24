const mongoose = require('mongoose');

const satelliteSchema = new mongoose.Schema({
    noradId: { type: Number, required: true },
    name: { type: String },
    tleLine1: { type: String },
    tleLine2: { type: String },
    details: { type: mongoose.Schema.Types.Mixed }
});

const companySchema = new mongoose.Schema({
    companyId: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    trackedSatellites: [satelliteSchema]
});

module.exports = mongoose.model('Company', companySchema);
