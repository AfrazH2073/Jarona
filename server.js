const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

loadDotEnv();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const SESSION_TTL_DAYS = 30;
const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar"
];
const DEFAULT_SETTINGS = {
  dailyCount: 3,
  cooldownDays: 3,
  timezone: "America/Los_Angeles",
  autoGenerateHour: 12
};
const DEFAULT_GOOGLE_INTEGRATION = {
  connected: false,
  accountEmail: "",
  calendarId: "",
  calendarName: "Jarona",
  refreshToken: "",
  accessToken: "",
  accessTokenExpiresAt: "",
  lastSyncAt: "",
  lastSyncMessage: "",
  lastSyncError: ""
};

let mutationQueue = Promise.resolve();

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    writeStore({
      profiles: [],
      sessions: [],
      oauthStates: []
    });
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

function normalizeReachout(record) {
  return {
    date: String(record?.date || ""),
    responded: typeof record?.responded === "boolean" ? record.responded : null
  };
}

function normalizeBondHistory(person) {
  if (Array.isArray(person.bondHistory) && person.bondHistory.length > 0) {
    return person.bondHistory
      .map((entry) => ({
        date: String(entry.date || ""),
        bond: Number(entry.bond || person.bond || 1)
      }))
      .filter((entry) => entry.date && Number.isInteger(entry.bond));
  }

  const initialDate = person.createdAt
    ? String(person.createdAt).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return [{
    date: initialDate,
    bond: Number(person.bond || 1)
  }];
}

function normalizePerson(person) {
  const normalized = {
    id: person.id || crypto.randomUUID(),
    firstName: String(person.firstName || "").trim(),
    lastName: String(person.lastName || "").trim(),
    location: String(person.location || "").trim(),
    metAt: String(person.metAt || "").trim(),
    bond: Number(person.bond || 1),
    createdAt: person.createdAt || new Date().toISOString(),
    updatedAt: person.updatedAt || person.createdAt || new Date().toISOString(),
    reachouts: Array.isArray(person.reachouts) ? person.reachouts.map(normalizeReachout) : [],
    bondHistory: normalizeBondHistory(person)
  };

  normalized.reachouts.sort((left, right) => right.date.localeCompare(left.date));
  normalized.bondHistory.sort((left, right) => left.date.localeCompare(right.date));
  return normalized;
}

function normalizeGoogleIntegration(profile) {
  return {
    ...DEFAULT_GOOGLE_INTEGRATION,
    ...(profile.googleIntegration || {})
  };
}

function normalizeProfile(profile) {
  const normalized = clone(profile);
  normalized.settings = {
    ...DEFAULT_SETTINGS,
    ...(profile.settings || {})
  };
  normalized.people = Array.isArray(profile.people) ? profile.people.map(normalizePerson) : [];
  normalized.history = Array.isArray(profile.history) ? profile.history : [];
  normalized.generationLog = Array.isArray(profile.generationLog) ? profile.generationLog : [];
  normalized.lastGeneratedDate = profile.lastGeneratedDate || null;
  normalized.lastGeneratedPeopleIds = Array.isArray(profile.lastGeneratedPeopleIds) ? profile.lastGeneratedPeopleIds : [];
  normalized.googleIntegration = normalizeGoogleIntegration(profile);

  if (normalized.history.length > 0) {
    for (const entry of normalized.history) {
      const person = normalized.people.find((candidate) => candidate.id === entry.personId);
      if (!person) {
        continue;
      }

      if (!person.reachouts.some((reachout) => reachout.date === entry.date)) {
        person.reachouts.push({
          date: entry.date,
          responded: null
        });
      }
    }
  }

  if (normalized.lastGeneratedDate && normalized.lastGeneratedPeopleIds.length > 0) {
    const alreadyLogged = normalized.generationLog.some((entry) => entry.date === normalized.lastGeneratedDate);
    if (!alreadyLogged) {
      normalized.generationLog.push({
        date: normalized.lastGeneratedDate,
        personIds: normalized.lastGeneratedPeopleIds,
        createdAt: normalized.createdAt || new Date().toISOString(),
        trigger: "legacy"
      });
    }
  }

  for (const person of normalized.people) {
    person.reachouts.sort((left, right) => right.date.localeCompare(left.date));
    person.bondHistory.sort((left, right) => left.date.localeCompare(right.date));
  }

  normalized.generationLog.sort((left, right) => right.date.localeCompare(left.date));
  return normalized;
}

function readStore() {
  ensureStore();
  const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  store.profiles = Array.isArray(store.profiles) ? store.profiles.map(normalizeProfile) : [];
  store.sessions = Array.isArray(store.sessions) ? store.sessions : [];
  store.oauthStates = Array.isArray(store.oauthStates) ? store.oauthStates : [];
  return store;
}

