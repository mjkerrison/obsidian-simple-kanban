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
        const tasks = parseTasksFromContent(content, file.path, { includeTags: this.plugin.settings.taskIncludeTags });
        // naive: replace all tasks from this file
        const existing = dataStore.getAllTasks().filter((t) => t.filepath !== file.path);
        dataStore.setTasks(existing.concat(tasks));
        this.plugin.requestBoardRerender();
      })
    );

    this.plugin.registerEvent(
      this.plugin.app.vault.on('rename', async (file: TFile, oldPath: string) => {
        if (!(file instanceof TFile)) return;
        if (!file.path.endsWith('.md') && !oldPath.endsWith('.md')) return;
        // Remove tasks associated with the old path and the new path, then re-add from new path
        const content = file.path.endsWith('.md')
          ? await this.plugin.app.vault.read(file)
          : '';
        const tasks = file.path.endsWith('.md')
          ? parseTasksFromContent(content, file.path, { includeTags: this.plugin.settings.taskIncludeTags })
          : [];
        const others = dataStore
          .getAllTasks()
          .filter((t) => t.filepath !== oldPath && t.filepath !== file.path);
        dataStore.setTasks(others.concat(tasks));
        this.plugin.requestBoardRerender();
      })
    );

    // Remove tasks for files that are deleted from the vault
    this.plugin.registerEvent(
      this.plugin.app.vault.on('delete', async (file: TFile) => {
        if (!(file instanceof TFile)) return;
        if (!file.path.endsWith('.md')) return;
        const remaining = dataStore.getAllTasks().filter((t) => t.filepath !== file.path);
        dataStore.setTasks(remaining);
        this.plugin.requestBoardRerender();
      })
    );
  }
}
