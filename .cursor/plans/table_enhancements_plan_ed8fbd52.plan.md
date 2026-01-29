---
name: Table Enhancements Plan
overview: Add smart sticky headers and horizontal scrolling with fixed first columns to both Project Breakdown and Developer Breakdown tables.
todos:
  - id: add-horizontal-scroll
    content: Wrap tables in scrollable containers and add sticky positioning to first columns
    status: completed
  - id: implement-sticky-observer
    content: Add Intersection Observer logic to control sticky header behavior based on table visibility
    status: completed
  - id: update-table-functions
    content: Modify renderProjectTable() and renderTable() to apply sticky column classes
    status: completed
  - id: add-css-styles
    content: Add custom CSS for fixed column shadows and sticky header transitions
    status: completed
isProject: false
---

# Table Enhancements Plan

## Overview

Enhance the Project Breakdown and Developer Breakdown tables with:

1. Sticky headers that only remain sticky while their table is in view
2. Horizontal scrolling capability with the first column fixed

## Implementation Approach

### 1. Horizontal Scrolling with Fixed First Column

For both tables, we'll:

- Wrap each table in a horizontally scrollable container (`overflow-x-auto`)
- Apply `position: sticky` with `left: 0` to all first column cells (both `<th>` and `<td>`)
- Add a shadow effect to the fixed column to create visual separation
- Ensure the fixed column has a solid background color to prevent text overlap

**Files affected:** `[index.html](d:\_gits\dc.openproject-export-monthly-visualizer\index.html)`

**Current structure:**

```130:140:index.html
<div class="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
    <table class="w-full text-sm text-left border-collapse">
        <thead id="project-thead" class="text-xs text-slate-400 uppercase bg-slate-900 border-b border-slate-700 sticky top-0 z-10">
```

**Changes needed:**

- Wrap table container with `overflow-x-auto` div
- Remove `w-full` from tables to allow horizontal scrolling
- Add CSS classes for fixed first column with sticky positioning
- Add shadow styling for visual separation

### 2. Smart Sticky Headers (Intersection Observer)

Implement JavaScript logic using Intersection Observer API to:

- Monitor when each table section enters/exits the viewport
- Dynamically add/remove sticky positioning on headers based on visibility
- Use a small CSS helper class to control sticky behavior

**Technical approach:**

```javascript
// Create observers for each table section
const observerOptions = {
  root: document.getElementById('scroll-content'),
  rootMargin: '-1px 0px 0px 0px',
  threshold: [0, 1]
};

// Toggle sticky class when table is in view
observer.observe(projectSection);
observer.observe(developerSection);
```

### 3. CSS Updates

Add custom styles for:

- Fixed first column with `position: sticky; left: 0`
- Shadow effect on fixed column: `box-shadow: 2px 0 4px rgba(0,0,0,0.3)`
- Z-index layering: header cells `z-20`, body cells `z-10`
- Background colors to prevent text bleed-through
- Smooth transitions for visual polish

### 4. JavaScript Function Updates

Modify the following functions in `[index.html](d:\_gits\dc.openproject-export-monthly-visualizer\index.html)`:

`**renderProjectTable()` (line 471):**

- Add sticky classes to first `<th>`: `sticky left-0 z-20 bg-slate-900`
- Add sticky classes to first `<td>`: `sticky left-0 z-10 bg-slate-900 shadow-[2px_0_4px_rgba(0,0,0,0.3)]`

`**renderTable()` (line 511):**

- Apply same sticky column treatment for Developer table

**New function `initializeStickyHeaders()`:**

- Set up Intersection Observers for both tables
- Handle sticky header state changes

## Expected Behavior

After implementation:

- **Horizontal scrolling**: Month columns scroll left/right while Project/Developer name stays visible
- **Smart sticky headers**: Header row sticks to top only while scrolling within that table
- When scrolled past a table, its header unsticks naturally
- Visual shadow on fixed column for better readability
- Smooth, polished user experience

## Technical Notes

- Using CSS `position: sticky` on first column cells (most performant solution)
- Intersection Observer provides efficient viewport detection
- No external dependencies required (pure CSS + vanilla JS)
- Maintains dark mode aesthetics with proper z-index layering

