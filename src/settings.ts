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

    new Setting(containerEl)
      .setName('Scan interval (ms)')
      .setDesc('How often to scan for changes when idle.')
      .addText((text) =>
        text
          .setPlaceholder('2000')
          .setValue(String(this.plugin.settings.scanInterval))
          .onChange(async (value) => {
            const v = Number(value);
            if (!Number.isNaN(v) && v > 0) {
              this.plugin.settings.scanInterval = v;
              await this.plugin.saveSettings();
            }
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
                  { id: 'all', name: 'All', filter: { type: 'or', children: [] }, type: 'filtered' },
                  { id: 'backlog', name: 'Backlog', filter: { type: 'tag', value: '#in/backlog' }, type: 'filtered', statusTag: '#in/backlog' },
                  { id: 'wip', name: 'WIP', filter: { type: 'tag', value: '#in/wip' }, type: 'filtered', statusTag: '#in/wip' },
                  { id: 'blocked', name: 'Blocked', filter: { type: 'tag', value: '#in/blocked' }, type: 'filtered', statusTag: '#in/blocked' },
                  { id: 'completed', name: 'Completed', filter: { type: 'or', children: [] }, type: 'filtered', showCompleted: true }
                ],
                showCompletedColumn: true,
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
