import { copyFile, mkdir, chmod } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ffmpeg = require('ffmpeg-static');
const ffprobe = require('ffprobe-static').path;
await mkdir('vendor/runtime', { recursive: true });
for (const [name, source] of [['ffmpeg', ffmpeg], ['ffprobe', ffprobe]]) {
  await copyFile(source, `vendor/runtime/${name}`);
  await chmod(`vendor/runtime/${name}`, 0o755);
}
