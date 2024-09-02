import { readFileSync } from "fs";
import path from "path";

function isNumeric(str: string): boolean {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(+str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }

export function readWeapons(baseDir: string) {
    const weaponsFile = path.join(baseDir, 'component_templates', "weapon_components.csv")
    const weaponsDataRaw = readFileSync(weaponsFile, {encoding: 'utf8'})

    const WEAPON_DATA: {[key:string]: any} = {};
    const colNames: string[] = [];
    weaponsDataRaw.toString().split("\n").forEach(lineRaw =>
    {
        const line = lineRaw.trim();
        if(line.length===0 || line.startsWith("#"))
            return;

        const parts = line.split(";");
        if(colNames.length===0)
            return colNames.push(...line.split(";"));
        
        if(parts.length!==colNames.length)
            return console.error("weapon_components.csv line has [%d] columns but expected [%d] for line: %s", parts.length, colNames.length, lineRaw);

        const weaponData = Object.assign({}, ...colNames.map((k, i) =>
        {
            if(k.endsWith("_penetration"))
                return !!(+parts[i]);

            return {[k]: isNumeric(parts[i]) ? +parts[i] : parts[i]};
        }));
        WEAPON_DATA[weaponData.key] = weaponData;
        ["key", "end"].forEach(v => { delete weaponData[v]; });
    });

    return WEAPON_DATA
}