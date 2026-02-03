# Preact Migration Plan

**Target:** `openproject-export-monthly-visualizer` -> Preact + htm  
**Location:** Baguio, PH (GMT +0800)  
**Vibe:** Buildless, Clean, and low-maintenance.

---

## 📂 1. The Folder Structure
Move your logic into a `src/` directory so it's not a total mess.

```text
.
├── index.html          # Entry HTML
├── assets/             # CSS and static images
└── src/                # All the actual brains
    ├── main.js         # App entry point
    ├── store.js        # Global state (Signals)
    ├── router.js       # Hash routing logic
    ├── components/     # Reusable UI (Buttons, Nav, etc.)
    ├── views/          # Page-level components
    │   ├── Upload.js   # The "Upload" screen
    │   └── Report.js   # The "Dashboard" screen
    └── utils/          # The boring math and API stuff
```

---

## 🗺️ 2. The Import Map
Put this in your `<head>`. This is how the browser finds your libraries.

```html
<script type="importmap">
{
    "imports": {
        "preact": "https://esm.sh/preact@10.19.0",
        "preact/hooks": "https://esm.sh/preact@10.19.0/hooks",
        "preact/signals": "https://esm.sh/preact-signals@1.2.2",
        "htm": "https://esm.sh/htm@3.1.1",
        "app/": "./src/"
    }
}
</script>
```

---

## 🧠 3. Centralized Store (`src/store.js`)
```javascript
import { signal, computed } from 'preact/signals';

// State
export const rawData = signal([]);
export const fileName = signal(null);
export const isLoading = signal(false);

// Derived State (Computed)
export const activeData = computed(() => {
    return rawData.value.filter(row => row.units > 0);
});

// Actions
export const setReportData = (data, name) => {
    rawData.value = data;
    fileName.value = name;
};
```

---

## 🛣️ 4. The Hash Router (`src/router.js`)
```javascript
import { signal } from 'preact/signals';

export const route = signal(window.location.hash || '#upload');

window.addEventListener('hashchange', () => {
    route.value = window.location.hash;
});

export const navigate = (path) => {
    window.location.hash = path;
};
```

---

## 🚀 5. The Main Entry (`src/main.js`)
```javascript
import { h, render } from 'preact';
import htm from 'htm';
import { route } from './router.js';
import { UploadView } from './views/Upload.js';
import { DashboardView } from './views/Dashboard.js';

const html = htm.bind(h);

function App() {
    switch (route.value) {
        case '#dashboard':
            return html`<${DashboardView} />`;
        case '#upload':
        default:
            return html`<${UploadView} />`;
    }
}

render(html`<${App} />`, document.getElementById('app'));
```

---

## 🛠️ 6. Migration Steps
1.  **Clean the HTML:** Replace all old script tags with the `importmap` and `main.js`.
2.  **Move Utility Logic:** Put your parsing code in `src/utils/parser.js`.
3.  **Componentize:** Create `src/views/Upload.js` using an `html` template string.
4.  **Wrap Charts:** Use `useRef` and `useEffect` to initialize Chart.js inside components.
5.  **Deploy:** Keep `index.html` at the root for GitHub Pages.