import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'pixi-3d',
    environment: 'node',
    // Rendering needs a GPU; the picoCAD reading it builds on is tested in @anomnomnomaly/picocad
    passWithNoTests: true,
  },
});
