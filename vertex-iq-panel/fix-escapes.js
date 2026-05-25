import fs from 'fs';
const file = 'server/pgStore.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/\/\\\\\/\\\$\//g, '/\\/$/'); // '/\\\\/$' -> '/\\/$'
content = content.split("baseUrl.replace(/\\\\/$/, '')").join("baseUrl.replace(/\\/$/, '')");
fs.writeFileSync(file, content);
