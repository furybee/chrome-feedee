import Parser from "rss-parser";

const ALARM_NAME = "rss-check";
const DEFAULT_INTERVAL = 5;
const parser = new Parser();

// Open side panel on action icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(async () => {
  const { refreshInterval = DEFAULT_INTERVAL } =
    await chrome.storage.sync.get("refreshInterval");
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: refreshInterval });
  checkAllFeeds();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    checkAllFeeds();
    // Notify side panel to refresh its view
    chrome.runtime.sendMessage({ action: "alarm-tick" }).catch(() => {});
  }
});

// Re-create alarm when interval setting changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.refreshInterval) {
    const minutes = changes.refreshInterval.newValue || DEFAULT_INTERVAL;
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: minutes });
  }
});

async function checkAllFeeds() {
  const { feeds = [] } = await chrome.storage.sync.get("feeds");
  const { seenGuids = {} } = await chrome.storage.local.get("seenGuids");

  let updated = false;

  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url);
      const xml = await response.text();
      const parsed = await parser.parseString(xml);

      if (!seenGuids[feed.url]) {
        seenGuids[feed.url] = [];
      }

      const knownGuids = new Set(seenGuids[feed.url]);

      for (const item of parsed.items) {
        const id = item.guid || item.link || item.title;
        if (!knownGuids.has(id)) {
          knownGuids.add(id);
          updated = true;

          chrome.notifications.create(id, {
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/rss-128.png"),
            title: feed.name || parsed.title || "RSS",
            message: item.title || "",
          });
        }
      }

      seenGuids[feed.url] = [...knownGuids];
    } catch (err) {
      console.error(`Erreur lors de la lecture du flux ${feed.url}:`, err);
    }
  }

  if (updated) {
    await chrome.storage.local.set({ seenGuids });
  }
}

async function getAllItems() {
  const { feeds = [] } = await chrome.storage.sync.get("feeds");
  const results = [];

  for (const feed of feeds) {
    try {
      const response = await fetch(feed.url);
      const xml = await response.text();
      const parsed = await parser.parseString(xml);

      results.push({
        name: feed.name || parsed.title || feed.url,
        url: feed.url,
        items: parsed.items.map((item) => ({
          title: item.title || "",
          link: item.link || "",
          pubDate: item.pubDate || item.isoDate || "",
        })),
      });
    } catch (err) {
      results.push({
        name: feed.name || feed.url,
        url: feed.url,
        items: [],
        error: err.message,
      });
    }
  }

  return results;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "checkNow") {
    checkAllFeeds().then(() => sendResponse({ ok: true }));
    return true;
  }
  if (message.action === "getItems") {
    getAllItems().then((items) => sendResponse({ items }));
    return true;
  }
});
