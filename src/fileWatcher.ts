import { TFile } from 'obsidian';
import type SimpleKanbanPlugin from './main';
import { dataStore } from './dataStore';
import { parseTasksFromContent } from './taskScanner';

export class FileWatcher {
  private plugin: SimpleKanbanPlugin;

  constructor(plugin: SimpleKanbanPlugin) {
    this.plugin = plugin;
  }

  register() {
    this.plugin.registerEvent(
      this.plugin.app.vault.on('modify', async (file: TFile) => {
        if (!(file instanceof TFile)) return;
        if (!file.path.endsWith('.md')) return;
        const content = await this.plugin.app.vault.read(file);
        const tasks = parseTasksFromContent(content, file.path);
        // naive: replace all tasks from this file
        const existing = dataStore.getAllTasks().filter((t) => t.filepath !== file.path);
        dataStore.setTasks(existing.concat(tasks));
        this.plugin.requestBoardRerender();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.vault.on('rename', async (file: TFile) => {
        if (!(file instanceof TFile)) return;
        if (!file.path.endsWith('.md')) return;
        const content = await this.plugin.app.vault.read(file);
        const tasks = parseTasksFromContent(content, file.path);
        const others = dataStore.getAllTasks().filter((t) => t.filepath !== file.path);
        dataStore.setTasks(others.concat(tasks));
        this.plugin.requestBoardRerender();
      })
    );
  }
}