function queueMutation(work) {
  const task = mutationQueue.then(() => work());
  mutationQueue = task.catch(() => {});
  return task;
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function redirectToApp(request, response, params) {
  const protocol = request.headers["x-forwarded-proto"] || "http";
  const host = request.headers.host || `127.0.0.1:${PORT}`;
  const url = new URL("/", `${protocol}://${host}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  response.writeHead(302, { Location: url.toString() });
  response.end();
}

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".bat": "text/plain; charset=utf-8",
    ".sh": "text/plain; charset=utf-8",
    ".command": "text/plain; charset=utf-8"
  };

  fs.readFile(filePath, (error, contents) => {
    if (error) {
      json(response, 404, { error: "Not found." });
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[ext] || "application/octet-stream"
    });
    response.end(contents);
  });
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large."));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body."));
      }
    });

    request.on("error", reject);
  });
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value) {
  return String(value || "").trim();
}

function createPasswordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const actualHash = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, "hex");
  return actualHash.length === expected.length && crypto.timingSafeEqual(actualHash, expected);
}

function createSession(store, profileId) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  store.sessions = store.sessions.filter((session) => new Date(session.expiresAt) > now);
  store.sessions.push({
    token,
    profileId,
    createdAt: now.toISOString(),
    expiresAt
  });

  return token;
}

function getSessionToken(request) {
  const authHeader = request.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

function getAuthedProfile(store, request) {
  const token = getSessionToken(request);
  if (!token) {
    return null;
  }

  const session = store.sessions.find((entry) => entry.token === token);
  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt) <= new Date()) {
    store.sessions = store.sessions.filter((entry) => entry.token !== token);
    return null;
  }

  return store.profiles.find((profile) => profile.id === session.profileId) || null;
}

function publicProfile(profile) {
  return {
    id: profile.id,
    username: profile.username
  };
}

function formatDateForTimezone(timezone, date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  const parts = formatter.formatToParts(date);
  const values = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function validateSettings(input, existingSettings = DEFAULT_SETTINGS) {
  const dailyCount = Number(input.dailyCount ?? existingSettings.dailyCount);
  const cooldownDays = Number(input.cooldownDays ?? existingSettings.cooldownDays);
  const timezone = cleanText(input.timezone || existingSettings.timezone || DEFAULT_SETTINGS.timezone);
  const autoGenerateHour = Number(input.autoGenerateHour ?? existingSettings.autoGenerateHour ?? 12);

  if (!Number.isInteger(dailyCount) || dailyCount < 1 || dailyCount > 10) {
    throw new Error("Daily selection count must be an integer from 1 to 10.");
  }

  if (!Number.isInteger(cooldownDays) || cooldownDays < 0 || cooldownDays > 30) {
    throw new Error("Cooldown must be an integer from 0 to 30 days.");
  }

  if (!Number.isInteger(autoGenerateHour) || autoGenerateHour < 0 || autoGenerateHour > 23) {
    throw new Error("Auto-generate hour must be between 0 and 23.");
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch (error) {
    throw new Error("Timezone is invalid.");
  }

  return {
    dailyCount,
    cooldownDays,
    timezone,
    autoGenerateHour
  };
}

function validatePerson(input) {
  const firstName = cleanText(input.firstName);
  const lastName = cleanText(input.lastName);
  const location = cleanText(input.location);
  const metAt = cleanText(input.metAt);
  const bond = Number(input.bond);

  if (!firstName) {
    throw new Error("First name or username is required.");
  }

  if (!Number.isInteger(bond) || bond < 1 || bond > 10) {
    throw new Error("Bond must be an integer from 1 to 10.");
  }

  if (metAt && !/^\d{4}-\d{2}-\d{2}$/.test(metAt)) {
    throw new Error("When you met must use YYYY-MM-DD format.");
  }

  return {
    firstName,
    lastName,
    location,
    metAt,
    bond
  };
}

function validateReachoutUpdates(updates) {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("At least one reachout update is required.");
  }

  return updates.map((entry) => {
    if (!entry.personId || !entry.date) {
      throw new Error("Each reachout update must include a person and date.");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(entry.date))) {
      throw new Error("Reachout dates must use YYYY-MM-DD format.");
    }

    if (entry.responded !== null && typeof entry.responded !== "boolean") {
      throw new Error("Reachout responses must be true, false, or null.");
    }

    return {
      personId: String(entry.personId),
      date: String(entry.date),
      responded: entry.responded
    };
  });
}

function pickWeightedPeople(people, count) {
  const pool = [...people];
  const selected = [];

  while (pool.length > 0 && selected.length < count) {
    const totalWeight = pool.reduce((sum, person) => sum + person.bond, 0);
    let roll = Math.random() * totalWeight;
    let chosenIndex = 0;

    for (let index = 0; index < pool.length; index += 1) {
      roll -= pool[index].bond;
      if (roll <= 0) {
        chosenIndex = index;
        break;
      }
    }

    selected.push(pool[chosenIndex]);
    pool.splice(chosenIndex, 1);
  }

  return selected;
}

function getPersonResponseStats(person) {
  const reviewed = person.reachouts.filter((reachout) => reachout.responded !== null);
  const responded = reviewed.filter((reachout) => reachout.responded).length;
  const totalReachouts = person.reachouts.length;
  const pendingReachouts = person.reachouts.filter((reachout) => reachout.responded === null).length;
  const responseRate = reviewed.length === 0 ? 100 : Math.round((responded / reviewed.length) * 100);
  const firstBond = person.bondHistory[0]?.bond ?? person.bond;

  return {
    responseRate,
    totalReachouts,
    pendingReachouts,
    respondedReachouts: responded,
    bondTrend: person.bond - firstBond
  };
}

function serializePerson(person) {
  const stats = getPersonResponseStats(person);
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName || "",
    location: person.location || "",
    metAt: person.metAt || "",
    bond: person.bond,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt,
    responseRate: stats.responseRate,
    totalReachouts: stats.totalReachouts,
    pendingReachouts: stats.pendingReachouts,
    respondedReachouts: stats.respondedReachouts,
    bondTrend: stats.bondTrend,
    reachouts: person.reachouts.map((reachout) => ({
      date: reachout.date,
      responded: reachout.responded
    })),
    bondHistory: person.bondHistory.map((entry) => ({
      date: entry.date,
      bond: entry.bond
    }))
  };
}

function computeMetrics(profile) {
  const people = profile.people;
  const totalPeople = people.length;
  const totalBond = people.reduce((sum, person) => sum + person.bond, 0);
  const averageBond = totalPeople === 0 ? 0 : Number((totalBond / totalPeople).toFixed(1));

  const allReviewed = people.flatMap((person) => person.reachouts.filter((reachout) => reachout.responded !== null));
  const allResponded = allReviewed.filter((reachout) => reachout.responded).length;
  const overallResponseRate = allReviewed.length === 0 ? 100 : Math.round((allResponded / allReviewed.length) * 100);
  const totalReachouts = people.reduce((sum, person) => sum + person.reachouts.length, 0);
  const pendingResponses = people.reduce((sum, person) => sum + person.reachouts.filter((reachout) => reachout.responded === null).length, 0);

  const strongestPerson = [...people].sort((left, right) => right.bond - left.bond)[0] || null;
  const bestResponder = [...people].sort((left, right) => {
    const leftRate = getPersonResponseStats(left).responseRate;
    const rightRate = getPersonResponseStats(right).responseRate;
    if (rightRate !== leftRate) {
      return rightRate - leftRate;
    }
    return right.bond - left.bond;
  })[0] || null;

  const bondChanges = people
    .map((person) => {
      const firstBond = person.bondHistory[0]?.bond ?? person.bond;
      return {
        id: person.id,
        name: [person.firstName, person.lastName].filter(Boolean).join(" "),
        startBond: firstBond,
        currentBond: person.bond,
        change: person.bond - firstBond
      };
    })
    .sort((left, right) => Math.abs(right.change) - Math.abs(left.change))
    .slice(0, 5);

  return {
    totalPeople,
    averageBond,
    overallResponseRate,
    totalReachouts,
    pendingResponses,
    strongestPerson: strongestPerson ? {
      name: [strongestPerson.firstName, strongestPerson.lastName].filter(Boolean).join(" "),
      bond: strongestPerson.bond
    } : null,
    bestResponder: bestResponder ? {
      name: [bestResponder.firstName, bestResponder.lastName].filter(Boolean).join(" "),
      responseRate: getPersonResponseStats(bestResponder).responseRate
    } : null,
    bondChanges
  };
}

function getPendingResponseReview(profile, today) {
  return (profile.generationLog || [])
    .filter((entry) => entry.date < today)
    .map((entry) => {
      const people = entry.personIds
        .map((personId) => {
          const person = profile.people.find((candidate) => candidate.id === personId);
          if (!person) {
            return null;
          }

          const reachout = person.reachouts.find((candidate) => candidate.date === entry.date);
          if (!reachout || reachout.responded !== null) {
            return null;
          }

          return {
            personId: person.id,
            name: [person.firstName, person.lastName].filter(Boolean).join(" "),
            responded: reachout.responded
          };
        })
        .filter(Boolean);

      return people.length > 0 ? { date: entry.date, people } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.date.localeCompare(left.date));
}

function getGoogleConfig() {
  const clientId = cleanText(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanText(process.env.GOOGLE_CLIENT_SECRET);
  const redirectUri = cleanText(process.env.GOOGLE_REDIRECT_URI) || `http://127.0.0.1:${PORT}/api/google/callback`;

  return {
    configured: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    redirectUri
  };
}

function decodeJwtPayload(token) {
  if (!token || token.split(".").length < 2) {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
  } catch (error) {
    return null;
  }
}

function serializeGoogleCalendar(profile) {
  const config = getGoogleConfig();
  return {
    configured: config.configured,
    connected: Boolean(profile.googleIntegration.connected && profile.googleIntegration.refreshToken),
    accountEmail: profile.googleIntegration.accountEmail || "",
    calendarId: profile.googleIntegration.calendarId || "",
    calendarName: profile.googleIntegration.calendarName || "Jarona",
    lastSyncAt: profile.googleIntegration.lastSyncAt || "",
    lastSyncMessage: profile.googleIntegration.lastSyncMessage || "",
    lastSyncError: profile.googleIntegration.lastSyncError || "",
    redirectUri: config.redirectUri
  };
}

function serializeProfileData(profile) {
  const today = formatDateForTimezone(profile.settings.timezone);
  return {
    profile: publicProfile(profile),
    settings: profile.settings,
    people: profile.people.map(serializePerson),
    lastGeneratedDate: profile.lastGeneratedDate,
    lastGeneratedPeopleIds: profile.lastGeneratedPeopleIds || [],
    generationLog: (profile.generationLog || []).slice(0, 30),
    pendingResponseReview: getPendingResponseReview(profile, today),
    metrics: computeMetrics(profile),
    googleCalendar: serializeGoogleCalendar(profile)
  };
}

function ensureReachout(person, date) {
  let reachout = person.reachouts.find((entry) => entry.date === date);
  if (!reachout) {
    reachout = { date, responded: null };
    person.reachouts.push(reachout);
    person.reachouts.sort((left, right) => right.date.localeCompare(left.date));
  }
  return reachout;
}

function getSelectedPeopleFromIds(profile, personIds = []) {
  return personIds
    .map((personId) => profile.people.find((person) => person.id === personId))
    .filter(Boolean);
}

function getEligiblePeople(profile, today) {
  return profile.people.filter((person) => {
    const latestReachout = person.reachouts[0];
    if (!latestReachout) {
      return true;
    }

    return daysBetween(latestReachout.date, today) > profile.settings.cooldownDays;
  });
}

function hasReachedAutoGenerateTime(profile, now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: profile.settings.timezone,
    hour: "numeric",
    hour12: false
  });

  const hour = Number(formatter.format(now));
  return Number.isInteger(hour) && hour >= profile.settings.autoGenerateHour;
}

