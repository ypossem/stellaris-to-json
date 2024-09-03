import { readFileSync } from "fs";
import path from "path";

export function readGlobalData(baseDir: string) {
    const globalVarsPath = path.join(baseDir, 'scripted_variables', "00_scripted_variables.txt")
    const globalVarsDataRaw = readFileSync(globalVarsPath, {encoding: 'utf8'})

    const GLOBAL_VARS: {[key:string]: any} = {};
    // Just use some quick regex to extract the global vars. I could use use the pegjs file, but meh, this is quick and easy.
    globalVarsDataRaw.toString().split("\n").forEach(line =>
    {
        const varMatches = line.trim().match(/(@[^ =]+)[ ]*=[ ]*([^\n]+)/);
        if(!varMatches)
            return;

        GLOBAL_VARS[varMatches[1]] = +varMatches[2];
    });

    return GLOBAL_VARS
}