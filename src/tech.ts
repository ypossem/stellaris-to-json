import { readFileSync } from "fs";
import path from "path";
import * as peggy from "peggy";


export function readTech(baseDir: string) {
    const stellarisGrammarPath = path.join(__dirname, "stellaris.pegjs")
    const stellarisGrammarRaw = readFileSync(stellarisGrammarPath, {encoding: 'utf8'})

    const stellarisParser = peggy.generate(stellarisGrammarRaw) 
}