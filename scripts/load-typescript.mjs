import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
const nativeRequire=createRequire(import.meta.url),cache=new Map();
/** Test/export only: resolve local TS modules without writing transient source files. */
export function loadTypeScript(file){
 file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const compiled=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const require=specifier=>{
  if(specifier.startsWith('.')){const candidate=path.resolve(path.dirname(file),specifier);for(const ext of ['', '.ts','.tsx'])if(existsSync(candidate+ext)&&/\.tsx?$/.test(candidate+ext))return loadTypeScript(candidate+ext);return nativeRequire(candidate);}
  return nativeRequire(specifier);
 };
 new Function('require','module','exports',compiled)(require,module,module.exports);return module.exports;
}
