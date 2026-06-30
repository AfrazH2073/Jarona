const state = {
  token: localStorage.getItem("jarona-session-token") || "",
  profile: null,
  people: [],
  settings: {
    dailyCount: 3,
    cooldownDays: 3
  },
  profiles: [],
  sortField: "firstName",
  sortDirection: "asc",
  editingPersonId: null,
  authMode: "login",
  pendingProfileUsername: "",
  lastGeneratedPeopleIds: [],
  lastGeneratedDate: null
};

const bondDescriptions = {
  1: "Barely know them, want to learn more.",
  2: "Early connection, little shared history.",
  3: "Friendly acquaintance, occasional conversations.",
  4: "Comfortable rapport, room to deepen.",
  5: "Solid connection, still exploring more.",
  6: "Meaningful friendship, enjoy staying updated.",
  7: "Strong bond, regular and genuine care.",
  8: "Very close, trusted and emotionally safe.",
  9: "Deep friendship, major part of life.",
  10: "Best friend, unwavering love and support."
};

const elements = {
  currentDate: document.getElementById("currentDate"),
  profileSelect: document.getElementById("profileSelect"),
  switchProfileButton: document.getElementById("switchProfileButton"),
  loginButton: document.getElementById("loginButton"),
  registerButton: document.getElementById("registerButton"),
  logoutButton: document.getElementById("logoutButton"),
  activeProfileLabel: document.getElementById("activeProfileLabel"),
  addPersonButton: document.getElementById("addPersonButton"),
  peopleList: document.getElementById("peopleList"),
  sortField: document.getElementById("sortField"),
  sortDirection: document.getElementById("sortDirection"),
  generateButton: document.getElementById("generateButton"),
  generationStatus: document.getElementById("generationStatus"),
  generationResults: document.getElementById("generationResults"),
  dailyCountRange: document.getElementById("dailyCountRange"),
  dailyCountInput: document.getElementById("dailyCountInput"),
  cooldownRange: document.getElementById("cooldownRange"),
  cooldownInput: document.getElementById("cooldownInput"),
  saveSettingsButton: document.getElementById("saveSettingsButton"),
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
  personTemplate: document.getElementById("personCardTemplate"),
  authModal: document.getElementById("authModal"),
  authModalTitle: document.getElementById("authModalTitle"),
  closeAuthModalButton: document.getElementById("closeAuthModalButton"),
  authForm: document.getElementById("authForm"),
  authUsername: document.getElementById("authUsername"),
  authPassword: document.getElementById("authPassword"),
  authHelperText: document.getElementById("authHelperText"),
  authError: document.getElementById("authError"),
  submitAuthButton: document.getElementById("submitAuthButton")
};

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

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "Request failed.");
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function syncRangeAndInput(rangeElement, inputElement, min, max) {
  function apply(nextValue) {
    const value = Number(nextValue);
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new Error(`Value must be between ${min} and ${max}.`);
    }
    rangeElement.value = String(value);
    inputElement.value = String(value);
  }

  rangeElement.addEventListener("input", () => {
    inputElement.value = rangeElement.value;
  });

  inputElement.addEventListener("change", () => {
    try {
      apply(inputElement.value);
      elements.generationStatus.textContent = "Ready to save your settings.";
    } catch (error) {
      inputElement.value = rangeElement.value;
      elements.generationStatus.textContent = error.message;
    }
  });

  return apply;
}

const setDailyCount = syncRangeAndInput(elements.dailyCountRange, elements.dailyCountInput, 1, 10);
const setCooldown = syncRangeAndInput(elements.cooldownRange, elements.cooldownInput, 0, 30);
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

