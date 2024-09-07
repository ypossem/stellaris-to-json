import * as exBase from '@sembiance/xbase';
import {file as exfileUtil} from '@sembiance/xutil';

const 
	
  glob = require('glob'),
  cliProgress = require('cli-progress'),
  tiptoe = require('tiptoe'),
  mkdirp = require('mkdirp'),
  pegjs = require('pegjs'),
  fs = require('fs');

if(process.argv.length<3 || !exfileUtil.existsSync(process.argv[2]))
  return (console.log('Usage: node %s <path to stellaris/common>', path.basename(process.argv[1])), process.exit(1));

const I18N_DIR_PATH = process.argv.length>=4 ? process.argv[3] : null;
const OUT_DIR_PATH = path.join(__dirname, 'json');
const COMMON_DIR_PATH = process.argv[2];
const WEAPON_DATA = {};
const GLOBAL_VARS = {};
const I18N_DATA = {};

tiptoe(
  function processI18NDataIfNeeded()
  {
    processI18NData(this);
  },
  function loadWeaponsData()
  {
    console.log('Parsing weapons data...');

    fs.readFile(path.join(COMMON_DIR_PATH, 'component_templates', 'weapon_components.csv'), exBase.UTF8, this);
  },
  function processWeaponsData(weaponsDataRaw)
  {
    const colNames = [];
    weaponsDataRaw.toString().split('\n').forEach(lineRaw =>
    {
      const line = lineRaw.trim();
      if(line.length===0 || line.startsWith('#'))
        return;

      const parts = line.split(';');
      if(colNames.length===0)
        return colNames.push(...line.split(';'));
			
      if(parts.length!==colNames.length)
        return console.error('weapon_components.csv line has [%d] columns but expected [%d] for line: %s', parts.length, colNames.length, lineRaw);

      const weaponData = colNames.mapToObject((k, i) =>
      {
        if(k.endsWith('_penetration'))
          return !!(+parts[i]);

        return Number.isNumber(parts[i]) ? +parts[i] : parts[i];
      });
      WEAPON_DATA[weaponData.key] = weaponData;
      ['key', 'end'].forEach(v => { delete weaponData[v]; });
    });

    this();
  },
  function loadGlobalVarsFile()
  {
    console.log('Parsing global variables...');

    fs.readFile(path.join(COMMON_DIR_PATH, 'scripted_variables', '00_scripted_variables.txt'), exBase.UTF8, this);
  },
  function processGlobalVarsData(dataRaw)
  {
    // Just use some quick regex to extract the global vars. I could use use the pegjs file, but meh, this is quick and easy.
    dataRaw.toString().split('\n').forEach(line =>
    {
      const varMatches = line.trim().match(/(@[^ =]+)[ ]*=[ ]*([^\n]+)/);
      if(!varMatches)
        return;

      GLOBAL_VARS[varMatches[1]] = +varMatches[2];
    });

    fs.readFile(path.join(__dirname, 'stellaris.pegjs'), exBase.UTF8, this.parallel());
    glob(path.join(COMMON_DIR_PATH, '**/*.txt'), this.parallel());
  },
  function parseTechFiles(stellarisGrammarRaw, dataFilePaths)
  {
    const stellarisParser = pegjs.generate(stellarisGrammarRaw);

    const progressBar = new cliProgress.Bar({stopOnComplete : true}, cliProgress.Presets.shades_classic);
    console.log('Parsing %d data files...\n', dataFilePaths.length);

    progressBar.start(dataFilePaths.length, 0);

    dataFilePaths.parallelForEach((v, subcb) => parseTechFile(v, stellarisParser, progressBar, subcb), this, 10);
  },
  exBase.FINISH
);

