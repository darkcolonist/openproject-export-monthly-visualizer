# Introducing Supabase Data Source Task Checklist

- [ ] UI Implementation
    - [ ] Create Settings Dropdown (Gear) in header in `index.html`
    - [ ] Add "Connect Supabase" modal to `index.html`
    - [ ] Update `dom.js` with new elements
    - [ ] Update `ui.js` with dropdown and modal logic
- [ ] Logic & State
    - [ ] Create `assets/js/supabase.js`
    - [ ] Update `state.js` with `supabaseConfig`
    - [ ] Update `storage.js` for 365-day expiry and config storage
    - [ ] Implement Disconnect logic (clear storage and reset UI)
    - [ ] Update `data-processing.js` to handle Supabase schema
- [ ] Integration
    - [ ] Update `boot.js` for auto-sync/auto-load
    - [ ] Connect "Sync Now" button to Supabase logic
- [ ] Verification
    - [ ] Test UI transitions
    - [ ] Test Supabase data fetching (mocked or real)
    - [ ] Test 365-day persistence