function sortedPeople() {
  const items = [...state.people];
  const direction = state.sortDirection === "asc" ? 1 : -1;

  items.sort((left, right) => {
    const a = left[state.sortField] ?? "";
    const b = right[state.sortField] ?? "";

    if (state.sortField === "bond") {
      return (Number(a) - Number(b)) * direction;
    }

    return String(a).localeCompare(String(b), undefined, { sensitivity: "base" }) * direction;
  });

  return items;
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

  if (state.people.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No people added yet. Tap the plus button to add your first person.";
    elements.peopleList.appendChild(empty);
    return;
  }

  sortedPeople().forEach((person) => {
    const node = elements.personTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".person-name").textContent = formatDisplayName(person);
    node.querySelector(".person-bond").textContent = `Bond ${person.bond}/10`;

    const meta = node.querySelector(".person-meta");
    const metaItems = [
      ["Username / First", person.firstName],
      ["Location", person.location || "Not added"],
      ["Last Name", person.lastName || "Not added"],
      ["When We Met", formatMetAt(person.metAt)]
    ];

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

function applyProfilePayload(payload) {
  state.profile = payload.profile;
  state.people = payload.people || [];
  state.settings = payload.settings || { ...state.settings };
  state.lastGeneratedDate = payload.lastGeneratedDate || null;
  state.lastGeneratedPeopleIds = payload.lastGeneratedPeopleIds || [];
  state.pendingProfileUsername = state.profile.username;

  elements.activeProfileLabel.textContent = `Active profile: ${state.profile.username}`;
  elements.logoutButton.classList.remove("hidden");
  setDailyCount(state.settings.dailyCount);
  setCooldown(state.settings.cooldownDays);

  elements.generationStatus.textContent = state.lastGeneratedDate
    ? `Last generated on ${state.lastGeneratedDate}.`
    : "Press Generate to choose people for today.";

  renderProfiles();
  renderPeople();

  if (state.lastGeneratedPeopleIds.length > 0) {
    const mappedPeople = state.lastGeneratedPeopleIds
      .map((personId) => state.people.find((person) => person.id === personId))
      .filter(Boolean);
    renderGenerationResults(mappedPeople);
  } else {
    renderGenerationResults([]);
  }
}

function clearProfileState() {
  state.profile = null;
  state.people = [];
  state.lastGeneratedPeopleIds = [];
  state.lastGeneratedDate = null;
  elements.activeProfileLabel.textContent = "No active profile";
  elements.logoutButton.classList.add("hidden");
  elements.generationStatus.textContent = "Log in and press generate when you are ready.";
  elements.generationResults.innerHTML = "";
  renderPeople();
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
    localStorage.removeItem("jarona-session-token");
    state.token = "";
    clearProfileState();
  }
}

function openAuthModal(mode, username = "") {
  state.authMode = mode;
  state.pendingProfileUsername = username || elements.profileSelect.value || "";
  elements.authModalTitle.textContent = mode === "register" ? "Create profile" : "Log in";
  elements.submitAuthButton.textContent = mode === "register" ? "Create Profile" : "Log In";
  elements.authHelperText.textContent = mode === "register"
    ? "Create a secure profile to keep your list and settings saved."
    : "Use your profile credentials to access your data.";
  elements.authUsername.value = state.pendingProfileUsername;
  elements.authPassword.value = "";
  clearError(elements.authError);
  elements.authModal.showModal();
}

function closeAuthModal() {
  elements.authModal.close();
  clearError(elements.authError);
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
  elements.personModal.showModal();
}

function closePersonModal() {
  elements.personModal.close();
  clearError(elements.personFormError);
}

async function saveSettings() {
  if (!state.profile) {
    elements.generationStatus.textContent = "Log in before changing settings.";
    return;
  }

  try {
    const payload = {
      dailyCount: Number(elements.dailyCountInput.value),
      cooldownDays: Number(elements.cooldownInput.value),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const data = await api("/api/settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    state.settings = data.settings;
    elements.generationStatus.textContent = "Settings saved.";
  } catch (error) {
    elements.generationStatus.textContent = error.message;
  }
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

    renderPeople();
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

    state.token = data.token;
    localStorage.setItem("jarona-session-token", state.token);
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
    // Ignore logout errors and clear local state anyway.
  }

  state.token = "";
  localStorage.removeItem("jarona-session-token");
  clearProfileState();
}

async function generateToday() {
  if (!state.profile) {
    elements.generationStatus.textContent = "Log in before generating.";
    return;
  }

  try {
    const data = await api("/api/generate", {
      method: "POST",
      body: JSON.stringify({})
    });

    state.lastGeneratedDate = data.generatedDate;
    state.lastGeneratedPeopleIds = data.selectedPeople.map((person) => person.id);
    elements.generationStatus.textContent = `Generated for ${data.generatedDate}.`;
    renderGenerationResults(data.selectedPeople);
  } catch (error) {
    if (error.status === 409 && error.payload?.selectedPeople) {
      state.lastGeneratedDate = error.payload.generatedDate;
      state.lastGeneratedPeopleIds = error.payload.selectedPeople.map((person) => person.id);
      elements.generationStatus.textContent = error.message;
      renderGenerationResults(error.payload.selectedPeople);
      return;
    }

    elements.generationStatus.textContent = error.message;
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

  elements.addPersonButton.addEventListener("click", () => openPersonModal());
  elements.closePersonModalButton.addEventListener("click", closePersonModal);
  elements.personForm.addEventListener("submit", submitPersonForm);

  elements.loginButton.addEventListener("click", () => openAuthModal("login"));
  elements.registerButton.addEventListener("click", () => openAuthModal("register"));
  elements.switchProfileButton.addEventListener("click", () => openAuthModal("login", elements.profileSelect.value));
  elements.closeAuthModalButton.addEventListener("click", closeAuthModal);
  elements.authForm.addEventListener("submit", submitAuthForm);
  elements.logoutButton.addEventListener("click", logout);

  elements.saveSettingsButton.addEventListener("click", saveSettings);
  elements.generateButton.addEventListener("click", generateToday);
}

async function init() {
  setCurrentDate();
  buildBondLegend();
  renderPeople();
  attachEvents();
  await loadProfiles();
  await restoreSession();
}

init();
