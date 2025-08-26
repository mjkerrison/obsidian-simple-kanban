import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type SimpleKanbanPlugin from './main';
import { DEFAULT_SETTINGS, PluginSettings } from './types';
import { dataStore } from './dataStore';

export class SimpleKanbanSettingTab extends PluginSettingTab {
  plugin: SimpleKanbanPlugin;

  constructor(app: App, plugin: SimpleKanbanPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Simple Kanban Settings' });

    // Global task filter
    new Setting(containerEl)
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
            // trigger a rescan to apply filter
            await this.plugin.rescanAllTasks();
            this.plugin.requestBoardRerender();
          })
      );

    let boardsText = JSON.stringify(this.plugin.settings.boards, null, 2);
    let boardsTA: HTMLTextAreaElement | null = null;
    new Setting(containerEl)
      .setName('Boards (JSON)')
      .setDesc('Edit boards configuration. Click Save to apply. Use Load Sample for a starter config.')
      .addTextArea((ta) => {
        ta.setValue(boardsText).onChange((value) => {
          boardsText = value;
        });
        ta.inputEl.rows = 14;
        ta.inputEl.cols = 60;
        boardsTA = ta.inputEl;
      })
      .addExtraButton((btn) =>
        btn
          .setIcon('document')
          .setTooltip('Load Sample')
          .onClick(async () => {
            const sample = [
              {
                id: 'work',
                name: 'Work',
                filter: { type: 'tag', value: '#for/work' },
                columns: [
                  { id: 'all', name: 'All', filter: { type: 'or', children: [] }, type: 'filtered', sort: { key: 'due', direction: 'asc' } },
                  { id: 'backlog', name: 'Backlog', filter: { type: 'tag', value: '#in/backlog' }, type: 'filtered', statusTag: '#in/backlog', sort: { key: 'title', direction: 'asc' } },
                  { id: 'wip', name: 'WIP', filter: { type: 'tag', value: '#in/wip' }, type: 'filtered', statusTag: '#in/wip', sort: { key: 'due', direction: 'asc' } },
                  { id: 'blocked', name: 'Blocked', filter: { type: 'tag', value: '#in/blocked' }, type: 'filtered', statusTag: '#in/blocked', sort: { key: 'title', direction: 'asc' } },
                  { id: 'completed', name: 'Completed', filter: { type: 'or', children: [] }, type: 'filtered', showCompleted: true, sort: { key: 'completed', direction: 'desc' } }
                ],
                hideFilterTags: ['#todo'],
                showDates: { due: true, scheduled: true, created: true, completed: true }
              }
            ];
            boardsText = JSON.stringify(sample, null, 2);
            if (boardsTA) boardsTA.value = boardsText;
          })
      )
      .addExtraButton((btn) =>
        btn
          .setIcon('save')
          .setTooltip('Save Boards JSON')
          .onClick(async () => {
            try {
              const parsed = JSON.parse(boardsText);
              if (!Array.isArray(parsed)) throw new Error('Root must be an array');
              this.plugin.settings.boards = parsed as any;
              dataStore.setBoards(parsed as any);
              await this.plugin.saveSettings();
              this.plugin.requestBoardRerender();
              new Notice('Simple Kanban: Boards saved');
            } catch (e: any) {
              new Notice(`Invalid JSON: ${e.message ?? e}`);
            }
          })
      );
  }
}

export async function loadSettings(plugin: SimpleKanbanPlugin): Promise<PluginSettings> {
  return Object.assign({}, DEFAULT_SETTINGS, await plugin.loadData());
}
