import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type SimpleKanbanPlugin from './main';
import { DEFAULT_SETTINGS, PluginSettings, Board, Column } from './types';
import { dataStore } from './dataStore';
import { parseFilterString, stringifyFilter } from './filter/parser';

interface SettingsState {
  boards: Board[];
  activeTab: 'gui' | 'json';
  expandedBoardIds: Set<string>;
  expandedColumnIds: Set<string>;
  jsonText: string;
  jsonError: string | null;
}

export class SimpleKanbanSettingTab extends PluginSettingTab {
  plugin: SimpleKanbanPlugin;
  private state: SettingsState;

  constructor(app: App, plugin: SimpleKanbanPlugin) {
    super(app, plugin);
    this.plugin = plugin;
    this.state = this.createInitialState();
  }

  private createInitialState(): SettingsState {
    const boards = JSON.parse(JSON.stringify(this.plugin.settings.boards)) as Board[];
    return {
      boards,
      activeTab: 'gui',
      expandedBoardIds: new Set(),
      expandedColumnIds: new Set(),
      jsonText: JSON.stringify(boards, null, 2),
      jsonError: null,
    };
  }

  display(): void {
    // Re-initialize state from plugin settings each time display is called
    this.state = this.createInitialState();
    this.render();
  }

  private render(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Simple Kanban Settings' });

    this.renderGlobalSettings(containerEl);
    this.renderTabSwitcher(containerEl);

    if (this.state.activeTab === 'gui') {
      this.renderGuiEditor(containerEl);
    } else {
      this.renderJsonEditor(containerEl);
    }
  }

  private renderGlobalSettings(container: HTMLElement): void {
    new Setting(container)
      .setName('Global task tags')
      .setDesc('Only include top-level tasks that have at least one of these tags (comma-separated). Leave empty to include all tasks.')
      .addText((text) =>
        text
          .setPlaceholder('#todo, #task')
          .setValue(this.plugin.settings.taskIncludeTags.join(', '))
          .onChange(async (value) => {
            const parts = value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
              .map((s) => (s.startsWith('#') ? s : `#${s}`));
            this.plugin.settings.taskIncludeTags = parts;
            await this.plugin.saveSettings();
            await this.plugin.rescanAllTasks();
            this.plugin.requestBoardRerender();
          })
      );
  }

  private renderTabSwitcher(container: HTMLElement): void {
    const tabsEl = container.createDiv({ cls: 'sk-settings-tabs' });

    const guiTab = tabsEl.createDiv({
      cls: `sk-settings-tab ${this.state.activeTab === 'gui' ? 'is-active' : ''}`,
      text: 'GUI Editor',
    });
    guiTab.addEventListener('click', () => {
      if (this.state.activeTab !== 'gui') {
        this.state.activeTab = 'gui';
        this.render();
      }
    });

    const jsonTab = tabsEl.createDiv({
      cls: `sk-settings-tab ${this.state.activeTab === 'json' ? 'is-active' : ''}`,
      text: 'JSON Editor',
    });
    jsonTab.addEventListener('click', () => {
      if (this.state.activeTab !== 'json') {
        // Update JSON text from current GUI state before switching
        this.state.jsonText = JSON.stringify(this.state.boards, null, 2);
        this.state.jsonError = null;
        this.state.activeTab = 'json';
        this.render();
      }
    });
  }

  private renderGuiEditor(container: HTMLElement): void {
    // Header with Add Board and Save buttons
    const headerRow = container.createDiv({ cls: 'sk-header-row' });

    const addBoardBtn = headerRow.createEl('button', { cls: 'sk-btn', text: '+ Add Board' });
    addBoardBtn.addEventListener('click', () => {
      const newId = `board-${Date.now()}`;
      const newBoard: Board = {
        id: newId,
        name: 'New Board',
        filter: { type: 'or', children: [] },
        columns: [],
        hideFilterTags: [],
        showDates: { due: true, scheduled: true, created: false, completed: false },
      };
      this.state.boards.push(newBoard);
      this.state.expandedBoardIds.add(newId);
      this.render();
    });

    const saveBtn = headerRow.createEl('button', { cls: 'sk-btn sk-btn-primary', text: 'Save Changes' });
    saveBtn.addEventListener('click', () => this.saveBoards());

    // Board list
    const boardsContainer = container.createDiv({ cls: 'sk-boards-list' });
    for (const board of this.state.boards) {
      this.renderBoardSection(board, boardsContainer);
    }

    if (this.state.boards.length === 0) {
      boardsContainer.createDiv({ text: 'No boards configured. Click "Add Board" to create one.', cls: 'sk-empty-message' });
    }
  }

