const msg = chrome.i18n.getMessage;

const viewArticles = document.getElementById("view-articles");
const viewSettings = document.getElementById("view-settings");
const settingsBtn = document.getElementById("settings-btn");
const backBtn = document.getElementById("back-btn");
const refreshBtn = document.getElementById("refresh-btn");
const articlesContainer = document.getElementById("articles-container");
const feedList = document.getElementById("feed-list");
const noFeeds = document.getElementById("no-feeds");
const addForm = document.getElementById("add-form");
const feedNameInput = document.getElementById("feed-name");
const feedUrlInput = document.getElementById("feed-url");
const feedColorInput = document.getElementById("feed-color");
const addFeedBtn = document.getElementById("add-feed-btn");
const cancelBtn = document.getElementById("cancel-btn");
const refreshIntervalInput = document.getElementById("refresh-interval");
const searchInput = document.getElementById("search-input");
const statusBar = document.getElementById("status-bar");
const groupByDateCheckbox = document.getElementById("group-by-date");
const filterBtn = document.getElementById("filter-btn");
const filterDropdown = document.getElementById("filter-dropdown");
const exportBtn = document.getElementById("export-btn");

const DEFAULT_INTERVAL = 5;
let lastFeedResults = [];
let groupByDate = true;
let feedColorMap = {};
let selectedFeeds = new Set();

// --- Init Coloris ---
Coloris({
  el: "[data-coloris]",
  theme: "polaroid",
  themeMode: "auto",
  alpha: false,
  clearButton: true,
  clearLabel: "Clear",
  swatches: [
    "#e53935", "#d81b60", "#8e24aa", "#5e35b1",
    "#3949ab", "#1e88e5", "#039be5", "#00acc1",
    "#00897b", "#43a047", "#7cb342", "#f4511e",
  ],
});

// --- i18n: populate static text ---
searchInput.placeholder = msg("searchPlaceholder");
refreshBtn.title = msg("refreshTitle");
filterBtn.title = msg("filterTitle");
exportBtn.title = msg("exportTitle");
settingsBtn.title = msg("settingsTitle");
backBtn.textContent = msg("back");
feedNameInput.placeholder = msg("feedNamePlaceholder");
feedUrlInput.placeholder = msg("feedUrlPlaceholder");
feedColorInput.placeholder = msg("feedColorPlaceholder");
document.getElementById("add-btn").textContent = msg("addButton");
cancelBtn.textContent = msg("cancel");
document.getElementById("settings-refresh-title").textContent = msg("autoRefresh");
document.getElementById("interval-label").textContent = msg("intervalLabel");
document.getElementById("settings-feeds-title").textContent = msg("savedFeeds");
noFeeds.textContent = msg("noFeeds");
document.getElementById("initial-loading").textContent = msg("loading");
document.getElementById("settings-display-title").textContent = msg("displaySettings");
document.getElementById("group-by-date-label").textContent = msg("groupByDate");
document.getElementById("footer-support").textContent = msg("footerSupport");
document.getElementById("footer-bug").textContent = msg("footerBug");

// --- Navigation ---

function showSettings() {
  viewArticles.classList.add("hidden");
  viewSettings.classList.remove("hidden");
  loadFeeds();
  loadInterval();
  loadGroupByDate();
}

function showArticles() {
  viewSettings.classList.add("hidden");
  viewArticles.classList.remove("hidden");
}

settingsBtn.addEventListener("click", showSettings);
backBtn.addEventListener("click", showArticles);

// --- Add form toggle ---

function showAddForm() {
  addForm.classList.remove("hidden");
  addFeedBtn.classList.add("hidden");
  feedNameInput.focus();
}

function hideAddForm() {
  addForm.classList.add("hidden");
  addFeedBtn.classList.remove("hidden");
  feedNameInput.value = "";
  feedUrlInput.value = "";
  feedColorInput.value = "";
  feedColorInput.style.background = "";
}

addFeedBtn.addEventListener("click", showAddForm);
cancelBtn.addEventListener("click", hideAddForm);

// --- Export feeds ---

