import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {adaptSource} from './adapter.mjs';
await mkdir('generated',{recursive:true});
const source=adaptSource(await readFile('../functions/index.js','utf8'));
await writeFile('generated/handlers.cjs',source);
await build({entryPoints:['src/worker.mjs'],outfile:'dist/worker.mjs',bundle:true,format:'esm',platform:'neutral',target:'es2022',external:['node:*'],minify:true,banner:{js:"import * as __nodeCrypto from 'node:crypto';const require=name=>{if(name==='node:crypto')return __nodeCrypto;throw Error('Unsupported runtime module: '+name);};"}});
