const TOKEN_KEY = "jarona-session-token";
const REMEMBERED_AUTH_KEY = "jarona-remembered-auth";

const state = {
  token: localStorage.getItem(TOKEN_KEY) || "",
  profile: null,
  people: [],
  settings: {
    dailyCount: 3,
    cooldownDays: 3,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    autoGenerateHour: 12
  },
  profiles: [],
  sortField: "firstName",
  sortDirection: "asc",
  searchQuery: "",
  editingPersonId: null,
  authMode: "login",
  pendingProfileUsername: "",
  lastGeneratedPeopleIds: [],
  lastGeneratedDate: null,
  latestGeneratedPeople: [],
  pendingResponseReview: [],
  metrics: null,
  googleCalendar: {
    configured: false,
    connected: false,
    accountEmail: "",
    calendarId: "",
    calendarName: "Jarona",
    lastSyncAt: "",
    lastSyncMessage: "",
    lastSyncError: "",
    redirectUri: ""
  },
  calendarEvent: null,
  automationTimer: null
};

const bondDescriptions = {
  1: "Brand-new contact I barely know yet.",
  2: "New acquaintance with only light history.",
  3: "Friendly acquaintance I hear from occasionally.",
  4: "Casual friend I enjoy seeing around.",
  5: "Good acquaintance worth getting closer to.",
  6: "Reliable friend I like checking on.",
  7: "Close friend who matters to me.",
  8: "Very close friend I trust deeply.",
  9: "Inner-circle friend central to my life.",
  10: "Best friend I love and prioritize."
};

const elements = {
  currentDate: document.getElementById("currentDate"),
  profileSelect: document.getElementById("profileSelect"),
  switchProfileButton: document.getElementById("switchProfileButton"),
  loginButton: document.getElementById("loginButton"),
  registerButton: document.getElementById("registerButton"),
  loginStateBadge: document.getElementById("loginStateBadge"),
  activeProfileLabel: document.getElementById("activeProfileLabel"),
  addPersonButton: document.getElementById("addPersonButton"),
  peopleSearch: document.getElementById("peopleSearch"),
  peopleList: document.getElementById("peopleList"),
  sortField: document.getElementById("sortField"),
  sortDirection: document.getElementById("sortDirection"),
  generateButton: document.getElementById("generateButton"),
  generationStatus: document.getElementById("generationStatus"),
  generationResults: document.getElementById("generationResults"),
  openCalendarButton: document.getElementById("openCalendarButton"),
  syncGoogleCalendarButton: document.getElementById("syncGoogleCalendarButton"),
  downloadCalendarButton: document.getElementById("downloadCalendarButton"),
  googleCalendarStatus: document.getElementById("googleCalendarStatus"),
  connectGoogleCalendarButton: document.getElementById("connectGoogleCalendarButton"),
  disconnectGoogleCalendarButton: document.getElementById("disconnectGoogleCalendarButton"),
  dailyCountRange: document.getElementById("dailyCountRange"),
  dailyCountInput: document.getElementById("dailyCountInput"),
  cooldownRange: document.getElementById("cooldownRange"),
  cooldownInput: document.getElementById("cooldownInput"),
  saveSettingsButton: document.getElementById("saveSettingsButton"),
  enableNotificationsButton: document.getElementById("enableNotificationsButton"),
  settingsSaveMessage: document.getElementById("settingsSaveMessage"),
  metricsGrid: document.getElementById("metricsGrid"),
  bondChangesList: document.getElementById("bondChangesList"),
  metricCardTemplate: document.getElementById("metricCardTemplate"),
  personModal: document.getElementById("personModal"),
  personModalTitle: document.getElementById("personModalTitle"),
  closePersonModalButton: document.getElementById("closePersonModalButton"),
  personForm: document.getElementById("personForm"),
  personFirstName: document.getElementById("personFirstName"),
  personLastName: document.getElementById("personLastName"),
  personLocation: document.getElementById("personLocation"),
  personMetAt: document.getElementById("personMetAt"),
  personBondRange: document.getElementById("personBondRange"),
  personBondInput: document.getElementById("personBondInput"),
  personFormError: document.getElementById("personFormError"),
  bondLegend: document.getElementById("bondLegend"),
  responseStatsCard: document.getElementById("responseStatsCard"),
  personResponseSummary: document.getElementById("personResponseSummary"),
  reachoutHistoryList: document.getElementById("reachoutHistoryList"),
  personTemplate: document.getElementById("personCardTemplate"),
  authModal: document.getElementById("authModal"),
  authModalTitle: document.getElementById("authModalTitle"),
  closeAuthModalButton: document.getElementById("closeAuthModalButton"),
  authForm: document.getElementById("authForm"),
  authUsername: document.getElementById("authUsername"),
  authPassword: document.getElementById("authPassword"),
  rememberPasswordCheckbox: document.getElementById("rememberPasswordCheckbox"),
  authHelperText: document.getElementById("authHelperText"),
  authError: document.getElementById("authError"),
  submitAuthButton: document.getElementById("submitAuthButton"),
  responseReviewModal: document.getElementById("responseReviewModal"),
  responseReviewForm: document.getElementById("responseReviewForm"),
  responseReviewContent: document.getElementById("responseReviewContent"),
  responseReviewError: document.getElementById("responseReviewError"),
  closeResponseReviewButton: document.getElementById("closeResponseReviewButton")
};

