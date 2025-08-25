# Developer Guide

This document provides architecture, code map, build/run instructions, and implementation notes for contributors.

## Context & Design

- High-level goals, trade-offs, and UX are captured in `obsidian-simple-kanban-design-doc.md`.
- The conversation that informed the design lives in `additional-conversation-context.md`.
- This plugin keeps edits minimal: modify only the task line; tasks stay in their source notes.

## Architecture Overview

Core components:

- Task Scanner (`src/taskScanner.ts`): Parse markdown files → Task[] (id = `path:line`). Extract tags and emoji dates, and strip them from title text.
- File Watcher (`src/fileWatcher.ts`): Listen to `modify`/`rename` events; re-parse changed files; update cache; trigger rerender.
- Data Store (`src/dataStore.ts`): In-memory store of tasks and current boards.
- Filter System (`src/filter/parser.ts`, `src/filter/eval.ts`): Boolean filter strings → AST → predicate; AST also supported directly in settings JSON.
- Board UI (`src/board/*`): Board/Column/Card renderers; tabs; action icons; scroll preservation.
- Edits (`src/utils/mdEdit.ts`): Replace line (single- or multi-line), soft delete.
- Plugin Entry (`src/main.ts`): Settings, commands, view registration, handlers for toggle/edit/jump/delete.

## Code Map

- `src/main.ts` – Plugin lifecycle, view activation, board state, handlers.
- `src/types.ts` – Interfaces for `Task`, `Board`, `Column`, `FilterExpression`, `PluginSettings`.
- `src/settings.ts` – Settings tab with Boards JSON editor (Load Sample + Save).
- `src/dataStore.ts` – Simple Map-backed task cache and boards state.
- `src/taskScanner.ts` – Regex-based scanning of `- [ ]` lines; parse tags and emoji dates (➕ ⏳ 📅 ✅); strip decorations from title.
- `src/filter/parser.ts` – Lexer + Pratt parser for NOT/AND/OR with parentheses; empty → match-all.
- `src/filter/eval.ts` – Evaluator for `and`/`or`/`not`/`tag`/`empty`.
- `src/board/BoardView.ts` – ItemView with tabs, scroll preservation, render pipeline.
- `src/board/ColumnView.ts` – Column container; pumps options into cards.
- `src/board/CardView.ts` – Card renderer: checkbox, title, tags, dates, and action icons (Jump/Edit/Delete).
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

## Known Gaps / Backlog

- Drag & Drop between columns to update `statusTag` (remove source, add destination)
- Reduce flicker with in-place DOM updates
- Subtasks/notes rendering
- Sorting by dates/priority
- Bulk operations, keyboard shortcuts
- Delete mode choice (strike vs comments)
- Visual editor for boards/columns
- Performance: virtualization for long columns; worker-based scanning for huge vaults

## Testing Tips

- Use a dev vault with a mix of tasks, tags, and emoji dates.
- Try recurring tasks with the Tasks plugin to confirm multi-line toggle writes.
- Exercise `Rescan Tasks` and check for live updates from watcher.

