<p align="center">
  <img src="assets/promo-small.png" alt="Feedee" width="440">
</p>

<h1 align="center">Feedee</h1>

<p align="center">
  <strong>RSS & Atom Feed Notifier</strong><br>
  A lightweight Chrome extension that lives in your side panel.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/manifest-v3-blue" alt="Manifest V3">
  <img src="https://img.shields.io/badge/chrome-extension-brightgreen" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/i18n-en%20%7C%20fr-orange" alt="i18n">
</p>

---

## Features

- **Side panel UI** — Browse all your articles without leaving the current tab
- **Desktop notifications** — Get notified when new articles are published
- **Search** — Filter articles by title or feed name
- **Feed filter** — Show/hide articles per feed with multi-select checkboxes
- **Group by date** — Articles organized into Today, This week, This month, etc.
- **Auto-refresh** — Configurable interval (1–120 minutes)
- **Custom tag colors** — Assign a color to each feed for visual identification
- **Dark mode** — Follows system preference automatically
- **i18n** — English and French

## Installation

### From source

```bash
git clone git@github.com:furybee/chrome-feedee.git
cd chrome-feedee
npm install
npm run build
```

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist/` folder

### Build for distribution

```bash
npm run build:zip
```

Produces `feedee.zip` ready for Chrome Web Store upload.

## Usage

1. Click the Feedee icon in the toolbar to open the side panel
2. Open **Settings** (gear icon) to add your RSS/Atom feeds
3. Articles appear in the side panel, sorted by date
4. Use the **search bar** to filter by keyword
5. Use the **filter button** to show/hide specific feeds

## Permissions

| Permission | Reason |
|---|---|
| `alarms` | Schedule periodic feed checks |
| `notifications` | Desktop alerts for new articles |
| `storage` | Persist feeds, settings, and seen articles |
| `sidePanel` | Display the main UI in the browser side panel |
| `*://*/*` | Fetch RSS/Atom XML from any user-configured URL |

## Project structure

```
├── src/
│   └── background.js       # Service worker (fetch, parse, notify)
├── sidepanel.html           # Side panel markup
├── sidepanel.css            # Styles (light + dark theme)
├── sidepanel.js             # Side panel logic (render, search, filter)
├── _locales/
│   ├── en/messages.json
│   └── fr/messages.json
├── icons/                   # Extension icons (16, 48, 128)
├── lib/                     # Vendored Coloris (color picker)
├── manifest.json            # Chrome extension manifest v3
└── vite.config.js           # Build config
```

## License

[MIT](LICENSE)
