import {performance} from 'node:perf_hooks';

export const activeRenderStates = ['starting', 'rendering', 'paused', 'encoding'];

// Hold the next frame acknowledgement, keeping the browser, encoder and their
// streams alive. FFmpeg drains its bounded queue and then waits for more input.
export function createRenderPause(job, now = () => performance.now()) {
  let pending, release, pausedAt = null, pausedMs = 0;
  const pause = () => {
    if (job.status === 'paused') return true;
    if (job.status !== 'rendering') return false;
    pending = new Promise(resolve => { release = resolve; });
    pausedAt = now();
    job.status = 'paused';
    job.message = 'Render paused';
    return true;
  };
  const resume = () => {
    if (!pending) return false;
    pausedMs += now() - pausedAt;
    pausedAt = null;
    const wake = release;
    pending = release = undefined;
    if (job.status === 'paused') {
      job.status = 'rendering';
      job.message = 'Rendering your video';
    }
    wake();
    return true;
  };
  job.pause = pause;
  job.resume = resume;
  return {
    wait: async () => { await pending; },
    elapsed: started => (now() - started - pausedMs - (pausedAt === null ? 0 : now() - pausedAt)) / 1000,
    dispose() {
      resume();
      delete job.pause;
      delete job.resume;
    },
  };
}
