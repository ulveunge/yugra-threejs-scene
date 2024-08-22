import { readdirSync } from 'fs';
import { resolve } from 'path';

export default function (dir) {
  return readdirSync(resolve(dir))
    .filter((file) => file.endsWith('.html') && file !== 'index.html')
    .reduce((entries, file) => {
      entries[file.replace('.html', '')] = resolve(dir, file);
      return entries;
    }, {});
}
