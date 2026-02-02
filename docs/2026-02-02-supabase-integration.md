# Introducing Supabase Data Source

This plan outlines the steps to introduce Supabase as a secondary data source alongside the existing XLS/CSV file upload option. Data from Supabase will be cached locally with a 365-day expiry.

## User Review Required

> [!IMPORTANT]
> I will need the following information from you to test the integration:
> 1.  **Supabase Base URL**: The URL of your Supabase project (e.g., `https://xyz.supabase.co`).
> 2.  **Supabase Anon Key**: The public API key.
> 3.  **Filtering Requirements**: You mentioned wanting to finalize datasource filter and range. I will implement a field for generic query parameters, but we can refine this.

## Proposed Changes

### 1. New Component: Supabase Integration
Create a new file `assets/js/supabase.js` to handle all Supabase-related logic.

#### [NEW] [supabase.js](file:///d:/_gits/dc.openproject-export-monthly-visualizer/assets/js/supabase.js)
- `App.supabase.fetchData(config)`: Fetches data from the endpoint.
- `App.supabase.sync()`: Main entry point for syncing.

### 2. UI Updates
#### [MODIFY] [index.html](file:///d:/_gits/dc.openproject-export-monthly-visualizer/index.html)
- Replace "New File" link in the header with a dropdown menu (using a Gear icon).
- Add "Clear Current Data" to the dropdown.
- Add "Connect Supabase" (if disconnected) or "Disconnect Supabase" (if connected) to the dropdown.
- Add a "Sync Status" indicator in the header when Supabase is connected.
- The Supabase configuration will be a modal that appears when "Connect Supabase" is selected.

#### [MODIFY] [dom.js](file:///d:/_gits/dc.openproject-export-monthly-visualizer/assets/js/dom.js)
- Update `App.elements` to include the dropdown menu and its items.

#### [MODIFY] [ui.js](file:///d:/_gits/dc.openproject-export-monthly-visualizer/assets/js/ui.js)
- Implement dropdown toggle logic.
- Update `resetToUpload` to clear current state.
- Implement switching logic: To change Supabase sources, the user must first click "Disconnect Supabase". This clears the stored credentials and cached Supabase data.

### 3. Data & Storage
#### [MODIFY] [state.js](file:///d:/_gits/dc.openproject-export-monthly-visualizer/assets/js/state.js)
- Add `supabaseConfig` to the global state.

#### [MODIFY] [storage.js](file:///d:/_gits/dc.openproject-export-monthly-visualizer/assets/js/storage.js)
- Add functions to save/load Supabase config.
- Update IndexedDB logic to support a 365-day expiry for Supabase data (separate from the 24-hour file cache).

#### [MODIFY] [data-processing.js](file:///d:/_gits/dc.openproject-export-monthly-visualizer/assets/js/data-processing.js)
- Update normalization logic to handle both `units` (XLS) and `hours` (Supabase).
- Ensure `date_spent` is correctly mapped to `Date`.

### 4. Boot Sequence
#### [MODIFY] [boot.js](file:///d:/_gits/dc.openproject-export-monthly-visualizer/assets/js/boot.js)
- On startup, check if valid Supabase credentials and cached data exist. If so, auto-load.

---

## Verification Plan

### Automated Tests
- I'll use the browser tool to verify UI transitions.
- I'll simulate a Supabase response to verify data processing.

### Manual Verification
- User will provide credentials and confirm if the "Sync" works as expected.
- Verify that data persists after page reload for 365 days.
