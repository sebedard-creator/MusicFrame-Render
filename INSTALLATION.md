# Installation

Review [Requirements](REQUIREMENTS.md) first. Windows is the currently tested host platform. Run these commands from the project folder.

## First setup

1. Install Node.js 22 or later, including npm.
2. Install FFmpeg and FFprobe. Add their executable folder to your PATH, or configure `FFMPEG_PATH` and `FFPROBE_PATH` below. FFmpeg must include the `libx264` and `aac` encoders.
3. Install the locked application dependencies and the matching Chromium browser:

   ```sh
   npm ci
   npx playwright install chromium
   ```

On supported Linux hosts, Playwright can also install Chromium's required system libraries:

```sh
npx playwright install --with-deps chromium
```

The browser must be installed for the operating-system account that will run the server. Installations and dependency updates require internet access. Stop the server before replacing dependencies; an active render must finish or be cancelled first.

## Start the server

```sh
npm start
```

On Windows, `demarrer-studio.cmd` uses the built-in PowerShell/CIM process launcher to start the server outside the terminal's Windows Job group. You can close the launcher window; logs and Node.js fatal-error reports are kept in `data/logs/`. Running it again reuses an already running server, without changing how that process was started. Finish any active render before restarting an older server through the independent launcher. With a manual `npm start`, keep its terminal open for the duration of the render. The independent launcher does not create a scheduled task, change PowerShell execution policy or install a Windows service.

Open **http://localhost:5180** on the host. Other devices can use the LAN address printed at startup. Allow Node.js through the host firewall on your private network if necessary. The interface has no authentication and is intended for a trusted LAN.

## Configuration

Set environment variables before starting the server.

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port; default `5180`. |
| `HOST` | Listening address; default `0.0.0.0`. |
| `DATA_DIR` | Data directory; default `data/` inside the project. |
| `FFMPEG_PATH` | Full path to FFmpeg if it is outside PATH. |
| `FFPROBE_PATH` | Full path to FFprobe if it is outside PATH. |
| `VISUALIZER_GPU=off` | Use software rendering. |
| `VISUALIZER_ENCODER=cpu` | Use software x264 encoding. |

Example in PowerShell:

```powershell
$env:FFMPEG_PATH = 'C:\Tools\ffmpeg\bin\ffmpeg.exe'
$env:FFPROBE_PATH = 'C:\Tools\ffmpeg\bin\ffprobe.exe'
npm start
```

For another installation, copy `data/saved-settings.json` to retain your presets. Keep the server account's read/write access to the data directory. The application creates its working directories automatically.

## Verify the installation

```sh
node --version
npm ls --depth=0
ffmpeg -version
ffprobe -version
npx playwright install --list
```

Use the configured executable paths for these checks if FFmpeg or FFprobe is outside PATH.

For development validation, the default `npm ci` also installs the test dependencies. Run `npm test` while the renderer is idle: integration tests perform real video exports and use additional CPU and memory. The FFmpeg build must include `libmp3lame` to generate the MP3 test fixtures.
