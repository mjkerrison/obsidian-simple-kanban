import type { Task } from './types';

// Parse markdown content into Task[] with subtasks and notes.
// - Top-level (or any) checkbox lines become cards
// - More-indented checkbox lines become subtasks of the nearest less-indented task
// - More-indented non-checkbox lines become notes on the nearest less-indented task
export function parseTasksFromContent(content: string, path: string, opts?: { includeTags?: string[] }): Task[] {
  const lines = content.split(/\r?\n/);
  const tasks: Task[] = [];
  const stack: Array<{ indent: number; task: Task }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const taskMatch = /^([ \t]*)- \[( |x|X)\]\s+(.*)$/.exec(line);
    const indentOf = (s: string) => s.replace(/\t/g, '  ').length;

    if (taskMatch) {
      const indent = indentOf(taskMatch[1] ?? '');
      const isComplete = taskMatch[2].toLowerCase() === 'x';
      const rawTail = taskMatch[3];

      // unwind stack to the nearest parent
      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) stack.pop();

      if (stack.length === 0) {
        // New top-level (or root-level) task → card
        const id = `${path}:${i + 1}`;
        const tags = extractTags(rawTail);
        const includeTags = opts?.includeTags ?? [];
        if (includeTags.length > 0) {
          const tagSet = new Set(tags);
          const matches = includeTags.some((t) => tagSet.has(t));
          if (!matches) {
            // Do not include this task or its children
            continue;
          }
        }
        const stripped = stripTags(rawTail);
        const { text, createdDate, scheduledDate, dueDate, completedDate } = extractAndStripDates(stripped);
        const task: Task = {
          id,
          filepath: path,
          lineNumber: i + 1,
          text,
          isComplete,
          tags,
          subtasks: [],
          notes: [],
          createdDate,
          scheduledDate,
          dueDate,
          completedDate,
        };
        tasks.push(task);
        stack.push({ indent, task });
      } else {
        // Subtask of current parent
        const parent = stack[stack.length - 1].task;
        const subTags = extractTags(rawTail);
        const subStripped = stripTags(rawTail);
        const clean = extractAndStripDates(subStripped).text; // dates on subtasks are ignored for now
        parent.subtasks.push({ text: clean, isComplete, tags: subTags, lineNumber: i + 1 });
        // do not push to stack — we only support one subtask level for display
      }
      continue;
    }

    // Non-task line: if it's indented more than the current parent, treat as a note
    const m = /^([ \t]*)(.*)$/.exec(line);
    if (m) {
      const indent = indentOf(m[1] ?? '');
      const contentText = (m[2] ?? '').trimEnd();
      if (stack.length > 0 && indent > stack[stack.length - 1].indent) {
        const parent = stack[stack.length - 1].task;
        const note = contentText.replace(/^[-*+]\s+/, '').trim();
        if (note.length > 0) parent.notes.push(note);
        continue;
      }
      // If indentation collapses, unwind stack
      while (stack.length > 0 && indent <= stack[stack.length - 1].indent) stack.pop();
    }
  }
  return tasks;
}

function extractTags(text: string): string[] {
  const tags = new Set<string>();
  const re = /(^|\s)#([\w\/-]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    tags.add(`#${m[2]}`);
  }
  return Array.from(tags);
}

function stripTags(text: string): string {
  const without = text.replace(/(^|\s)#[\w\/-]+/g, ' ');
  return without.replace(/\s{2,}/g, ' ').trim();
}

function extractAndStripDates(text: string): {
  text: string;
  createdDate?: string;
  scheduledDate?: string;
  dueDate?: string;
  completedDate?: string;
} {
  let out = text;
  let createdDate: string | undefined;
  let scheduledDate: string | undefined;
  let dueDate: string | undefined;
  let completedDate: string | undefined;

  const patterns: Array<{ key: 'created' | 'scheduled' | 'due' | 'completed'; re: RegExp }> = [
    { key: 'created', re: /\s➕\s(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?/g },
    { key: 'scheduled', re: /\s⏳\s(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?/g },
    { key: 'due', re: /\s📅\s(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?/g },
    { key: 'completed', re: /\s✅\s(\d{4}-\d{2}-\d{2})(?:\s+\d{2}:\d{2})?/g },
  ];

  for (const { key, re } of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(out))) {
      const iso = m[1];
      if (isValidISODate(iso)) {
        if (key === 'created') createdDate = iso;
        if (key === 'scheduled') scheduledDate = iso;
        if (key === 'due') dueDate = iso;
        if (key === 'completed') completedDate = iso;
        // remove this occurrence
        out = out.slice(0, m.index) + out.slice(m.index + m[0].length);
        re.lastIndex = 0; // reset due to string modified
      }
    }
  }

  out = out.replace(/\s{2,}/g, ' ').trim();
  return { text: out, createdDate, scheduledDate, dueDate, completedDate };
}

function isValidISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month && d.getUTCDate() === day;
}
