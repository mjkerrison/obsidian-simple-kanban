import type { Task } from '../types';
import { renderCard } from './CardView';
import { makeDropZone } from './drag';

export function renderColumn(
  title: string,
  tasks: Task[],
  options?: { hiddenTags?: string[]; showDates?: { due: boolean; scheduled: boolean; created: boolean; completed: boolean }; onToggle?: (t: Task) => void; onJump?: (t: Task) => void; onDelete?: (t: Task) => void; onEdit?: (t: Task) => void; onToggleSubtask?: (t: Task, idx: number) => void; dnd?: { enabled: boolean; colId: string; onDrop: (data: { taskId: string; fromColId: string }) => void } }
): HTMLElement {
  const col = createDiv({ cls: 'simple-kanban-column' });
  col.createEl('h4', { text: title });
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
  return col;
}