async function generatePeopleForProfile(profile, options = {}) {
  const today = options.today || formatDateForTimezone(profile.settings.timezone);
  const trigger = options.trigger || (options.automatic ? "automatic" : "manual");

  if (profile.lastGeneratedDate === today) {
    const existingPeople = getSelectedPeopleFromIds(profile, profile.lastGeneratedPeopleIds);
    return {
      ok: false,
      status: 409,
      today,
      trigger,
      error: `Today's people were already generated for ${today}. Try again tomorrow.`,
      selectedPeople: existingPeople
    };
  }

  if (profile.people.length === 0) {
    return {
      ok: false,
      status: 400,
      today,
      trigger,
      error: "Add at least one person before generating.",
      selectedPeople: []
    };
  }

  const eligiblePeople = getEligiblePeople(profile, today);
  if (eligiblePeople.length === 0) {
    return {
      ok: false,
      status: 400,
      today,
      trigger,
      error: "No one is eligible right now because of the cooldown setting.",
      selectedPeople: []
    };
  }

  const count = Math.min(profile.settings.dailyCount, eligiblePeople.length);
  const selectedPeople = pickWeightedPeople(eligiblePeople, count);

  profile.lastGeneratedDate = today;
  profile.lastGeneratedPeopleIds = selectedPeople.map((person) => person.id);
  profile.generationLog.unshift({
    date: today,
    personIds: profile.lastGeneratedPeopleIds,
    createdAt: new Date().toISOString(),
    trigger
  });
  profile.generationLog = profile.generationLog
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 90);

  for (const person of selectedPeople) {
    ensureReachout(person, today);
  }

  let calendarSyncMessage = "Google Calendar was not synced because no Google account is connected.";
  if (profile.googleIntegration.connected && profile.googleIntegration.refreshToken) {
    try {
      await syncGeneratedPeopleToGoogle(profile, selectedPeople, today, trigger);
      calendarSyncMessage = profile.googleIntegration.lastSyncMessage;
    } catch (syncError) {
      profile.googleIntegration.lastSyncError = syncError.message;
      calendarSyncMessage = `Google Calendar sync failed: ${syncError.message}`;
    }
  }

  return {
    ok: true,
    status: 200,
    today,
    trigger,
    selectedPeople,
    calendarSyncMessage
  };
}

