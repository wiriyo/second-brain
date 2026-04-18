# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Start Protocol

**IMPORTANT:** At the start of every session in this folder, call `mempalace_search` with wing `second-brain` to load project context before responding.

## Overview

This is a static web application called "Second Brain" - a personal productivity system built entirely with HTML, CSS, and JavaScript. It's designed to be deployed on GitHub Pages without requiring a backend server.

**Architecture Pattern:**
- **State Management**: Centralized in `js/app.js` using a `state` object
- **Persistence**: Primary storage is browser `localStorage`, with optional sync to Google Sheets via Google Apps Script
- **Module Pattern**: Each page (inbox, tasks, habit, para) has its own JS module that imports the shared state from `app.js`
- **Sync Strategy**: Uses JSONP to avoid CORS issues when communicating with Google Apps Script

## File Structure

```
second-brain/
├── index.html      # Dashboard homepage
├── inbox.html      # Inbox capture & processing
├── tasks.html      # Task management with PARA integration
├── para.html       # PARA method organizer
├── habit.html      # Habit tracker + reward system
├── css/
│   └── style.css   # All styles with CSS variable theming
└── js/
    ├── app.js      # Shared state, storage, sync, and utilities
    ├── inbox.js    # Inbox-specific logic
    ├── tasks.js    # Task management logic
    ├── habit.js    # Habit tracking & rewards logic
    └── para.js     # PARA organization logic
```

## Core Architecture

### State Management (app.js)

The `state` object contains all application data:
- `inbox`: Array of inbox items with id, text, date, done, tag
- `tasks`: Array of tasks with id, name, priority, para, due, done, date
- `points`: Total points accumulated (habits + completed tasks)
- `streak`: Consecutive days tracking
- `habitLog`: Object tracking daily habit completion
- `redeemLog`: Array tracking redeemed rewards
- `focus`: Array of 3 daily focus items

All state persists to localStorage using the `save()` function, which also triggers optional sync to Sheets.

### Storage & Sync Pattern

```javascript
const S = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
```

**Sync to Google Sheets:**
- Uses JSONP to avoid CORS issues
- All requests are GET requests through Google Apps Script (`AppScript.gs`)
- The Apps Script exposes actions: `saveInbox`, `saveTasks`, `saveHabits`, `getInbox`, `getTasks`
- Sync happens automatically on state changes when `save('inbox')`, `save('tasks')`, or `save('habits')` is called

**JSONP Implementation:**
```javascript
function jsonpCall(params, onSuccess, label) {
  const id = 'cb_' + Date.now();
  const parts = Object.entries(params).map(([k,v]) => k + '=' + v);
  parts.push('callback=' + id);
  const url = SHEET_URL + '?' + parts.join('&');
  window[id] = function(data) {
    delete window[id];
    if (onSuccess) onSuccess(data);
  };
  const s = document.createElement('script');
  s.src = url;
  document.head.appendChild(s);
}
```

### Module Responsibilities

**app.js:**
- Central state management
- localStorage persistence
- Google Sheets sync (JSONP)
- Shared utilities: `today()`, `thaiDate()`, `showSyncBadge()`, `updateStats()`
- Navigation sync (inbox count, points)
- Quick capture from dashboard

**inbox.js:**
- Inbox item management (add, delete, move to PARA)
- Modal for moving items to Projects/Areas/Resources/Archive
- Tagging for processed items

**tasks.js:**
- Task CRUD operations
- Priority-based filtering (high, medium, low)
- PARA categorization
- Task completion (+10 points)
- Clear completed tasks

**habit.js:**
- Habit definitions (6 habits with point values)
- Daily habit toggling
- Streak tracking
- Week view visualization
- Reward shop with redemption history

**para.js:**
- Simple inline item management for Projects/Areas/Resources/Archive
- Add/delete items for each PARA section

## Development Workflow

Since this is a static site with no build process:

1. **Local Testing**: Open HTML files directly in browser or use a local server (e.g., `python -m http.server`)
2. **Deploy to GitHub Pages**: Push to main branch, enable Pages from repo settings → Source: main branch → / (root)
3. **Google Apps Script**: Deploy the script and update `SHEET_URL` in `js/app.js` line 2
4. **Styling**: All styles in `css/style.css` using CSS variables for theming

## Important Patterns

### Date Handling
- Always use ISO format for storage: `YYYY-MM-DD`
- Thai date display via `thaiDate()` function
- `today()` returns current date in ISO format

### State Updates
- Always modify `state` directly, then call `save()` or `save('module')`
- Page-specific render functions are called after state changes
- Navigation badges auto-update via `syncNav()`

### Task Priority Colors
- High: `#f87171` (red)
- Medium: `#fbbf24` (yellow)
- Low: `#34d399` (green)

### PARA Emoji Mapping
- Projects: 📁
- Areas: 🌀
- Resources: 📚
- Archive: 📦

## Google Apps Script Integration

The `AppScript.gs` file handles data persistence to Google Sheets:
- Each module gets its own sheet (Inbox, Tasks, Habits)
- Actions: `saveInbox`, `saveTasks`, `saveHabits`, `getInbox`, `getTasks`
- All responses wrapped in JSONP callback to avoid CORS

## Theme & Styling

The app uses a pastel purple/pink color scheme defined in CSS variables (`style.css`):
- Primary colors: `--pink`, `--purple`, `--blue`, `--green`
- Backgrounds: `--bg` (main), `--card` (white), `--sidebar-bg` (dark purple)
- Typography: Sarabun and Mitr fonts (Thai language support)

## Browser Compatibility

This app relies on:
- `localStorage` for persistence
- `fetch` and `script` tags for JSONP
- ES6+ JavaScript features
- Modern CSS (custom properties, grid, flexbox)

All modern browsers (Chrome, Firefox, Safari, Edge) are supported.
