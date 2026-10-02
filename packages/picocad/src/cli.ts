#!/usr/bin/env node
/**
 * picocad: command-line tools for picoCAD save files
 *
 *   picocad to-glb <in.txt> <out.glb> [--exclude 2,3] [--normalize] [--flip]
 *   picocad info <in.txt>
 *
 * --exclude leaves out objects by number (1-based, as `info` lists them), e.g. a backdrop plane.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

import { picoCADToGLB } from './glb.js';
import { parsePicoCAD } from './parse.js';

const USAGE = `usage:
  picocad to-glb <in.txt> <out.glb> [--exclude 2,3] [--normalize] [--flip]
  picocad info <in.txt>`;

const [command, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith('--')));
const excludeAt = rest.indexOf('--exclude');
// Everything that isn't a flag, or the list after --exclude, is a file
const files = rest.filter((a, i) => !a.startsWith('--') && !(excludeAt >= 0 && i === excludeAt + 1));

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (command === 'info' && files[0]) {
  const model = parsePicoCAD(readFileSync(files[0], 'utf8'));

  console.log(`${model.name}: ${model.objects.length} objects, transparent colour ${model.alpha}`);
  model.objects.forEach((o, i) => console.log(`  ${i + 1}. ${o.name}: ${o.vertices.length} vertices, ${o.faces.length} faces`));
} else if (command === 'to-glb' && files[0] && files[1]) {
  const model = parsePicoCAD(readFileSync(files[0], 'utf8'));
  const exclude = excludeAt >= 0 ? (rest[excludeAt + 1] ?? '').split(',').map((n) => Number(n) - 1) : [];

  if (exclude.some((n) => !Number.isInteger(n) || n < 0 || n >= model.objects.length)) {
    fail(`--exclude takes object numbers from 1 to ${model.objects.length} (see: picocad info ${files[0]})`);
  }

  const glb = picoCADToGLB({ exclude, normalize: flags.has('--normalize'), flip: flags.has('--flip'), deflate: (d) => deflateSync(d) }, model);

  writeFileSync(files[1], glb);
  console.log(`${files[1]}: ${model.objects.length - exclude.length} of ${model.objects.length} objects, ${(glb.length / 1024).toFixed(1)} KB`);
} else {
  fail(USAGE);
}
