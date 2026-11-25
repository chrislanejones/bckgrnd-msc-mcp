import { parentPort, workerData } from 'node:worker_threads';
import { readFileSync } from 'node:fs';
import { Engine, initSync } from '../vendor/engine/bckgrnd_msc_engine.js';
import { renderProject } from '../vendor/shared/runtime.js';

// Each render has its own WASM instance and seeded noise stream, just like the
// browser export worker. Live/previous playback cannot change this revision.
try {
  initSync({ module: readFileSync(new URL('../vendor/engine/bckgrnd_msc_engine_bg.wasm', import.meta.url)) });
  const result = await renderProject(Engine, workerData.snapshot, workerData.source, workerData.settings,
    undefined, (progress) => parentPort!.postMessage({ progress }));
  parentPort!.postMessage({ result }, [result.wav.buffer as ArrayBuffer]);
} catch (error) { parentPort!.postMessage({ error: (error as Error).message }); }
