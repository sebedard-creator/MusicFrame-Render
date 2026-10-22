import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validateConfig } from './config.js';
import { presets, presetNames } from '../public/presets.js';

export class SavedSettings {
  constructor(directory) { this.file = path.join(directory, 'saved-settings.json'); this.pending = Promise.resolve(); }
  async read() {
    try { return JSON.parse(await readFile(this.file, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return { version: 1, presets: {}, history: [] }; throw error; }
  }
  save(preset, input, projectId) {
    const operation = this.pending.then(async () => {
      if (!Object.hasOwn(presets, preset)) throw new Error('Modèle inconnu.');
      if (!input || typeof input !== 'object' || input.preset !== preset) throw new Error('Le modèle des réglages ne correspond pas.');
      const config = validateConfig(input);
      const saved = await this.read();
      const record = { id: randomUUID(), preset, name: presetNames[preset], revision: (saved.presets[preset]?.revision || 0) + 1, savedAt: new Date().toISOString(), projectId, config };
      saved.presets[preset] = record;
      saved.history = [...saved.history, record].slice(-100);
      const temporary = `${this.file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify(saved, null, 2), { flag: 'wx' });
        await rename(temporary, this.file);
      } finally { await unlink(temporary).catch(() => {}); }
      return record;
    });
    // Serialize saves from LAN clients; one failed request must not block later saves.
    this.pending = operation.catch(() => {});
    return operation;
  }
}
