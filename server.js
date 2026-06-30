const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { URL } = require("url");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

const SESSION_TTL_DAYS = 30;
let mutationQueue = Promise.resolve();
const DEFAULT_SETTINGS = {
  dailyCount: 3,
  cooldownDays: 3,
  timezone: "America/Los_Angeles"
};

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(STORE_PATH)) {
    writeStore({
      profiles: [],
      sessions: []
    });
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
}

function writeStore(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
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

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml"
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

  if (actualHash.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualHash, expected);
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

function serializePerson(person) {
  return {
    id: person.id,
    firstName: person.firstName,
    lastName: person.lastName || "",
    location: person.location || "",
    metAt: person.metAt || "",
    bond: person.bond,
    createdAt: person.createdAt,
    updatedAt: person.updatedAt
  };
}

function serializeProfileData(profile) {
  return {
    profile: publicProfile(profile),
    settings: profile.settings,
    people: profile.people.map(serializePerson),
    lastGeneratedDate: profile.lastGeneratedDate,
    lastGeneratedPeopleIds: profile.lastGeneratedPeopleIds || []
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

  if (!Number.isInteger(dailyCount) || dailyCount < 1 || dailyCount > 10) {
    throw new Error("Daily selection count must be an integer from 1 to 10.");
  }

  if (!Number.isInteger(cooldownDays) || cooldownDays < 0 || cooldownDays > 30) {
    throw new Error("Cooldown must be an integer from 0 to 30 days.");
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch (error) {
    throw new Error("Timezone is invalid.");
  }

  return {
    dailyCount,
    cooldownDays,
    timezone
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

function routeApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/profiles") {
    const store = readStore();
    json(response, 200, {
      profiles: store.profiles.map(publicProfile)
    });
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
      .then((body) => {
        return queueMutation(() => {
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
          const settings = validateSettings({ timezone }, DEFAULT_SETTINGS);
          const profile = {
            id: crypto.randomUUID(),
            username,
            passwordSalt: passwordData.salt,
            passwordHash: passwordData.hash,
            settings,
            people: [],
            history: [],
            lastGeneratedDate: null,
            lastGeneratedPeopleIds: [],
            createdAt: new Date().toISOString()
          };

          store.profiles.push(profile);
          const token = createSession(store, profile.id);
          writeStore(store);

          return {
            status: 201,
            payload: {
              token,
              ...serializeProfileData(profile)
            }
          };
        });
      })
      .then((result) => {
        json(response, result.status, result.payload);
      })
      .catch((error) => {
        json(response, 400, { error: error.message });
      });
    return;
  }

  if (request.method === "POST" && pathname === "/api/login") {
    readRequestBody(request)
      .then((body) => {
        return queueMutation(() => {
          const store = readStore();
          const username = normalizeUsername(body.username);
          const rawPassword = String(body.password || "");
          const profile = store.profiles.find((entry) => entry.username === username);

          if (!profile || !verifyPassword(rawPassword, profile.passwordSalt, profile.passwordHash)) {
            return {
              status: 401,
              payload: { error: "Username or password is incorrect." }
            };
          }

          if (body.timezone) {
            profile.settings = validateSettings({ timezone: body.timezone }, profile.settings);
          }

          const token = createSession(store, profile.id);
          writeStore(store);

          return {
            status: 200,
            payload: {
              token,
              ...serializeProfileData(profile)
            }
          };
        });
      })
      .then((result) => {
        json(response, result.status, result.payload);
      })
      .catch((error) => {
        json(response, 400, { error: error.message });
      });
    return;
  }

  if (request.method === "POST" && pathname === "/api/logout") {
    queueMutation(() => {
      const store = readStore();
      const token = getSessionToken(request);
      if (token) {
        store.sessions = store.sessions.filter((entry) => entry.token !== token);
        writeStore(store);
      }
      return { status: 200, payload: { ok: true } };
    })
      .then((result) => {
        json(response, result.status, result.payload);
      })
      .catch((error) => {
        json(response, 400, { error: error.message });
      });
    return;
  }

  if (request.method === "PUT" && pathname === "/api/settings") {
    readRequestBody(request)
      .then((body) => {
        return queueMutation(() => {
          const store = readStore();
          const profile = getAuthedProfile(store, request);
          if (!profile) {
            return { status: 401, payload: { error: "Please log in first." } };
          }

          profile.settings = validateSettings(body, profile.settings);
          writeStore(store);
          return { status: 200, payload: { settings: profile.settings } };
        });
      })
      .then((result) => {
        json(response, result.status, result.payload);
      })
      .catch((error) => {
        json(response, 400, { error: error.message });
      });
    return;
  }

  if (request.method === "POST" && pathname === "/api/people") {
    readRequestBody(request)
      .then((body) => {
        return queueMutation(() => {
          const store = readStore();
          const profile = getAuthedProfile(store, request);
          if (!profile) {
            return { status: 401, payload: { error: "Please log in first." } };
          }

          const person = validatePerson(body);
          const timestamp = new Date().toISOString();
          const nextPerson = {
            id: crypto.randomUUID(),
            ...person,
            createdAt: timestamp,
            updatedAt: timestamp
          };

          profile.people.push(nextPerson);
          writeStore(store);
          return { status: 201, payload: { person: serializePerson(nextPerson) } };
        });
      })
      .then((result) => {
        json(response, result.status, result.payload);
      })
      .catch((error) => {
        json(response, 400, { error: error.message });
      });
    return;
  }

  if (request.method === "PUT" && pathname.startsWith("/api/people/")) {
    const personId = pathname.slice("/api/people/".length);
    readRequestBody(request)
      .then((body) => {
        return queueMutation(() => {
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
          Object.assign(person, updates, { updatedAt: new Date().toISOString() });
          writeStore(store);
          return { status: 200, payload: { person: serializePerson(person) } };
        });
      })
      .then((result) => {
        json(response, result.status, result.payload);
      })
      .catch((error) => {
        json(response, 400, { error: error.message });
      });
    return;
  }

  if (request.method === "POST" && pathname === "/api/generate") {
    queueMutation(() => {
      const store = readStore();
      const profile = getAuthedProfile(store, request);
      if (!profile) {
        return { status: 401, payload: { error: "Please log in first." } };
      }

      const today = formatDateForTimezone(profile.settings.timezone);
      const history = profile.history || [];

      if (profile.lastGeneratedDate === today) {
        const existingPeople = (profile.lastGeneratedPeopleIds || [])
          .map((personId) => profile.people.find((person) => person.id === personId))
          .filter(Boolean);

        return {
          status: 409,
          payload: {
            error: `Today's people were already generated for ${today}. Try again tomorrow.`,
            generatedDate: today,
            selectedPeople: existingPeople.map(serializePerson)
          }
        };
      }

      if (profile.people.length === 0) {
        return {
          status: 400,
          payload: { error: "Add at least one person before generating." }
        };
      }

      const eligiblePeople = profile.people.filter((person) => {
        const lastSeen = history
          .filter((entry) => entry.personId === person.id)
          .sort((left, right) => right.date.localeCompare(left.date))[0];

        if (!lastSeen) {
          return true;
        }

        const daysSince = daysBetween(lastSeen.date, today);
        return daysSince > profile.settings.cooldownDays;
      });

      if (eligiblePeople.length === 0) {
        return {
          status: 400,
          payload: {
            error: "No one is eligible right now because of the cooldown setting."
          }
        };
      }

      const count = Math.min(profile.settings.dailyCount, eligiblePeople.length);
      const selectedPeople = pickWeightedPeople(eligiblePeople, count);

      profile.lastGeneratedDate = today;
      profile.lastGeneratedPeopleIds = selectedPeople.map((person) => person.id);
      profile.history = history;
      for (const person of selectedPeople) {
        profile.history.push({
          personId: person.id,
          date: today
        });
      }

      writeStore(store);

      return {
        status: 200,
        payload: {
          generatedDate: today,
          selectedPeople: selectedPeople.map(serializePerson)
        }
      };
    })
      .then((result) => {
        json(response, result.status, result.payload);
      })
      .catch((error) => {
        json(response, 400, { error: error.message });
      });
    return;
  }

  json(response, 404, { error: "API route not found." });
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith("/api/")) {
    routeApi(request, response, pathname);
    return;
  }

  const resolvedPath = pathname === "/"
    ? path.join(PUBLIC_DIR, "index.html")
    : path.join(PUBLIC_DIR, pathname);

  const safePath = path.normalize(resolvedPath);
  if (!safePath.startsWith(PUBLIC_DIR)) {
    json(response, 403, { error: "Forbidden." });
    return;
  }

  sendFile(response, safePath);
});

ensureStore();
server.listen(PORT, HOST, () => {
  console.log(`Jarona is running at http://${HOST}:${PORT}`);
});