  private renderBoardSection(board: Board, container: HTMLElement): void {
    const isExpanded = this.state.expandedBoardIds.has(board.id);
    const wrapper = container.createDiv({ cls: 'sk-collapsible' });

    // Header
    const header = wrapper.createDiv({ cls: 'sk-collapsible-header' });
    const icon = header.createSpan({ cls: 'sk-collapse-icon', text: isExpanded ? '▼' : '▶' });
    const nameSpan = header.createSpan({ cls: 'sk-board-name', text: board.name || 'Unnamed Board' });

    // Toggle expand on icon/name click
    const toggleExpand = () => {
      if (isExpanded) {
        this.state.expandedBoardIds.delete(board.id);
      } else {
        this.state.expandedBoardIds.add(board.id);
      }
      this.render();
    };
    icon.addEventListener('click', (e) => { e.stopPropagation(); toggleExpand(); });
    nameSpan.addEventListener('click', (e) => { e.stopPropagation(); toggleExpand(); });

    // Delete button
    const deleteBtn = header.createEl('button', { cls: 'sk-btn sk-btn-danger', text: 'Delete' });
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete board "${board.name}"?`)) {
        this.state.boards = this.state.boards.filter((b) => b.id !== board.id);
        this.state.expandedBoardIds.delete(board.id);
        this.render();
      }
    });

    if (isExpanded) {
      const content = wrapper.createDiv({ cls: 'sk-collapsible-content' });
      this.renderBoardFields(board, content);
      this.renderColumnsSection(board, content);
    }
  }

  private renderBoardFields(board: Board, container: HTMLElement): void {
    // Name field
    this.createFieldRow(container, 'Name', (inputContainer) => {
      const input = inputContainer.createEl('input', { type: 'text', value: board.name });
      input.addEventListener('input', () => {
        board.name = input.value;
      });
    });

    // Filter field with validation
    this.createFilterField(container, 'Filter', board.filter, (newFilter) => {
      board.filter = newFilter;
    });

    // Hide Tags field
    this.createFieldRow(container, 'Hide Tags', (inputContainer) => {
      const input = inputContainer.createEl('input', {
        type: 'text',
        value: board.hideFilterTags.join(', '),
        placeholder: '#tag1, #tag2',
      });
      input.addEventListener('input', () => {
        board.hideFilterTags = input.value
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .map((s) => (s.startsWith('#') ? s : `#${s}`));
      });
    });

    // Show Dates checkboxes
    this.createFieldRow(container, 'Show Dates', (inputContainer) => {
      const checkboxes = inputContainer.createDiv({ cls: 'sk-checkboxes' });
      const dates: Array<{ key: keyof Board['showDates']; label: string }> = [
        { key: 'due', label: 'Due' },
        { key: 'scheduled', label: 'Scheduled' },
        { key: 'created', label: 'Created' },
        { key: 'completed', label: 'Completed' },
      ];
      for (const { key, label } of dates) {
        const item = checkboxes.createDiv({ cls: 'sk-checkbox-item' });
        const cb = item.createEl('input', { type: 'checkbox' });
        cb.checked = board.showDates[key] ?? false;
        cb.addEventListener('change', () => {
          board.showDates[key] = cb.checked;
        });
        item.createSpan({ text: label });
      }
    });
  }

  private renderColumnsSection(board: Board, container: HTMLElement): void {
    const section = container.createDiv({ cls: 'sk-columns-section' });

    const headerRow = section.createDiv({ cls: 'sk-columns-header' });
    headerRow.createSpan({ text: 'Columns' });
    const addColBtn = headerRow.createEl('button', { cls: 'sk-btn', text: '+ Add Column' });
    addColBtn.addEventListener('click', () => {
      const newId = `col-${Date.now()}`;
      const newCol: Column = {
        id: newId,
        name: 'New Column',
        filter: { type: 'or', children: [] },
        type: 'filtered',
      };
      board.columns.push(newCol);
      this.state.expandedColumnIds.add(newId);
      this.render();
    });

    const listEl = section.createDiv({ cls: 'sk-column-list' });
    for (let i = 0; i < board.columns.length; i++) {
      this.renderColumnItem(board, i, listEl);
    }

    if (board.columns.length === 0) {
      listEl.createDiv({ text: 'No columns. Click "Add Column" to create one.', cls: 'sk-empty-message' });
    }
  }

  private renderColumnItem(board: Board, index: number, container: HTMLElement): void {
    const col = board.columns[index];
    const isExpanded = this.state.expandedColumnIds.has(col.id);
    const wrapper = container.createDiv({ cls: 'sk-column-item' });

    // Row with reorder buttons, name, expand toggle, delete
    const row = wrapper.createDiv({ cls: 'sk-column-row' });

    // Reorder buttons
    const reorderBtns = row.createDiv({ cls: 'sk-reorder-btns' });
    const upBtn = reorderBtns.createEl('button', { cls: 'sk-reorder-btn', text: '↑' });
    upBtn.disabled = index === 0;
    upBtn.addEventListener('click', () => {
      if (index > 0) {
        [board.columns[index - 1], board.columns[index]] = [board.columns[index], board.columns[index - 1]];
        this.render();
      }
    });

    const downBtn = reorderBtns.createEl('button', { cls: 'sk-reorder-btn', text: '↓' });
    downBtn.disabled = index === board.columns.length - 1;
    downBtn.addEventListener('click', () => {
      if (index < board.columns.length - 1) {
        [board.columns[index], board.columns[index + 1]] = [board.columns[index + 1], board.columns[index]];
        this.render();
      }
    });

    // Column name (clickable to expand)
    const nameSpan = row.createSpan({ cls: 'sk-column-name', text: col.name || 'Unnamed' });
    nameSpan.addEventListener('click', () => {
      if (isExpanded) {
        this.state.expandedColumnIds.delete(col.id);
      } else {
        this.state.expandedColumnIds.add(col.id);
      }
      this.render();
    });

    // Expand toggle
    const expandToggle = row.createSpan({ cls: 'sk-column-expand', text: isExpanded ? '▲ collapse' : '▼ expand' });
    expandToggle.addEventListener('click', () => {
      if (isExpanded) {
        this.state.expandedColumnIds.delete(col.id);
      } else {
        this.state.expandedColumnIds.add(col.id);
      }
      this.render();
    });

    // Delete button
    const deleteBtn = row.createEl('button', { cls: 'sk-btn sk-btn-danger', text: 'Delete' });
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Delete column "${col.name}"?`)) {
        board.columns.splice(index, 1);
        this.state.expandedColumnIds.delete(col.id);
        this.render();
      }
    });

    // Expanded fields
    if (isExpanded) {
      const fields = wrapper.createDiv({ cls: 'sk-column-fields' });
      this.renderColumnFields(col, fields);
    }
  }

  private renderColumnFields(col: Column, container: HTMLElement): void {
    // Name
    this.createFieldRow(container, 'Name', (inputContainer) => {
      const input = inputContainer.createEl('input', { type: 'text', value: col.name });
      input.addEventListener('input', () => {
        col.name = input.value;
      });
    });

    // Filter
    this.createFilterField(container, 'Filter', col.filter, (newFilter) => {
      col.filter = newFilter;
    });

    // Status Tag
    this.createFieldRow(container, 'Status Tag', (inputContainer) => {
      const input = inputContainer.createEl('input', {
        type: 'text',
        value: col.statusTag ?? '',
        placeholder: '#in/wip (optional)',
      });
      input.addEventListener('input', () => {
        const val = input.value.trim();
        col.statusTag = val.length > 0 ? (val.startsWith('#') ? val : `#${val}`) : undefined;
      });
    });

    // Type dropdown
    this.createFieldRow(container, 'Type', (inputContainer) => {
      const select = inputContainer.createEl('select');
      const optFiltered = select.createEl('option', { value: 'filtered', text: 'Filtered' });
      const optCompleted = select.createEl('option', { value: 'completed', text: 'Completed' });
      select.value = col.type ?? 'filtered';
      select.addEventListener('change', () => {
        col.type = select.value as 'filtered' | 'completed';
      });
    });

    // Show Completed checkbox
    this.createFieldRow(container, 'Show Completed Only', (inputContainer) => {
      const cb = inputContainer.createEl('input', { type: 'checkbox' });
      cb.checked = col.showCompleted ?? false;
      cb.addEventListener('change', () => {
        col.showCompleted = cb.checked;
      });
    });

    // Sort Key dropdown
    this.createFieldRow(container, 'Sort By', (inputContainer) => {
      const select = inputContainer.createEl('select');
      const options = [
        { value: '', label: 'None' },
        { value: 'due', label: 'Due Date' },
        { value: 'scheduled', label: 'Scheduled Date' },
        { value: 'created', label: 'Created Date' },
        { value: 'completed', label: 'Completed Date' },
        { value: 'title', label: 'Title' },
      ];
      for (const opt of options) {
        select.createEl('option', { value: opt.value, text: opt.label });
      }
      select.value = col.sort?.key ?? '';
      select.addEventListener('change', () => {
        if (select.value === '') {
          col.sort = undefined;
        } else {
          col.sort = {
            key: select.value as any,
            direction: col.sort?.direction ?? 'asc',
          };
        }
        this.render();
      });
    });

    // Sort Direction dropdown (only if sort key is set)
    if (col.sort?.key) {
      this.createFieldRow(container, 'Sort Direction', (inputContainer) => {
        const select = inputContainer.createEl('select');
        select.createEl('option', { value: 'asc', text: 'Ascending' });
        select.createEl('option', { value: 'desc', text: 'Descending' });
        select.value = col.sort?.direction ?? 'asc';
        select.addEventListener('change', () => {
          if (col.sort) {
            col.sort.direction = select.value as 'asc' | 'desc';
          }
        });
      });
    }
  }

  private renderJsonEditor(container: HTMLElement): void {
    const jsonContainer = container.createDiv({ cls: 'sk-json-container' });

    // Textarea
    const textarea = jsonContainer.createEl('textarea', { cls: 'sk-json-textarea' });
    textarea.value = this.state.jsonText;
    textarea.addEventListener('input', () => {
      this.state.jsonText = textarea.value;
      // Validate on input
      try {
        const parsed = JSON.parse(textarea.value);
        if (!Array.isArray(parsed)) {
          this.state.jsonError = 'Root must be an array';
        } else {
          this.state.jsonError = null;
        }
      } catch (e: any) {
        this.state.jsonError = e.message ?? 'Invalid JSON';
      }
      // Update validation message
      const msgEl = jsonContainer.querySelector('.sk-validation-msg');
      if (msgEl) {
        this.updateValidationMessage(msgEl as HTMLElement);
      }
    });

    // Validation message
    const validationEl = jsonContainer.createDiv({ cls: 'sk-validation-msg' });
    this.updateValidationMessage(validationEl);

    // Action buttons
    const actionBar = jsonContainer.createDiv({ cls: 'sk-action-bar' });

    const loadFromGuiBtn = actionBar.createEl('button', { cls: 'sk-btn', text: 'Load from GUI' });
    loadFromGuiBtn.addEventListener('click', () => {
      this.state.jsonText = JSON.stringify(this.state.boards, null, 2);
      this.state.jsonError = null;
      textarea.value = this.state.jsonText;
      this.updateValidationMessage(validationEl);
    });

    const applyJsonBtn = actionBar.createEl('button', { cls: 'sk-btn', text: 'Apply JSON to GUI' });
    applyJsonBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(this.state.jsonText);
        if (!Array.isArray(parsed)) {
          throw new Error('Root must be an array');
        }
        this.state.boards = parsed as Board[];
        this.state.jsonError = null;
        new Notice('JSON applied to GUI');
        this.state.activeTab = 'gui';
        this.render();
      } catch (e: any) {
        this.state.jsonError = e.message ?? 'Invalid JSON';
        this.updateValidationMessage(validationEl);
        new Notice(`Invalid JSON: ${this.state.jsonError}`);
      }
    });

    const loadSampleBtn = actionBar.createEl('button', { cls: 'sk-btn', text: 'Load Sample' });
    loadSampleBtn.addEventListener('click', () => {
      const sample = this.getSampleBoards();
      this.state.jsonText = JSON.stringify(sample, null, 2);
      this.state.jsonError = null;
      textarea.value = this.state.jsonText;
      this.updateValidationMessage(validationEl);
    });

    const saveBtn = actionBar.createEl('button', { cls: 'sk-btn sk-btn-primary', text: 'Save Changes' });
    saveBtn.addEventListener('click', () => {
      try {
        const parsed = JSON.parse(this.state.jsonText);
        if (!Array.isArray(parsed)) {
          throw new Error('Root must be an array');
        }
        this.state.boards = parsed as Board[];
        this.saveBoards();
      } catch (e: any) {
        this.state.jsonError = e.message ?? 'Invalid JSON';
        this.updateValidationMessage(validationEl);
        new Notice(`Invalid JSON: ${this.state.jsonError}`);
      }
    });
  }

  private updateValidationMessage(el: HTMLElement): void {
    el.empty();
    if (this.state.jsonError) {
      el.addClass('is-error');
      el.removeClass('is-valid');
      el.setText(`Error: ${this.state.jsonError}`);
    } else {
      el.removeClass('is-error');
      el.addClass('is-valid');
      el.setText('Valid JSON');
    }
  }

  private createFieldRow(container: HTMLElement, label: string, renderInput: (inputContainer: HTMLElement) => void): void {
    const row = container.createDiv({ cls: 'sk-field-row' });
    row.createSpan({ cls: 'sk-field-label', text: label });
    const inputContainer = row.createDiv({ cls: 'sk-field-input' });
    renderInput(inputContainer);
  }

  private createFilterField(
    container: HTMLElement,
    label: string,
    currentFilter: import('./types').FilterExpression,
    onUpdate: (newFilter: import('./types').FilterExpression) => void
  ): void {
    const row = container.createDiv({ cls: 'sk-field-row' });
    row.createSpan({ cls: 'sk-field-label', text: label });
    const inputContainer = row.createDiv({ cls: 'sk-field-input' });

    const filterStr = stringifyFilter(currentFilter);
    const input = inputContainer.createEl('input', {
      type: 'text',
      value: filterStr,
      cls: 'sk-filter-input',
      placeholder: '#tag AND NOT #other',
    });

    const statusSpan = inputContainer.createSpan({ cls: 'sk-filter-status' });

    const validateAndUpdate = () => {
      const val = input.value.trim();
      try {
        const parsed = parseFilterString(val);
        onUpdate(parsed);
        statusSpan.setText('✓');
        statusSpan.removeClass('sk-filter-invalid');
        statusSpan.addClass('sk-filter-valid');
      } catch {
        statusSpan.setText('✗');
        statusSpan.removeClass('sk-filter-valid');
        statusSpan.addClass('sk-filter-invalid');
      }
    };

    // Initial validation
    validateAndUpdate();

    input.addEventListener('input', validateAndUpdate);
  }

  private saveBoards(): void {
    this.plugin.settings.boards = this.state.boards;
    dataStore.setBoards(this.state.boards);
    this.plugin.saveSettings();
    this.plugin.requestBoardRerender();
    new Notice('Simple Kanban: Boards saved');
  }

  private getSampleBoards(): Board[] {
    return [
      {
        id: 'work',
        name: 'Work',
        filter: { type: 'tag', value: '#for/work' },
        columns: [
          { id: 'all', name: 'All', filter: { type: 'or', children: [] }, type: 'filtered', sort: { key: 'due', direction: 'asc' } },
          { id: 'backlog', name: 'Backlog', filter: { type: 'tag', value: '#in/backlog' }, type: 'filtered', statusTag: '#in/backlog', sort: { key: 'title', direction: 'asc' } },
          { id: 'wip', name: 'WIP', filter: { type: 'tag', value: '#in/wip' }, type: 'filtered', statusTag: '#in/wip', sort: { key: 'due', direction: 'asc' } },
          { id: 'blocked', name: 'Blocked', filter: { type: 'tag', value: '#in/blocked' }, type: 'filtered', statusTag: '#in/blocked', sort: { key: 'title', direction: 'asc' } },
          { id: 'completed', name: 'Completed', filter: { type: 'or', children: [] }, type: 'filtered', showCompleted: true, sort: { key: 'completed', direction: 'desc' } },
        ],
        hideFilterTags: ['#todo'],
        showDates: { due: true, scheduled: true, created: true, completed: true },
      },
    ];
  }
}

export async function loadSettings(plugin: SimpleKanbanPlugin): Promise<PluginSettings> {
  return Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData());
}