async function runScheduledGeneration() {
  const summary = await queueMutation(async () => {
    const store = readStore();
    const results = [];
    let didChangeStore = false;

    for (const profile of store.profiles) {
      const today = formatDateForTimezone(profile.settings.timezone);
      const dueNow = hasReachedAutoGenerateTime(profile);

      if (!dueNow || profile.lastGeneratedDate === today) {
        results.push({
          username: profile.username,
          status: "skipped",
          reason: dueNow ? "already-generated" : "not-due-yet",
          date: today
        });
        continue;
      }

      const generation = await generatePeopleForProfile(profile, {
        automatic: true,
        trigger: "scheduled automatic",
        today
      });

      if (generation.ok) {
        didChangeStore = true;
        results.push({
          username: profile.username,
          status: "generated",
          date: generation.today,
          people: generation.selectedPeople.map((person) => [person.firstName, person.lastName].filter(Boolean).join(" ")),
          calendar: generation.calendarSyncMessage
        });
      } else {
        results.push({
          username: profile.username,
          status: "skipped",
          reason: generation.error,
          date: generation.today
        });
      }
    }

    if (didChangeStore) {
      writeStore(store);
    }

    return results;
  });

  for (const result of summary) {
    if (result.status === "generated") {
      console.log(`[generated] ${result.username} on ${result.date}: ${result.people.join(", ") || "No people"} | ${result.calendar}`);
    } else {
      console.log(`[skipped] ${result.username} on ${result.date}: ${result.reason}`);
    }
  }

  return summary;
}

