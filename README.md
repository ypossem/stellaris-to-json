Description
===========

**WARNING** This has not been updated since August 2018. Likely doesn't work with the current Stellaris versions. Also, sadly, the git history was lost.

**WARNING** EXTRA WARNING! This JS uses some old utility code of mine ('@sembiance/xuti;') that may have changed over the years and may no longer be compatible with this code. Shouldn't be hard to refactor the code to workaround it.

Converts game data from [Stellaris](https://store.steampowered.com/app/281990/Stellaris/) into JSON format.

You can run "parseGameData.js" (see below) to generate your own JSON files.

It automatically converts variable references (@variable) to actual values (50.0) (local vars override global vars).

It inserts into each wepaon component weapon values from the weapon_components.csv file.

Provide the path to the language dir and it will add where appropriate "localizedName" and "localizedDesc" attributes.


Requirements
============
nodejs

Install
=======
```
git clone https://github.com/Sembiance/stellaris-to-json.git
cd stellaris-to-json
npm install .
```


Usage
=====
```node parseGameData.js <path to stellaris/common> [path to lang dir]```

Results will be placed into the 'json' directory.


Thanks
======
HUGE THANKS to https://github.com/Chamberlain91/stellaris-tech-parser for the initial PEGJS grammar file which this project was originally based on.
