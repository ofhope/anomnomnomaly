/**
 * picoCAD's save format, a `.txt` file in three parts:
 *
 * 1. a header line, `picocad;<name>;<zoom>;<background>;<alpha>`
 * 2. a Lua table of objects: each has a name, position, rotation, vertices, and faces (vertex
 *    indices plus `c` colour, `uv` coordinates in 8-pixel units, and flags `dbl`, `noshade`,
 *    `notex`, `prio`)
 * 3. after a `%`, the texture: 120 rows of 128 hex digits, each a PICO-8 palette index
 */
import type { PicoCADFace, PicoCADModel, PicoCADObject } from './types.js';
import { TEXTURE_HEIGHT, TEXTURE_WIDTH } from './types.js';

type LuaValue = number | string | LuaTable;
interface LuaTable {
  list: LuaValue[];
  fields: Record<string, LuaValue>;
}

/**
 * Reads a picoCAD save file.
 *
 * @example
 * ```ts
 * const model = parsePicoCAD(await readFile('station.txt', 'utf8'));
 * model.objects[0].faces.length;
 * ```
 */
export function parsePicoCAD(text: string): PicoCADModel {
  const newline = text.indexOf('\n');
  const header = text.slice(0, newline).trim().split(';');

  if (header[0] !== 'picocad') throw new Error('not a picoCAD file: it should start with "picocad;"');

  const split = text.indexOf('%');
  const scene = parseLua(text.slice(newline + 1, split < 0 ? undefined : split));
  const texture = new Uint8Array(TEXTURE_WIDTH * TEXTURE_HEIGHT);
  const rows = split < 0 ? [] : text.slice(split + 1).trim().split(/\s+/);

  for (let y = 0; y < TEXTURE_HEIGHT; y++) {
    for (let x = 0; x < TEXTURE_WIDTH; x++) {
      texture[y * TEXTURE_WIDTH + x] = parseInt(rows[y]?.[x] ?? '0', 16) || 0;
    }
  }

  return {
    name: header[1] ?? '',
    zoom: Number(header[2] ?? 0),
    background: Number(header[3] ?? 0),
    alpha: Number(header[4] ?? -1),
    objects: scene.list.map((o) => readObject(asTable(o))),
    texture,
  };
}

function readObject(t: LuaTable): PicoCADObject {
  const vec = (v: LuaValue | undefined): [number, number, number] => {
    const l = v === undefined ? [] : asTable(v).list;

    return [Number(l[0] ?? 0), Number(l[1] ?? 0), Number(l[2] ?? 0)];
  };

  return {
    name: String(t.fields.name ?? ''),
    position: vec(t.fields.pos),
    rotation: vec(t.fields.rot),
    vertices: asTable(t.fields.v).list.map(vec),
    faces: asTable(t.fields.f).list.map((f) => readFace(asTable(f))),
  };
}

function readFace(t: LuaTable): PicoCADFace {
  const uv = t.fields.uv === undefined ? [] : asTable(t.fields.uv).list.map(Number);
  const vertices = t.list.map((i) => Number(i) - 1);
  const flag = (key: string) => Number(t.fields[key] ?? 0) === 1;

  return {
    vertices,
    color: Number(t.fields.c ?? 0),
    // picoCAD's UV unit is 8 texture pixels
    uvs: vertices.map((_, j) => [Number(uv[j * 2] ?? 0) * 8, Number(uv[j * 2 + 1] ?? 0) * 8]),
    doubleSided: flag('dbl'),
    unlit: flag('noshade'),
    untextured: flag('notex'),
    priority: flag('prio'),
  };
}

function asTable(v: LuaValue | undefined): LuaTable {
  if (v === undefined || typeof v !== 'object') throw new Error('malformed picoCAD file: expected a table');

  return v;
}

/** Just enough Lua: tables (with positional entries and `key=value` fields), numbers and strings */
function parseLua(src: string): LuaTable {
  let i = 0;

  const skip = () => {
    while (i < src.length && /[\s,;]/.test(src[i])) i++;
  };

  const value = (): LuaValue => {
    skip();

    const c = src[i];

    if (c === '{') return table();
    if (c === "'" || c === '"') {
      const end = src.indexOf(c, i + 1);
      const s = src.slice(i + 1, end);

      i = end + 1;

      return s;
    }

    const m = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i.exec(src.slice(i));

    if (!m) throw new Error(`malformed picoCAD file near "${src.slice(i, i + 24)}"`);
    i += m[0].length;

    return Number(m[0]);
  };

  const table = (): LuaTable => {
    const t: LuaTable = { list: [], fields: {} };

    i++; // {
    for (;;) {
      skip();
      if (i >= src.length) throw new Error('malformed picoCAD file: unclosed table');
      if (src[i] === '}') {
        i++;

        return t;
      }

      const key = /^([A-Za-z_]\w*)\s*=/.exec(src.slice(i));

      if (key) {
        i += key[0].length;
        t.fields[key[1]] = value();
      } else {
        t.list.push(value());
      }
    }
  };

  skip();

  const root = value();

  return asTable(root);
}
