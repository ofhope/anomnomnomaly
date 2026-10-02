/**
 * A minimal PNG encoder for RGBA pixels, with no dependencies, so it runs in browsers and Node
 *
 * PNG wants its pixel data zlib-compressed. Pass a `deflate` (Node's `zlib.deflateSync`, pako's
 * `deflate`, …) to compress it; without one the data is stored uncompressed, which is still a valid
 * PNG, just bigger (a picoCAD texture is ~60 KB stored, a few KB compressed).
 */

/** zlib-wraps bytes: returns a complete zlib stream (header, data, checksum) */
export type Deflate = (data: Uint8Array) => Uint8Array;

export interface PngOptions {
  deflate?: Deflate;
}

/**
 * Encodes RGBA pixels (width × height × 4 bytes) as a PNG file.
 *
 * @example
 * ```ts
 * import { deflateSync } from 'node:zlib';
 * const png = encodePNG({ deflate: deflateSync }, 128, 120, rgba);
 * ```
 */
export function encodePNG(options: PngOptions, width: number, height: number, rgba: Uint8Array): Uint8Array {
  // Each scanline is a filter byte (0: none) then the row's pixels
  const raw = new Uint8Array((width * 4 + 1) * height);

  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);

  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA

  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', (options.deflate ?? storedZlib)(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);

  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));

  return out;
}

/** A zlib stream of uncompressed ("stored") deflate blocks */
function storedZlib(data: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(data.length / 0xffff));
  const out = new Uint8Array(2 + data.length + blocks * 5 + 4);
  let o = 0;

  out[o++] = 0x78;
  out[o++] = 0x01;
  for (let b = 0; b < blocks; b++) {
    const start = b * 0xffff;
    const len = Math.min(0xffff, data.length - start);

    out[o++] = b === blocks - 1 ? 1 : 0;
    out[o++] = len & 0xff;
    out[o++] = len >>> 8;
    out[o++] = ~len & 0xff;
    out[o++] = (~len >>> 8) & 0xff;
    out.set(data.subarray(start, start + len), o);
    o += len;
  }

  new DataView(out.buffer).setUint32(o, adler32(data));

  return out;
}

let crcTable: Uint32Array | null = null;

function crc32(data: Uint8Array): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;

      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }

  let c = 0xffffffff;

  for (const byte of data) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);

  return (c ^ 0xffffffff) >>> 0;
}

function adler32(data: Uint8Array): number {
  let a = 1;
  let b = 0;

  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }

  return ((b << 16) | a) >>> 0;
}

export function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;

  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }

  return out;
}
