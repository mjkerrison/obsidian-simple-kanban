import type { Task } from '../types';
import { renderCard } from './CardView';
import { makeDropZone } from './drag';
import { setIcon } from 'obsidian';

interface ColumnOptions {
  hiddenTags?: string[];
  showDates?: { due: boolean; scheduled: boolean; created: boolean; completed: boolean };
  onToggle?: (t: Task) => void;
  onJump?: (t: Task) => void;
  onDelete?: (t: Task) => void;
  onEdit?: (t: Task) => void;
  onToggleSubtask?: (t: Task, idx: number) => void;
  dnd?: { enabled: boolean; colId: string; onDrop: (data: { taskId: string; fromColId: string }) => void };
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function renderColumn(
  title: string,
  tasks: Task[],
  options?: ColumnOptions
): HTMLElement {
  const col = createDiv({ cls: 'simple-kanban-column' });
  const isCollapsed = options?.collapsed ?? false;

  if (isCollapsed) {
    col.addClass('is-collapsed');
    // Collapsed column: narrow vertical strip with rotated title
    const header = col.createDiv({ cls: 'simple-kanban-column-collapsed-header' });

    // Expand icon at top
    const expandIcon = header.createDiv({ cls: 'simple-kanban-collapse-icon clickable-icon' });
    setIcon(expandIcon, 'chevron-right');
    expandIcon.setAttr('aria-label', 'Expand column');
    if (options?.onToggleCollapse) {
      expandIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onToggleCollapse!();
      });
    }

    // Vertical rotated title with task count
    const titleEl = header.createDiv({ cls: 'simple-kanban-column-title-vertical' });
    titleEl.setText(`${title} (${tasks.length})`);

    // Click on title also expands
    titleEl.addEventListener('click', (e) => {
      e.stopPropagation();
      options?.onToggleCollapse?.();
    });

    // Still a valid drop target when collapsed
    if (options?.dnd?.enabled) {
      col.addClass('is-droppable');
      makeDropZone(col, { onDrop: options.dnd.onDrop });
    }
  } else {
    // Normal expanded column
    const header = col.createDiv({ cls: 'simple-kanban-column-header' });

    // Collapse icon
    if (options?.onToggleCollapse) {
      const collapseIcon = header.createDiv({ cls: 'simple-kanban-collapse-icon clickable-icon' });
      setIcon(collapseIcon, 'chevron-left');
      collapseIcon.setAttr('aria-label', 'Collapse column');
      collapseIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        options.onToggleCollapse!();
      });
    }

    // Title
    header.createEl('h4', { text: `${title} (${tasks.length})` });

    if (options?.dnd?.enabled) {
      col.addClass('is-droppable');
      makeDropZone(col, { onDrop: options.dnd.onDrop });
    }

    for (const t of tasks) {
      col.appendChild(
        renderCard(t, {
          hiddenTags: options?.hiddenTags,
          showDates: options?.showDates,
          onToggle: options?.onToggle,
          onJump: options?.onJump,
          onDelete: options?.onDelete,
          onEdit: options?.onEdit,
          onToggleSubtask: options?.onToggleSubtask,
          drag: options?.dnd?.enabled ? { enabled: true, fromColId: options.dnd.colId } : undefined,
        })
      );
    }
  }

  return col;
}
