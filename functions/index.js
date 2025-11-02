// functions/index.js
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const admin = require("firebase-admin");

// Initialize the app and database
admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

// Re-creation of /api/getCrazyFoxData
app.get("/getCrazyFoxData", async (req, res) => {
  try {
    const snapshot = await db.collection("crazyfox_sim_data").orderBy("year", "asc").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Re-creation of /api/getRahmanTrustData
app.get("/getRahmanTrustData", async (req, res) => {
  try {
    const snapshot = await db.collection("rahman_trust_data").orderBy("id", "asc").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Re-creation of /api/updateCrazyFoxData
app.post("/updateCrazyFoxData", async (req, res) => {
  const simData = req.body;
  if (!simData || !Array.isArray(simData)) {
    return res.status(400).send("Invalid data format. Expected an array.");
  }

  try {
    const batch = db.batch();
    simData.forEach((row) => {
      const docRef = db.collection("crazyfox_sim_data").doc(String(row.year));
      batch.set(docRef, row);
    });
    await batch.commit();
    res.status(200).json({ message: "Simulation updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Re-creation of /api/updateRahmanTrustData
app.post("/updateRahmanTrustData", async (req, res) => {
  try {
    const { id, rate, value } = req.body;
    if (id === undefined || rate === undefined || value === undefined) {
      return res.status(400).send("Missing id, rate, or value");
    }

    const docRef = db.collection("rahman_trust_data").doc(String(id));
    await docRef.update({
      rate: rate,
      value: value,
    });

    // Re-fetch all data to send back
    const snapshot = await db.collection("rahman_trust_data").orderBy("id", "asc").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Expose the Express app as a single Cloud Function named 'api'
exports.api = functions.https.onRequest(app);