function parseTechFile(techDataFilePath, stellarisParser, progressBar, cb)
{
  // Ignore some directories and files that we don't yet support or don't have any actual data yet
  if(['scripted_variables', 'random_names'].some(v => techDataFilePath.contains('/' + v + '/')) || ['_tags', 'README', 'HOW_TO_MAKE_NEW_SHIPS'].some(v => techDataFilePath.endsWith(v + '.txt')))
  {
    progressBar.increment();
    return cb();
  }

  const outFileDirPath = path.join(OUT_DIR_PATH, path.dirname(path.relative(COMMON_DIR_PATH, techDataFilePath)));
	
  tiptoe(
    function loadTechData()
    {
      fs.readFile(techDataFilePath, exBase.UTF8, this.parallel());
      mkdirp(outFileDirPath, this.parallel());	// Also create our out directory path if needed
    },
    function parseData(techDataRaw)
    {
      // Clean up some typos in some of the files so the PEGJS parser doesn't choke
      [
        [/min = ([0-9]+) max ([0-9]+)/g, 'min = $1 max = $2']	// Missing equal sign in some case
      ].forEach(v => { techDataRaw = techDataRaw.replace(v[0], v[1]); });	 

      const techData = stellarisParser.parse(techDataRaw);

      // Extract our our local vars
      const localVars = {};
      Object.filter(techData, (k, v) =>
      {
        if(!k.startsWith('@'))
          return true;

        localVars[k] = v;
        return false;
      });

      function addStandardI18NData(o, key)
      {
        Object.forEach({
          localizedName : [''],
          localizedDesc : ['_desc', '_DESC']
        }, (propName, keySuffixes) => keySuffixes.forEach(keySuffix =>
        {
          if(I18N_DATA.hasOwnProperty(key + keySuffix))
            o[propName] = I18N_DATA[key + keySuffix];
        }));
      }

      // Replace any referenced variables with the actual data and also I18N keys and insert weapon data
      function enhanceAndModify(o)
      {
        if(o.hasOwnProperty('key'))
        {
          addStandardI18NData(o, o.key);

          if(WEAPON_DATA.hasOwnProperty(o.key))
            Object.merge(o, WEAPON_DATA[o.key], v1 => v1);
        }

        Object.forEach(o, (k, v) =>
        {
          if(Object.isObject(v))
          {
            addStandardI18NData(v, k);
            enhanceAndModify(v);
          }
          else if(Array.isArray(v))
          {
            v.forEach(subValue =>
            {
              if(Object.isObject(subValue))
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
            else if(I18N_DATA.hasOwnProperty(v) && !['key'].contains(k))
            {
              o[k] = I18N_DATA[v];
            }
          }
        });
      }

      enhanceAndModify(techData);

      fs.writeFile(path.join(outFileDirPath, path.basename(techDataFilePath, path.extname(techDataFilePath)) + '.json'), JSON.stringify(techData), exBase.UTF8, this);
    },
    function finish(err)
    {
      progressBar.increment();
			
      if(err)
        console.error('\nError processing [%s] [%s]', path.relative(COMMON_DIR_PATH, techDataFilePath), err);

      cb(err);
    }
  );
}

function processI18NData(cb)
{
  if(!I18N_DIR_PATH)
    return cb();

  console.log('Parsing I18N data...');

  tiptoe(
    function findI18NFiles()
    {
      glob(path.join(I18N_DIR_PATH, '*.yml'), this);
    },
    function processI18NFiles(i18nFilePaths)
    {
      i18nFilePaths.parallelForEach(processI18NFile, this, 10);
    },
    function postProcessI18NData()
    {
      // Several strings reference other strings using $KEY$
      Object.mapInPlace(I18N_DATA, (k, v) =>
      {
        const parts = v.match(/(\$[^$]+\$)/g);
        if(!parts || parts.length===0)
          return v;

        let newValue = v;
        parts.forEach(part =>
        {
          const i18nKey = part.substring(1, (part.contains('|') ? part.indexOf('|') : part.lastIndexOf('$')));
          newValue = newValue.replace(part, I18N_DATA[i18nKey]);
        });

        return newValue;
      });

      this();
    },
    cb
  );
}

function processI18NFile(i18nFilePath, cb)
{
  tiptoe(
    function loadFile()
    {
      fs.readFile(i18nFilePath, exBase.UTF8, this);
    },
    function parseFile(i18nDataRaw)
    {
      i18nDataRaw.toString().split('\n').forEach(lineRaw =>
      {
        const line = lineRaw.trim();
        if(line.length===0 || line.startsWith('#'))
          return;

        const parts = line.match(/([^:]+):[0-9]\s+"([^"]+)"/);
        if(!parts || parts.length!==3)
          return;

        I18N_DATA[parts[1]] = parts[2];
      });

      this();
    },
    cb
  );
}
