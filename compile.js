const fs = require("fs");

// CRITERION //

const CRITERION = {
    "equals_string": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*"(.*?)"$/,
    "equals_number": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "equals_boolean": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*(true|false)$/,
    "greater_than": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*>[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "greater_equal": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*>=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "less_than": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "less_equal": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "lt_lt": /^([+-]?[0-9]*[.]?[0-9]+)[ \t]*<[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "lt_le": /^([+-]?[0-9]*[.]?[0-9]+)[ \t]*<[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "le_lt": /^([+-]?[0-9]*[.]?[0-9]+)[ \t]*<=[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "le_le": /^([+-]?[0-9]*[.]?[0-9]+)[ \t]*<=[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "exists": /^([a-zA-Z][a-zA-Z._\-0-9]*) [ \t]*exists$/,
    "dummy": /^dummy [ \t]*([-+]?\d+)$/,
    "fail": /^fail [ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    "preset": /^([a-zA-Z][a-zA-Z_\-0-9]*)$/
};

function criterionWithKey(key, type, value) {
    obj = {};
    let firstDotIndex = key.indexOf(".");
    if(firstDotIndex > -1) {
        obj["table"] = key.substring(0, firstDotIndex);
        obj["field"] = key.substring(firstDotIndex + 1);
    } else {
        obj["field"] = key;
    }
    
    obj["type"] = type;
    if(value != null) {
        obj["value"] = value;
    }
    
    return obj;
}

function toBoolean(str) {
    if(str == "true") {
        return true;
    } else if(str == "false") {
        return false;
    }
    throw new SyntaxError("Cannot convert \"" + str + "\" to boolean!");
}

function isInteger(num) {
    return num % 1 == 0;
}

function modifyIfInteger(str, modifier) {
    let value = parseFloat(str);
    if(isInteger(value)) {
        return value + modifier;
    }
    return value;
}

function parseCriterion(str) {
    str = str.trim();
    let type = null;
    let result = null;
    for(k in CRITERION) {
        result = CRITERION[k].exec(str);
        if(result != null) {
            type = k;
            break;
        }
    }
    
    if(type == null) {
        throw new SyntaxError("Unable to parse criterion \"" + str + "\"");
    }
    
    let min, max;
    
    switch(type) {
        case "equals_string":
            return criterionWithKey(result[1], "equals", result[2]);
        case "equals_number":
            return criterionWithKey(result[1], "equals", parseFloat(result[2]));
        case "equals_boolean":
            return criterionWithKey(result[1], "equals", toBoolean(result[2]));
        case "greater_than":
            return criterionWithKey(result[1], "min", modifyIfInteger(result[2], 1));
        case "greater_equal":
            return criterionWithKey(result[1], "min", parseFloat(result[2]));
        case "less_than":
            return criterionWithKey(result[1], "max", modifyIfInteger(result[2], -1));
        case "less_equal":
            return criterionWithKey(result[1], "max", parseFloat(result[2]));
        case "lt_lt":
            min = modifyIfInteger(result[1], 1);
            max = modifyIfInteger(result[3], -1);
            if(min == max) {
                return criterionWithKey(result[2], "equals", min);
            }
            return criterionWithKey(result[2], "range", [min, max]);
        case "lt_le":
            min = modifyIfInteger(result[1], 1);
            max = parseFloat(result[3]);
            if(min == max) {
                return criterionWithKey(result[2], "equals", min);
            }
            return criterionWithKey(result[2], "range", [min, max]);
        case "le_lt":
            min = parseFloat(result[1]);
            max = modifyIfInteger(result[3], -1);
            if(min == max) {
                return criterionWithKey(result[2], "equals", min);
            }
            return criterionWithKey(result[2], "range", [min, max]);
        case "le_le":
            min = parseFloat(result[1]);
            max = parseFloat(result[3]);
            if(min == max) {
                return criterionWithKey(result[2], "equals", min);
            }
            return criterionWithKey(result[2], "range", [min, max]);
        case "exists":
            return criterionWithKey(result[1], "equals", null);
        case "dummy":
            return { "type": "dummy", "value": parseInt(result[1]) };
        case "fail":
            return { "type": "fail", "value": parseFloat(result[1]) };
        case "preset":
            return result[1];
        default:
            throw new SyntaxError("Unknown criterion type for \"" + str + "\"");
    }
}

// RULE //

function parseCriteria(str) {
    str = str.trim();
    let criteria = [];
    let tokenList = splitString(str);
    for(let tokenStr of tokenList) {
        criteria.push(parseCriterion(tokenStr));
    }
    return criteria;
}

const LINES_STATEMENT = /^lines[ \t]*=[ \t]*\[([.\S\s]*?)\]$/;
const LINES_LABEL_STATEMENT = /^lines[ \t]*=[ \t]*"([a-zA-Z][a-zA-Z0-9\-_]*)"$/;
const LIST_STATEMENT = /^list[ \t]*([a-zA-Z][a-zA-Z0-9\-_]*)[ \t]*=[ \t]*\[([.\S\s]*?)\]$/;
function parseRuleBody(str, obj) {
    str = str.trim();
    let result;
    let tokenList = splitRuleBody(str);
    let lines = null;
    let lists = {};
    
    for(let tokenStr of tokenList) {
        tokenStr = tokenStr.trim();
        result = LINES_STATEMENT.exec(tokenStr);
        if(result != null) {
            if(lines != null) {
                throw new SyntaxError("Speech line is already defined in this block");
            }
            lines = parseList(result[1], true);
            continue;
        }
        
        result = LINES_LABEL_STATEMENT.exec(tokenStr);
        if(result != null) {
            if(lines != null) {
                throw new SyntaxError("Speech line is already defined in this block");
            }
            lines = result[1];
            continue;
        }
        
        result = LIST_STATEMENT.exec(tokenStr);
        if(result != null) {
            let listName = result[1];
            let listContents = parseList(result[2], false);
            if(lists.hasOwnProperty(listName)) {
                throw new SyntaxError("List \"" + listName + "\" is already defined in this block");
            }
            lists[listName] = listContents;
            continue;
        }
        
        throw new SyntaxError("Unable to parse statement in speech body \"" + tokenStr + "\"");
    }
    
    if(Object.keys(lists).length > 0) {
        obj["lists"] = lists;
    }
    obj["line"] = lines;
    
    return obj;
}

const STANDARD_RULE = /^rule[ \t]*\(([.\S\s]*?)\)[ \t]*{([.\S\s]*?)}$/;
const LABELLED_RULE = /^rule[ \t]*([a-zA-Z][a-zA-Z.\-_0-9]*)[ \t]*\(([.\S\s]*?)\)[ \t]*{([.\S\s]*?)}$/;
function parseRule(str) {
    str = str.trim();
    let result;
    let presets = [];
    let obj = {};
    
    result = STANDARD_RULE.exec(str);
    if(result != null) {
        let criteriaStr = result[1];
        let bodyStr = result[2];
        let criteria = parseCriteria(criteriaStr);
        for(let i = criteria.length - 1; i >= 0; --i) {
            if(typeof criteria[i] === "string") {
                presets.push(criteria[i]);
                criteria.splice(i, 1);
            }
        }
        if(presets.length > 0) {
            obj["presets"] = presets;
        }
        if(criteria.length > 0) {
            obj["rule"] = criteria;
        }
        parseRuleBody(bodyStr, obj);
        return obj;
    }
    
    result = LABELLED_RULE.exec(str);
    if(result != null) {
        obj["label"] = result[1];
        let criteriaStr = result[2];
        let bodyStr = result[3];
        let criteria = parseCriteria(criteriaStr);
        for(let i = criteria.length - 1; i >= 0; --i) {
            if(typeof criteria[i] === "string") {
                presets.push(criteria[i]);
                criteria.splice(i, 1);
            }
        }
        if(presets.length > 0) {
            obj["presets"] = presets;
        }
        if(criteria.length > 0) {
            obj["rule"] = criteria;
        }
        parseRuleBody(bodyStr, obj);
        return obj;
    }
    
    throw new SyntaxError("Unable to parse rule \"" + str + "\"");
}

// LIST //

function parseList(str, allowInnerList = false) {
    str = str.trim();
    let result = [];
    let tokenList = splitString(str, allowInnerList);
    for(let tokenStr of tokenList) {
        result.push(parseListItem(tokenStr, allowInnerList));
    }
    return result;
}

const STRING = /^"(.*?)"$/;
const LIST = /^\[([.\S\s]*?)\]$/;
function parseListItem(str, allowInnerList) {
    str = str.trim();
    let result;
    
    result = STRING.exec(str);
    if(result != null) {
        return result[1];
    }
    
    if(allowInnerList) {
        result = LIST.exec(str);
        if(result != null) {
            return parseList(result[1], false);
        }
    }
    
    throw new SyntaxError("Unable to parse list item \"" + str + "\"");
}

// CATEGORY //

function parseCategory(str, obj) {
    str = str.trim();
    
    let result = CATEGORY.exec(str);
    if(result == null) {
        throw new SyntaxError("Error: Cannot parse category \"" + str + "\"");
    }
    
    let categoryName = result[1];
    let rules = parseCategoryBody(result[2]);
    if(obj.hasOwnProperty(categoryName)) {
        throw new SyntaxError("Category \"" + categoryName + "\" is already defined!");
    }
    if(rules.length > 0) {
        obj[categoryName] = rules;
    }
    return obj;
}

function parseCategoryBody(str) {
    str = str.trim();
    let tokenList = splitStatements(str);
    let rules = [];
    
    for(let tokenStr of tokenList) {
        rules.push(parseRule(tokenStr))
    }
    
    return rules;
}

// SPEECHBANK //

const ROOT_GROUP = /^group [ \t]*([a-zA-Z][a-zA-Z.\-_0-9]*)[ \t]*{([.\S\s]*?)}$/;
const CHILD_GROUP = /^group [ \t]*([a-zA-Z][a-zA-Z.\-_0-9]*) [ \t]*extends [ \t]*([a-zA-Z][a-zA-Z.\-_0-9]*)[ \t]*{([.\S\s]*?)}$/;
function parseSpeechbank(str) {
    str = removeComments(str);
    let result;
    
    result = ROOT_GROUP.exec(str);
    if(result != null) {
        let groupName = result[1];
        let speechbankBody = parseSpeechbankBody(result[2], {});
        return [groupName, speechbankBody];
    }
    
    result = CHILD_GROUP.exec(str);
    if(result != null) {
        let groupName = result[1];
        let obj = {
            "parent": result[2]
        };
        let speechbankBody = parseSpeechbankBody(result[3], obj);
        return [groupName, speechbankBody];
    }
    
    throw new SyntaxError("File must start with \"group <group name> ...\"");
}

const CATEGORY = /^category ([a-zA-Z][a-zA-Z.\-_0-9]*)[ \t]*{([.\S\s]*?)}$/;
function parseSpeechbankBody(str, obj) {
    str = str.trim();
    let speechbank = {};
    let lists = {};
    let tokenList = splitStatements(str);
    
    for(let tokenStr of tokenList) {
        tokenStr = tokenStr.trim();
        let result;
        
        result = CATEGORY.exec(tokenStr);
        if(result != null) {
            parseCategory(tokenStr, speechbank);
            continue;
        }
        
        result = LIST_STATEMENT.exec(tokenStr);
        if(result != null) {
            let listName = result[1];
            let listContents = parseList(result[2], false);
            if(lists.hasOwnProperty(listName)) {
                throw new SyntaxError("List \"" + listName + "\" is already defined in this block");
            }
            lists[listName] = listContents;
        }
    }
    
    if(Object.keys(lists).length > 0) {
        obj["lists"] = lists;
    }
    
    if(Object.keys(speechbank).length > 0) {
        obj["speechbank"] = speechbank;
    }
    
    return obj;
}

// COMMENTS //

const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/.*/g;
function removeComments(str) {
    return str.trim().replace(COMMENTS, "");
}

// HELPERS //

// Split by commas and newlines, escape quotes and optionally brackets
function splitString(str, allowList = false) {
    let list = [];
    let item = "";
    for(let i = 0; i < str.length; ++i) {
        let ch = str.charAt(i);
        if(ch == '"') {
            item += '"';
            ++i;
            while(str.charAt(i) != '"' && i < str.length) {
                ch = str.charAt(i);
                item += ch;
                ++i;
            }
            item += '"';
        } else if(ch == ',' || ch == '\n') {
            if(item.trim().length) {
                list.push(item.trim());
            }
            item = "";
        } else if(ch == '[' && allowList) {
            item += '[';
            ++i;
            while(str.charAt(i) != ']' && i < str.length) {
                ch = str.charAt(i);
                item += ch;
                ++i;
            }
            if(i <= str.length) {
                item += ']';
            }
        } else {
            item += ch;
        }
    }
    if(item.trim().length) {
        list.push(item.trim());
    }
    return list;
}

// Split by newlines, escape by curly braces
function splitStatements(str) {
    let list = [];
    let item = "";
    for(let i = 0; i < str.length; ++i) {
        let ch = str.charAt(i);
        if(ch == '\n') {
            if(item.trim().length) {
                list.push(item.trim());
            }
            item = "";
        } else if(ch == '{') {
            level = -1;
            do {
                ch = str.charAt(i);
                if(ch == '{') {
                    ++level;
                }
                if(ch == '}') {
                    --level;
                }
                item += ch;
                ++i;
            } while((level >= 0) && i < str.length)
            --i;
        } else if(ch == '[') {
            level = -1;
            do {
                ch = str.charAt(i);
                if(ch == '[') {
                    ++level;
                }
                if(ch == ']') {
                    --level;
                }
                item += ch;
                ++i;
            } while((level >= 0) && i < str.length)
            --i;
        } else {
            item += ch;
        }
    }
    if(item.trim().length) {
        list.push(item.trim());
    }
    return list;
}

function splitRuleBody(str) {
    let list = [];
    let item = "";
    for(let i = 0; i < str.length; ++i) {
        let ch = str.charAt(i);
        if(ch == '\n') {
            if(item.trim().length) {
                list.push(item.trim());
            }
            item = "";
        } else if(ch == '[') {
            level = -1;
            do {
                ch = str.charAt(i);
                if(ch == '[') {
                    ++level;
                }
                if(ch == ']') {
                    --level;
                }
                item += ch;
                ++i;
            } while((level >= 0) && i < str.length)
            --i;
        } else {
            item += ch;
        }
    }
    if(item.trim().length) {
        list.push(item.trim());
    }
    return list;
}

// TODO: Allow slashes to be used to make multi-lines? "a / b" -> ["a", "b"]

// MAIN //

function main(args) {
    if(args.length < 3) {
        console.error("You must enter a file name to process! Usage: node main.js scripts/<script>.drkn");
        return;
    }
    
    const filePath = args[2];
    const data = fs.readFileSync(filePath, "utf8");
    const result = parseSpeechbank(data);
    if(result == null || result[1] == null) {
        console.error("Failed to parse!");
        return;
    }
    const fileName = result[0];
    const fileData = result[1];
    const outPath = "out/" + escape(fileName) + ".json"
    console.log("File written successfully to " + outPath);
    fs.writeFileSync(outPath, JSON.stringify(fileData, null, 2));
}

main(process.argv);