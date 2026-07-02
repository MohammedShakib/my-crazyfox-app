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
app.use(express.json());

const getCrazyFoxData = async (req, res) => {
  try {
    const snapshot = await db.collection("crazyfox_sim_data").orderBy("year", "asc").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRahmanTrustData = async (req, res) => {
  try {
    const snapshot = await db.collection("rahman_trust_data").orderBy("id", "asc").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCrazyFoxData = async (req, res) => {
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
};

const updateRahmanTrustData = async (req, res) => {
  try {
    const { id, rate, value, pic, manager, location, mandate } = req.body;
    if (id === undefined) {
      return res.status(400).send("Missing id");
    }

    const updateData = {};
    if (rate !== undefined) updateData.rate = rate;
    if (value !== undefined) updateData.value = value;
    if (pic !== undefined) updateData.pic = pic;
    if (manager !== undefined) updateData.manager = manager;
    if (location !== undefined) updateData.location = location;
    if (mandate !== undefined) updateData.mandate = mandate;

    const docRef = db.collection("rahman_trust_data").doc(String(id));
    await docRef.update(updateData);

    const snapshot = await db.collection("rahman_trust_data").orderBy("id", "asc").get();
    const data = snapshot.docs.map((doc) => doc.data());
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addRahmanTrustEntry = async (req, res) => {
  try {
    const { pic, manager, location, value, rate, mandate } = req.body;
    if (!pic || !manager || !location || value === undefined || rate === undefined || !mandate) {
      return res.status(400).send("Missing required fields");
    }

    const snapshot = await db.collection("rahman_trust_data").orderBy("id", "desc").limit(1).get();
    const newId = snapshot.empty ? 1 : snapshot.docs[0].data().id + 1;

    await db.collection("rahman_trust_data").doc(String(newId)).set({
      id: newId, pic, manager, location, value, rate, mandate,
    });

    const allSnapshot = await db.collection("rahman_trust_data").orderBy("id", "asc").get();
    const data = allSnapshot.docs.map((doc) => doc.data());
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Expose handlers on both direct and /api-prefixed paths so Hosting rewrites reach them
app.get("/getCrazyFoxData", getCrazyFoxData);
app.get("/api/getCrazyFoxData", getCrazyFoxData);
app.get("/getRahmanTrustData", getRahmanTrustData);
app.get("/api/getRahmanTrustData", getRahmanTrustData);
app.post("/updateCrazyFoxData", updateCrazyFoxData);
app.post("/api/updateCrazyFoxData", updateCrazyFoxData);
app.post("/updateRahmanTrustData", updateRahmanTrustData);
app.post("/api/updateRahmanTrustData", updateRahmanTrustData);
app.post("/addRahmanTrustEntry", addRahmanTrustEntry);
app.post("/api/addRahmanTrustEntry", addRahmanTrustEntry);

// Expose the Express app as a single Cloud Function named 'api'
exports.api = functions.https.onRequest(app);
