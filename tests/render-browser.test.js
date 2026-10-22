import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { launchRenderBrowser } from '../server/render-browser.js';

test('render browser calculates WebGL frames without a Windows console executable', { timeout: 45000 }, async t => {
  const browser = await launchRenderBrowser(false);
  t.after(() => browser.close());
  if (process.platform === 'win32') {
    const cdp = await browser.newBrowserCDPSession();
    const { processInfo } = await cdp.send('SystemInfo.getProcessInfo');
    const pid = processInfo.find(p => p.type === 'browser').id;
    assert.ok(Number.isInteger(pid) && pid > 0);
    const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `$browserProcess=Get-Process -Id ${pid}; $details=Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}'; ` +
      '[pscustomobject]@{path=$browserProcess.Path;commandLine=$details.CommandLine;window=$browserProcess.MainWindowHandle.ToInt64()} | ConvertTo-Json -Compress'],
    { windowsHide: true });
    const details = JSON.parse(stdout);
    assert.match(details.commandLine, /--headless(?:[=\s]|$)/);
    assert.equal(details.window, 0, 'The render browser must not display a window.');
    const executable = await readFile(details.path);
    const peOffset = executable.readUInt32LE(0x3c);
    assert.equal(executable.readUInt16LE(peOffset + 24 + 68), 2,
      'Use a Windows GUI executable in headless mode; the console build opens a terminal.');
    await cdp.detach();
  }
  const page = await browser.newPage();
  const pixel = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const gl = canvas.getContext('webgl2');
    if (!gl) throw Error('WebGL2 is unavailable.');
    gl.clearColor(1, 0.5, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const bytes = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    return Array.from(bytes);
  });
  assert.deepEqual(pixel, [255, 128, 0, 255]);
});
