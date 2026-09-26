import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({}));

import { API_COMMANDS } from '../src/api/commands';

describe('API command surface', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { contributes: { commands: { command: string }[]; menus: { commandPalette: { command: string; when?: string }[] } } };
  it('declares every tasksmd.api.* command in package.json and hides it from the palette', () => {
    const declared = pkg.contributes.commands.map((c) => c.command).filter((c) => c.startsWith('tasksmd.api.')).sort();
    expect(declared).toEqual(Object.keys(API_COMMANDS).sort());
    const hidden = pkg.contributes.menus.commandPalette.filter((m) => m.command.startsWith('tasksmd.api.') && m.when === 'false').map((m) => m.command).sort();
    expect(hidden).toEqual(declared);
  });
});
