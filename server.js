// server.js

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const defaultBlueCapScenario = require('./src/data/bluecapDefaultScenario.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

// Create once-and-reuse Mongo connection in this process.
let isConnecting = null;
const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!isConnecting) {
    isConnecting = mongoose.connect(process.env.MONGODB_URI, {
      bufferCommands: false
    });
  }

  return isConnecting;
};

// Re-create the schemas here so the standalone server does not depend on Next/Vercel runtime.
const CrazyFoxSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true, unique: true },
    start_aum: Number,
    loan: Number,
    gross_return: Number,
    net_profit: Number,
    repayment: Number,
    end_aum: Number
  },
  { collection: 'crazyfox_sim_data' }
);

const RahmanTrustSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    pic: { type: String, required: true },
    manager: { type: String, required: true },
    location: { type: String, required: true },
    value: { type: Number, required: true },
    rate: { type: Number, required: true },
    mandate: { type: String, required: true }
  },
  { collection: 'rahman_trust_data' }
);

const BlueCapScenarioSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    config: { type: mongoose.Schema.Types.Mixed, required: true },
    entities: { type: [mongoose.Schema.Types.Mixed], required: true },
    dependencies: { type: [mongoose.Schema.Types.Mixed], required: true }
  },
  { collection: 'bluecap_scenarios' }
);

const CrazyFox =
  mongoose.models.CrazyFox || mongoose.model('CrazyFox', CrazyFoxSchema);
const RahmanTrust =
  mongoose.models.RahmanTrust || mongoose.model('RahmanTrust', RahmanTrustSchema);
const BlueCapScenario =
  mongoose.models.BlueCapScenario || mongoose.model('BlueCapScenario', BlueCapScenarioSchema);

const cloneBlueCapScenario = (scenario = defaultBlueCapScenario) =>
  JSON.parse(JSON.stringify(scenario));

const toFiniteNumber = (value, fallback) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const normalizeBlueCapDependency = (dependency, fallbackDependency) => ({
  id:
    typeof dependency?.id === 'string' && dependency.id.trim()
      ? dependency.id
      : fallbackDependency.id,
  name:
    typeof dependency?.name === 'string' && dependency.name.trim()
      ? dependency.name
      : fallbackDependency.name,
  category:
    typeof dependency?.category === 'string' && dependency.category.trim()
      ? dependency.category
      : fallbackDependency.category,
  description:
    typeof dependency?.description === 'string' && dependency.description.trim()
      ? dependency.description
      : fallbackDependency.description,
  sourceEntityIds:
    Array.isArray(dependency?.sourceEntityIds) && dependency.sourceEntityIds.length > 0
      ? dependency.sourceEntityIds
      : fallbackDependency.sourceEntityIds,
  targetEntityIds:
    Array.isArray(dependency?.targetEntityIds) && dependency.targetEntityIds.length > 0
      ? dependency.targetEntityIds
      : fallbackDependency.targetEntityIds,
  exposureEntityIds:
    Array.isArray(dependency?.exposureEntityIds) && dependency.exposureEntityIds.length > 0
      ? dependency.exposureEntityIds
      : fallbackDependency.exposureEntityIds
});

const normalizeBlueCapScenario = (inputScenario) => {
  const baseScenario = cloneBlueCapScenario();
  const sourceScenario = inputScenario && typeof inputScenario === 'object' ? inputScenario : {};
  const sourceConfig = sourceScenario.config && typeof sourceScenario.config === 'object' ? sourceScenario.config : {};
  const sourceEntities = Array.isArray(sourceScenario.entities) ? sourceScenario.entities : [];
  const sourceEntitiesById = new Map(
    sourceEntities
      .filter((entity) => entity && typeof entity.id === 'string')
      .map((entity) => [entity.id, entity])
  );
  const sourceDependencies = Array.isArray(sourceScenario.dependencies) ? sourceScenario.dependencies : [];
  const sourceDependenciesById = new Map(
    sourceDependencies
      .filter((dependency) => dependency && typeof dependency.id === 'string')
      .map((dependency) => [dependency.id, dependency])
  );

  return {
    slug:
      typeof sourceScenario.slug === 'string' && sourceScenario.slug.trim()
        ? sourceScenario.slug.trim()
        : baseScenario.slug,
    config: {
      initialCapitalCrore: toFiniteNumber(
        sourceConfig.initialCapitalCrore,
        baseScenario.config.initialCapitalCrore
      ),
      annualCapitalInjectionCrore: toFiniteNumber(
        sourceConfig.annualCapitalInjectionCrore,
        baseScenario.config.annualCapitalInjectionCrore
      ),
      regulatoryConstraintPercent: toFiniteNumber(
        sourceConfig.regulatoryConstraintPercent,
        baseScenario.config.regulatoryConstraintPercent
      ),
      reinvestmentRatePercent: toFiniteNumber(
        sourceConfig.reinvestmentRatePercent,
        baseScenario.config.reinvestmentRatePercent
      )
    },
    entities: baseScenario.entities.map((baseEntity) => {
      const sourceEntity = sourceEntitiesById.get(baseEntity.id) || {};
      return {
        ...baseEntity,
        year4TargetRevenueCrore: toFiniteNumber(
          sourceEntity.year4TargetRevenueCrore,
          baseEntity.year4TargetRevenueCrore
        ),
        netMarginPercent: toFiniteNumber(
          sourceEntity.netMarginPercent,
          baseEntity.netMarginPercent
        )
      };
    }),
    dependencies: baseScenario.dependencies.map((baseDependency) =>
      normalizeBlueCapDependency(sourceDependenciesById.get(baseDependency.id), baseDependency)
    )
  };
};

