const fs=require('node:fs');const path=require('node:path');const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');const files=['server.js'];
function walk(relative){for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){const file=path.join(relative,entry.name);if(entry.isDirectory())walk(file);else if(/\.(?:js|cjs)$/.test(file))files.push(file);}}
for(const directory of ['lib','public','scripts','tests'])walk(directory);
for(const file of files){const result=spawnSync(process.execPath,['--check',path.join(root,file)],{encoding:'utf8'});if(result.status!==0){console.error(result.stderr);process.exit(1);}}
for(const file of ['package.json','package-lock.json','public/manifest.webmanifest'])JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')),lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));if(JSON.stringify(pkg.dependencies)!==JSON.stringify(lock.packages[''].dependencies))throw Error('Package dependencies and lockfile root differ.');
if(pkg.version!==lock.version||pkg.version!==lock.packages[''].version)throw Error('Build version and lockfile differ.');
if(!fs.readFileSync(path.join(root,'public/sw.js'),'utf8').includes('gearhub-shell-v53-'+pkg.version))throw Error('Worker cache generation must match the installed build version.');
console.log(`Static validation passed: ${files.length} JavaScript files and 3 JSON files. No production secrets required.`);

if(!fs.readFileSync(path.join(root,"public/index.html"),"utf8").includes(`name="gearhub-build-version" content="${pkg.version}"`))throw Error("HTML build version must match package version.");
