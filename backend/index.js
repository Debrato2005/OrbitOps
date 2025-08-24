require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const companyRoutes = require('./routes/company');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully.'))
    .catch(err => console.error('MongoDB connection error:', err));

app.use('/api/companies', companyRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
