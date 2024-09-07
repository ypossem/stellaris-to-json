// Grammar for Stellaris Tech Files

Object "object"
	= s:Statement* {
		let o = {};

		// For each object property
		for(let { op, key, value } of s.filter(x => x != undefined )) {

			// Operators
			switch(op) {
				case ">=":
					value = { greaterThanOrEqual : value };
					break;

				case "<=":
					value = { lessThanOrEqual : value };
					break;
				
				case ">":
					value = { greaterThan : value };
					break;
				
				case "<":
					value = { lessThan : value };
					break;
			}

			let isArray = Array.isArray(o[key]);
			let exists = key in o;

			// 
			if( exists && isArray ) {
				o[key].push(value);
			} else if(exists && !isArray) {
				o[key] = [o[key], value];
			} else {
				o[key] = value;
			}
		}
		
		return o;
	}

Statement "statement"
	= _ s:( Comment / Property / EOL ) _ { return s; }

Property
	= key:Identifier _ op:Operator? _ colorKey:ColorKey _ value:Value { return { op, key : colorKey, value }; }
    / key:Identifier _ op:Operator _ value:Value { return { op, key, value }; }

ColorKey
	= "rgb"
    / "hsv"

Operator
	= ">=" / "<=" / "=" / ">" / "<"

Value "value"
	= _ Comment* _ val:( Map / Array / Boolean / String / Identifier ) _ Comment* _ { return val; }

Map "map"
	= "{" _ "}" { return {}; }
	/ "{" obj:Object "}" { return obj; }

Array "array"
	 = "{" arr:Value+ "}" { return arr; }

Comment "comment"
	= _ "#" body:( !EOS . )* EOS { }

Identifier
	= value: Constant
	/ value: String
	/ value: Word
    / value: Calculation
	/ value: Number

Constant "constant"
	= "@" word:Word { return text(); }

Boolean "boolean"
	= "yes" EOS { return true; }
	/ "no" EOS { return false; }

Word "word"
	= [A-Za-z_][A-Za-z0-9.:@_'\x9F-\xFFFFFF-]* { return text(); }
	/ [0-9]+[A-Za-z:_-]+[A-Za-z0-9.:@_'\x9F-\xFFFFFF-]* { return text(); }

String
	= '"' quote: NotQuote* '"' { return quote.join(""); }

NotQuote
	= !'"' char: . { return char }

Calculation
	= Division
   
Division
	= v1:Number _ "/" _ v2:Number { return +v1 / +v2; }

Number "number"
	= "-"? "+"? [0-9]+ "." [0-9]+ "f"? { return parseFloat(text()); }
	/ "-"? "+"? [0-9]+ { return parseInt(text(), 10); }

_ "whitespace"
	= [ \t\v\f\r\n\u00A0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]* { return undefined; }

EOS "EOS"
	= EOL
	/ EOF

EOL "EOL"
	= "\r\n" { }
	/ "\n" { }

EOF "EOF"
	= !. { }
