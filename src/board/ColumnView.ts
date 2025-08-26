import type { Task } from '../types';
import { renderCard } from './CardView';

export function renderColumn(
  title: string,
  tasks: Task[],
  options?: { hiddenTags?: string[]; showDates?: { due: boolean; scheduled: boolean; created: boolean; completed: boolean }; onToggle?: (t: Task) => void; onJump?: (t: Task) => void; onDelete?: (t: Task) => void; onEdit?: (t: Task) => void; onToggleSubtask?: (t: Task, idx: number) => void }
): HTMLElement {
  const col = createDiv({ cls: 'simple-kanban-column' });
  col.createEl('h4', { text: title });
  for (const t of tasks)
    col.appendChild(
      renderCard(t, { hiddenTags: options?.hiddenTags, showDates: options?.showDates, onToggle: options?.onToggle, onJump: options?.onJump, onDelete: options?.onDelete, onEdit: options?.onEdit, onToggleSubtask: options?.onToggleSubtask })
    );
  return col;
}
