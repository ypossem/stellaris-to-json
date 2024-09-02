import { Command } from 'commander';
import { readWeapons } from './weapons';
import { exit } from 'process';
const program = new Command();

program
  .name('Stellaris to JSON')
  .description('convert Stellaris data files to json')
  .argument('<stelDir>', 'Location of the base stellaris directory')
  .option('-i --i18dir <dir>', 'Location of directory containing I18N yaml files')

program.parse();

const options = program.opts();
const limit = options.first ? 1 : undefined;
console.debug(program)

if (program.processedArgs.length < 1) {
    console.warn("Directory for Stellaris required")
    exit(1)
}
if (program.processedArgs.length > 1) {
    console.warn("Too many arguments!")
    exit(1)
}

const basePath = program.processedArgs[0]

const WEAPON_DATA = readWeapons(basePath)
console.log(WEAPON_DATA)
