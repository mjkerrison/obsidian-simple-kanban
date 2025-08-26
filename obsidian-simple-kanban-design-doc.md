# Obsidian Kanban Plugin Design Document

## 1. Executive Summary

This plugin aggregates tasks from across an Obsidian vault and displays them in customizable kanban boards with advanced filtering capabilities. Unlike existing solutions, it combines the best features of CardBoard (vault-wide task aggregation), Kanban (drag-and-drop), and Task Board (active development), while addressing their individual limitations.

**Key differentiators:**
- Tasks remain in their original notes (no centralized task file)
- Advanced filtering with boolean logic at board and column levels
- Drag-and-drop between columns updates task tags automatically
- Full integration with the Tasks plugin
- Multiple context-based board views

**Tech Stack:** Vanilla TypeScript for Obsidian plugin development

## 2. Core Requirements & Principles

### Design Principles
1. **Minimal footprint** - Edits to one task should only modify that task's line in its file
2. **Real-time synchronization** - Changes in notes reflect immediately on boards
3. **Tasks stay in context** - Tasks remain in their original notes for maximum context
4. **Progressive complexity** - Simple to start, powerful when needed
5. **Obsidian-native** - Use built-in CSS, respect vault themes, integrate with core features

### Target User
Primary user is someone who:
- Uses the Tasks plugin with emoji-based field notation
- Captures tasks in-situ throughout their vault (meeting notes, daily notes, project files)
- Needs different views based on context (work/home/hobbies)
- Values efficiency in task management without leaving Obsidian

### MVP Scope
- Display tasks from across vault in kanban columns
- Drag-and-drop between columns to change status tags
- Click checkbox to complete tasks (via Tasks plugin API)
- Advanced filtering with boolean logic
- Multiple board configurations
- Jump to source note functionality

## 3. Architecture Overview

### High-Level Architecture
```
┌─────────────────────────────────────────────┐
│                  Plugin Core                 │
├──────────────┬──────────────┬───────────────┤
│ Task Scanner │ Board Engine │  UI Renderer  │
├──────────────┼──────────────┼───────────────┤
│ File Watcher │ Data Store   │ Drag Handler  │
├──────────────┴──────────────┴───────────────┤
│            Obsidian Plugin API               │
└─────────────────────────────────────────────┘
```

### Component Responsibilities

**Task Scanner**
- Parses markdown files for tasks matching format: `- [ ] Task text`
- Extracts task metadata (tags, dates, subtasks)
- Creates unique task IDs from filepath + line number

**File Watcher**
- Monitors vault for file changes
- Triggers incremental updates to task list
- Handles file renames/moves/deletions

**Data Store**
- In-memory cache of parsed tasks
- Board configurations from plugin settings
- Manages task-to-column mapping

**Board Engine**
- Applies filtering logic to tasks
- Determines which tasks appear in which columns
- Handles task sorting within columns

**UI Renderer**
- Renders board views with tabs
- Creates draggable cards
- Handles board switching

**Drag Handler**
- Manages drag-and-drop interactions
- Updates task tags on drop
- Writes changes back to source files

## 4. Data Model

### TypeScript Interfaces

```typescript
// Core task representation
interface Task {
  id: string;           // Format: "filepath:lineNumber"
  filepath: string;     // Path to source file
  lineNumber: number;   // Line in source file
  text: string;         // Main task text
  isComplete: boolean;  
  tags: string[];       // All tags on the task
  subtasks: Subtask[];  // Nested tasks
  notes: string[];      // Non-task indented content
  
  // Tasks plugin fields (optional)
  dueDate?: string;     // Format: YYYY-MM-DD
  scheduledDate?: string;
  createdDate?: string;
  completedDate?: string;
  priority?: number;
  recurrence?: string;
  
  // Manual ordering (future feature)
  orderValue?: number;  // For fractional ordering
}

interface Subtask {
  text: string;
  isComplete: boolean;
  tags: string[];
}

// Board configuration
interface Board {
  id: string;
  name: string;
  filter: FilterExpression;  // Board-level filter
  columns: Column[];
  
  // Display settings
  hideFilterTags: string[];  // Tags to hide from cards
  showDates: {
    due: boolean;
    scheduled: boolean;
    created: boolean;
    completed: boolean;
  };
}

interface Column {
  id: string;
  name: string;
  filter: FilterExpression;
  type: 'filtered' | 'completed';  // 'completed' is special column
}

// Filtering system
interface FilterExpression {
  type: 'and' | 'or' | 'not' | 'tag' | 'empty';
  value?: string;  // For 'tag' type
  children?: FilterExpression[];  // For logical operators
}

// Plugin settings
interface PluginSettings {
  boards: Board[];
}
```

## 5. Feature Specifications

### MVP Features ✅

