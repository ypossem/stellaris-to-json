import { readFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';
import * as peggy from 'peggy';
import {mkdir, readFile} from 'node:fs/promises';

const OUT_DIR_PATH = path.join(__dirname, 'json');

function objectFilterInplace(object: Record<any, any>, callback: (key: any, value: any) => boolean) {
  for (const k in Object.keys(object)) {
    const v = object[k];
    const remove = !callback(k,v);
    if (remove) {
      delete object[k];
    }
  }
}

const readSingleTech = (baseDir: string, stellarisParser: peggy.Parser)=>
  async (techDataFilePath: string) => {
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
    const knownIssueFixes = [
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

    function addStandardI18NData() {
    // TODO
    }
  };

export async function readTech(baseDir: string) {
  const stellarisGrammarPath = path.join(__dirname, 'stellaris.pegjs');
  const stellarisGrammarRaw = readFileSync(stellarisGrammarPath, {encoding: 'utf8'});

  const stellarisParser = peggy.generate(stellarisGrammarRaw);
  const files = glob(path.join(baseDir, '**/*.txt'));

  await Promise.allSettled((await files).map(readSingleTech(baseDir, stellarisParser)));

}