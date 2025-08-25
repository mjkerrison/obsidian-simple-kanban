# Boards JSON Reference

Simple Kanban stores board definitions in plugin data and lets you edit them as JSON in Settings. This document explains the schema, examples, and tips.

## Top-Level Structure

The settings field is an array of boards:

```
[
  { /* Board */ },
  { /* Board */ }
]
```

## Board

- `id` (string): Unique identifier
- `name` (string): Display name
- `filter` (FilterExpression): Board-level filter applied before column filters
- `columns` (Column[]): Columns rendered left → right
- `showCompletedColumn` (boolean): Legacy toggle; prefer `showCompleted` on columns
- `hideFilterTags` (string[]): Tags hidden from card chips
- `showDates` (object): Toggle date chips in the footer
  - `created` (boolean)
  - `scheduled` (boolean)
  - `due` (boolean)
  - `completed` (boolean)

## Column

- `id` (string)
- `name` (string)
- `type` ("filtered" | "completed"): `completed` is treated as `showCompleted: true`
- `filter` (FilterExpression): Column-level filter
- `statusTag?` (string): Tag this column represents (for future drag-and-drop)
- `showCompleted?` (boolean):
  - `false` (default): omit completed tasks
  - `true`: only show completed tasks

## FilterExpression (AST)

Filter expressions are JSON trees. Supported node types:

- `{"type":"tag","value":"#for/work"}`
- `{"type":"empty"}`
- Logical nodes with `children`:
  - `{"type":"and","children":[ ... ]}`
  - `{"type":"or","children":[ ... ]}`
  - `{"type":"not","children":[ expr ]}`

Notes:
- An empty filter is treated as match-all (internally `{"type":"or","children":[]}`)
- `empty` matches tasks with no tags on the task line

## Examples

### Contexts Board

```
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
  "showDates": { "created": true, "scheduled": true, "due": true, "completed": true }
}
```

### Status Board (backlog / wip / blocked)

```
{
  "id": "status",
  "name": "Status",
  "filter": { "type": "or", "children": [] },
  "columns": [
    { "id": "backlog", "name": "Backlog", "type": "filtered", "filter": { "type": "tag", "value": "#in/backlog" }, "statusTag": "#in/backlog" },
    { "id": "wip", "name": "WIP", "type": "filtered", "filter": { "type": "tag", "value": "#in/wip" }, "statusTag": "#in/wip" },
    { "id": "blocked", "name": "Blocked", "type": "filtered", "filter": { "type": "tag", "value": "#in/blocked" }, "statusTag": "#in/blocked" },
    { "id": "done", "name": "Done", "type": "filtered", "filter": { "type": "or", "children": [] }, "showCompleted": true }
  ],
  "showCompletedColumn": true,
  "hideFilterTags": ["#todo", "#in/backlog", "#in/wip", "#in/blocked"],
  "showDates": { "created": true, "scheduled": true, "due": true, "completed": true }
}
```

## Tips

- Keep board-level filters broad (often match-all), and use columns for specific slices.
- Hide structural tags in `hideFilterTags` so cards are focused.
- Use a Completed column with `showCompleted: true` to review what’s done.
- For future drag-and-drop, add `statusTag` to columns where moving should change a tag.

