export interface Subtask {
  text: string;
  isComplete: boolean;
  tags: string[];
}

export interface Task {
  id: string; // "filepath:lineNumber"
  filepath: string;
  lineNumber: number;
  text: string;
  isComplete: boolean;
  tags: string[];
  subtasks: Subtask[];
  notes: string[];

  // Tasks plugin fields (optional)
  dueDate?: string; // YYYY-MM-DD
  scheduledDate?: string;
  createdDate?: string;
  completedDate?: string;
  priority?: number;
  recurrence?: string;

  // Manual ordering (future)
  orderValue?: number;
}

export type ColumnType = 'filtered' | 'completed';

export interface FilterExpression {
  type: 'and' | 'or' | 'not' | 'tag' | 'empty';
  value?: string; // for 'tag'
  children?: FilterExpression[];
}

export interface Column {
  id: string;
  name: string;
  filter: FilterExpression;
  type: ColumnType;
  // Optional tag this column represents for DnD updates
  statusTag?: string;
  // Show only completed tasks in this column (default: false = omit completed)
  showCompleted?: boolean;
}

export interface Board {
  id: string;
  name: string;
  filter: FilterExpression;
  columns: Column[];
  showCompletedColumn: boolean;

  // Display settings
  hideFilterTags: string[];
  showDates: {
    due: boolean;
    scheduled: boolean;
    created: boolean;
    completed: boolean;
  };
}

export interface PluginSettings {
  boards: Board[];
  scanInterval: number;
  ignorePaths: string[];
  completionFormat: 'tasks' | 'dataview' | 'cardboard' | 'none';
  useUTC: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  boards: [],
  scanInterval: 2000,
  ignorePaths: ['.obsidian/', 'node_modules/'],
  completionFormat: 'tasks',
  useUTC: true,
};
