// seedMongo.js

const mongoose = require('mongoose');
const crazyFoxModule = require('./models/CrazyFox'); // ES module default export in Next.js
const rahmanTrustModule = require('./models/RahmanTrust'); // ES module default export in Next.js
const CrazyFox = crazyFoxModule.default || crazyFoxModule;
const RahmanTrust = rahmanTrustModule.default || rahmanTrustModule;
require('dotenv').config(); // To read .env file

// --- 1. Data from CrazyFoxPage.js ---
const crazyFoxSourceData = [
    { year: 1, startAUM: 30e6, loan: 0, grossReturn: 0.48, netProfit: 11.9e6, repayment: 0, endAUM: 41.9e6 },
    { year: 2, startAUM: 41.9e6, loan: 0, grossReturn: 0.52, netProfit: 19.29e6, repayment: 0, endAUM: 61.19e6 },
    { year: 3, startAUM: 261.19e6, loan: 0, grossReturn: 0.55, netProfit: 139.74e6, repayment: 0, endAUM: 400.92e6 },
    { year: 4, startAUM: 400.92e6, loan: 0, grossReturn: 0.41, netProfit: 158.36e6, repayment: 0, endAUM: 559.29e6 },
    { year: 5, startAUM: 559.29e6, loan: 1e9, grossReturn: 0.53, netProfit: 768.03e6, repayment: 0, endAUM: 1.33e9 },
    { year: 6, startAUM: 1.33e9, loan: 1e9, grossReturn: 2.00, netProfit: 4.58e9, repayment: 0, endAUM: 5.91e9 },
    { year: 7, startAUM: 5.91e9, loan: 1e9, grossReturn: -0.10, netProfit: -829.89e6, repayment: 0, endAUM: 5.08e9 },
    { year: 8, startAUM: 5.08e9, loan: 1e9, grossReturn: 0.48, netProfit: 2.79e9, repayment: 0, endAUM: 7.88e9 },
    { year: 9, startAUM: 7.88e9, loan: 1e9, grossReturn: 0.35, netProfit: 2.94e9, repayment: 0, endAUM: 10.81e9 },
    { year: 10, startAUM: 10.81e9, loan: 1e9, grossReturn: 0.29, netProfit: 3.21e9, repayment: 0, endAUM: 14.03e9 },
    { year: 11, startAUM: 14.03e9, loan: 1e9, grossReturn: 0.42, netProfit: 6.05e9, repayment: 250e6, endAUM: 19.83e9 },
    { year: 12, startAUM: 19.83e9, loan: 750e6, grossReturn: 0.51, netProfit: 10.16e9, repayment: 250e6, endAUM: 29.74e9 },
    { year: 13, startAUM: 29.74e9, loan: 500e6, grossReturn: 0.31, netProfit: 8.90e9, repayment: 250e6, endAUM: 38.39e9 },
    { year: 14, startAUM: 38.39e9, loan: 250e6, grossReturn: -0.12, netProfit: -5.23e9, repayment: 250e6, endAUM: 32.92e9 },
    { year: 15, startAUM: 32.92e9, loan: 5e9, grossReturn: 0.50, netProfit: 18.22e9, repayment: 0, endAUM: 51.14e9 },
    { year: 16, startAUM: 51.14e9, loan: 5e9, grossReturn: 0.32, netProfit: 16.94e9, repayment: 500e6, endAUM: 67.58e9 },
    { year: 17, startAUM: 67.58e9, loan: 4.5e9, grossReturn: 0.24, netProfit: 16.07e9, repayment: 500e6, endAUM: 83.15e9 },
    { year: 18, startAUM: 83.15e9, loan: 4e9, grossReturn: 0.18, netProfit: 14.24e9, repayment: 500e6, endAUM: 96.89e9 },
    { year: 19, startAUM: 96.89e9, loan: 3.5e9, grossReturn: 0.13, netProfit: 11.43e9, repayment: 500e6, endAUM: 107.82e9 },
    { year: 20, startAUM: 107.82e9, loan: 3e9, grossReturn: 0.10, netProfit: 9.31e9, repayment: 500e6, endAUM: 116.63e9 }
];

const crazyFoxData = crazyFoxSourceData.map((row) => ({
    year: row.year,
    start_aum: row.startAUM,
    loan: row.loan,
    gross_return: row.grossReturn,
    net_profit: row.netProfit,
    repayment: row.repayment,
    end_aum: row.endAUM
}));

// --- 2. Data from RahmanTrustPage.js ---
const rahmanTrustData = [
    { id: 1, pic: 'Rahman Matterhorn Ltd.', manager: 'UBS', location: 'Switzerland', value: 142857142, rate: 0.060, mandate: 'Stable Growth' },
    { id: 2, pic: 'Rahman Sierra Ltd.', manager: 'Goldman Sachs', location: 'USA', value: 142857142, rate: 0.075, mandate: 'Balanced Growth' },
    { id: 3, pic: 'Rahman Concorde Ltd.', manager: 'BNP Paribas', location: 'France', value: 142857142, rate: 0.075, mandate: 'Balanced Growth' },
    { id: 4, pic: 'Rahman Suhail Ltd.', manager: 'LGT', location: 'UAE', value: 142857142, rate: 0.090, mandate: 'Aggressive Growth' },
    { id: 5, pic: 'Rahman Liffey Ltd.', manager: 'Goodbody', location: 'Ireland', value: 142857142, rate: 0.060, mandate: 'Stable Growth' },
    { id: 6, pic: 'Rahman Merlion Ltd.', manager: 'DBS Private Bank', location: 'Singapore', value: 142857142, rate: 0.075, mandate: 'Balanced Growth' },
    { id: 7, pic: 'Rahman Andes Ltd.', manager: 'BTG Pactual', location: 'Brazil', value: 142857142, rate: 0.090, mandate: 'Aggressive Growth' }
];

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
}

// --- 3. Seed Function ---
const seedDatabase = async () => {
    console.log('Connecting to database...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully.');

    try {
        // Seed CrazyFox Data
        console.log('Deleting old CrazyFox data...');
        await CrazyFox.deleteMany({});
        console.log('Inserting new CrazyFox data...');
        await CrazyFox.insertMany(crazyFoxData);
        console.log('CrazyFox data seeded successfully.');

        // Seed RahmanTrust Data
        console.log('Deleting old RahmanTrust data...');
        await RahmanTrust.deleteMany({});
        console.log('Inserting new RahmanTrust data...');
        await RahmanTrust.insertMany(rahmanTrustData);
        console.log('RahmanTrust data seeded successfully.');

        console.log('\n=== Database seeded successfully! ===');
    } catch (error) {
        console.error('Error seeding database:', error);
    } finally {
        // 4. Disconnect
        await mongoose.connection.close();
        console.log('Database connection closed.');
    }
};

// --- 5. Run the function ---
seedDatabase();
