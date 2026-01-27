# Chrome Web Store – Justifications

## Objectif unique

Feedee allows users to monitor RSS and Atom feeds directly from the browser's side panel. It fetches articles from user-configured feeds, displays them in a unified list with search and filtering, and sends desktop notifications when new articles are published.

## Justification des autorisations

### alarms

The alarms permission is used to schedule periodic background fetches of RSS/Atom feeds at a user-defined interval (default: every 5 minutes). This ensures articles are kept up to date without requiring manual refresh.

### notifications

The notifications permission is used to send desktop notifications when new articles are detected in the user's RSS/Atom feeds, so the user is informed of new publications even when the side panel is closed.

### storage

The storage permission is used to persist user settings (feed list with names, URLs and tag colors, refresh interval, display preferences) across browser sessions using chrome.storage.sync and to track already-seen article GUIDs using chrome.storage.local to avoid duplicate notifications.

### sidePanel

The sidePanel permission is used to display the main interface of the extension in the browser's side panel. This is the primary UI where users browse, search and filter their aggregated RSS/Atom articles.

### Autorisation d'accès à l'hôte (`*://*/*`)

The host permission is required to fetch RSS/Atom feed XML data from any URL the user configures. Since feeds can be hosted on any domain, the extension needs broad host access to perform these HTTP requests from the background service worker.

## Code distant

Non, je n'utilise pas "Code distant".

All JavaScript and CSS code is bundled within the extension package. No external scripts are loaded at runtime. The only network requests are HTTP fetches to RSS/Atom feed URLs configured by the user, which return XML data (not executable code).
