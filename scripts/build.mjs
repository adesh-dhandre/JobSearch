import { access } from 'node:fs/promises';
for (const file of ['public/index.html','public/app.js','public/style.css','public/seed.json']) await access(file);
console.log('Static dashboard ready. Netlify builds the functions during deployment.');
