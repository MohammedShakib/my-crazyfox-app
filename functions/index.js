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

const sanitizeSimulationPlans = (plans) => {
  if (!plans || typeof plans !== 'object') return {};
  return Object.entries(plans).reduce((nextPlans, [year, plan]) => {
    if (!plan || typeof plan !== 'object') return nextPlans;
    const filteredPlan = Object.entries(plan).reduce((nextPlan, [assetId, amount]) => {
      const normalizedAmount = Number(amount);
      if (Number.isFinite(normalizedAmount) && normalizedAmount > 0) {
        nextPlan[String(assetId)] = normalizedAmount;
      }
      return nextPlan;
    }, {});
    if (Object.keys(filteredPlan).length > 0) {
      nextPlans[String(year)] = filteredPlan;
    }
    return nextPlans;
  }, {});
};

const getBDTrustSimulationConfig = async (req, res) => {
  try {
    const docRef = db.collection('bd_trust_config').doc('simulation');
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(200).json(null);
    res.status(200).json(docSnap.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBDTrustSimulationConfig = async (req, res) => {
  try {
    const { simulationYears, payoutMode, payoutGrowthInput, yearlyInjectionPlans } = req.body || {};
    await db.collection('bd_trust_config').doc('simulation').set({
      simulationYears: Number(simulationYears) || 10,
      payoutMode: payoutMode === 'fixed' ? 'fixed' : 'growing',
      payoutGrowthInput: payoutGrowthInput !== undefined ? String(payoutGrowthInput) : '10',
      yearlyInjectionPlans: sanitizeSimulationPlans(yearlyInjectionPlans),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getRahmanTrustSimulationConfig = async (req, res) => {
  try {
    const docRef = db.collection('rahman_trust_config').doc('simulation');
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(200).json(null);
    res.status(200).json(docSnap.data());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateRahmanTrustSimulationConfig = async (req, res) => {
  try {
    const { simulationYears, yearlyInjectionPlans } = req.body || {};
    await db.collection('rahman_trust_config').doc('simulation').set({
      simulationYears: Number(simulationYears) || 10,
      yearlyInjectionPlans: sanitizeSimulationPlans(yearlyInjectionPlans),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    res.status(200).json({ ok: true });
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

// ── Bangladesh Trust seed data ────────────────────────────────────────────
const BD_PORTFOLIO_SEED = [
  { id: 1, asset_class: 'Government Treasury Bond', institution: 'Bangladesh Bank / Primary Dealers', amount_bdt: 1750000000, rate: 0.125,  tax_rate: 0.05, category: 'bond' },
  { id: 2, asset_class: 'Cityjem FDR',              institution: 'City Bank',                        amount_bdt:  525000000, rate: 0.0975, tax_rate: 0.15, category: 'fdr' },
  { id: 3, asset_class: 'Commercial Real Estate',   institution: 'Rahman Holdings Limited',          amount_bdt:  875000000, rate: 0.06,   tax_rate: 0.00, category: 'real_estate' },
  { id: 4, asset_class: 'Capital Market / Corp Bond', institution: 'BSEC / DSE',                    amount_bdt:  350000000, rate: 0.122,  tax_rate: 0.20, category: 'capital_market' },
];
const BD_BENEFICIARIES_SEED = [
  { id: 1, name: 'Rahman Family Monthly', type: 'family', monthly_payout_lakh: 5.0, active: true },
  { id: 2, name: 'Education Foundation', type: 'ngo', monthly_payout_lakh: 1.5, active: true },
  { id: 3, name: 'Charitable Donation Fund', type: 'donation', monthly_payout_lakh: 1.0, active: true },
];

const getBDTrustPortfolio = async (req, res) => {
  try {
    const col = db.collection('bd_trust_portfolio');
    const snapshot = await col.orderBy('id', 'asc').get();
    if (snapshot.empty) {
      const batch = db.batch();
      BD_PORTFOLIO_SEED.forEach((item) => batch.set(col.doc(String(item.id)), item));
      await batch.commit();
      return res.status(200).json(BD_PORTFOLIO_SEED);
    }
    res.status(200).json(snapshot.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addBDTrustPortfolioEntry = async (req, res) => {
  try {
    const { asset_class, institution, category, amount_bdt, rate, tax_rate } = req.body;
    if (!asset_class || !institution || !category || amount_bdt === undefined || rate === undefined || tax_rate === undefined) {
      return res.status(400).send('Missing required fields');
    }
    const col = db.collection('bd_trust_portfolio');
    const snap = await col.orderBy('id', 'desc').limit(1).get();
    const newId = snap.empty ? 1 : snap.docs[0].data().id + 1;
    await col.doc(String(newId)).set({ id: newId, asset_class, institution, category, amount_bdt, rate, tax_rate });
    const all = await col.orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBDTrustPortfolioEntry = async (req, res) => {
  try {
    const { id, asset_class, institution, category, amount_bdt, rate, tax_rate } = req.body;
    if (id === undefined) return res.status(400).send('Missing id');
    const update = {};
    if (asset_class !== undefined) update.asset_class = asset_class;
    if (institution !== undefined) update.institution = institution;
    if (category !== undefined) update.category = category;
    if (amount_bdt !== undefined) update.amount_bdt = amount_bdt;
    if (rate !== undefined) update.rate = rate;
    if (tax_rate !== undefined) update.tax_rate = tax_rate;
    await db.collection('bd_trust_portfolio').doc(String(id)).update(update);
    const all = await db.collection('bd_trust_portfolio').orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteBDTrustPortfolioEntry = async (req, res) => {
  try {
    const { id } = req.body;
    if (id === undefined) return res.status(400).send('Missing id');
    await db.collection('bd_trust_portfolio').doc(String(id)).delete();
    const all = await db.collection('bd_trust_portfolio').orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getBDTrustBeneficiaries = async (req, res) => {
  try {
    const col = db.collection('bd_trust_beneficiaries');
    const snapshot = await col.orderBy('id', 'asc').get();
    if (snapshot.empty) {
      const batch = db.batch();
      BD_BENEFICIARIES_SEED.forEach((item) => batch.set(col.doc(String(item.id)), item));
      await batch.commit();
      return res.status(200).json(BD_BENEFICIARIES_SEED);
    }
    res.status(200).json(snapshot.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addBDTrustBeneficiary = async (req, res) => {
  try {
    const { name, type, monthly_payout_lakh, active } = req.body;
    if (!name || !type || monthly_payout_lakh === undefined) return res.status(400).send('Missing required fields');
    const col = db.collection('bd_trust_beneficiaries');
    const snap = await col.orderBy('id', 'desc').limit(1).get();
    const newId = snap.empty ? 1 : snap.docs[0].data().id + 1;
    await col.doc(String(newId)).set({ id: newId, name, type, monthly_payout_lakh, active: active !== false });
    const all = await col.orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBDTrustBeneficiary = async (req, res) => {
  try {
    const { id, name, type, monthly_payout_lakh, active } = req.body;
    if (id === undefined) return res.status(400).send('Missing id');
    const update = {};
    if (name !== undefined) update.name = name;
    if (type !== undefined) update.type = type;
    if (monthly_payout_lakh !== undefined) update.monthly_payout_lakh = monthly_payout_lakh;
    if (active !== undefined) update.active = active;
    await db.collection('bd_trust_beneficiaries').doc(String(id)).update(update);
    const all = await db.collection('bd_trust_beneficiaries').orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteBDTrustBeneficiary = async (req, res) => {
  try {
    const { id } = req.body;
    if (id === undefined) return res.status(400).send('Missing id');
    await db.collection('bd_trust_beneficiaries').doc(String(id)).delete();
    const all = await db.collection('bd_trust_beneficiaries').orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addBDTrustBeneficiaryMember = async (req, res) => {
  try {
    const { beneficiary_id, name, monthly_payout_lakh, active } = req.body;
    if (!beneficiary_id || !name || monthly_payout_lakh === undefined) return res.status(400).send('Missing required fields');
    const docRef = db.collection('bd_trust_beneficiaries').doc(String(beneficiary_id));
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).send('Beneficiary not found');
    const members = docSnap.data().members || [];
    const newId = members.length > 0 ? Math.max(...members.map((m) => m.id)) + 1 : 1;
    await docRef.update({ members: [...members, { id: newId, name, monthly_payout_lakh, active: active !== false }] });
    const all = await db.collection('bd_trust_beneficiaries').orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateBDTrustBeneficiaryMember = async (req, res) => {
  try {
    const { beneficiary_id, member_id, name, monthly_payout_lakh, active } = req.body;
    if (beneficiary_id === undefined || member_id === undefined) return res.status(400).send('Missing required fields');
    const docRef = db.collection('bd_trust_beneficiaries').doc(String(beneficiary_id));
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).send('Beneficiary not found');
    const members = (docSnap.data().members || []).map((m) => {
      if (m.id !== member_id) return m;
      return {
        ...m,
        ...(name !== undefined && { name }),
        ...(monthly_payout_lakh !== undefined && { monthly_payout_lakh }),
        ...(active !== undefined && { active }),
      };
    });
    await docRef.update({ members });
    const all = await db.collection('bd_trust_beneficiaries').orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteBDTrustBeneficiaryMember = async (req, res) => {
  try {
    const { beneficiary_id, member_id } = req.body;
    if (beneficiary_id === undefined || member_id === undefined) return res.status(400).send('Missing required fields');
    const docRef = db.collection('bd_trust_beneficiaries').doc(String(beneficiary_id));
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).send('Beneficiary not found');
    const members = (docSnap.data().members || []).filter((m) => m.id !== member_id);
    await docRef.update({ members });
    const all = await db.collection('bd_trust_beneficiaries').orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const addBDTrustDeposit = async (req, res) => {
  try {
    const { asset_id, amount_bdt, note } = req.body;
    if (asset_id === undefined || amount_bdt === undefined) return res.status(400).send('Missing required fields');
    const docRef = db.collection('bd_trust_portfolio').doc(String(asset_id));
    const docSnap = await docRef.get();
    if (!docSnap.exists) return res.status(404).send('Asset not found');
    await docRef.update({ amount_bdt: docSnap.data().amount_bdt + amount_bdt });
    await db.collection('bd_trust_transactions').doc().set({
      asset_id, amount_bdt, note: note || '',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });
    const all = await db.collection('bd_trust_portfolio').orderBy('id', 'asc').get();
    res.status(200).json(all.docs.map((d) => d.data()));
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
app.get("/getRahmanTrustSimulationConfig", getRahmanTrustSimulationConfig);
app.get("/api/getRahmanTrustSimulationConfig", getRahmanTrustSimulationConfig);
app.post("/updateRahmanTrustSimulationConfig", updateRahmanTrustSimulationConfig);
app.post("/api/updateRahmanTrustSimulationConfig", updateRahmanTrustSimulationConfig);
app.get("/getBDTrustPortfolio", getBDTrustPortfolio);
app.get("/api/getBDTrustPortfolio", getBDTrustPortfolio);
app.post("/addBDTrustPortfolioEntry", addBDTrustPortfolioEntry);
app.post("/api/addBDTrustPortfolioEntry", addBDTrustPortfolioEntry);
app.post("/updateBDTrustPortfolioEntry", updateBDTrustPortfolioEntry);
app.post("/api/updateBDTrustPortfolioEntry", updateBDTrustPortfolioEntry);
app.get("/getBDTrustSimulationConfig", getBDTrustSimulationConfig);
app.get("/api/getBDTrustSimulationConfig", getBDTrustSimulationConfig);
app.post("/updateBDTrustSimulationConfig", updateBDTrustSimulationConfig);
app.post("/api/updateBDTrustSimulationConfig", updateBDTrustSimulationConfig);
app.post("/deleteBDTrustPortfolioEntry", deleteBDTrustPortfolioEntry);
app.post("/api/deleteBDTrustPortfolioEntry", deleteBDTrustPortfolioEntry);
app.get("/getBDTrustBeneficiaries", getBDTrustBeneficiaries);
app.get("/api/getBDTrustBeneficiaries", getBDTrustBeneficiaries);
app.post("/addBDTrustBeneficiary", addBDTrustBeneficiary);
app.post("/api/addBDTrustBeneficiary", addBDTrustBeneficiary);
app.post("/updateBDTrustBeneficiary", updateBDTrustBeneficiary);
app.post("/api/updateBDTrustBeneficiary", updateBDTrustBeneficiary);
app.post("/deleteBDTrustBeneficiary", deleteBDTrustBeneficiary);
app.post("/api/deleteBDTrustBeneficiary", deleteBDTrustBeneficiary);
app.post("/addBDTrustDeposit", addBDTrustDeposit);
app.post("/api/addBDTrustDeposit", addBDTrustDeposit);
app.post("/addBDTrustBeneficiaryMember", addBDTrustBeneficiaryMember);
app.post("/api/addBDTrustBeneficiaryMember", addBDTrustBeneficiaryMember);
app.post("/updateBDTrustBeneficiaryMember", updateBDTrustBeneficiaryMember);
app.post("/api/updateBDTrustBeneficiaryMember", updateBDTrustBeneficiaryMember);
app.post("/deleteBDTrustBeneficiaryMember", deleteBDTrustBeneficiaryMember);
app.post("/api/deleteBDTrustBeneficiaryMember", deleteBDTrustBeneficiaryMember);

// Expose the Express app as a single Cloud Function named 'api'
exports.api = functions.https.onRequest(app);
