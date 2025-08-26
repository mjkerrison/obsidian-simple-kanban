import { App, Plugin, TFile, WorkspaceLeaf, Notice } from 'obsidian';
import { SimpleKanbanSettingTab, loadSettings } from './settings';
import { dataStore } from './dataStore';
import { parseTasksFromContent } from './taskScanner';
import type { Board, PluginSettings } from './types';
import { BoardView, VIEW_TYPE_KANBAN } from './board/BoardView';
import { parseFilterString } from './filter/parser';
import { evaluateFilter } from './filter/eval';
import { FileWatcher } from './fileWatcher';
import { replaceLineInFile, replaceLineWithText, wrapLineWithDel } from './utils/mdEdit';

export default class SimpleKanbanPlugin extends Plugin {
  settings: PluginSettings;
  private currentBoardId: string | null = null;

  async onload() {
    this.settings = await loadSettings(this);

    this.addSettingTab(new SimpleKanbanSettingTab(this.app, this));

    // Initialize boards in data store from settings
    dataStore.setBoards(this.settings.boards);

    this.registerView(
      VIEW_TYPE_KANBAN,
      (leaf: WorkspaceLeaf) => new BoardView(leaf)
    );

    this.addCommand({
      id: 'open-simple-kanban',
      name: 'Open Simple Kanban',
      callback: () => this.activateView(),
    });

    this.addCommand({
      id: 'rescan-tasks',
      name: 'Rescan Tasks',
      callback: async () => {
        await this.rescanAllTasks();
        this.requestBoardRerender();
      },
    });

    // Defer initial scan and watcher until workspace is ready
    this.app.workspace.onLayoutReady(async () => {
      await this.rescanAllTasks();
      new FileWatcher(this).register();
      await this.ensureKanbanViewOpen();
      this.requestBoardRerender();
    });
  }

  onunload() {}

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async rescanAllTasks() {
    const files = this.app.vault.getMarkdownFiles();
    const allTasks: ReturnType<typeof parseTasksFromContent> = [];
    for (const f of files) {
      const content = await this.app.vault.read(f);
      allTasks.push(
        ...parseTasksFromContent(content, f.path, { includeTags: this.settings.taskIncludeTags })
      );
    }
    dataStore.setTasks(allTasks);
    console.log(`[Simple Kanban] Rescan complete: ${allTasks.length} tasks from ${files.length} markdown files.`);
    new Notice(`Simple Kanban: Rescanned ${allTasks.length} tasks`);
  }

