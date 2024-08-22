import { readdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

export default function (dir) {
  return readdirSync(resolve(dir, 'src/mock')).reduce((data, file) => {
    const obj = JSON.parse(readFileSync(resolve(dir, `src/mock/${file}`), 'utf-8'));

    if (file.includes('.standalone')) {
      Object.keys(obj).forEach((key) => {
        data[key] = obj[key];
      });
    } else {
      data[file.replace('.json', '')] = obj;
    }

    return data;
  }, {});
}
