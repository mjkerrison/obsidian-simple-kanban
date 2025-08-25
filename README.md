# Simple Kanban (Obsidian Plugin)

Aggregate your Tasks across the vault into customizable kanban boards with powerful filtering, minimal file edits, and smooth interactions.

## Features

- Board tabs in a main-pane view
- Column and board filtering with boolean logic (AND/OR/NOT, parentheses)
- Cards show title, tag chips, and date footer (➕ created, ⏳ scheduled, 📅 due, ✅ completed)
- Tasks stay in their original notes; minimal edits touch only the task line
- Interactions: complete via Tasks API, Jump-to-source, Edit in Tasks modal, soft Delete (<del>…</del>)
- Completed handling: columns omit completed by default; per-column `showCompleted: true` shows only completed
- Settings include a JSON editor for board definitions and a manual Rescan command

## Quick Start

1. Install requirements in a dev environment:
   - Obsidian desktop, latest version
   - Node.js 18+
   - Tasks plugin enabled in your vault (optional but recommended)
2. Build the plugin:
   - `npm install`
   - `npm run dev` (watches and emits `main.js`)
3. Load in Obsidian:
   - Copy/symlink this folder into your vault at `.obsidian/plugins/obsidian-simple-kanban/`
   - Enable “Simple Kanban” in Obsidian’s Community Plugins
4. Open via command palette: `Open Simple Kanban`

## Tasks Format Supported

- Tasks are standard markdown checkboxes on a single line: `- [ ] Task title`
- Inline tags like `#for/work #in/wip` (chips render; hidden via board `hideFilterTags`)
- Emoji dates on the task line:
  - Created: `➕ YYYY-MM-DD`
  - Scheduled: `⏳ YYYY-MM-DD`
  - Due: `📅 YYYY-MM-DD`
  - Completed: `✅ YYYY-MM-DD` or `✅ YYYY-MM-DD HH:MM`

## Interactions

- Checkbox: toggles via Tasks API (recurring supported); falls back to naive toggle
- Jump: opens the source note at the task’s line
- Edit: opens Tasks modal via `apiV1.editTaskLineModal`; falls back to Jump
- Delete: soft delete by wrapping the line with `<del>…</del>`

## Board Configuration (JSON)

Use Settings → Simple Kanban → Boards (JSON). Click “Load Sample” to start, then Edit and Save.

- Board
  - `id`: string
  - `name`: string
  - `filter`: FilterExpression (board-level)
  - `columns`: Column[]
  - `showCompletedColumn`: boolean (legacy; use `showCompleted` per column instead)
  - `hideFilterTags`: string[] (tags hidden from chips)
  - `showDates`: { `due`: bool, `scheduled`: bool, `created`: bool, `completed`: bool }
- Column
  - `id`: string
  - `name`: string
  - `type`: `"filtered"` (default) | `"completed"` (treated as `showCompleted: true`)
  - `filter`: FilterExpression
  - `statusTag?`: string (for future drag-and-drop updates)
  - `showCompleted?`: boolean (default false = omit completed; true = only completed)

FilterExpression (AST):
- `{ "type": "tag", "value": "#for/work" }`
- `{ "type": "empty" }` (matches tasks with no tags)
- Logical nodes: `and` | `or` | `not` with `children: FilterExpression[]`
- Empty string is treated as match-all (internally `{ type: 'or', children: [] }`).

Example board with contexts and a completed column:

```
[
  {
    "id": "contexts",
    "name": "Contexts",
    "filter": { "type": "or", "children": [] },
    "columns": [
      {
        "id": "contextless",
        "name": "Contextless",
        "type": "filtered",
        "filter": {
          "type": "not",
          "children": [
            {
              "type": "or",
              "children": [
                { "type": "tag", "value": "#for/work" },
                { "type": "tag", "value": "#for/home" },
                { "type": "tag", "value": "#for/hobbies" }
              ]
            }
          ]
        }
      },
      { "id": "work", "name": "Work", "type": "filtered", "filter": { "type": "tag", "value": "#for/work" } },
      { "id": "home", "name": "Home", "type": "filtered", "filter": { "type": "tag", "value": "#for/home" } },
      { "id": "hobbies", "name": "Hobbies", "type": "filtered", "filter": { "type": "tag", "value": "#for/hobbies" } },
      { "id": "completed", "name": "Completed", "type": "filtered", "filter": { "type": "or", "children": [] }, "showCompleted": true }
    ],
    "showCompletedColumn": true,
    "hideFilterTags": ["#for/work", "#for/home", "#for/hobbies"],
    "showDates": { "due": true, "scheduled": true, "created": true, "completed": true }
  }
]
```

More schema detail lives in `docs/boards-json.md`.

## Commands

- `Open Simple Kanban`: Opens the board in the main pane as a tab.
- `Rescan Tasks`: Re-parses all markdown files and refreshes the board.

## Known Limitations

- Minor flicker on rerender as scroll is restored
- Subtasks/indented notes are not displayed
- No sorting controls yet; no bulk operations
- Drag-and-drop between columns not yet implemented (planned via `statusTag`)

## Contributing / Development

See `DEVELOPER.md` for architecture, code map, and how to work on the plugin.

