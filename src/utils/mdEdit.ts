import type { Vault } from 'obsidian';

export function addTagToLine(line: string, tag: string): string {
  return line.includes(tag) ? line : `${line} ${tag}`.trim();
}

export function removeTagFromLine(line: string, tag: string): string {
  const re = new RegExp(`(^|\\s)${escapeTag(tag)}(?![\\w/])`, 'g');
  return line.replace(re, ' ').replace(/\s{2,}/g, ' ').trimEnd();
}

function escapeTag(tag: string): string {
  return tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function replaceLineInFile(vault: Vault, path: string, lineNumber: number, newLine: string) {
  const file = vault.getAbstractFileByPath(path);
  if (!file || !('stat' in file)) return;
  // naive implementation to be optimized later
  // read, replace line, write back
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const content = await vault.read(file);
  const lines = content.split(/\r?\n/);
  if (lineNumber <= 0 || lineNumber > lines.length) return;
  lines[lineNumber - 1] = newLine;
  // @ts-ignore
  await vault.modify(file, lines.join('\n'));
}

export async function replaceLineWithText(vault: Vault, path: string, lineNumber: number, newText: string) {
  const file = vault.getAbstractFileByPath(path);
  if (!file || !('stat' in file)) return;
  // @ts-ignore
  const content = await vault.read(file);
  const lines = content.split(/\r?\n/);
  if (lineNumber <= 0 || lineNumber > lines.length) return;
  const newLines = newText.split(/\r?\n/);
  lines.splice(lineNumber - 1, 1, ...newLines);
  // @ts-ignore
  await vault.modify(file, lines.join('\n'));
}

export async function wrapLineWithDel(vault: Vault, path: string, lineNumber: number) {
  const file = vault.getAbstractFileByPath(path);
  if (!file || !('stat' in file)) return;
  // @ts-ignore
  const content = await vault.read(file);
  const lines = content.split(/\r?\n/);
  if (lineNumber <= 0 || lineNumber > lines.length) return;
  const current = lines[lineNumber - 1];
  if (/^\s*<del>.*<\/del>\s*$/.test(current)) return; // already wrapped
  lines[lineNumber - 1] = `<del>${current}</del>`;
  // @ts-ignore
  await vault.modify(file, lines.join('\n'));
}