#### Task Detection & Display
- Scan vault for tasks in format `- [ ] Task text`
- Display tasks as cards with:
  - Checkbox for completion
  - Task text
  - Subtasks and notes (indented content)
  - Tags (as chips, configurable visibility)
  - Dates (due, scheduled, created, completed - when present)
- Real-time updates when source files change

#### Board Management
- Multiple board configurations stored in plugin settings
- Board-level filtering with boolean logic
- Column-level filtering with boolean logic
- Tab-based board switching
- Settings UI for board configuration

#### Drag and Drop
- Drag cards between columns
- Automatically update status tags on drop
- Remove source column tag, add destination column tag
- Immediate file update on drop

#### Task Actions
- **Complete**: Check/uncheck via Tasks plugin API
- **Jump to source**: Open note in new tab at task line
- **Edit**: Open Tasks plugin modal (via API)
- **Delete**: Wrap task in `<del>` tags or comment out

#### Filtering System
- Support for boolean operators: AND, OR, NOT
- Tag-based filtering: `#work AND NOT #someday`
- Parentheses for grouping: `(#work OR #personal) AND #urgent`
- Special case for untagged tasks (empty filter)

### Future Enhancements 🔮

#### Manual Ordering
- Drag to reorder within columns
- Fractional ordering system (1, 1.5, 1.75...)
- Persist order with emoji marker: `↕️ 1.5`
- Handle edge cases (start/end of list)

#### Advanced Features
- Sort by date within columns
- Keyboard shortcuts
- Bulk operations
- Task templates
- Time tracking integration
- Custom card layouts
- Export capabilities

## 6. Implementation Modules

Implement in this order for incremental development:

### Phase 1: Core Infrastructure
1. **Plugin scaffold** - Basic Obsidian plugin structure
2. **Settings management** - Load/save plugin settings with board configs
3. **Task parser** - Extract tasks from markdown files
4. **Data store** - In-memory task cache

### Phase 2: Basic Display
5. **Board view** - Render board with columns
6. **Card renderer** - Display task cards with basic info
7. **Tab system** - Switch between multiple boards
8. **Settings UI** - Add/edit/delete boards and columns

### Phase 3: Filtering
9. **Filter parser** - Convert filter strings to AST
10. **Filter engine** - Apply filters to task list
11. **Board filtering** - Apply board-level filters
12. **Column filtering** - Apply column-level filters

### Phase 4: File Watching
13. **File watcher** - Monitor vault for changes
14. **Incremental updates** - Update only changed tasks
15. **Performance optimization** - Debouncing, caching

### Phase 5: Interactivity
16. **Checkbox handler** - Complete tasks via Tasks API
17. **Jump to source** - Open note at task line
18. **Edit modal** - Trigger Tasks plugin editor
19. **Delete handler** - Comment out or wrap in `<del>`

### Phase 6: Drag and Drop
20. **Drag initialization** - Make cards draggable
21. **Drop zones** - Define column drop areas
22. **Tag updater** - Modify task tags on drop
23. **File writer** - Update source file with changes

## 7. Key Algorithms

### Filter Expression Evaluator

```typescript
// Pseudocode for filter evaluation
function evaluateFilter(task: Task, filter: FilterExpression): boolean {
  switch (filter.type) {
    case 'tag':
      return task.tags.includes(filter.value);
    
    case 'empty':
      return task.tags.length === 0;
    
    case 'and':
      return filter.children.every(child => 
        evaluateFilter(task, child)
      );
    
    case 'or':
      return filter.children.some(child => 
        evaluateFilter(task, child)
      );
    
    case 'not':
      return !evaluateFilter(task, filter.children[0]);
  }
}
```

### Filter String Parser

```typescript
// Parse filter strings like "#work AND NOT #someday"
// Returns FilterExpression AST
function parseFilterString(input: string): FilterExpression {
  // Tokenize: identify operators (AND, OR, NOT), tags, parentheses
  // Build AST respecting operator precedence: NOT > AND > OR
  // Handle parentheses for explicit grouping
  // Return root FilterExpression node
}
```

### Fractional Ordering (Future)

```typescript
// Generate order value between two tasks
function getOrderBetween(before?: number, after?: number): number {
  if (!before && !after) return 1.0;
  if (!before) return after - 1.0;
  if (!after) return before + 1.0;
  return (before + after) / 2.0;
}

// Rebalance if precision becomes problematic
function shouldRebalance(orders: number[]): boolean {
  // Check if differences between consecutive orders < threshold
  // Return true if rebalancing needed
}
```

### Task ID Management

```typescript
// Generate unique, stable task ID
function getTaskId(filepath: string, lineNumber: number): string {
  return `${filepath}:${lineNumber}`;
}

// Handle line number changes
function updateTaskLocation(oldId: string, newPath: string, newLine: number): void {
  // Treat as delete + create
  // Remove old ID from cache
  // Add new ID to cache
  // UI will reflect change automatically
}
```

