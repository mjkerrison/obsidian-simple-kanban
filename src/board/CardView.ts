import type { Task } from '../types';
import { setIcon } from 'obsidian';

type DateToggles = { due: boolean; scheduled: boolean; created: boolean; completed: boolean };

export function renderCard(
  task: Task,
  options?: { hiddenTags?: string[]; showDates?: DateToggles; onToggle?: (t: Task) => void; onJump?: (t: Task) => void; onEdit?: (t: Task) => void; onDelete?: (t: Task) => void; onToggleSubtask?: (t: Task, idx: number) => void }
): HTMLElement {
  const el = createDiv({ cls: 'simple-kanban-card' });
  const header = el.createEl('div');
  const checkbox = header.createEl('input', { attr: { type: 'checkbox' } });
  checkbox.checked = task.isComplete;
  if (options?.onToggle) {
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      options.onToggle!(task);
    });
  }
  const cleanText = stripDecorationsForDisplay(task.text);
  header.createEl('span', { cls: 'simple-kanban-title', text: ` ${cleanText}` });

  // Subtasks (read-only checkboxes) and notes
  if (task.subtasks && task.subtasks.length > 0) {
    const subs = el.createDiv({ cls: 'simple-kanban-subtasks' });
    task.subtasks.forEach((st, idx) => {
      const row = subs.createDiv({ cls: 'simple-kanban-subtask' });
      if (st.isComplete) row.addClass('is-complete');
      const cb = row.createEl('input', { attr: { type: 'checkbox' } });
      cb.checked = st.isComplete;
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        options?.onToggleSubtask && options.onToggleSubtask(task, idx);
      });
      row.createEl('span', { text: ` ${stripDecorationsForDisplay(st.text)}` });
    });
  }
  if (task.notes && task.notes.length > 0) {
    const notes = el.createDiv({ cls: 'simple-kanban-notes' });
    for (const n of task.notes) {
      const li = notes.createDiv({ cls: 'simple-kanban-note' });
      li.setText(n);
    }
  }
  // Footer placeholder
  const tagsWrap = el.createDiv({ cls: 'simple-kanban-tags' });
  const hidden = new Set(options?.hiddenTags ?? []);
  for (const tag of task.tags) {
    if (hidden.has(tag)) continue;
    tagsWrap.createSpan({ cls: 'simple-kanban-tag', text: tag });
  }

  // Dates footer
  const show = options?.showDates ?? { due: true, scheduled: true, created: true, completed: true };
  const dates = el.createDiv({ cls: 'simple-kanban-dates' });
  if (show.created && task.createdDate) {
    dates.createSpan({ cls: 'simple-kanban-date', text: `➕ ${task.createdDate}` });
  }
  if (show.scheduled && task.scheduledDate) {
    dates.createSpan({ cls: 'simple-kanban-date', text: `⏳ ${task.scheduledDate}` });
  }
  if (show.due && task.dueDate) {
    const dueEl = dates.createSpan({ cls: 'simple-kanban-date', text: `📅 ${task.dueDate}` });
    if (!task.isComplete && isOverdue(task.dueDate)) {
      dueEl.addClass('is-overdue');
    }
  }
  if (show.completed && task.completedDate) {
    dates.createSpan({ cls: 'simple-kanban-date', text: `✅ ${task.completedDate}` });
  }

  // Actions (bottom-right): Jump / Edit / Delete
  const actions = el.createDiv({ cls: 'simple-kanban-actions' });
  if (options?.onJump) {
    const jump = actions.createDiv({ cls: 'simple-kanban-action-icon clickable-icon' });
    setIcon(jump, 'external-link');
    jump.setAttr('aria-label', 'Open at source');
    jump.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onJump!(task);
    });
  }
  if (options?.onEdit) {
    const edit = actions.createDiv({ cls: 'simple-kanban-action-icon clickable-icon' });
    setIcon(edit, 'pencil');
    edit.setAttr('aria-label', 'Edit task');
    edit.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onEdit!(task);
    });
  }
  if (options?.onDelete) {
    const del = actions.createDiv({ cls: 'simple-kanban-action-icon clickable-icon' });
    setIcon(del, 'trash');
    del.setAttr('aria-label', 'Delete task');
    del.addEventListener('click', (e) => {
      e.stopPropagation();
      options.onDelete!(task);
    });
  }
  return el;
}

function stripDecorationsForDisplay(text: string): string {
  // strip inline tags and any date emojis
  let out = text.replace(/(^|\s)#[\w\/-]+/g, ' ');
  out = out.replace(/\s[➕⏳📅✅]\s\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?/g, ' ');
  return out.replace(/\s{2,}/g, ' ').trim();
}

function isOverdue(isoDate: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const todayIso = `${y}-${m}-${d}`;
  return isoDate < todayIso;
}
