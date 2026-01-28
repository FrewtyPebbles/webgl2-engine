import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const extensions = [".fs", ".vs", ".gs", ".glsl"]

var shaders:fs.PathOrFileDescriptor[] = [];

for (const extension of extensions) {
  shaders = shaders.concat(globSync(`src/**/*${extension}`));
}

shaders.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const tsContent = `export default \`${content.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;`;
  fs.writeFileSync(`${file}.ts`, tsContent);
});