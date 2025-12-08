# Simple Kanban (Obsidian Plugin)

Aggregate your Tasks across the vault into customizable kanban boards with powerful filtering, minimal file edits, and smooth interactions.

## Features

- Board tabs in a main-pane view
- Column and board filtering with boolean logic (AND/OR/NOT, parentheses)
- Cards show title, tag chips, date footer (➕ created, ⏳ scheduled, 📅 due, ✅ completed), and any subtasks/child notes
- Tasks stay in their original notes; minimal edits touch only the task line
- Interactions: complete via Tasks API, Jump-to-source, Edit in Tasks modal, soft Delete (<del>…</del>), and drag-and-drop between status columns
- Completed handling: columns omit completed by default; per-column `showCompleted: true` shows only completed
- Visual settings GUI for boards and columns with bidirectional JSON sync for power users

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

## Board Configuration

Open Settings → Simple Kanban to configure your boards. Two editing modes are available:

### GUI Editor (recommended)

The visual editor lets you create and modify boards without writing JSON:

- **Add/delete boards** with collapsible sections for each
- **Configure board settings**: name, filter, hidden tags, which dates to show
- **Add/delete/reorder columns** with ↑/↓ buttons
- **Configure column settings**: name, filter, status tag (for drag-drop), sort options
- **Filter syntax**: Use text like `#tag`, `#a AND #b`, `#a OR NOT #b` — validated as you type
- Click **Save Changes** to apply

### JSON Editor (advanced)

Switch to the JSON tab for direct editing. Useful for bulk changes or copying configs between vaults.

- **Load from GUI**: Populate JSON from current GUI state
- **Apply JSON to GUI**: Parse JSON and update the visual editor
- **Load Sample**: Get a starter configuration

Both editors stay in sync — changes in one can be loaded into the other.

### Schema Reference

- Board
  - `id`: string
  - `name`: string
  - `filter`: FilterExpression (board-level)
  - `columns`: Column[]
  - `hideFilterTags`: string[] (tags hidden from chips)
  - `showDates`: { `due`: bool, `scheduled`: bool, `created`: bool, `completed`: bool }
- Column
  - `id`: string
  - `name`: string
  - `type`: `"filtered"` (default) | `"completed"` (treated as `showCompleted: true`)
  - `filter`: FilterExpression
  - `statusTag?`: string (used by drag-and-drop to represent this column's status tag)
  - `showCompleted?`: boolean (default false = omit completed; true = only completed)
  - `sort?`: `{ key: 'due'|'scheduled'|'created'|'completed'|'title', direction: 'asc'|'desc' }`
    - Missing dates sort last; ties fall back to `title` asc

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
      { "id": "home", "name": "Home", "type": "filtered", "filter": { "type": "tag", "value": "#for/home" }, "sort": { "key": "due", "direction": "asc" } },
      { "id": "hobbies", "name": "Hobbies", "type": "filtered", "filter": { "type": "tag", "value": "#for/hobbies" } },
      { "id": "completed", "name": "Completed", "type": "filtered", "filter": { "type": "or", "children": [] }, "showCompleted": true, "sort": { "key": "completed", "direction": "desc" } }
    ],
    "hideFilterTags": ["#for/work", "#for/home", "#for/hobbies"],
    "showDates": { "due": true, "scheduled": true, "created": true, "completed": true }
  }
]
```

More schema detail lives in `docs/boards-json.md`.

## Drag and Drop

- Drag a card into another column to change its status tag.
- Requirements: both source and destination columns must define `statusTag`.
- Completed-only columns (`showCompleted: true` or `type: "completed"`) are not droppable.
- Only top-level tasks are draggable (subtasks are not).
- Only the board’s `statusTag`s are modified; other tags (e.g., `#todo`) are preserved.
- Drag-and-drop does not change completion state; use the checkbox to complete.

## Global Task Filter

To align with Tasks plugin behavior, you can restrict which checklist items are treated as tasks at all:

- Settings → Simple Kanban → Global task tags: enter tags (comma‑separated) like `#todo, #task`.
- When set, only top‑level checklist items containing at least one of these tags are included.
- Subtasks and child notes remain visible under included parent tasks.
- Leave empty to include all top‑level tasks.

## Commands

- `Open Simple Kanban`: Opens the board in the main pane as a tab.
- `Rescan Tasks`: Re-parses all markdown files and refreshes the board.

## Known Limitations

- Minor flicker on rerender as scroll is restored
- Subtasks and child notes are displayed on cards; subtasks support inline toggling
- No bulk operations; limited sorting controls are per-column only

## Contributing / Development

See `DEVELOPER.md` for architecture, code map, and how to work on the plugin.
