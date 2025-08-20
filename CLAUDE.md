# Obsidian Simple Kanban Plugin - Development Guide

## Project Overview

Building a kanban plugin for Obsidian that aggregates tasks from across the vault and displays them in customizable boards with advanced filtering. This combines the best features of existing plugins: CardBoard (vault-wide aggregation), Kanban (drag-and-drop), and Task Board (active development).

## Key Files

- `obsidian-simple-kanban-design-doc.md` - Complete technical specification with architecture, data models, and implementation phases
- `additional-conversation-context.md` - Detailed discussion log with design decisions and rationale

## Core Principles

1. **Minimal footprint** - Edits to one task should only modify that task's line in its file
2. **Real-time synchronization** - Changes in notes reflect immediately on boards  
3. **Tasks stay in context** - Tasks remain in their original notes for maximum context
4. **Progressive complexity** - Simple to start, powerful when needed
5. **Obsidian-native** - Use built-in CSS, respect vault themes, integrate with core features

## Tech Stack Decision

**Vanilla TypeScript** - Recommended over React/Svelte/Elm for:
- Better coding agent understanding
- Direct Obsidian API access
- Simpler maintenance and extension
- Easier debugging

## Task Identity System

Tasks are uniquely identified by `filepath:lineNumber` format:
- Guarantees uniqueness (no two tasks on same line)
- Survives content edits
- Natural mapping to source location
- Handles file renames/moves as delete + create

## Implementation Phases

### Phase 1: Core Infrastructure
1. Plugin scaffold - Basic Obsidian plugin structure
2. Settings management - Load/save `data.json` with board configs
3. Task parser - Extract tasks from markdown files
4. Data store - In-memory task cache

### Phase 2: Basic Display  
5. Board view - Render board with columns
6. Card renderer - Display task cards with basic info
7. Tab system - Switch between multiple boards
8. Settings UI - Add/edit/delete boards and columns

### Phase 3: Filtering
9. Filter parser - Convert filter strings to AST
10. Filter engine - Apply filters to task list
11. Board filtering - Apply board-level filters
12. Column filtering - Apply column-level filters

### Phase 4: File Watching
13. File watcher - Monitor vault for changes
14. Incremental updates - Update only changed tasks
15. Performance optimization - Debouncing, caching

### Phase 5: Interactivity
16. Checkbox handler - Complete tasks via Tasks API
17. Jump to source - Open note at task line
18. Edit modal - Trigger Tasks plugin editor
19. Delete handler - Comment out or wrap in `<del>`

### Phase 6: Drag and Drop
20. Drag initialization - Make cards draggable
21. Drop zones - Define column drop areas
22. Tag updater - Modify task tags on drop
23. File writer - Update source file with changes

## Key Features

### Task Detection
- Format: `- [ ] Task text` 
- Extracts tags, dates, subtasks
- Integrates with Tasks plugin emoji notation
- Real-time updates on file changes

### Board Management
- Multiple board configurations in `data.json`
- Tab-based board switching
- Board-level and column-level filtering with boolean logic
- Support for `#tag AND NOT #othertag` syntax

### Drag and Drop
- Drag cards between columns updates status tags automatically
- Remove source column tag, add destination column tag
- Immediate file update on drop
- Future: Manual ordering within columns using fractional system

### Task Actions
- **Complete**: Check/uncheck via Tasks plugin API
- **Jump to source**: Open note in new tab at task line  
- **Edit**: Open Tasks plugin modal
- **Delete**: Wrap in `<del>` tags or comment out

### Card Content
- Task text with checkbox
- Subtasks and notes (indented content)
- Tags as chips (configurable visibility)
- Dates in Tasks format when present
- Action buttons (edit, delete, jump)

## Integration Requirements

### Tasks Plugin Integration
- Use Tasks API: `executeToggleTaskDoneCommand(line, path)`
- Support all Tasks emoji fields (due dates, priorities, etc.)
- Maintain Tasks plugin completion behavior

### Obsidian Integration
- Use native CSS variables for theming
- Respect vault themes
- File watcher using Obsidian events
- Store settings in `data.json`

## Data Storage

- Board configurations in plugin's `data.json`
- Tasks remain in original markdown files
- Manual ordering (future): `↕️ 1.5` emoji marker in task text
- No centralized task file

## Performance Considerations

- In-memory cache of parsed tasks
- Incremental updates on file changes
- Debounced scanning for large vaults
- Target: < 2s initial scan for 1000 tasks, < 100ms update latency

## Future Enhancements

- Manual ordering with drag-to-reorder within columns
- Sort by date within columns
- Keyboard shortcuts
- Bulk operations
- Custom card layouts
- Export capabilities

## Development Commands

(To be determined - check for package.json scripts like `npm run dev`, `npm run build`, etc.)

## Testing Strategy

Critical scenarios to test:
- File operations (create, edit, delete, rename)
- Concurrent edits (board open while editing source file)
- Large vaults (1000+ tasks performance)
- Complex filter expressions
- Drag and drop between columns
- Task completion via board and source file
- Line number changes when adding/removing lines above tasks