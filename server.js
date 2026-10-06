// server.js

const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const defaultBlueCapScenario = require('./src/data/bluecapDefaultScenario.json');
const {
  answerFromKnowledge,
  asQuickFactText,
  buildProjectKnowledge,
} = require('./functions/projectKnowledge');

const app = express();
const PORT = process.env.PORT || 5000;
const BUILD_DIR = path.join(__dirname, 'build');
const GEMBRIDGE_BASE_URL =
  process.env.GEMBRIDGE_BASE_URL || 'https://shakibs-pc.tail76a11b.ts.net/v1';
const GEMBRIDGE_API_KEY = process.env.GEMBRIDGE_API_KEY;
const GEMBRIDGE_MODEL = process.env.GEMBRIDGE_MODEL || 'gemini-3.7-flash';

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

const BLUECAP_CALENDAR_YEARS = Array.from({ length: 9 }, (_, index) => 2022 + index);

const createDefaultInjectionSchedule = (annualCapitalInjectionCrore) =>
  BLUECAP_CALENDAR_YEARS.reduce((schedule, calendarYear) => {
    schedule[String(calendarYear)] = Number(Number(annualCapitalInjectionCrore || 0).toFixed(2));
    return schedule;
  }, {});

const normalizeInjectionSchedule = (sourceSchedule, fallbackAnnualCapitalInjectionCrore) => {
  const fallbackSchedule = createDefaultInjectionSchedule(fallbackAnnualCapitalInjectionCrore);

  return BLUECAP_CALENDAR_YEARS.reduce((schedule, calendarYear) => {
    const calendarYearKey = String(calendarYear);
    schedule[calendarYearKey] = Number(
      Number(
        toFiniteNumber(sourceSchedule?.[calendarYearKey], fallbackSchedule[calendarYearKey])
      ).toFixed(2)
    );
    return schedule;
  }, {});
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
  const annualCapitalInjectionCrore = toFiniteNumber(
    sourceConfig.annualCapitalInjectionCrore,
    baseScenario.config.annualCapitalInjectionCrore
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
      annualCapitalInjectionCrore,
      yearlyCapitalInjectionsCrore: normalizeInjectionSchedule(
        sourceConfig.yearlyCapitalInjectionsCrore,
        annualCapitalInjectionCrore
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

const compactForPrompt = (value, maxChars = 24000) => {
  const text = JSON.stringify(value, null, 2);
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n... [context truncated]`;
};

const buildChatbotContext = async () => {
  if (!process.env.MONGODB_URI) {
    return {
      generatedAt: new Date().toISOString(),
      dataSources: {
        crazyFox: [],
        rahmanTrust: [],
        blueCap: null,
      },
      unavailableSources: ['MongoDB-backed project data'],
    };
  }

  await connectToDatabase();

  const [crazyFoxResult, rahmanTrustResult, blueCapResult] = await Promise.allSettled([
    CrazyFox.find({}).sort({ year: 'asc' }).lean(),
    RahmanTrust.find({}).sort({ id: 'asc' }).lean(),
    ensureBlueCapScenario(),
  ]);

  const context = {
    generatedAt: new Date().toISOString(),
    dataSources: {
      crazyFox: crazyFoxResult.status === 'fulfilled' ? crazyFoxResult.value : [],
      rahmanTrust: rahmanTrustResult.status === 'fulfilled' ? rahmanTrustResult.value : [],
      blueCap: blueCapResult.status === 'fulfilled' ? blueCapResult.value : null,
    },
    unavailableSources: [
      crazyFoxResult.status === 'rejected' ? 'CrazyFox' : null,
      rahmanTrustResult.status === 'rejected' ? 'Rahman Trust' : null,
      blueCapResult.status === 'rejected' ? 'BlueCAP' : null,
    ].filter(Boolean),
  };

  return {
    ...context,
    quickKnowledge: buildProjectKnowledge(context),
  };
};

const extractGemBridgeMessage = (payload) =>
  payload?.choices?.[0]?.message?.content ||
  payload?.choices?.[0]?.text ||
  payload?.message?.content ||
  payload?.content ||
  '';

const sanitizeAssistantAnswer = (answer) => {
  if (!answer) return answer;
  return answer
    .replace(/<ElicitationsGroup[\s\S]*?<\/ElicitationsGroup>/gi, '')
    .replace(/<Elicitation\b[\s\S]*?\/>/gi, '')
    .trim();
};

const getErrorDetails = (error) => ({
  name: error?.name || 'Error',
  message: error?.message || String(error),
  code: error?.code,
  cause: error?.cause
    ? {
        name: error.cause.name,
        message: error.cause.message,
        code: error.cause.code,
      }
    : undefined,
});

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

app.post('/api/chatbot', async (req, res) => {
  const requestStartedAt = Date.now();
  const question = String(req.body?.question || '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history.slice(-8) : [];
  const currentPage = String(req.body?.currentPage || '/');
  const gemBridgeUrl = `${GEMBRIDGE_BASE_URL.replace(/\/$/, '')}/chat/completions`;

  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  if (!GEMBRIDGE_API_KEY) {
    return res.status(500).json({
      error: 'GemBridge is not configured. Set GEMBRIDGE_API_KEY in the server environment.',
    });
  }

  try {
    let projectContext;
    try {
      projectContext = await buildChatbotContext();
    } catch (error) {
      console.error('POST /api/chatbot context failed', error);
      return res.status(500).json({
        error: 'Unable to load project data context.',
        details: {
          stage: 'context',
          elapsedMs: Date.now() - requestStartedAt,
          error: getErrorDetails(error),
        },
      });
    }

    const knowledgeAnswer = answerFromKnowledge(question, projectContext.quickKnowledge);
    if (knowledgeAnswer) {
      return res.status(200).json({
        answer: knowledgeAnswer,
        source: 'quick_knowledge',
        elapsedMs: Date.now() - requestStartedAt,
      });
    }

    const messages = [
      {
        role: 'system',
        content: [
          'You are the CrazyFox project assistant.',
          'Answer using the supplied project data when the question is about CrazyFox, BlueCAP, Rahman Family Trust, or Bangladesh Trust.',
          'You may perform calculations and scenario reasoning. Show concise formulas when useful.',
          'If the provided data does not contain the answer, say what is missing instead of inventing project facts.',
          'Never output XML, JSX, HTML-like tags, tool directives, ElicitationsGroup, or hidden UI metadata.',
          'Do not write romanized Bangla unless the user explicitly asks for it. Prefer Bangla script for Bangla questions and English for English questions.',
          'Keep follow-up suggestions as plain natural language only, never as markup.',
          'Keep answers practical, concise, and easy to read.',
          `Current app page: ${currentPage}`,
          `Quick project knowledge:\n${asQuickFactText(projectContext.quickKnowledge)}`,
          `Project data snapshot:\n${compactForPrompt(projectContext)}`,
        ].join('\n\n'),
      },
      ...history
        .filter((item) => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
        .map((item) => ({ role: item.role, content: item.content.slice(0, 2000) })),
      { role: 'user', content: question },
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    let response;
    try {
      response = await fetch(gemBridgeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GEMBRIDGE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GEMBRIDGE_MODEL,
          messages,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('POST /api/chatbot GemBridge fetch failed', error);
      return res.status(502).json({
        error: error.name === 'AbortError' ? 'GemBridge request timed out.' : 'GemBridge fetch failed.',
        details: {
          stage: 'gembridge_fetch',
          elapsedMs: Date.now() - requestStartedAt,
          gemBridgeBaseUrl: GEMBRIDGE_BASE_URL,
          gemBridgeUrl,
          model: GEMBRIDGE_MODEL,
          error: getErrorDetails(error),
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const payloadText = await response.text();
    let payload = {};
    try {
      payload = payloadText ? JSON.parse(payloadText) : {};
    } catch (error) {
      payload = { raw: payloadText };
    }

    if (!response.ok) {
      return res.status(response.status).json({
        error: payload?.error?.message || payload?.error || payloadText || 'GemBridge request failed.',
        details: {
          stage: 'gembridge_response',
          elapsedMs: Date.now() - requestStartedAt,
          gemBridgeBaseUrl: GEMBRIDGE_BASE_URL,
          gemBridgeUrl,
          model: GEMBRIDGE_MODEL,
          status: response.status,
          statusText: response.statusText,
          responsePreview: payloadText.slice(0, 1200),
        },
      });
    }

    const answer = sanitizeAssistantAnswer(extractGemBridgeMessage(payload));
    res.status(200).json({ answer: answer || 'GemBridge returned an empty response.' });
  } catch (error) {
    console.error('POST /api/chatbot failed', error);
    res.status(500).json({
      error: error.name === 'AbortError' ? 'GemBridge request timed out.' : error.message,
      details: {
        stage: 'unknown',
        elapsedMs: Date.now() - requestStartedAt,
        error: getErrorDetails(error),
      },
    });
  }
});

if (fs.existsSync(BUILD_DIR)) {
  app.use(express.static(BUILD_DIR));
  app.use((req, res, next) => {
    if (req.method === 'GET' && req.accepts('html')) {
      return res.sendFile(path.join(BUILD_DIR, 'index.html'));
    }
    return next();
  });
}

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
