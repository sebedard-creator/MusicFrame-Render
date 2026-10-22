# Requirements

## Host prerequisites

| Component | Requirement |
| --- | --- |
| Node.js and npm | Node.js **22 or later**, with npm included. |
| FFmpeg | Available on PATH or through `FFMPEG_PATH`; must decode MP3 and WAV/PCM, encode H.264 with `libx264`, and encode AAC audio. |
| FFprobe | Available on PATH or through `FFPROBE_PATH` for media inspection. |
| Chromium | The browser version provided by the installed Playwright package; installed separately with `npx playwright install chromium`. |
| Graphics | Working Chromium WebGL rendering. A GPU is optional; software rendering is supported. |
| Storage | Read/write access and sufficient free space for imports, normalized images, analysis, temporary audio and the finished video. |
| Client browser | A current browser that can access the host's LAN address and upload files. |

Windows is the tested host platform. Other hosts require a compatible Node.js/Playwright installation and Chromium's system libraries. GPU rendering requires working graphics drivers; NVENC additionally requires a compatible NVIDIA GPU, driver and FFmpeg build. Hardware encoding is used only after a successful capability check.

The independent Windows launcher uses the system's built-in Windows PowerShell and CIM/WMI (`Win32_Process.Create`) to avoid inheriting the launching terminal's process group. PowerShell script execution policy is not changed.

The input limits are **12 hours of audio**, **16 GB per uploaded file**, **300 images**, **1 GB of extracted ZIP contents**, **80 MB per ZIP entry** and **64 megapixels per image**. These are acceptance limits, not guarantees of available disk space or rendering speed.

## Application dependencies

[`package.json`](package.json) is the dependency manifest; [`package-lock.json`](package-lock.json) pins the complete dependency tree. Install with `npm ci` as described in [Installation](INSTALLATION.md). Native image libraries are supplied through Sharp's platform packages.

| Package | Version | Role |
| --- | --- | --- |
| `express` | 5.3.0 | HTTP server and LAN interface. |
| `multer` | 2.4.0 | Audio and ZIP uploads. |
| `yauzl` | 3.4.0 | ZIP extraction. |
| `sharp` | 0.35.5 | Image decoding, normalization and thumbnails. |
| `fft.js` | 4.0.4 | Audio frequency analysis. |
| `three` | 0.186.1 | WebGL effects and composition. |
| `playwright` | 1.64.1 | Headless Chromium rendering. |
| `ws` | 8.22.0 | Local frame transport to the encoder. |
| `butterchurn` | 2.6.7 | Compatibility with retained historical effects. |

Optional dependency: **`bufferutil` 4.1.0**, a native WebSocket accelerator. The application works without it.

Development dependency: **`yazl` 3.3.1**, used to generate ZIP fixtures for tests and diagnostics. Automated tests also require FFmpeg's **`libmp3lame`** encoder. Node.js provides the test runner.

Adapted shaders and effect sources are bundled in `public/vendor/`; their licenses and origins are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). FFmpeg, FFprobe and Playwright's Chromium browser are external prerequisites and are not installed by `npm ci` alone.
