import { readdir, readFile, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { execFileSync } from 'node:child_process';
const inspect = async folder => {
  const files = await readdir(folder), result = {};
  for (const file of files.filter(name=>name.endsWith('.js'))) {
    const bytes = await readFile(`${folder}/${file}`);
    const key = file.startsWith('index-') ? 'entry' : file.startsWith('VirgoScene-') ? 'scene' : /^(react-three-fiber(?:\.esm)?|useQualityTier)-/.test(file) ? 'threeShared' : file.startsWith('ZneyOS-') ? 'os' : file.startsWith('DesktopOverlay-') ? 'playground' : null;
    if (key) result[key]={file,bytes:bytes.length,gzipBytes:gzipSync(bytes).length};
  }
  return result;
};
const baseline = await inspect('scripts/.cache/baseline/dist/assets'), current = await inspect('dist/assets');
const sum = bundle=>['entry','scene','threeShared'].reduce((n,key)=>n+bundle[key].gzipBytes,0);
const delta = sum(current)-sum(baseline);
const report = {baselineCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),baseline,current,portfolioGzipDelta:delta,portfolioLimit:30000,osAdditionalGzip:current.os.gzipBytes+current.playground.gzipBytes,osLimit:120000};
if (delta>30000 || report.osAdditionalGzip>120000) throw new Error('Experience bundle budget exceeded');
await writeFile('docs/qa/bundle-budgets.json',JSON.stringify(report,null,2)+'\n');
console.log(`Portfolio entry + scene + shared 3D delta: ${delta} gzip bytes; OS + Playground: ${report.osAdditionalGzip} gzip bytes.`);
