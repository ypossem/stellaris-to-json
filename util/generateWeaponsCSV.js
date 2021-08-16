"use strict";

// This will generate a CSV file of all the weapons in the game, useful for importing into a spreadsheet program and doing filtering/sorting/etc

const base = require("@sembiance/xbase"),
	path = require("path"),
	glob = require("glob"),
	tiptoe = require("tiptoe"),
	fs = require("fs");

tiptoe(
	function findWeaponJSONFiles()
	{
		glob(path.join(__dirname, "..", "json", "component_templates", "*.json"), this);
	},
	function loadWeaponJSONFiles(filePaths)
	{
		filePaths.parallelForEach((filePath, subcb) => fs.readFile(filePath, base.UTF8, subcb), this, 10);
	},
	function processWeaponJSONFiles(jsonDataRaw)
	{
		const COL_NAMES = ["key", "localizedName", "size", "power", "cooldown", "range", "accuracy", "tracking", "missile_speed", "min_damage", "max_damage", "hull_damage", "shield_damage", "armor_damage", "shield_penetration", "armor_penetration"];
		console.log(COL_NAMES.join(";"));

		jsonDataRaw.map(v => JSON.parse(v)).forEach(jsonData =>
		{
			Object.forEach(jsonData, (key, v) => Array.toArray(v).forEach(weaponData =>
			{
				if(!weaponData.hasOwnProperty("min_damage") || weaponData.hidden===true)
					return;

				if(weaponData.localizedName==="Our scientists can make no sense of these.")
					weaponData.localizedName = weaponData.key;

				weaponData.power = Math.abs(weaponData.power);
				["hull_damage", "shield_damage", "armor_damage"].forEach(k => { weaponData[k] = weaponData[k]*100; });

				const row = [];
				COL_NAMES.forEach(k => row.push(weaponData[k]));

				console.log(row.join(";"));
			}));
		});

		this();
	},
	base.FINISH
);