function getRememberedAuth() {
  try {
    return JSON.parse(localStorage.getItem(REMEMBERED_AUTH_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function saveRememberedAuth(username, password) {
  localStorage.setItem(REMEMBERED_AUTH_KEY, JSON.stringify({ username, password }));
}

function clearRememberedAuth() {
  localStorage.removeItem(REMEMBERED_AUTH_KEY);
}

function setCurrentDate() {
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  elements.currentDate.textContent = formatter.format(new Date());
}

function showError(target, message) {
  target.textContent = message;
  target.classList.remove("hidden");
}

function clearError(target) {
  target.textContent = "";
  target.classList.add("hidden");
}

function closeDialogIfOpen(dialog) {
  if (dialog.open) {
    dialog.close();
  }
}

function consumeGoogleCallbackStatus() {
  const url = new URL(window.location.href);
  const googleCalendar = url.searchParams.get("google_calendar");
  const message = url.searchParams.get("message");

  if (!googleCalendar) {
    return null;
  }

  url.searchParams.delete("google_calendar");
  url.searchParams.delete("message");
  window.history.replaceState({}, "", url.toString());
  return { googleCalendar, message };
}

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function syncRangeAndInput(rangeElement, inputElement, min, max, onChange) {
  function apply(nextValue) {
    const value = Number(nextValue);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`Value must be between ${min} and ${max}.`);
    }
    rangeElement.value = String(value);
    inputElement.value = String(value);
    if (onChange) {
      onChange(value);
    }
  }

  rangeElement.addEventListener("input", () => {
    inputElement.value = rangeElement.value;
    if (onChange) {
      onChange(Number(rangeElement.value));
    }
  });

  inputElement.addEventListener("change", () => {
    try {
      apply(inputElement.value);
    } catch (error) {
      inputElement.value = rangeElement.value;
      elements.settingsSaveMessage.textContent = error.message;
    }
  });

  return apply;
}

const setDailyCount = syncRangeAndInput(elements.dailyCountRange, elements.dailyCountInput, 1, 10, () => {
  elements.settingsSaveMessage.textContent = "Unsaved settings changes.";
});

const setCooldown = syncRangeAndInput(elements.cooldownRange, elements.cooldownInput, 0, 30, () => {
  elements.settingsSaveMessage.textContent = "Unsaved settings changes.";
});

const setBond = syncRangeAndInput(elements.personBondRange, elements.personBondInput, 1, 10);

function buildBondLegend() {
  elements.bondLegend.innerHTML = "";
  Object.entries(bondDescriptions).forEach(([value, description]) => {
    const item = document.createElement("div");
    item.className = "bond-item";
    item.textContent = `${value} - ${description}`;
    elements.bondLegend.appendChild(item);
  });
}

function formatDisplayName(person) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

function formatMetAt(value) {
  if (!value) {
    return "Not added";
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function formatDateReadable(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function getTodayInTimezone(timezone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getTimePartsInTimezone(timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const values = {};
  parts.forEach((part) => {
    values[part.type] = part.value;
  });
  return {
    hour: Number(values.hour || 0),
    minute: Number(values.minute || 0)
  };
}

function sortedPeople() {
  const query = state.searchQuery.trim().toLowerCase();
  const direction = state.sortDirection === "asc" ? 1 : -1;

  return [...state.people]
    .filter((person) => {
      if (!query) {
        return true;
      }

      return person.firstName.toLowerCase().includes(query);
    })
    .sort((left, right) => {
      const a = left[state.sortField] ?? "";
      const b = right[state.sortField] ?? "";

      if (["bond", "responseRate"].includes(state.sortField)) {
        return (Number(a) - Number(b)) * direction;
      }

      return String(a).localeCompare(String(b), undefined, { sensitivity: "base" }) * direction;
    });
}

function renderProfiles() {
  elements.profileSelect.innerHTML = "";

  if (state.profiles.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No profiles yet";
    elements.profileSelect.appendChild(option);
    return;
  }

  state.profiles.forEach((profile) => {
    const option = document.createElement("option");
    option.value = profile.username;
    option.textContent = profile.username;
    if (profile.username === state.pendingProfileUsername || profile.username === state.profile?.username) {
      option.selected = true;
    }
    elements.profileSelect.appendChild(option);
  });
}

function renderAuthState() {
  const loggedIn = Boolean(state.profile);
  elements.loginButton.textContent = loggedIn ? "Log Out" : "Log In";
  elements.loginStateBadge.textContent = loggedIn ? `Logged in as ${state.profile.username}` : "Logged out";
  elements.loginStateBadge.classList.toggle("is-active", loggedIn);
  elements.activeProfileLabel.textContent = loggedIn
    ? `You are currently using ${state.profile.username}.`
    : "Not logged in";
  elements.registerButton.classList.toggle("hidden", loggedIn);
}

function renderPeople() {
  elements.peopleList.innerHTML = "";

  if (!state.profile) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "Log in to start building your people list.";
    elements.peopleList.appendChild(empty);
    return;
  }

  const people = sortedPeople();
  if (people.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = state.searchQuery
      ? "No people matched that search."
      : "No people added yet. Tap the plus button to add your first person.";
    elements.peopleList.appendChild(empty);
    return;
  }

  people.forEach((person) => {
    const node = elements.personTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".person-name").textContent = formatDisplayName(person);
    const bondSummary = [`Bond ${person.bond}/10`];
    if (typeof person.responseRate === "number" && !Number.isNaN(person.responseRate)) {
      bondSummary.push(`Response rate ${person.responseRate}%`);
    }
    node.querySelector(".person-bond").textContent = bondSummary.join(" • ");

    const meta = node.querySelector(".person-meta");
    const metaItems = [
      ["Username / First", person.firstName],
      ["Location", person.location || "Not added"],
      ["Last Name", person.lastName || "Not added"]
    ];

    if (person.metAt) {
      metaItems.push(["When We Met", formatMetAt(person.metAt)]);
    }

    if (person.totalReachouts > 0) {
      metaItems.push(["Dates Reached Out To", String(person.totalReachouts)]);
    }

    if (person.pendingReachouts > 0) {
      metaItems.push(["Pending Response Checks", String(person.pendingReachouts)]);
    }

    metaItems.forEach(([label, value]) => {
      const wrapper = document.createElement("div");
      const term = document.createElement("dt");
      term.textContent = label;
      const definition = document.createElement("dd");
      definition.textContent = value;
      wrapper.append(term, definition);
      meta.appendChild(wrapper);
    });

    node.querySelector(".edit-button").addEventListener("click", () => openPersonModal(person));
    elements.peopleList.appendChild(node);
  });
}

function renderGenerationResults(people) {
  elements.generationResults.innerHTML = "";

  if (people.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No generated people yet.";
    elements.generationResults.appendChild(empty);
    return;
  }

  people.forEach((person) => {
    const card = document.createElement("div");
    card.className = "result-person";

    const name = document.createElement("h4");
    name.textContent = formatDisplayName(person);

    const subtext = document.createElement("p");
    subtext.textContent = "Reach out to them today.";

    card.append(name, subtext);
    elements.generationResults.appendChild(card);
  });
}

function renderMetrics() {
  elements.metricsGrid.innerHTML = "";
  elements.bondChangesList.innerHTML = "";

  if (!state.metrics) {
    return;
  }

  const metricItems = [
    ["People", state.metrics.totalPeople],
    ["Average Bond", state.metrics.averageBond],
    ["Overall Response Rate", `${state.metrics.overallResponseRate}%`],
    ["Total Reach-outs", state.metrics.totalReachouts],
    ["Pending Reviews", state.metrics.pendingResponses],
    ["Strongest Bond", state.metrics.strongestPerson ? `${state.metrics.strongestPerson.name} (${state.metrics.strongestPerson.bond})` : "None yet"],
    ["Best Responder", state.metrics.bestResponder ? `${state.metrics.bestResponder.name} (${state.metrics.bestResponder.responseRate}%)` : "None yet"]
  ];

  metricItems.forEach(([label, value]) => {
    const card = elements.metricCardTemplate.content.firstElementChild.cloneNode(true);
    card.querySelector(".metric-label").textContent = label;
    card.querySelector(".metric-value").textContent = String(value);
    elements.metricsGrid.appendChild(card);
  });

  if (state.metrics.bondChanges.length > 0) {
    const heading = document.createElement("h4");
    heading.className = "micro-heading";
    heading.textContent = "Bond changes over time";
    elements.bondChangesList.appendChild(heading);

    state.metrics.bondChanges.forEach((entry) => {
      const item = document.createElement("div");
      item.className = "bond-change-item";
      const changeWord = entry.change > 0 ? `up ${entry.change}` : entry.change < 0 ? `down ${Math.abs(entry.change)}` : "unchanged";
      item.textContent = `${entry.name}: started at ${entry.startBond}, now ${entry.currentBond} (${changeWord}).`;
      elements.bondChangesList.appendChild(item);
    });
  }
}

function buildCalendarArtifacts(people, date) {
  if (!people.length || !date) {
    return null;
  }

  const title = `Jarona reach-outs for ${date}`;
  const description = people
    .map((person) => `Reach out to ${formatDisplayName(person)}.`)
    .join("\\n");
  const start = `${date.replace(/-/g, "")}T130000`;
  const end = `${date.replace(/-/g, "")}T150000`;
  const eventEditUrl = `https://calendar.google.com/calendar/u/0/r/eventedit?text=${encodeURIComponent(title)}&details=${encodeURIComponent(description)}&dates=${start}/${end}`;
  const chooserUrl = `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(eventEditUrl)}&service=cl`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jarona//EN",
    "BEGIN:VEVENT",
    `UID:${date}-jarona@local`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z")}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\\n/g, "\\\\n")}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT10M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Jarona reach-out reminder",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");

  return {
    googleUrl: eventEditUrl,
    chooserUrl,
    ics,
    filename: `jarona-${date}.ics`
  };
}

function renderCalendarActions() {
  const hasCalendar = Boolean(state.googleCalendar.connected && state.googleCalendar.calendarId);
  const hasGeneratedEvent = Boolean(state.calendarEvent);
  elements.openCalendarButton.disabled = !hasCalendar;
  elements.syncGoogleCalendarButton.disabled = !(state.profile && state.googleCalendar.connected && state.lastGeneratedDate && state.lastGeneratedPeopleIds.length > 0);
  elements.downloadCalendarButton.disabled = !hasGeneratedEvent;
}

function renderGoogleCalendarPanel() {
  const google = state.googleCalendar;

  if (!state.profile) {
    elements.googleCalendarStatus.textContent = "Log in to connect Google Calendar.";
    elements.connectGoogleCalendarButton.disabled = true;
    elements.disconnectGoogleCalendarButton.classList.add("hidden");
    return;
  }

  elements.connectGoogleCalendarButton.disabled = false;

  if (!google.configured) {
    elements.googleCalendarStatus.textContent = "Google Calendar setup is not configured on this machine yet. Add your Google OAuth credentials locally first.";
    elements.connectGoogleCalendarButton.textContent = "Google Setup Needed";
    elements.connectGoogleCalendarButton.disabled = true;
    elements.disconnectGoogleCalendarButton.classList.add("hidden");
    return;
  }

  if (!google.connected) {
    elements.googleCalendarStatus.textContent = "Google Calendar is not connected yet. Connect once and Jarona will create and update a dedicated Jarona calendar automatically.";
    elements.connectGoogleCalendarButton.textContent = "Connect Google Calendar";
    elements.disconnectGoogleCalendarButton.classList.add("hidden");
    return;
  }

  elements.connectGoogleCalendarButton.textContent = "Reconnect Google Calendar";
  elements.disconnectGoogleCalendarButton.classList.remove("hidden");

  const statusParts = [];
  statusParts.push(google.accountEmail ? `Connected as ${google.accountEmail}.` : "Google Calendar connected.");
  if (google.calendarId) {
    statusParts.push(`Using calendar "${google.calendarName || "Jarona"}".`);
  }
  if (google.lastSyncMessage) {
    statusParts.push(google.lastSyncMessage);
  }
  if (google.lastSyncError) {
    statusParts.push(`Last sync error: ${google.lastSyncError}`);
  }

  elements.googleCalendarStatus.textContent = statusParts.join(" ");
}

function renderReachoutHistory(person) {
  elements.reachoutHistoryList.innerHTML = "";

  if (!person || person.reachouts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state compact-empty";
    empty.textContent = "No reach-out dates tracked yet.";
    elements.reachoutHistoryList.appendChild(empty);
    return;
  }

  person.reachouts.forEach((reachout) => {
    const row = document.createElement("label");
    row.className = "checkbox-row reachout-row";
    row.dataset.date = reachout.date;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "reachout-checkbox";
    checkbox.checked = reachout.responded === true;
    checkbox.dataset.date = reachout.date;

    const label = document.createElement("span");
    const suffix = reachout.responded === null ? "Pending review" : checkbox.checked ? "Responded" : "No response yet";
    label.textContent = `${formatDateReadable(reachout.date)} • ${suffix}`;

    row.append(checkbox, label);
    elements.reachoutHistoryList.appendChild(row);
  });
}

function renderPendingResponseReview() {
  elements.responseReviewContent.innerHTML = "";

  if (!state.pendingResponseReview.length) {
    closeDialogIfOpen(elements.responseReviewModal);
    return;
  }

  state.pendingResponseReview.forEach((entry) => {
    const section = document.createElement("section");
    section.className = "response-review-section";

    const heading = document.createElement("h4");
    heading.className = "micro-heading";
    heading.textContent = `Reached out on ${formatDateReadable(entry.date)}`;
    section.appendChild(heading);

    entry.people.forEach((person) => {
      const row = document.createElement("label");
      row.className = "checkbox-row reachout-row";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = person.responded === true;
      checkbox.dataset.personId = person.personId;
      checkbox.dataset.date = entry.date;

      const label = document.createElement("span");
      label.textContent = person.name;

      row.append(checkbox, label);
      section.appendChild(row);
    });

    elements.responseReviewContent.appendChild(section);
  });
}

function openResponseReviewModalIfNeeded() {
  renderPendingResponseReview();
  if (state.pendingResponseReview.length > 0 && !elements.responseReviewModal.open) {
    elements.responseReviewModal.showModal();
  }
}

function applyPeopleState(people) {
  state.people = people || [];
  renderPeople();
}

function applyProfilePayload(payload) {
  state.profile = payload.profile;
  state.pendingProfileUsername = state.profile.username;
  state.settings = payload.settings || state.settings;
  state.lastGeneratedDate = payload.lastGeneratedDate || null;
  state.lastGeneratedPeopleIds = payload.lastGeneratedPeopleIds || [];
  state.pendingResponseReview = payload.pendingResponseReview || [];
  state.metrics = payload.metrics || null;
  state.googleCalendar = payload.googleCalendar || state.googleCalendar;
  applyPeopleState(payload.people || []);
  renderProfiles();
  renderAuthState();
  renderMetrics();

  setDailyCount(state.settings.dailyCount);
  setCooldown(state.settings.cooldownDays);

  state.latestGeneratedPeople = state.lastGeneratedPeopleIds
    .map((personId) => state.people.find((person) => person.id === personId))
    .filter(Boolean);

  state.calendarEvent = buildCalendarArtifacts(state.latestGeneratedPeople, state.lastGeneratedDate);
  renderCalendarActions();
  renderGoogleCalendarPanel();

  if (state.latestGeneratedPeople.length > 0) {
    renderGenerationResults(state.latestGeneratedPeople);
  } else {
    renderGenerationResults([]);
  }

  elements.generationStatus.textContent = state.lastGeneratedDate
    ? `Last generated on ${state.lastGeneratedDate}.`
    : "Press Generate to choose people for today.";

  elements.settingsSaveMessage.textContent = `Current settings: ${state.settings.dailyCount} people each day, ${state.settings.cooldownDays}-day cooldown, auto-generate at 12:00 PM.`;
  updateNotificationButton();
  startAutomationLoop();
  openResponseReviewModalIfNeeded();
}

function clearProfileState() {
  state.profile = null;
  state.people = [];
  state.lastGeneratedPeopleIds = [];
  state.lastGeneratedDate = null;
  state.latestGeneratedPeople = [];
  state.pendingResponseReview = [];
  state.metrics = null;
  state.googleCalendar = {
    configured: false,
    connected: false,
    accountEmail: "",
    calendarId: "",
    calendarName: "Jarona",
    lastSyncAt: "",
    lastSyncMessage: "",
    lastSyncError: "",
    redirectUri: ""
  };
  state.calendarEvent = null;
  clearAutomationLoop();
  renderAuthState();
  renderPeople();
  renderMetrics();
  renderGenerationResults([]);
  renderCalendarActions();
  renderGoogleCalendarPanel();
  elements.generationStatus.textContent = "Log in and press generate when you are ready.";
  elements.settingsSaveMessage.textContent = "No saved changes yet.";
}

async function loadProfiles() {
  const data = await api("/api/profiles", { method: "GET" });
  state.profiles = data.profiles || [];
  renderProfiles();
}

async function restoreSession() {
  if (!state.token) {
    clearProfileState();
    return;
  }

  try {
    const payload = await api("/api/session", { method: "GET" });
    applyProfilePayload(payload);
  } catch (error) {
    localStorage.removeItem(TOKEN_KEY);
    state.token = "";
    clearProfileState();
  }
}

function openAuthModal(mode, username = "") {
  state.authMode = mode;
  state.pendingProfileUsername = username || elements.profileSelect.value || "";

  const remembered = getRememberedAuth();
  elements.authModalTitle.textContent = mode === "register" ? "Create profile" : "Log in";
  elements.submitAuthButton.textContent = mode === "register" ? "Create Profile" : "Log In";
  elements.authHelperText.textContent = mode === "register"
    ? "Create a secure profile to keep your list and settings saved."
    : "Use your profile credentials to access your data.";
  elements.authUsername.value = username || remembered?.username || "";
  elements.authPassword.value = remembered?.password || "";
  elements.rememberPasswordCheckbox.checked = Boolean(remembered);
  clearError(elements.authError);
  elements.authModal.showModal();
}

function closeAuthModal() {
  closeDialogIfOpen(elements.authModal);
  clearError(elements.authError);
}

function findEditingPerson() {
  return state.people.find((person) => person.id === state.editingPersonId) || null;
}

function openPersonModal(person = null) {
  if (!state.profile) {
    elements.generationStatus.textContent = "Log in before editing your people list.";
    return;
  }

  state.editingPersonId = person?.id || null;
  elements.personModalTitle.textContent = person ? "Edit person" : "Add person";
  elements.personFirstName.value = person?.firstName || "";
  elements.personLastName.value = person?.lastName || "";
  elements.personLocation.value = person?.location || "";
  elements.personMetAt.value = person?.metAt || "";
  setBond(person?.bond || 5);
  clearError(elements.personFormError);

  if (person && person.reachouts.length > 0) {
    elements.responseStatsCard.classList.remove("hidden");
    elements.personResponseSummary.textContent = `Response rate: ${person.responseRate}% • Reached out ${person.totalReachouts} times`;
    renderReachoutHistory(person);
  } else {
    elements.responseStatsCard.classList.add("hidden");
    elements.reachoutHistoryList.innerHTML = "";
  }

  elements.personModal.showModal();
}

function closePersonModal() {
  closeDialogIfOpen(elements.personModal);
  clearError(elements.personFormError);
}

async function saveSettings() {
  if (!state.profile) {
    elements.settingsSaveMessage.textContent = "Log in before changing settings.";
    return;
  }

  try {
    const payload = {
      dailyCount: Number(elements.dailyCountInput.value),
      cooldownDays: Number(elements.cooldownInput.value),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      autoGenerateHour: 12
    };

    const data = await api("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    state.settings = data.settings;
    state.metrics = data.metrics;
    renderMetrics();
    elements.settingsSaveMessage.textContent = `Saved settings: ${data.settings.dailyCount} people each day, ${data.settings.cooldownDays}-day cooldown, auto-generate at 12:00 PM.`;
    startAutomationLoop();
  } catch (error) {
    elements.settingsSaveMessage.textContent = error.message;
  }
}

function collectReachoutUpdatesFromModal() {
  return [...elements.reachoutHistoryList.querySelectorAll(".reachout-checkbox")].map((checkbox) => ({
    personId: state.editingPersonId,
    date: checkbox.dataset.date,
    responded: checkbox.checked
  }));
}

async function submitPersonForm(event) {
  event.preventDefault();
  clearError(elements.personFormError);

  try {
    const payload = {
      firstName: elements.personFirstName.value,
      lastName: elements.personLastName.value,
      location: elements.personLocation.value,
      metAt: elements.personMetAt.value,
      bond: Number(elements.personBondInput.value)
    };

    const path = state.editingPersonId ? `/api/people/${state.editingPersonId}` : "/api/people";
    const method = state.editingPersonId ? "PUT" : "POST";
    const data = await api(path, {
      method,
      body: JSON.stringify(payload)
    });

    if (state.editingPersonId) {
      state.people = state.people.map((person) => (person.id === data.person.id ? data.person : person));
    } else {
      state.people.push(data.person);
    }

    state.metrics = data.metrics || state.metrics;

    if (state.editingPersonId) {
      const reachoutUpdates = collectReachoutUpdatesFromModal();
      if (reachoutUpdates.length > 0) {
        const reachoutData = await api("/api/reachouts", {
          method: "PUT",
          body: JSON.stringify({ updates: reachoutUpdates })
        });
        state.people = reachoutData.people;
        state.pendingResponseReview = reachoutData.pendingResponseReview;
        state.metrics = reachoutData.metrics;
      }
    }

    renderPeople();
    renderMetrics();
    closePersonModal();
  } catch (error) {
    showError(elements.personFormError, error.message);
  }
}

async function submitAuthForm(event) {
  event.preventDefault();
  clearError(elements.authError);

  try {
    const payload = {
      username: elements.authUsername.value,
      password: elements.authPassword.value,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const data = await api(state.authMode === "register" ? "/api/register" : "/api/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    if (elements.rememberPasswordCheckbox.checked) {
      saveRememberedAuth(payload.username, payload.password);
    } else {
      clearRememberedAuth();
    }

    state.token = data.token;
    localStorage.setItem(TOKEN_KEY, state.token);
    applyProfilePayload(data);
    closeAuthModal();
    await loadProfiles();
  } catch (error) {
    showError(elements.authError, error.message);
  }
}

async function logout() {
  try {
    await api("/api/logout", { method: "POST", body: JSON.stringify({}) });
  } catch (error) {
    // Ignore logout failures.
  }

  state.token = "";
  localStorage.removeItem(TOKEN_KEY);
  clearProfileState();
}

function notifyGeneration(people, date) {
  if (!("Notification" in window) || Notification.permission !== "granted" || people.length === 0) {
    return;
  }

  const names = people.map((person) => formatDisplayName(person)).join(", ");
  new Notification("Jarona daily reach-out ready", {
    body: `${date}: ${names}`
  });
}

function downloadCalendarFile() {
  if (!state.calendarEvent) {
    return;
  }

  const blob = new Blob([state.calendarEvent.ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = state.calendarEvent.filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function generateToday(options = {}) {
  if (!state.profile) {
    elements.generationStatus.textContent = "Log in before generating.";
    return;
  }

  try {
    const data = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({ automatic: Boolean(options.automatic) })
    });

    state.lastGeneratedDate = data.generatedDate;
    state.lastGeneratedPeopleIds = data.selectedPeople.map((person) => person.id);
    state.latestGeneratedPeople = data.selectedPeople;
    state.people = data.people || state.people;
    state.pendingResponseReview = data.pendingResponseReview || state.pendingResponseReview;
    state.metrics = data.metrics || state.metrics;
    state.googleCalendar = data.googleCalendar || state.googleCalendar;
    state.calendarEvent = buildCalendarArtifacts(data.selectedPeople, data.generatedDate);

    renderGenerationResults(data.selectedPeople);
    renderCalendarActions();
    renderGoogleCalendarPanel();
    renderMetrics();
    renderPeople();

    const triggerLabel = data.trigger === "automatic" ? "Automatically generated" : "Generated";
    const syncSuffix = data.calendarSyncMessage ? ` ${data.calendarSyncMessage}` : "";
    elements.generationStatus.textContent = `${triggerLabel} for ${data.generatedDate}. Google Calendar result: ${syncSuffix.trim() || "No calendar status available."}`;
    notifyGeneration(data.selectedPeople, data.generatedDate);
  } catch (error) {
    if (error.status === 409 && error.payload?.selectedPeople) {
      state.lastGeneratedDate = error.payload.generatedDate;
      state.lastGeneratedPeopleIds = error.payload.selectedPeople.map((person) => person.id);
      state.latestGeneratedPeople = error.payload.selectedPeople;
      state.people = error.payload.people || state.people;
      state.pendingResponseReview = error.payload.pendingResponseReview || state.pendingResponseReview;
      state.metrics = error.payload.metrics || state.metrics;
      state.googleCalendar = error.payload.googleCalendar || state.googleCalendar;
      state.calendarEvent = buildCalendarArtifacts(error.payload.selectedPeople, error.payload.generatedDate);
      renderGenerationResults(error.payload.selectedPeople);
      renderCalendarActions();
      renderGoogleCalendarPanel();
      renderMetrics();
      renderPeople();
      elements.generationStatus.textContent = error.message;
      return;
    }

    if (!options.silent) {
      elements.generationStatus.textContent = error.message;
    }
  }
}

function updateNotificationButton() {
  if (!("Notification" in window)) {
    elements.enableNotificationsButton.textContent = "Notifications Unsupported";
    elements.enableNotificationsButton.disabled = true;
    return;
  }

  elements.enableNotificationsButton.disabled = false;
  if (Notification.permission === "granted") {
    elements.enableNotificationsButton.textContent = "Notifications Unblocked";
  } else if (Notification.permission === "denied") {
    elements.enableNotificationsButton.textContent = "Notifications Blocked";
  } else {
    elements.enableNotificationsButton.textContent = "Unblock Notifications";
  }
}

async function requestNotifications() {
  if (!("Notification" in window)) {
    elements.settingsSaveMessage.textContent = "This browser does not support notifications.";
    return;
  }

  const permission = await Notification.requestPermission();
  updateNotificationButton();
  elements.settingsSaveMessage.textContent = permission === "granted"
    ? "Notifications enabled. Jarona can now alert you after automatic generation."
    : "Notifications were not enabled.";
}

async function connectGoogleCalendar() {
  if (!state.profile) {
    elements.googleCalendarStatus.textContent = "Log in before connecting Google Calendar.";
    return;
  }

  try {
    const data = await api("/api/google/connect", {
      method: "POST",
      body: JSON.stringify({})
    });
    window.location.href = data.authUrl;
  } catch (error) {
    elements.googleCalendarStatus.textContent = error.message;
  }
}

async function disconnectGoogleCalendar() {
  if (!state.profile) {
    return;
  }

  try {
    const data = await api("/api/google/disconnect", {
      method: "POST",
      body: JSON.stringify({})
    });
    state.googleCalendar = data.googleCalendar || state.googleCalendar;
    renderGoogleCalendarPanel();
    renderCalendarActions();
  } catch (error) {
    elements.googleCalendarStatus.textContent = error.message;
  }
}

async function syncTodayToGoogleCalendar() {
  if (!state.profile) {
    elements.googleCalendarStatus.textContent = "Log in before syncing Google Calendar.";
    return;
  }

  try {
    const data = await api("/api/google/sync-today", {
      method: "POST",
      body: JSON.stringify({})
    });
    state.googleCalendar = data.googleCalendar || state.googleCalendar;
    renderGoogleCalendarPanel();
    renderCalendarActions();
  } catch (error) {
    elements.googleCalendarStatus.textContent = error.message;
  }
}

function clearAutomationLoop() {
  if (state.automationTimer) {
    clearTimeout(state.automationTimer);
    state.automationTimer = null;
  }
}

function startAutomationLoop() {
  clearAutomationLoop();
  if (!state.profile) {
    return;
  }

  const today = getTodayInTimezone(state.settings.timezone);
  const now = getTimePartsInTimezone(state.settings.timezone);
  const hasReachedAutoTime = now.hour > state.settings.autoGenerateHour
    || (now.hour === state.settings.autoGenerateHour && now.minute >= 0);

  if (hasReachedAutoTime && state.lastGeneratedDate !== today) {
    generateToday({ automatic: true, silent: true });
  }

  state.automationTimer = window.setTimeout(startAutomationLoop, 60 * 1000);
}

async function submitResponseReview(event) {
  event.preventDefault();
  clearError(elements.responseReviewError);

  try {
    const updates = [...elements.responseReviewContent.querySelectorAll("input[type='checkbox']")].map((checkbox) => ({
      personId: checkbox.dataset.personId,
      date: checkbox.dataset.date,
      responded: checkbox.checked
    }));

    const data = await api("/api/reachouts", {
      method: "PUT",
      body: JSON.stringify({ updates })
    });

    state.people = data.people;
    state.pendingResponseReview = data.pendingResponseReview;
    state.metrics = data.metrics;
    renderPeople();
    renderMetrics();
    renderPendingResponseReview();

    if (state.pendingResponseReview.length === 0) {
      closeDialogIfOpen(elements.responseReviewModal);
    }
  } catch (error) {
    showError(elements.responseReviewError, error.message);
  }
}

function attachEvents() {
  elements.sortField.addEventListener("change", () => {
    state.sortField = elements.sortField.value;
    renderPeople();
  });

  elements.sortDirection.addEventListener("change", () => {
    state.sortDirection = elements.sortDirection.value;
    renderPeople();
  });

  elements.peopleSearch.addEventListener("input", () => {
    state.searchQuery = elements.peopleSearch.value;
    renderPeople();
  });

  elements.addPersonButton.addEventListener("click", () => openPersonModal());
  elements.closePersonModalButton.addEventListener("click", closePersonModal);
  elements.personForm.addEventListener("submit", submitPersonForm);

  elements.loginButton.addEventListener("click", () => {
    if (state.profile) {
      logout();
      return;
    }
    openAuthModal("login");
  });

  elements.registerButton.addEventListener("click", () => openAuthModal("register"));
  elements.switchProfileButton.addEventListener("click", () => openAuthModal("login", elements.profileSelect.value));
  elements.closeAuthModalButton.addEventListener("click", closeAuthModal);
  elements.authForm.addEventListener("submit", submitAuthForm);

  elements.saveSettingsButton.addEventListener("click", saveSettings);
  elements.enableNotificationsButton.addEventListener("click", requestNotifications);
  elements.connectGoogleCalendarButton.addEventListener("click", connectGoogleCalendar);
  elements.disconnectGoogleCalendarButton.addEventListener("click", disconnectGoogleCalendar);
  elements.syncGoogleCalendarButton.addEventListener("click", syncTodayToGoogleCalendar);
  elements.generateButton.addEventListener("click", () => generateToday({ automatic: false }));
  elements.openCalendarButton.addEventListener("click", () => {
    if (state.googleCalendar.connected && state.googleCalendar.calendarId) {
      const calendarUrl = `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(state.googleCalendar.calendarId)}`;
      window.open(calendarUrl, "_blank", "noopener");
    }
  });
  elements.downloadCalendarButton.addEventListener("click", downloadCalendarFile);

  elements.responseReviewForm.addEventListener("submit", submitResponseReview);
  elements.closeResponseReviewButton.addEventListener("click", () => closeDialogIfOpen(elements.responseReviewModal));
}

async function init() {
  const googleCallbackStatus = consumeGoogleCallbackStatus();
  setCurrentDate();
  buildBondLegend();
  renderAuthState();
  renderPeople();
  renderGenerationResults([]);
  renderCalendarActions();
  renderGoogleCalendarPanel();
  attachEvents();
  updateNotificationButton();
  await loadProfiles();
  await restoreSession();

  if (googleCallbackStatus) {
    const { googleCalendar, message } = googleCallbackStatus;
    if (googleCalendar === "connected") {
      elements.googleCalendarStatus.textContent = "Google Calendar connected. Jarona can now auto-create and update events in your dedicated Jarona calendar.";
    } else {
      elements.googleCalendarStatus.textContent = message
        ? `Google Calendar connection failed: ${message}`
        : "Google Calendar connection failed.";
    }
  }
}

init();