## 8. UI/UX Specifications

### Visual Design
- Use Obsidian's native CSS variables for theming
- Minimal custom styling - inherit from vault theme
- Card structure:
  ```
  ┌─────────────────────────┐
  │ □ Task Title            │
  │   □ Subtask 1           │
  │   □ Subtask 2           │
  │   • Note text           │
  │ [#tag1] [#tag2]         │
  │ 📅 2025-08-26           │
  │                    [✏️][🗑️]│
  └─────────────────────────┘
  ```

### Responsive Design
- Desktop: Multi-column with horizontal scroll if needed
- Mobile: Single column with swipe between columns
- Touch-friendly tap targets for mobile

### Interaction Patterns
- **Drag**: Visual feedback with opacity change
- **Drop**: Highlight valid drop zones
- **Hover**: Show action buttons (edit, delete, jump)
- **Click checkbox**: Immediate visual feedback
- **Tab switching**: Smooth transition between boards

### Board Layout
```
┌──────────────────────────────────────┐
│ [Work] [Home] [Hobbies]              │ ← Board tabs
├──────────────────────────────────────┤
│ Backlog │   WIP   │ Blocked │ Done  │ ← Columns
│ ┌─────┐ │ ┌─────┐ │ ┌─────┐ │ ┌─────┐│
│ │Card1│ │ │Card4│ │ │Card6│ │ │Card7││
│ └─────┘ │ └─────┘ │ └─────┘ │ └─────┘│
│ ┌─────┐ │ ┌─────┐ │         │       │
│ │Card2│ │ │Card5│ │         │       │
│ └─────┘ │ └─────┘ │         │       │
│ ┌─────┐ │         │         │       │
│ │Card3│ │         │         │       │
│ └─────┘ │         │         │       │
└──────────────────────────────────────┘
```

## 9. Testing Considerations

### Test Data Requirements
- Vault with various task formats
- Tasks with different emoji fields
- Nested subtasks and notes
- Edge cases: malformed tasks, special characters

### Critical Test Scenarios
1. **File operations**: Create, edit, delete, rename files with tasks
2. **Concurrent edits**: Board open while editing source file
3. **Large vaults**: Performance with 1000+ tasks
4. **Filter complexity**: Nested boolean expressions
5. **Drag and drop**: Between columns, to empty columns
6. **Task completion**: Via board and via source file
7. **Line number changes**: Adding/removing lines above tasks

### Performance Benchmarks
- Initial scan: < 2 seconds for 1000 tasks
- Update latency: < 100ms for single task change
- Drag feedback: Immediate (< 16ms)
- Memory usage: Linear with task count

## 10. Appendix: Context & Decisions

### Why Not Use Existing Plugins?

**CardBoard** (Elm-based)
- ✅ Aggregates tasks from entire vault
- ✅ Jumps to exact line in source
- ❌ No drag and drop
- ❌ Can't edit tasks from board
- ❌ Written in Elm (maintenance burden)
- ❌ Not actively developed

**Kanban** (TypeScript/React)
- ✅ Excellent drag and drop
- ✅ Edit task text directly
- ❌ All tasks in single file
- ❌ Limited Tasks plugin support
- ❌ No vault-wide aggregation

**Task Board** (JavaScript)
- ✅ Under active development
- ✅ Attempting to merge best features
- ❌ Not yet feature-complete
- ❌ Basic filtering only

### Key Design Decisions

**Why TypeScript over Elm?**
- Mainstream language understood by coding agents
- Better ecosystem and tooling
- Easier maintenance and contribution
- Direct Obsidian API access

**Why filepath:line as task ID?**
- Guarantees uniqueness (no two tasks on same line)
- Survives content edits
- Simple to implement
- Natural mapping to source location

**Why minimal footprint principle?**
- Reduces chance of conflicts
- Faster updates
- Cleaner version control diffs
- Preserves user's formatting

**Why boolean filter syntax over JavaScript functions?**
- Safer (no arbitrary code execution)
- Easier to validate and debug
- Sufficient for use cases
- Simpler UI for configuration

**Why no task creation from board?**
- Maintains note-first workflow
- Tasks need context from their notes
- Simplifies implementation
- Reduces UI complexity

### Future Considerations

**Fractional Ordering Challenge**
After many reorderings, fractional values may need too much precision. Solutions:
- Periodic rebalancing when precision threshold reached
- Lexicographic ordering as alternative
- Timestamp-based ordering as fallback

**Performance Optimization Opportunities**
- Virtualized scrolling for long columns
- Web Workers for parsing large vaults
- Incremental rendering
- Smart caching based on file modification times

**Potential Integrations**
- Calendar plugins for date-based views
- Time tracking plugins
- External task systems (Todoist, etc.)
- AI-powered task prioritization
