import type { FilterExpression, Task } from '../types';

export function evaluateFilter(task: Task, filter: FilterExpression): boolean {
  switch (filter.type) {
    case 'tag':
      return !!filter.value && task.tags.includes(filter.value);
    case 'empty':
      return task.tags.length === 0;
    case 'and':
      return (filter.children ?? []).every((c) => evaluateFilter(task, c));
    case 'or':
      if (!filter.children || filter.children.length === 0) return true;
      return filter.children.some((c) => evaluateFilter(task, c));
    case 'not':
      return filter.children ? !evaluateFilter(task, filter.children[0]) : true;
    default:
      return true;
  }
}
