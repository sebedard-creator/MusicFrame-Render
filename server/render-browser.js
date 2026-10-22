import { chromium } from 'playwright';

export function launchRenderBrowser(useHardware) {
  const gpuArgs = process.platform === 'win32'
    ? ['--use-angle=d3d11', '--enable-gpu']
    : ['--enable-gpu'];
  return chromium.launch({
    headless: true,
    // The default headless shell is a console executable on Windows. Playwright
    // does not hide its console when our server runs without a parent terminal.
    ...(process.platform === 'win32' ? { channel: 'chromium' } : {}),
    args: useHardware ? gpuArgs : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
}
