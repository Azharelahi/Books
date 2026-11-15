import { rmSync } from 'node:fs';
import path from 'node:path';

const workspace = path.resolve('.');
const output = path.resolve(workspace, 'dist');
const relative = path.relative(workspace, output);
if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
  throw new Error('Refusing to clean a build directory outside the project workspace.');
}
rmSync(output, { recursive: true, force: true });