exportBtn.addEventListener("click", async () => {
  const { feeds = [] } = await chrome.storage.sync.get("feeds");
  const json = JSON.stringify(feeds, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `feeds-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

// --- Feed CRUD ---

async function loadFeeds() {
  const { feeds = [] } = await chrome.storage.sync.get("feeds");
  buildFeedColorMap(feeds);
  renderFeeds(feeds);
}

function renderFeeds(feeds) {
  feedList.innerHTML = "";
  noFeeds.classList.toggle("hidden", feeds.length > 0);

  for (let i = 0; i < feeds.length; i++) {
    const li = document.createElement("li");

    const swatch = document.createElement("input");
    swatch.type = "text";
    swatch.className = "feed-color-swatch";
    swatch.dataset.coloris = "";
    swatch.autocomplete = "off";
    swatch.value = feeds[i].color || "";
    swatch.style.background = feeds[i].color || tagColor(feeds[i].name);
    swatch.addEventListener("change", () => updateFeedColor(i, swatch.value));

    const info = document.createElement("div");
    info.className = "feed-info";

    const name = document.createElement("span");
    name.className = "feed-name";
    name.textContent = feeds[i].name;

    const url = document.createElement("span");
    url.className = "feed-url";
    url.textContent = feeds[i].url;

    info.appendChild(name);
    info.appendChild(url);

    const removeBtn = document.createElement("button");
    removeBtn.textContent = msg("remove");
    removeBtn.addEventListener("click", () => removeFeed(i));

    li.appendChild(swatch);
    li.appendChild(info);
    li.appendChild(removeBtn);
    feedList.appendChild(li);
  }
}

async function addFeed(name, url, color) {
  const { feeds = [] } = await chrome.storage.sync.get("feeds");
  const feed = { name, url };
  if (color) feed.color = color;
  feeds.push(feed);
  await chrome.storage.sync.set({ feeds });
  buildFeedColorMap(feeds);
  renderFeeds(feeds);
}

async function updateFeedColor(index, color) {
  const { feeds = [] } = await chrome.storage.sync.get("feeds");
  if (color) {
    feeds[index].color = color;
  } else {
    delete feeds[index].color;
  }
  await chrome.storage.sync.set({ feeds });
  buildFeedColorMap(feeds);
}

async function removeFeed(index) {
  const { feeds = [] } = await chrome.storage.sync.get("feeds");
  const removed = feeds.splice(index, 1)[0];
  const { seenGuids = {} } = await chrome.storage.local.get("seenGuids");
  delete seenGuids[removed.url];
  await chrome.storage.sync.set({ feeds });
  await chrome.storage.local.set({ seenGuids });
  renderFeeds(feeds);
}

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = feedNameInput.value.trim();
  const url = feedUrlInput.value.trim();
  const color = feedColorInput.value.trim();
  if (name && url) {
    addFeed(name, url, color);
    hideAddForm();
  }
});

// --- Tag color from name (deterministic) ---

function tagColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = ((hash % 360) + 360) % 360;
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return `hsl(${h}, ${dark ? 60 : 55}%, ${dark ? 55 : 45}%)`;
}

function buildFeedColorMap(feeds) {
  feedColorMap = {};
  for (const feed of feeds) {
    if (feed.color) feedColorMap[feed.name] = feed.color;
  }
}

function feedTagColor(name) {
  return feedColorMap[name] || tagColor(name);
}

// --- Feed filter ---

function getAllFeedNames() {
  const names = [];
  for (const feed of lastFeedResults) {
    if (!feed.error && names.indexOf(feed.name) === -1) {
      names.push(feed.name);
    }
  }
  return names;
}

function renderFilterDropdown() {
  filterDropdown.innerHTML = "";
  const names = getAllFeedNames();

  // "Select all" checkbox
  const allLabel = document.createElement("label");
  allLabel.className = "filter-item filter-item-all";

  const allCb = document.createElement("input");
  allCb.type = "checkbox";
  const allChecked = names.every((n) => selectedFeeds.has(n));
  allCb.checked = allChecked;
  allCb.indeterminate = !allChecked && names.some((n) => selectedFeeds.has(n));

  const allSpan = document.createElement("span");
  allSpan.textContent = msg("filterAll");

  allCb.addEventListener("change", () => {
    if (allCb.checked) {
      for (const n of names) selectedFeeds.add(n);
    } else {
      selectedFeeds.clear();
    }
    updateFilterBtnState();
    renderArticles(lastFeedResults, searchInput.value.trim());
    renderFilterDropdown();
  });

  allLabel.appendChild(allCb);
  allLabel.appendChild(allSpan);
  filterDropdown.appendChild(allLabel);

  // Individual feed checkboxes
  for (const name of names) {
    const label = document.createElement("label");
    label.className = "filter-item";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = selectedFeeds.has(name);
    cb.addEventListener("change", () => {
      if (cb.checked) {
        selectedFeeds.add(name);
      } else {
        selectedFeeds.delete(name);
      }
      // Update "select all" state
      const nowAllChecked = names.every((n) => selectedFeeds.has(n));
      allCb.checked = nowAllChecked;
      allCb.indeterminate = !nowAllChecked && names.some((n) => selectedFeeds.has(n));
      updateFilterBtnState();
      renderArticles(lastFeedResults, searchInput.value.trim());
    });

    const span = document.createElement("span");
    span.textContent = name;

    label.appendChild(cb);
    label.appendChild(span);
    filterDropdown.appendChild(label);
  }
}

function initSelectedFeeds() {
  const names = getAllFeedNames();
  selectedFeeds = new Set(names);
}

function updateFilterBtnState() {
  const allNames = getAllFeedNames();
  const isFiltering = selectedFeeds.size < allNames.length;
  filterBtn.classList.toggle("active", isFiltering);
}

filterBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  const isHidden = filterDropdown.classList.contains("hidden");
  if (isHidden) {
    renderFilterDropdown();
    filterDropdown.classList.remove("hidden");
  } else {
    filterDropdown.classList.add("hidden");
  }
});

document.addEventListener("click", (e) => {
  if (!filterDropdown.classList.contains("hidden") &&
      !filterDropdown.contains(e.target) &&
      e.target !== filterBtn) {
    filterDropdown.classList.add("hidden");
  }
});

// --- Articles display ---

// Track currently displayed article keys to detect new items
let displayedKeys = new Set();

function articleKey(item) {
  return (item.link || "") + "|" + (item.title || "");
}

// --- Date bucketing ---

function dateBucket(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "older";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (d >= startOfToday) return "today";
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - (dayOfWeek - 1));
  if (d >= startOfWeek) return "week";
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  if (d >= startOfMonth) return "month";
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  if (d >= startOfYear) return "year";
  return "older";
}

const BUCKET_ORDER = ["today", "week", "month", "year", "older"];
const BUCKET_LABELS = {
  today: "dateToday",
  week: "dateThisWeek",
  month: "dateThisMonth",
  year: "dateThisYear",
  older: "dateOlder",
};

function buildArticleEl(item) {
  const key = articleKey(item);
  const isNew = !displayedKeys.has(key);

  const div = document.createElement("div");
  div.className = "article-item" + (isNew ? " fade-in" : "");

  const tag = document.createElement("span");
  tag.className = "article-tag";
  tag.textContent = item.feedName;
  tag.style.background = feedTagColor(item.feedName);
  div.appendChild(tag);

  const a = document.createElement("a");
  a.href = item.link;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = item.title || msg("untitled");
  div.appendChild(a);

  if (item.pubDate) {
    const date = document.createElement("span");
    date.className = "article-date";
    date.textContent = new Date(item.pubDate).toLocaleString();
    div.appendChild(date);
  }

  return { el: div, key };
}

function renderArticles(feedResults, filter = "") {
  const frag = document.createDocumentFragment();

  if (feedResults.length === 0) {
    const p = document.createElement("p");
    p.className = "placeholder";
    p.textContent = msg("noFeedsHint");
    frag.appendChild(p);
    swapContent(frag, new Set());
    return;
  }

  const query = filter.toLowerCase();

  // Flatten all articles into a single list with their feed name
  const allItems = [];
  const totalFeedCount = feedResults.filter((f) => !f.error).length;
  for (const feed of feedResults) {
    if (feed.error) continue;
    if (selectedFeeds.size < totalFeedCount && !selectedFeeds.has(feed.name)) continue;
    for (const item of feed.items) {
      allItems.push({ ...item, feedName: feed.name });
    }
  }

  // Show errors
  const errors = feedResults.filter((f) => f.error);
  for (const feed of errors) {
    const err = document.createElement("p");
    err.className = "error";
    err.textContent = feed.name + " — " + msg("errorPrefix") + " " + feed.error;
    frag.appendChild(err);
  }

  if (allItems.length === 0) {
    const p = document.createElement("p");
    p.className = "placeholder";
    p.textContent = msg("noArticles");
    frag.appendChild(p);
    swapContent(frag, new Set());
    return;
  }

  allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  const filtered = query
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.feedName.toLowerCase().includes(query)
      )
    : allItems;

  if (filtered.length === 0) {
    const p = document.createElement("p");
    p.className = "placeholder";
    p.textContent = msg("noResults", [filter]);
    frag.appendChild(p);
    swapContent(frag, new Set());
    return;
  }

  const newKeys = new Set();

  if (groupByDate) {
    // Bucket articles
    const buckets = {};
    for (const item of filtered) {
      const b = dateBucket(item.pubDate);
      if (!buckets[b]) buckets[b] = [];
      buckets[b].push(item);
    }

    for (const bucketId of BUCKET_ORDER) {
      const items = buckets[bucketId];
      if (!items || items.length === 0) continue;

      const group = document.createElement("div");
      group.className = "date-group" + (bucketId !== "today" ? " collapsed" : "");

      const header = document.createElement("div");
      header.className = "date-group-header";

      const titleSpan = document.createElement("span");
      titleSpan.className = "date-group-title";
      titleSpan.textContent = msg(BUCKET_LABELS[bucketId]);

      const countSpan = document.createElement("span");
      countSpan.className = "date-group-count";
      countSpan.textContent = "(" + items.length + ")";

      const chevron = document.createElement("span");
      chevron.className = "date-group-chevron";
      chevron.textContent = "\u25BE";

      const left = document.createElement("span");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "6px";
      left.appendChild(titleSpan);
      left.appendChild(countSpan);

      header.appendChild(left);
      header.appendChild(chevron);

      header.addEventListener("click", () => {
        group.classList.toggle("collapsed");
      });

      const body = document.createElement("div");
      body.className = "date-group-body";

      for (const item of items) {
        const { el, key } = buildArticleEl(item);
        newKeys.add(key);
        body.appendChild(el);
      }

      group.appendChild(header);
      group.appendChild(body);
      frag.appendChild(group);
    }
  } else {
    for (const item of filtered) {
      const { el, key } = buildArticleEl(item);
      newKeys.add(key);
      frag.appendChild(el);
    }
  }

  swapContent(frag, newKeys);
}

function swapContent(fragment, newKeys) {
  articlesContainer.innerHTML = "";
  articlesContainer.appendChild(fragment);
  displayedKeys = newKeys;
}

async function refreshArticles() {
  refreshBtn.disabled = true;
  refreshBtn.classList.add("spinning");

  // Only show loading placeholder on first load (empty state)
  if (lastFeedResults.length === 0 && !articlesContainer.children.length) {
    articlesContainer.innerHTML =
      '<p class="placeholder">' + msg("loading") + "</p>";
  }

  try {
    const response = await chrome.runtime.sendMessage({ action: "getItems" });
    const previousNames = getAllFeedNames();
    lastFeedResults = response.items;
    // Add any new feeds to selectedFeeds, keep existing deselections
    const currentNames = getAllFeedNames();
    for (const name of currentNames) {
      if (previousNames.indexOf(name) === -1) {
        selectedFeeds.add(name);
      }
    }
    updateFilterBtnState();
    renderArticles(lastFeedResults, searchInput.value.trim());
    chrome.runtime.sendMessage({ action: "resetBadge" }).catch(() => {});
    statusBar.textContent = msg("updatedAt", [
      new Date().toLocaleTimeString(),
    ]);
  } catch (err) {
    articlesContainer.innerHTML =
      '<p class="placeholder">' + msg("loadError") + "</p>";
    statusBar.textContent = msg("statusError");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.classList.remove("spinning");
  }
}

refreshBtn.addEventListener("click", refreshArticles);

searchInput.addEventListener("input", () => {
  renderArticles(lastFeedResults, searchInput.value.trim());
});

// --- Auto-refresh via alarm ---

async function loadInterval() {
  const { refreshInterval = DEFAULT_INTERVAL } =
    await chrome.storage.sync.get("refreshInterval");
  refreshIntervalInput.value = refreshInterval;
}

async function saveInterval(minutes) {
  const val = Math.max(1, Math.min(120, parseInt(minutes, 10) || DEFAULT_INTERVAL));
  await chrome.storage.sync.set({ refreshInterval: val });
  refreshIntervalInput.value = val;
}

refreshIntervalInput.addEventListener("change", (e) => {
  saveInterval(e.target.value);
});

// --- Group by date setting ---

async function loadGroupByDate() {
  const { groupByDateSetting = true } =
    await chrome.storage.sync.get("groupByDateSetting");
  groupByDate = groupByDateSetting;
  groupByDateCheckbox.checked = groupByDate;
}

groupByDateCheckbox.addEventListener("change", async () => {
  groupByDate = groupByDateCheckbox.checked;
  await chrome.storage.sync.set({ groupByDateSetting: groupByDate });
  renderArticles(lastFeedResults, searchInput.value.trim());
});

// Listen for alarm ticks from background
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "alarm-tick") {
    refreshArticles();
  }
});

// --- Init ---
(async () => {
  const { feeds = [] } = await chrome.storage.sync.get("feeds");
  buildFeedColorMap(feeds);
  // Pre-populate selectedFeeds with all known feed names
  selectedFeeds = new Set(feeds.map((f) => f.name));
  await loadGroupByDate();
  refreshArticles();
})();
