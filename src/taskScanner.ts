import type { Task } from './types';

// Placeholder: real implementation will parse markdown lines and emojis
export function parseTasksFromContent(content: string, path: string): Task[] {
  const lines = content.split(/\r?\n/);
  const tasks: Task[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = /^\s*- \[( |x|X)\]\s+(.*)$/.exec(line);
    if (!match) continue;
    const isComplete = match[1].toLowerCase() === 'x';
    let rawText = match[2];
    const id = `${path}:${i + 1}`;
    const tags = extractTags(rawText);
    rawText = stripTags(rawText);
    const { text, createdDate, scheduledDate, dueDate, completedDate } = extractAndStripDates(rawText);
    tasks.push({
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
    });
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
