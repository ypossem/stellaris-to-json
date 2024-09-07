import { Command } from 'commander';
import { readWeapons } from './weapons';
import { exit } from 'process';
import { readGlobalData } from './global-data';
import { readTech } from './tech';
const program = new Command();

program
  .name('Stellaris to JSON')
  .description('convert Stellaris data files to json')
  .argument('<stelDir>', 'Location of the base stellaris directory')
  .option('-n --i18dir <dir>', 'Location of directory containing I18N yaml files')
  .option('-o --output <dir>', 'Output directory of produced files');

program.parse();

const options = program.opts();
console.debug(program);

if (program.processedArgs.length < 1) {
  console.warn('Directory for Stellaris required');
  exit(1);
}
if (program.processedArgs.length > 1) {
  console.warn('Too many arguments!');
  exit(1);
}


const OUT_DIR_PATH = path.join(__dirname, 'json');

async function main() {
  const basePath = program.processedArgs[0];

  const WEAPON_DATA = readWeapons(basePath);
  console.log(WEAPON_DATA);
  
  const GLOBAL_VARS = readGlobalData(basePath);
  console.debug(GLOBAL_VARS);
  const outBasePath = options.output || OUT_DIR_PATH
  readTech({basePath, outBasePath}, {
    GLOBAL_VARS,
    WEAPON_DATA,
    I18N_DATA: {}
  })
}

main().then(()=>{
  // great, nothing else to do
}).catch((err)=>{
  console.error(err);
});