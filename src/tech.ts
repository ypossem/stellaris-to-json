import { readFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import * as peggy from 'peggy';
import {mkdir, readFile, writeFile} from 'node:fs/promises';


type StdObj = Record<string, any>

function objectFilterInplace(object: Record<any, any>, callback: (key: any, value: any) => boolean) {
  for (const k in Object.keys(object)) {
    const v = object[k];
    const remove = !callback(k,v);
    if (remove) {
      delete object[k];
    }
  }
}

function objectForEach(object: Record<any, any>, callback: (key: any, value: any) => void) {
  for (const k in Object.keys(object)) {
    const v = object[k];
    callback(k,v);
  }
}

// Considering x is NonNullable<T>
function isObject(o: unknown): o is NonNullable<object> {
  return !!o && typeof o === 'object'
}


const readSingleTech = (
  opts: {
  basePath: string,
  outBasePath: string
  stellarisParser: peggy.Parser
},
  dataParam: {
  I18N_DATA: Record<string, any>,
  WEAPON_DATA: Record<string, any>,
  GLOBAL_VARS: Record<string, any>,
}
)=>
  async (techDataFilePath: string) => {
    const {basePath: baseDir, stellarisParser, outBasePath} = opts
    const {GLOBAL_VARS, I18N_DATA, WEAPON_DATA} = dataParam
    if(
      ['scripted_variables', 'random_names']
        .some(v => techDataFilePath.includes('/' + v + '/'))
    || ['_tags', 'README', 'HOW_TO_MAKE_NEW_SHIPS']
      .some(v => techDataFilePath.endsWith(v + '.txt'))
    ) {
      return;
    }
    const outFileDirPath = path.join(outBasePath, path.dirname(path.relative(baseDir, techDataFilePath)));
    await mkdir(outFileDirPath, {recursive: true});
    let techDataRaw = await readFile(techDataFilePath, {encoding: 'utf-8'});
    // Clean up some typos in some of the files so the PEGJS parser doesn't choke
    const knownIssueFixes: [RegExp, string][] = [
      [/min = ([0-9]+) max ([0-9]+)/g, 'min = $1 max = $2']	// Missing equal sign in some case
    ];
    knownIssueFixes.forEach(v => { techDataRaw = techDataRaw.replace(v[0], v[1]); });

    const techData = stellarisParser.parse(techDataRaw);
  
    // Extract our our local vars
    const localVars:Record<any, any> = {};
  
    objectFilterInplace(techData, (k, v) =>
    {
      if(!k.startsWith('@'))
        return true;

      localVars[k] = v;
      return false;
    });

    function addStandardI18NData(o: StdObj, key:string) {
      objectForEach({
        localizedName : [''],
        localizedDesc : ['_desc', '_DESC']
      }, (propName: string, keySuffixes: string[]) => keySuffixes.forEach(keySuffix =>
      {
        if(Object.hasOwn(I18N_DATA, key + keySuffix))
          o[propName] = I18N_DATA[key + keySuffix];
      }));
    }

    // Replace any referenced variables with the actual data and also I18N keys and insert weapon data
    function enhanceAndModify(o: StdObj)
    {
      if(Object.hasOwn(o,'key'))
      {
        addStandardI18NData(o, o.key);

        if(Object.hasOwn(WEAPON_DATA, o.key))
          Object.assign(o, WEAPON_DATA[o.key]);
      }

      objectForEach(o, (k, v) =>
      {
        if(isObject(v))
        {
          addStandardI18NData(v, k);
          enhanceAndModify(v);
        }
        else if(Array.isArray(v))
        {
          v.forEach(subValue =>
          {
            if(isObject(subValue))
              enhanceAndModify(subValue);
          });
        }
        else if(typeof v==='string')
        {
          if(v.startsWith('@'))
          {
            if(!Object.hasOwn(localVars, v) && !Object.hasOwn(GLOBAL_VARS, v))
              return console.error('\nFailed to find variable reference [%s] in file: %s', v, path.relative(baseDir, techDataFilePath));

            o[k] = Object.hasOwn(localVars, v) ? localVars[v] : GLOBAL_VARS[v];
          }
          else if(Object.hasOwn(I18N_DATA, v) && !['key'].includes(k))
          {
            o[k] = I18N_DATA[v];
          }
        }
      });
    }

    enhanceAndModify(techData);
    const outFileName = path.join(outFileDirPath, path.basename(techDataFilePath, path.extname(techDataFilePath)) + '.json')
    await writeFile(outFileName, JSON.stringify(techData), 'utf-8');
  };

export async function readTech(opts: {basePath: string, outBasePath: string}, dataParam: {
  I18N_DATA: Record<string, any>,
  WEAPON_DATA: Record<string, any>,
  GLOBAL_VARS: Record<string, any>,
}) {
  const {basePath, outBasePath} = opts
  const stellarisGrammarPath = path.join(__dirname, 'stellaris.pegjs');
  const stellarisGrammarRaw = readFileSync(stellarisGrammarPath, {encoding: 'utf8'});

  const stellarisParser = peggy.generate(stellarisGrammarRaw);
  const files = glob(path.join(basePath, '**/*.txt'));

  await Promise.allSettled((await files).map(readSingleTech({basePath, stellarisParser, outBasePath}, dataParam)));

}