  async activateView() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_KANBAN)[0];
    if (!leaf) {
      // Open in main pane as a tab
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_KANBAN, active: true });
    }
    this.app.workspace.revealLeaf(leaf);

    const view = leaf.view as BoardView;
    const board = this.getCurrentBoard();
    view.setState(board, this.computeTasksByColumn(board));
    view.setOnSelectBoard((b) => {
      this.currentBoardId = b.id;
      const tasks = this.computeTasksByColumn(b);
      (leaf.view as BoardView).setState(b, tasks);
    });
    view.setHandlers({
      onToggle: (t) => this.toggleTaskCompletion(t).catch(console.error),
      onJump: (t) => this.jumpToTask(t).catch(console.error),
      onDelete: (t) => this.softDeleteTask(t).catch(console.error),
      onEdit: (t) => this.editTask(t).catch(console.error),
      onToggleSubtask: (t, idx) => this.toggleSubtaskCompletion(t, idx).catch(console.error),
    });
  }

  private async ensureKanbanViewOpen() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_KANBAN)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE_KANBAN, active: true });
    }
  }

  requestBoardRerender() {
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_KANBAN)[0];
    if (!leaf) return;
    const view = leaf.view as BoardView;
    if (!view || typeof (view as any).setBoard !== 'function' || typeof (view as any).setData !== 'function') {
      return;
    }
    const board = this.getCurrentBoard();
    view.setState(board, this.computeTasksByColumn(board));
    view.setOnSelectBoard((b) => {
      this.currentBoardId = b.id;
      const tasks = this.computeTasksByColumn(b);
      view.setState(b, tasks);
    });
    view.setHandlers({
      onToggle: (t) => this.toggleTaskCompletion(t).catch(console.error),
      onJump: (t) => this.jumpToTask(t).catch(console.error),
      onDelete: (t) => this.softDeleteTask(t).catch(console.error),
      onEdit: (t) => this.editTask(t).catch(console.error),
      onToggleSubtask: (t, idx) => this.toggleSubtaskCompletion(t, idx).catch(console.error),
    });
  }

  private getDefaultBoard(): Board {
    if (this.settings.boards.length > 0) return this.settings.boards[0];
    // Provide a basic default board if none configured
    const fallback: Board = {
      id: 'default',
      name: 'Default',
      filter: parseFilterString(''),
      columns: [
        { id: 'all', name: 'All', filter: { type: 'or', children: [] }, type: 'filtered' },
        { id: 'backlog', name: 'Backlog', filter: parseFilterString('#in/backlog'), type: 'filtered', statusTag: '#in/backlog' },
        { id: 'wip', name: 'WIP', filter: parseFilterString('#in/wip'), type: 'filtered', statusTag: '#in/wip' },
        { id: 'blocked', name: 'Blocked', filter: parseFilterString('#in/blocked'), type: 'filtered', statusTag: '#in/blocked' },
      ],
      hideFilterTags: ['#todo'],
      showDates: { due: true, scheduled: true, created: true, completed: true },
    };
    return fallback;
  }

  private getCurrentBoard(): Board {
    const boards = this.settings.boards;
    if (boards.length === 0) return this.getDefaultBoard();
    if (this.currentBoardId) {
      const found = boards.find((b) => b.id === this.currentBoardId);
      if (found) return found;
    }
    this.currentBoardId = boards[0].id;
    return boards[0];
  }

  private async toggleTaskCompletion(task: import('./types').Task) {
    const file = this.app.vault.getAbstractFileByPath(task.filepath) as TFile | null;
    if (!file) return;
    const content = await this.app.vault.read(file);
    const lines = content.split(/\r?\n/);
    if (task.lineNumber <= 0 || task.lineNumber > lines.length) return;
    const line = lines[task.lineNumber - 1];
    let newLine: string | null = null;
    try {
      const api = this.getTasksApiV1();
      if (api?.executeToggleTaskDoneCommand) {
        newLine = api.executeToggleTaskDoneCommand(line, task.filepath);
      }
    } catch (e) {
      console.warn('[Simple Kanban] Tasks API toggle failed, falling back.', e);
    }
    if (!newLine) {
      // Fallback: naive toggle without adding/removing metadata beyond ✅ date
      const isChecked = /- \[[xX]\]/.test(line);
      if (isChecked) {
        newLine = line.replace(/- \[[xX]\]/, '- [ ]').replace(/\s✅\s\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?/, '');
      } else {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        newLine = line.replace(/- \[ \]/, '- [x]') + ` ✅ ${y}-${m}-${d} ${hh}:${mm}`;
      }
    }
    // Tasks API may return two lines for recurring tasks; handle multi-line safely
    await replaceLineWithText(this.app.vault, task.filepath, task.lineNumber, newLine);
    // File watcher will refresh cache and UI
  }

  private async jumpToTask(task: import('./types').Task) {
    const file = this.app.vault.getAbstractFileByPath(task.filepath) as TFile | null;
    if (!file) return;
    const leaf = this.app.workspace.getLeaf(true);
    // @ts-ignore openFile supports eState with line
    await leaf.openFile(file, { eState: { line: Math.max(0, task.lineNumber - 1) } });
  }

  private async softDeleteTask(task: import('./types').Task) {
    await wrapLineWithDel(this.app.vault, task.filepath, task.lineNumber);
    // watcher will update view
  }

  private async editTask(task: import('./types').Task) {
    const file = this.app.vault.getAbstractFileByPath(task.filepath) as TFile | null;
    if (!file) return;
    const content = await this.app.vault.read(file);
    const lines = content.split(/\r?\n/);
    if (task.lineNumber <= 0 || task.lineNumber > lines.length) return;
    const line = lines[task.lineNumber - 1];
    try {
      const api = this.getTasksApiV1();
      if (api?.editTaskLineModal) {
        const edited = await api.editTaskLineModal(line);
        if (typeof edited === 'string' && edited.length > 0 && edited !== line) {
          await replaceLineWithText(this.app.vault, task.filepath, task.lineNumber, edited);
        }
        return;
      }
    } catch (e) {
      console.warn('[Simple Kanban] Tasks API edit failed; falling back to open note.', e);
    }
    await this.jumpToTask(task);
  }

  private async toggleSubtaskCompletion(task: import('./types').Task, subIndex: number) {
    const sub = task.subtasks?.[subIndex];
    if (!sub) return;
    const file = this.app.vault.getAbstractFileByPath(task.filepath) as TFile | null;
    if (!file) return;
    const content = await this.app.vault.read(file);
    const lines = content.split(/\r?\n/);
    if (sub.lineNumber <= 0 || sub.lineNumber > lines.length) return;
    const line = lines[sub.lineNumber - 1];
    let newLine: string | null = null;
    try {
      const api = this.getTasksApiV1();
      if (api?.executeToggleTaskDoneCommand) {
        newLine = api.executeToggleTaskDoneCommand(line, task.filepath);
      }
    } catch (e) {
      console.warn('[Simple Kanban] Tasks API toggle failed for subtask, falling back.', e);
    }
    if (!newLine) {
      const isChecked = /- \[[xX]\]/.test(line);
      if (isChecked) {
        newLine = line.replace(/- \[[xX]\]/, '- [ ]').replace(/\s✅\s\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?/, '');
      } else {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        newLine = line.replace(/- \[ \]/, '- [x]') + ` ✅ ${y}-${m}-${d} ${hh}:${mm}`;
      }
    }
    await replaceLineWithText(this.app.vault, task.filepath, sub.lineNumber, newLine);
    // watcher will update view
  }

  private getTasksApiV1(): any {
    try {
      // Per Tasks docs: app.plugins.plugins['obsidian-tasks-plugin'].apiV1
      const plugins = (this.app as any)?.plugins?.plugins;
      return plugins?.['obsidian-tasks-plugin']?.apiV1;
    } catch (e) {
      return undefined;
    }
  }

  private computeTasksByColumn(board: Board): Map<string, any[]> {
    const map = new Map<string, any[]>();
    const all = dataStore.getAllTasks();
    for (const col of board.columns) {
      const showCompletedOnly = col.showCompleted === true || col.type === 'completed';
      let tasks = all
        .filter((t) => evaluateFilter(t, board.filter))
        .filter((t) => evaluateFilter(t, col.filter))
        .filter((t) => (showCompletedOnly ? t.isComplete : !t.isComplete));
      // Column sorting (optional)
      if (col.sort) {
        const dir = col.sort.direction === 'desc' ? -1 : 1;
        const key = col.sort.key;
        const getDate = (t: any, k: typeof key): string | undefined => {
          if (k === 'due') return t.dueDate;
          if (k === 'scheduled') return t.scheduledDate;
          if (k === 'created') return t.createdDate;
          if (k === 'completed') return t.completedDate;
          return undefined;
        };
        const cmp = (a: any, b: any): number => {
          if (key === 'title') {
            const at = (a.text ?? '').toString().toLowerCase();
            const bt = (b.text ?? '').toString().toLowerCase();
            return at.localeCompare(bt) * dir;
          }
          const ad = getDate(a, key);
          const bd = getDate(b, key);
          if (ad && bd) return (ad < bd ? -1 : ad > bd ? 1 : 0) * dir;
          if (ad && !bd) return -1; // missing dates sort last
          if (!ad && bd) return 1;
          // fallback to title for stable-ish ordering
          const at = (a.text ?? '').toString().toLowerCase();
          const bt = (b.text ?? '').toString().toLowerCase();
          return at.localeCompare(bt);
        };
        tasks = tasks.slice().sort(cmp);
      }
      map.set(col.id, tasks);
    }
    const total = all.length;
    const perCol = Array.from(map.entries())
      .map(([k, v]) => `${k}:${v.length}`)
      .join(', ');
    console.log(`[Simple Kanban] Tasks scanned: ${total}; columns -> ${perCol}`);
    return map;
  }
}