const ensureBlueCapScenario = async () => {
  let scenario = await BlueCapScenario.findOne({ slug: defaultBlueCapScenario.slug }).lean();
  if (!scenario) {
    const seededScenario = normalizeBlueCapScenario(defaultBlueCapScenario);
    await BlueCapScenario.create(seededScenario);
    scenario = await BlueCapScenario.findOne({ slug: seededScenario.slug }).lean();
  }
  return scenario;
};

// CrazyFox routes
app.get('/api/getCrazyFoxData', async (req, res) => {
  try {
    await connectToDatabase();
    const data = await CrazyFox.find({}).sort({ year: 'asc' });
    res.status(200).json(data);
  } catch (error) {
    console.error('GET /api/getCrazyFoxData failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/updateCrazyFoxData', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const simData = req.body;
  if (!simData || !Array.isArray(simData)) {
    return res.status(400).send('Invalid data format. Expected an array.');
  }

  try {
    await connectToDatabase();

    const operations = simData.map((row) => ({
      updateOne: {
        filter: { year: row.year },
        update: {
          $set: {
            year: row.year,
            start_aum: row.start_aum,
            loan: row.loan,
            gross_return: row.gross_return,
            net_profit: row.net_profit,
            repayment: row.repayment,
            end_aum: row.end_aum
          }
        },
        upsert: true
      }
    }));

    if (operations.length > 0) {
      await CrazyFox.bulkWrite(operations);
    }

    const data = await CrazyFox.find({}).sort({ year: 'asc' });
    res.status(200).json(data);
  } catch (error) {
    console.error('POST /api/updateCrazyFoxData failed', error);
    res.status(500).json({ error: error.message });
  }
});

// Rahman Trust routes
app.get('/api/getRahmanTrustData', async (req, res) => {
  try {
    await connectToDatabase();
    const data = await RahmanTrust.find({}).sort({ id: 'asc' });
    res.status(200).json(data);
  } catch (error) {
    console.error('GET /api/getRahmanTrustData failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/updateRahmanTrustData', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const { id, rate, value, pic, manager, location, mandate } = req.body || {};
  if (id === undefined) {
    return res.status(400).send('Missing id');
  }

  const update = {};
  if (rate !== undefined) update.rate = rate;
  if (value !== undefined) update.value = value;
  if (pic !== undefined) update.pic = pic;
  if (manager !== undefined) update.manager = manager;
  if (location !== undefined) update.location = location;
  if (mandate !== undefined) update.mandate = mandate;

  if (Object.keys(update).length === 0) {
    return res.status(400).send('No fields to update');
  }

  try {
    await connectToDatabase();
    await RahmanTrust.findOneAndUpdate({ id }, { $set: update }, { upsert: true });
    const data = await RahmanTrust.find({}).sort({ id: 'asc' });
    res.status(200).json(data);
  } catch (error) {
    console.error('POST /api/updateRahmanTrustData failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/getBlueCapData', async (req, res) => {
  try {
    await connectToDatabase();
    const scenario = await ensureBlueCapScenario();
    res.status(200).json(scenario);
  } catch (error) {
    console.error('GET /api/getBlueCapData failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/updateBlueCapData', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).send('Invalid BlueCAP payload.');
  }

  try {
    await connectToDatabase();
    const normalizedScenario = normalizeBlueCapScenario(req.body);

    await BlueCapScenario.findOneAndUpdate(
      { slug: normalizedScenario.slug },
      { $set: normalizedScenario },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const savedScenario = await BlueCapScenario.findOne({ slug: normalizedScenario.slug }).lean();
    res.status(200).json(savedScenario);
  } catch (error) {
    console.error('POST /api/updateBlueCapData failed', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
