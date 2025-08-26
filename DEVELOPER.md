# Developer Guide

This document provides architecture, code map, build/run instructions, and implementation notes for contributors.

## Context & Design

- High-level goals, trade-offs, and UX are captured in `obsidian-simple-kanban-design-doc.md`.
- The conversation that informed the design lives in `additional-conversation-context.md`.
- This plugin keeps edits minimal: modify only the task line; tasks stay in their source notes.

## Architecture Overview

Core components:

- Task Scanner (`src/taskScanner.ts`): Parse markdown files → Task[] (id = `path:line`). Extract tags and emoji dates; build subtasks and notes by indentation; apply global include-tags filter to top-level tasks.
- File Watcher (`src/fileWatcher.ts`): Listen to `modify`/`rename`/`delete` events; re-parse changed files with include-tags; update cache; trigger rerender.
- Data Store (`src/dataStore.ts`): In-memory store of tasks and current boards.
- Filter System (`src/filter/parser.ts`, `src/filter/eval.ts`): Boolean filter strings → AST → predicate; AST also supported directly in settings JSON.
- Board UI (`src/board/*`): Board/Column/Card renderers; tabs; action icons; scroll preservation.
- Edits (`src/utils/mdEdit.ts`): Replace line (single- or multi-line), soft delete.
- Plugin Entry (`src/main.ts`): Settings (Boards JSON + Global task tags), commands, view registration, handlers for toggle/edit/jump/delete, and subtask toggle.

## Code Map

- `src/main.ts` – Plugin lifecycle, view activation, board state, handlers.
- `src/types.ts` – Interfaces for `Task`, `Board`, `Column`, `FilterExpression`, `PluginSettings`.
- `src/settings.ts` – Settings tab with Boards JSON editor (Load Sample + Save).
- `src/dataStore.ts` – Simple Map-backed task cache and boards state.
- `src/taskScanner.ts` – Scans `- [ ]` lines; parses tags and emoji dates (➕ ⏳ 📅 ✅); strips decorations from title; nests subtasks/notes by indentation; supports global include-tags for top-level tasks.
- `src/filter/parser.ts` – Lexer + Pratt parser for NOT/AND/OR with parentheses; empty → match-all.
- `src/filter/eval.ts` – Evaluator for `and`/`or`/`not`/`tag`/`empty`.
- `src/board/BoardView.ts` – ItemView with tabs, scroll preservation, render pipeline.
- `src/board/ColumnView.ts` – Column container; pumps options into cards.
- `src/board/CardView.ts` – Card renderer: bold title, tags, dates, subtasks (inline toggle + strikethrough when done), child notes, and action icons (Jump/Edit/Delete).
- `src/utils/mdEdit.ts` – `replaceLineInFile`, `replaceLineWithText`, `wrapLineWithDel`.

## Build & Run

Prereqs: Node.js 18+, Obsidian desktop.

1. `npm install`
2. `npm run dev` (watch) or `npm run build`
3. Link this folder into your vault: `.obsidian/plugins/obsidian-simple-kanban/`
4. Enable the plugin; use command `Open Simple Kanban`.

## Tasks Plugin Integration

We use the Tasks API v1, per docs:

- Access via `app.plugins.plugins['obsidian-tasks-plugin'].apiV1`.
- Toggle: `executeToggleTaskDoneCommand(line, path) => string` (may return two lines for recurrents) → write back using `replaceLineWithText`.
- Edit: `editTaskLineModal(taskLine: string) => Promise<string>` → write back if changed; fallback to jump if API unavailable.

## UX Notes & Decisions

- Board tabs switch sessions’ current board and persist in-memory.
- Completed handling is column-based: omit by default; show-only with `showCompleted: true`.
- Date footer stacks vertically to avoid cramping; overdue highlighting for `📅` < today.
- Scroll preservation: capture before rerender, restore after DOM paint (double `requestAnimationFrame`) to reduce jump.
- Global task filter: only top-level checkboxes with at least one of the specified tags are treated as tasks; subtasks/notes are only shown under included parents.
- Behavior is driven by top-level tasks: filtering/columns/completion state ignore subtask state.

### Ignore Paths Analysis (Performance)

- Purpose: Reduce initial scan IO, memory footprint, and per-rerender compute by excluding directories from parsing.
- Current model: Event-driven updates (modify/rename/delete) plus one initial scan; global task tags already restrict which items become cards after parsing.
- Effects by area:
  - IO/startup: Skipping folders reduces file reads proportionally during initial scan and manual rescans.
  - Ongoing updates: Excluded paths wouldn’t be parsed on future events, keeping the in-memory task set smaller.
  - Rerender cost: Filtering is O(columns × tasks); fewer tasks improves responsiveness, especially at large N.
- Global tags vs Ignore paths:
  - Global tags cut tasks kept in memory and rerender cost but still read/parse files first.
  - Ignore paths cut IO+parsing and downstream work, but add user-facing complexity.
- Order-of-magnitude guidance:
  - Small vaults (<500 top-level tasks): minimal benefit; global tags suffice.
  - Medium (500–3k tasks): some benefit (smoother rerenders, lower memory) and faster startup if large folders are excluded.
  - Large (5k+ tasks or thousands of files): meaningful startup and rerender improvements if excluding big non-task directories.
- Decision: Skip implementing ignore-paths for now. The global task filter covers the main UX control; performance is adequate for typical vaults. Revisit only for very large vaults.

## Known Gaps / Backlog

- Drag & Drop between columns to update `statusTag` (remove source, add destination)
- Reduce flicker with in-place DOM updates
- Sorting by dates/priority
- Bulk operations, keyboard shortcuts
- Delete mode choice (strike vs comments)
- Visual editor for boards/columns
- Performance: virtualization for long columns; worker-based scanning for huge vaults
- Ignore paths (performance) — deprioritized; see analysis above
- Subtasks follow-ups:
  - Multi-level subtask display (currently single nesting level shown)
  - Optional subtask tags display (chips) vs keep stripped
  - Optional strike-through for completed parent title
  - Optional subtask completion badge (x/y) on header
  - Optional setting to hide subtasks or notes for compact cards
- Optional: handle `create` events to parse brand-new files before first edit (low priority)

## Testing Tips

- Use a dev vault with a mix of tasks, tags, and emoji dates.
- Try recurring tasks with the Tasks plugin to confirm multi-line toggle writes.
- Exercise `Rescan Tasks` and check for live updates from watcher.
