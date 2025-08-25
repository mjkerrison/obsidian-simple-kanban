import type { Board, FilterExpression, Task } from './types';

export class DataStore {
  private tasksById: Map<string, Task> = new Map();
  private boards: Board[] = [];

  setBoards(boards: Board[]) {
    this.boards = boards;
  }

  getBoards(): Board[] {
    return this.boards;
  }

  setTasks(tasks: Task[]) {
    this.tasksById.clear();
    for (const t of tasks) this.tasksById.set(t.id, t);
  }

  upsertTask(task: Task) {
    this.tasksById.set(task.id, task);
  }

  removeTask(id: string) {
    this.tasksById.delete(id);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasksById.values());
  }
}

export const dataStore = new DataStore();

