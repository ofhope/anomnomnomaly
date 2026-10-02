/** A picoCAD texture's size in pixels */
export const TEXTURE_WIDTH = 128;
export const TEXTURE_HEIGHT = 120;

/** One face of an object: a polygon of three or more vertices */
export interface PicoCADFace {
  /** Indices into the object's vertices, 0-based (picoCAD's are 1-based) */
  vertices: number[];
  /** PICO-8 palette index, used when the face isn't textured */
  color: number;
  /** Texture coordinates per vertex, in pixels */
  uvs: [number, number][];
  /** Drawn from both sides */
  doubleSided: boolean;
  /** Not lit: drawn at full brightness */
  unlit: boolean;
  /** A plain colour rather than the texture */
  untextured: boolean;
  /** Drawn before the rest, as a backdrop (picoCAD's `prio`) */
  priority: boolean;
}

export interface PicoCADObject {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  /** Vertex positions, relative to the object's position */
  vertices: [number, number, number][];
  faces: PicoCADFace[];
}

/** A whole picoCAD save: its objects and its one texture */
export interface PicoCADModel {
  name: string;
  /** The editor's zoom level, kept for round-tripping */
  zoom: number;
  /** Background colour (PICO-8 palette index) */
  background: number;
  /** The colour drawn as transparent in the texture (PICO-8 palette index) */
  alpha: number;
  objects: PicoCADObject[];
  /** TEXTURE_WIDTH × TEXTURE_HEIGHT PICO-8 palette indices, row by row */
  texture: Uint8Array;
}

/** RGB triples, 0–255 */
export type Palette = readonly (readonly [number, number, number])[];
