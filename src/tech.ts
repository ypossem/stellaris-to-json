import { readFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import * as peggy from 'peggy';
import {mkdir, readFile} from 'node:fs/promises';

const OUT_DIR_PATH = path.join(__dirname, 'json');

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


const readSingleTech = (baseDir: string, stellarisParser: peggy.Parser, dataParam: {
  I18N_DATA: Record<string, any>,
  WEAPON_DATA: Record<string, any>,
  GLOBAL_VARS: Record<string, any>,
})=>
  async (techDataFilePath: string) => {
    const {GLOBAL_VARS, I18N_DATA, WEAPON_DATA} = dataParam
    if(
      ['scripted_variables', 'random_names']
        .some(v => techDataFilePath.includes('/' + v + '/'))
    || ['_tags', 'README', 'HOW_TO_MAKE_NEW_SHIPS']
      .some(v => techDataFilePath.endsWith(v + '.txt'))
    ) {
      return;
    }
    const outFileDirPath = path.join(OUT_DIR_PATH, path.dirname(path.relative(baseDir, techDataFilePath)));
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
    // TODO
    }

    // Replace any referenced variables with the actual data and also I18N keys and insert weapon data
    function enhanceAndModify(o: StdObj)
    {
      if(o.hasOwnProperty('key'))
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
            if(!localVars.hasOwnProperty(v) && !GLOBAL_VARS.hasOwnProperty(v))
              return console.error('\nFailed to find variable reference [%s] in file: %s', v, path.relative(COMMON_DIR_PATH, techDataFilePath));

            o[k] = localVars.hasOwnProperty(v) ? localVars[v] : GLOBAL_VARS[v];
          }
          else if(I18N_DATA.hasOwnProperty(v) && !['key'].includes(k))
          {
            o[k] = I18N_DATA[v];
          }
        }
      });
    }

    enhanceAndModify(techData);
  };

export async function readTech(baseDir: string) {
  const stellarisGrammarPath = path.join(__dirname, 'stellaris.pegjs');
  const stellarisGrammarRaw = readFileSync(stellarisGrammarPath, {encoding: 'utf8'});

  const stellarisParser = peggy.generate(stellarisGrammarRaw);
  const files = glob(path.join(baseDir, '**/*.txt'));

  await Promise.allSettled((await files).map(readSingleTech(baseDir, stellarisParser)));

}