async function postForm(url, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Google request failed.");
  }

  return data;
}

async function googleCalendarRequest(profile, method, apiPath, options = {}) {
  const google = profile.googleIntegration;
  const response = await fetch(`https://www.googleapis.com/calendar/v3${apiPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${google.accessToken}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data?.error?.message || data.error_description || data.error || "Google Calendar request failed.";
    throw new Error(error);
  }

  return data;
}

async function refreshGoogleAccessToken(profile) {
  const config = getGoogleConfig();
  if (!config.configured) {
    throw new Error("Google Calendar integration is not configured on this machine.");
  }

  if (!profile.googleIntegration.refreshToken) {
    throw new Error("Google Calendar is not connected for this profile.");
  }

  const tokens = await postForm("https://oauth2.googleapis.com/token", {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: profile.googleIntegration.refreshToken
  });

  profile.googleIntegration.accessToken = tokens.access_token;
  profile.googleIntegration.accessTokenExpiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
  profile.googleIntegration.connected = true;
  profile.googleIntegration.lastSyncError = "";
  return profile.googleIntegration.accessToken;
}

async function ensureGoogleAccessToken(profile) {
  const expiresAt = profile.googleIntegration.accessTokenExpiresAt
    ? new Date(profile.googleIntegration.accessTokenExpiresAt).getTime()
    : 0;

  if (!profile.googleIntegration.accessToken || expiresAt < Date.now() + 60_000) {
    return refreshGoogleAccessToken(profile);
  }

  return profile.googleIntegration.accessToken;
}

async function ensureJaronaCalendar(profile) {
  await ensureGoogleAccessToken(profile);

  if (profile.googleIntegration.calendarId) {
    try {
      await googleCalendarRequest(profile, "GET", `/calendars/${encodeURIComponent(profile.googleIntegration.calendarId)}`);
      return profile.googleIntegration.calendarId;
    } catch (error) {
      profile.googleIntegration.calendarId = "";
    }
  }

  const calendar = await googleCalendarRequest(profile, "POST", "/calendars", {
    body: {
      summary: profile.googleIntegration.calendarName || "Jarona",
      description: "Daily Jarona reach-out events",
      timeZone: profile.settings.timezone
    }
  });

  profile.googleIntegration.calendarId = calendar.id;
  profile.googleIntegration.calendarName = calendar.summary || "Jarona";
  return calendar.id;
}

async function syncGeneratedPeopleToGoogle(profile, selectedPeople, generatedDate, trigger) {
  const summary = selectedPeople.length === 1
    ? `Jarona: Reach out to ${selectedPeople[0].firstName}`
    : `Jarona: Reach out to ${selectedPeople.length} people`;

  const descriptionLines = [
    `Generated by Jarona (${trigger}) on ${generatedDate}.`,
    "",
    "People to reach out to:"
  ];
  selectedPeople.forEach((person) => {
    descriptionLines.push(`- ${[person.firstName, person.lastName].filter(Boolean).join(" ")}`);
  });

  const eventId = `jarona${generatedDate.replace(/-/g, "")}`;
  const startDateTime = `${generatedDate}T13:00:00`;
  const endDateTime = `${generatedDate}T15:00:00`;

  await ensureJaronaCalendar(profile);
  await ensureGoogleAccessToken(profile);

  const eventBody = {
    id: eventId,
    summary,
    description: descriptionLines.join("\n"),
    start: {
      dateTime: startDateTime,
      timeZone: profile.settings.timezone
    },
    end: {
      dateTime: endDateTime,
      timeZone: profile.settings.timezone
    },
    extendedProperties: {
      private: {
        jaronaDate: generatedDate
      }
    }
  };

  try {
    await googleCalendarRequest(
      profile,
      "PATCH",
      `/calendars/${encodeURIComponent(profile.googleIntegration.calendarId)}/events/${encodeURIComponent(eventId)}`,
      { body: eventBody }
    );
  } catch (error) {
    if (!String(error.message).includes("Not Found")) {
      throw error;
    }

    await googleCalendarRequest(
      profile,
      "POST",
      `/calendars/${encodeURIComponent(profile.googleIntegration.calendarId)}/events`,
      { body: eventBody }
    );
  }

  profile.googleIntegration.lastSyncAt = new Date().toISOString();
  profile.googleIntegration.lastSyncMessage = `Google Calendar event created or updated for ${generatedDate} from 1:00 PM to 3:00 PM.`;
  profile.googleIntegration.lastSyncError = "";
  profile.googleIntegration.connected = true;
}

function buildGoogleAuthUrl(profileId, store) {
  const config = getGoogleConfig();
  if (!config.configured) {
    throw new Error("Google Calendar integration is not configured yet.");
  }

  const state = crypto.randomBytes(24).toString("hex");
  store.oauthStates = store.oauthStates.filter((entry) => Date.now() - new Date(entry.createdAt).getTime() < 10 * 60 * 1000);
  store.oauthStates.push({
    state,
    profileId,
    createdAt: new Date().toISOString()
  });

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", config.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPES.join(" "));
  authUrl.searchParams.set("state", state);
  return authUrl.toString();
}

async function handleGoogleCallback(request, response, url) {
  const code = url.searchParams.get("code");
  const stateValue = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    redirectToApp(request, response, { google_calendar: "error", message: error });
    return;
  }

  if (!code || !stateValue) {
    redirectToApp(request, response, { google_calendar: "error", message: "Missing Google callback data." });
    return;
  }

  try {
    await queueMutation(async () => {
      const store = readStore();
      const oauthState = store.oauthStates.find((entry) => entry.state === stateValue);
      store.oauthStates = store.oauthStates.filter((entry) => entry.state !== stateValue);

      if (!oauthState) {
        throw new Error("Google auth state expired. Try connecting again.");
      }

      const profile = store.profiles.find((entry) => entry.id === oauthState.profileId);
      if (!profile) {
        throw new Error("Profile for Google connection was not found.");
      }

      const config = getGoogleConfig();
      if (!config.configured) {
        throw new Error("Google Calendar integration is not configured on this machine.");
      }

      const tokenData = await postForm("https://oauth2.googleapis.com/token", {
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code"
      });

      profile.googleIntegration.connected = true;
      profile.googleIntegration.refreshToken = tokenData.refresh_token || profile.googleIntegration.refreshToken;
      profile.googleIntegration.accessToken = tokenData.access_token || "";
      profile.googleIntegration.accessTokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString();
      profile.googleIntegration.lastSyncError = "";
      profile.googleIntegration.lastSyncMessage = "Google Calendar connected.";

      const idPayload = decodeJwtPayload(tokenData.id_token || "");
      if (idPayload?.email) {
        profile.googleIntegration.accountEmail = idPayload.email;
      }

      if (!profile.googleIntegration.calendarId) {
        await ensureJaronaCalendar(profile);
      }

      writeStore(store);
    });

    redirectToApp(request, response, { google_calendar: "connected" });
  } catch (callbackError) {
    redirectToApp(request, response, { google_calendar: "error", message: callbackError.message });
  }
}

function routeApi(request, response, pathname, url) {
  if (request.method === "GET" && pathname === "/api/google/callback") {
    handleGoogleCallback(request, response, url);
    return;
  }

  if (request.method === "GET" && pathname === "/api/profiles") {
    const store = readStore();
    json(response, 200, { profiles: store.profiles.map(publicProfile) });
    return;
  }

  if (request.method === "GET" && pathname === "/api/session") {
    const store = readStore();
    const profile = getAuthedProfile(store, request);
    if (!profile) {
      json(response, 401, { error: "Not authenticated." });
      return;
    }

    json(response, 200, serializeProfileData(profile));
    return;
  }

  if (request.method === "POST" && pathname === "/api/register") {
    readRequestBody(request)
      .then((body) => queueMutation(async () => {
        const store = readStore();
        const username = normalizeUsername(body.username);
        const rawPassword = String(body.password || "");
        const timezone = cleanText(body.timezone) || DEFAULT_SETTINGS.timezone;

        if (!username || username.length < 3 || username.length > 24) {
          throw new Error("Username must be 3 to 24 characters.");
        }

        if (!/^[a-z0-9_-]+$/.test(username)) {
          throw new Error("Username can only use letters, numbers, underscores, and hyphens.");
        }

        if (rawPassword.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }

        if (store.profiles.some((profile) => profile.username === username)) {
          throw new Error("That username already exists.");
        }

        const passwordData = createPasswordHash(rawPassword);
        const settings = validateSettings({ timezone, autoGenerateHour: 12 }, DEFAULT_SETTINGS);
        const timestamp = new Date().toISOString();
        const profile = normalizeProfile({
          id: crypto.randomUUID(),
          username,
          passwordSalt: passwordData.salt,
          passwordHash: passwordData.hash,
          settings,
          people: [],
          history: [],
          generationLog: [],
          lastGeneratedDate: null,
          lastGeneratedPeopleIds: [],
          googleIntegration: clone(DEFAULT_GOOGLE_INTEGRATION),
          createdAt: timestamp
        });

        store.profiles.push(profile);
        const token = createSession(store, profile.id);
        writeStore(store);

        return { status: 201, payload: { token, ...serializeProfileData(profile) } };
      }))
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    readRequestBody(request)
      .then((body) => queueMutation(async () => {
        const store = readStore();
        const username = normalizeUsername(body.username);
        const rawPassword = String(body.password || "");
        const profile = store.profiles.find((entry) => entry.username === username);

        if (!profile || !verifyPassword(rawPassword, profile.passwordSalt, profile.passwordHash)) {
          return { status: 401, payload: { error: "Username or password is incorrect." } };
        }

        if (body.timezone) {
          profile.settings = validateSettings({ ...profile.settings, timezone: body.timezone }, profile.settings);
        }

        const token = createSession(store, profile.id);
        writeStore(store);

        return { status: 200, payload: { token, ...serializeProfileData(profile) } };
      }))
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    queueMutation(async () => {
      const store = readStore();
      const token = getSessionToken(request);
      if (token) {
        store.sessions = store.sessions.filter((entry) => entry.token !== token);
        writeStore(store);
      }
      return { status: 200, payload: { ok: true } };
    })
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/google/connect") {
    queueMutation(async () => {
      const store = readStore();
      const profile = getAuthedProfile(store, request);
      if (!profile) {
        return { status: 401, payload: { error: "Please log in first." } };
      }

      const authUrl = buildGoogleAuthUrl(profile.id, store);
      writeStore(store);
      return { status: 200, payload: { authUrl } };
    })
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/google/disconnect") {
    queueMutation(async () => {
      const store = readStore();
      const profile = getAuthedProfile(store, request);
      if (!profile) {
        return { status: 401, payload: { error: "Please log in first." } };
      }

      profile.googleIntegration = clone(DEFAULT_GOOGLE_INTEGRATION);
      writeStore(store);
      return { status: 200, payload: { googleCalendar: serializeGoogleCalendar(profile) } };
    })
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/google/sync-today") {
    queueMutation(async () => {
      const store = readStore();
      const profile = getAuthedProfile(store, request);
      if (!profile) {
        return { status: 401, payload: { error: "Please log in first." } };
      }

      if (!profile.lastGeneratedDate || !profile.lastGeneratedPeopleIds.length) {
        return { status: 400, payload: { error: "Generate today's people first before syncing to Google Calendar." } };
      }

      const selectedPeople = getSelectedPeopleFromIds(profile, profile.lastGeneratedPeopleIds);

      await syncGeneratedPeopleToGoogle(profile, selectedPeople, profile.lastGeneratedDate, "manual sync");
      writeStore(store);

      return {
        status: 200,
        payload: {
          googleCalendar: serializeGoogleCalendar(profile)
        }
      };
    })
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "PUT" && pathname === "/api/settings") {
    readRequestBody(request)
      .then((body) => queueMutation(async () => {
        const store = readStore();
        const profile = getAuthedProfile(store, request);
        if (!profile) {
          return { status: 401, payload: { error: "Please log in first." } };
        }

        profile.settings = validateSettings(body, profile.settings);
        writeStore(store);

        return {
          status: 200,
          payload: {
            settings: profile.settings,
            metrics: computeMetrics(profile)
          }
        };
      }))
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/people") {
    readRequestBody(request)
      .then((body) => queueMutation(async () => {
        const store = readStore();
        const profile = getAuthedProfile(store, request);
        if (!profile) {
          return { status: 401, payload: { error: "Please log in first." } };
        }

        const person = validatePerson(body);
        const timestamp = new Date().toISOString();
        const nextPerson = normalizePerson({
          id: crypto.randomUUID(),
          ...person,
          createdAt: timestamp,
          updatedAt: timestamp,
          reachouts: [],
          bondHistory: [{
            date: timestamp.slice(0, 10),
            bond: person.bond
          }]
        });

        profile.people.push(nextPerson);
        writeStore(store);

        return {
          status: 201,
          payload: {
            person: serializePerson(nextPerson),
            metrics: computeMetrics(profile)
          }
        };
      }))
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/people/")) {
    const personId = pathname.slice("/api/people/".length);
    readRequestBody(request)
      .then((body) => queueMutation(async () => {
        const store = readStore();
        const profile = getAuthedProfile(store, request);
        if (!profile) {
          return { status: 401, payload: { error: "Please log in first." } };
        }

        const person = profile.people.find((entry) => entry.id === personId);
        if (!person) {
          return { status: 404, payload: { error: "Person not found." } };
        }

        const updates = validatePerson(body);
        const previousBond = person.bond;

        Object.assign(person, updates, { updatedAt: new Date().toISOString() });
        if (previousBond !== person.bond) {
          person.bondHistory.push({
            date: person.updatedAt.slice(0, 10),
            bond: person.bond
          });
          person.bondHistory.sort((left, right) => left.date.localeCompare(right.date));
        }

        writeStore(store);
        return {
          status: 200,
          payload: {
            person: serializePerson(person),
            metrics: computeMetrics(profile)
          }
        };
      }))
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "PUT" && pathname === "/api/reachouts") {
    readRequestBody(request)
      .then((body) => queueMutation(async () => {
        const store = readStore();
        const profile = getAuthedProfile(store, request);
        if (!profile) {
          return { status: 401, payload: { error: "Please log in first." } };
        }

        const updates = validateReachoutUpdates(body.updates);
        for (const update of updates) {
          const person = profile.people.find((entry) => entry.id === update.personId);
          if (!person) {
            return { status: 404, payload: { error: "A person in the reachout update was not found." } };
          }

          const reachout = ensureReachout(person, update.date);
          reachout.responded = update.responded;
        }

        writeStore(store);

        return {
          status: 200,
          payload: {
            people: profile.people.map(serializePerson),
            pendingResponseReview: getPendingResponseReview(profile, formatDateForTimezone(profile.settings.timezone)),
            metrics: computeMetrics(profile)
          }
        };
      }))
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  if (request.method === "POST" && pathname === "/api/generate") {
    readRequestBody(request)
      .then((body) => queueMutation(async () => {
        const store = readStore();
        const profile = getAuthedProfile(store, request);
        if (!profile) {
          return { status: 401, payload: { error: "Please log in first." } };
        }

        const today = formatDateForTimezone(profile.settings.timezone);
        const generation = await generatePeopleForProfile(profile, {
          automatic: Boolean(body.automatic),
          today
        });

        if (!generation.ok) {
          return {
            status: generation.status,
            payload: {
              error: generation.error,
              generatedDate: generation.today,
              selectedPeople: generation.selectedPeople.map(serializePerson),
              trigger: generation.trigger,
              people: profile.people.map(serializePerson),
              pendingResponseReview: getPendingResponseReview(profile, today),
              metrics: computeMetrics(profile),
              googleCalendar: serializeGoogleCalendar(profile)
            }
          };
        }

        writeStore(store);

        return {
          status: generation.status,
          payload: {
            generatedDate: generation.today,
            selectedPeople: generation.selectedPeople.map(serializePerson),
            trigger: generation.trigger,
            people: profile.people.map(serializePerson),
            pendingResponseReview: getPendingResponseReview(profile, today),
            metrics: computeMetrics(profile),
            googleCalendar: serializeGoogleCalendar(profile),
            calendarSyncMessage: generation.calendarSyncMessage
          }
        };
      }))
      .then((result) => json(response, result.status, result.payload))
      .catch((error) => json(response, 400, { error: error.message }));
    return;
  }

  json(response, 404, { error: "API route not found." });
}

ensureStore();

function createServer() {
  return http.createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname.startsWith("/api/")) {
      routeApi(request, response, pathname, url);
      return;
    }

    const resolvedPath = pathname === "/"
      ? path.join(PUBLIC_DIR, "index.html")
      : pathname.startsWith("/launchers/")
        ? path.join(__dirname, pathname)
        : path.join(PUBLIC_DIR, pathname);

    const safePath = path.normalize(resolvedPath);
    if (!safePath.startsWith(PUBLIC_DIR) && !safePath.startsWith(path.join(__dirname, "launchers"))) {
      json(response, 403, { error: "Forbidden." });
      return;
    }

    sendFile(response, safePath);
  });
}

async function main() {
  if (process.argv.includes("--run-scheduled")) {
    await runScheduledGeneration();
    return;
  }

  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`Jarona is running at http://${HOST}:${PORT}`);
  });
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
