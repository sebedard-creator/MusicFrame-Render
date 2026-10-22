import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SavedSettings } from '../server/saved-settings.js';
import { defaults, validateConfig } from '../server/config.js';
import { presets, legacyPresets, photoModelIds } from '../public/presets.js';

test('catalog retirement preserves historical saves and stable spectrum photo selections', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'musicframe-render-settings-'));
  assert.equal(path.dirname(directory), os.tmpdir());
  assert.ok(path.basename(directory).startsWith('musicframe-render-settings-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const retired = ['pulse', 'phase', 'intarsia', 'feedback', 'sculpt', 'kinetic', 'wavefield', 'portal', 'advection', 'lamella'];
  const historical = retired.map(preset => ({ preset, revision: 3, config: validateConfig({ ...defaults, ...legacyPresets[preset], preset }) }));
  await writeFile(path.join(directory, 'saved-settings.json'), JSON.stringify({ version: 1, presets: Object.fromEntries(historical.map(record => [record.preset, record])), history: historical }));
  const store = new SavedSettings(directory);
  assert.equal(Object.keys(presets).length, 21);
  for (const preset of retired) {
    assert.ok(!Object.hasOwn(presets, preset));
    await assert.rejects(store.save(preset, { ...defaults, preset }, 'new-project'));
  }
  for (const [preset, config] of Object.entries(presets)) {
    const before = await store.read();
    await store.save(preset, { ...defaults, ...config, preset }, 'active-project');
    const after = await new SavedSettings(directory).read();
    for (const key of Object.keys(before.presets)) assert.deepEqual(after.presets[key], before.presets[key]);
  }
  await assert.rejects(store.save('led', { ...defaults, ledSpacing: 0 }, 'invalid'));
  await assert.rejects(store.save('led', { ...defaults, preset: 'crt' }, 'mismatch'));
  const before = await store.read();
  await Promise.all([
    store.save('led', { ...defaults, ledSpacing: 12 }, 'lan-a'),
    store.save('led', { ...defaults, ledSpacing: 9, ledFill: .29 }, 'lan-b'),
  ]);
  const after = await new SavedSettings(directory).read();
  assert.equal(after.presets.led.revision, before.presets.led.revision + 2);
  assert.equal(after.presets.led.config.ledSpacing, 9);
  assert.equal(after.presets.led.config.ledFill, .29);
  assert.equal(after.history.length, before.history.length + 2);
  assert.deepEqual(after.history.slice(0, historical.length), historical);
  for (const record of historical) assert.deepEqual(after.presets[record.preset], record);
  for (const preset of Object.keys(legacyPresets)) await assert.rejects(store.save(preset, { ...defaults, preset }, 'rejected'));
  for (const [id, preset] of [[8,'crt'],[11,'morph'],[19,'plexus'],[20,'spectrum'],[21,'chrono'],[22,'sculpt'],[23,'holo'],[24,'kinetic'],[25,'wavefield'],[26,'portal'],[27,'advection'],[28,'lamella'],[29,'dataGrains'],[30,'orbit']]) assert.equal(photoModelIds[id-1], preset);
});
