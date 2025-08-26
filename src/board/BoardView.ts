import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { Board, Task } from '../types';
import { renderColumn } from './ColumnView';
import { dataStore } from '../dataStore';

export const VIEW_TYPE_KANBAN = 'simple-kanban-view';

export class BoardView extends ItemView {
  private board: Board | null = null;
  private tasksByColumn: Map<string, Task[]> = new Map();
  private onSelectBoard: ((board: Board) => void) | null = null;
  private onToggle: ((t: Task) => void) | null = null;
  private onJump: ((t: Task) => void) | null = null;
  private onDelete: ((t: Task) => void) | null = null;
  private onEdit: ((t: Task) => void) | null = null;
  private onToggleSubtask: ((t: Task, idx: number) => void) | null = null;
  private lastScrollLeft = 0;
  private lastScrollTop = 0;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE_KANBAN;
  }

  getDisplayText(): string {
    return this.board?.name ?? 'Simple Kanban';
  }

  setBoard(board: Board) {
    this.board = board;
  }

  setData(tasksByColumn: Map<string, Task[]>) {
    this.tasksByColumn = tasksByColumn;
  }

  setState(board: Board, tasksByColumn: Map<string, Task[]>) {
    this.board = board;
    this.tasksByColumn = tasksByColumn;
    this.render();
  }

  refresh() {
    this.render();
  }

  async onOpen() {
    // Track scroll positions to preserve UX across rerenders
    this.contentEl.addEventListener('scroll', () => {
      this.lastScrollTop = this.contentEl.scrollTop;
    });
    this.render();
  }

  async onClose() {
    this.contentEl.empty();
  }

  private render() {
    const { contentEl } = this;
    // Preserve scroll position across rerenders (capture from current DOM)
    const prevRoot = contentEl.querySelector('.simple-kanban') as HTMLElement | null;
    const prevRootScrollLeft = prevRoot?.scrollLeft ?? this.lastScrollLeft;
    const prevScrollTop = contentEl.scrollTop ?? this.lastScrollTop;
    // capture positions; avoid noisy logs in normal use
    contentEl.empty();
    // Tabs
    const tabs = contentEl.createDiv({ cls: 'simple-kanban-tabs' });
    const boards = dataStore.getBoards();
    if (boards.length > 0) {
      for (const b of boards) {
        const tab = tabs.createDiv({ cls: 'simple-kanban-tab', text: b.name });
        if (this.board && b.id === this.board.id) tab.addClass('is-active');
        tab.addEventListener('click', () => {
          this.onSelectBoard && this.onSelectBoard(b);
        });
      }
    } else {
      tabs.createDiv({ cls: 'simple-kanban-tab is-active', text: this.board?.name ?? 'Default' });
    }
    const root = contentEl.createDiv({ cls: 'simple-kanban' });
    if (!this.board) {
      root.createEl('div', { text: 'No board selected.' });
      return;
    }
    let total = 0;
    const columns = Array.isArray((this.board as any).columns) ? (this.board as any).columns : [];
    for (const col of columns) {
      const tasks = this.tasksByColumn.get(col.id) ?? [];
      total += tasks.length;
      const title = `${col.name} (${tasks.length})`;
      root.appendChild(
        renderColumn(title, tasks, {
          hiddenTags: this.board.hideFilterTags,
          showDates: this.board.showDates,
          onToggle: this.onToggle ?? undefined,
          onJump: this.onJump ?? undefined,
          onDelete: this.onDelete ?? undefined,
          onEdit: this.onEdit ?? undefined,
          onToggleSubtask: this.onToggleSubtask ?? undefined,
        })
      );
    }
    if (total === 0) {
      const empty = contentEl.createDiv();
      empty.setText('No tasks found. Try rescanning or adjusting filters.');
      empty.addClass('setting-item-description');
    }

    // Restore scroll after DOM updates
    const restore = () => {
      root.scrollLeft = prevRootScrollLeft;
      contentEl.scrollTop = prevScrollTop;
      this.lastScrollLeft = root.scrollLeft;
      this.lastScrollTop = contentEl.scrollTop;
      // restored
      // Track horizontal scroll on root
      root.addEventListener('scroll', () => {
        this.lastScrollLeft = root.scrollLeft;
      });
    };
    // Sometimes a single frame is not enough; restore twice
    requestAnimationFrame(() => requestAnimationFrame(restore));
  }

  setOnSelectBoard(cb: (board: Board) => void) {
    this.onSelectBoard = cb;
  }

  setHandlers(handlers: { onToggle?: (t: Task) => void; onJump?: (t: Task) => void; onDelete?: (t: Task) => void; onEdit?: (t: Task) => void; onToggleSubtask?: (t: Task, idx: number) => void }) {
    this.onToggle = handlers.onToggle ?? null;
    this.onJump = handlers.onJump ?? null;
    this.onDelete = handlers.onDelete ?? null;
    this.onEdit = handlers.onEdit ?? null;
    this.onToggleSubtask = handlers.onToggleSubtask ?? null;
  }
}
