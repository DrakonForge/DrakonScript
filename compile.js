const fs = require("fs");

// CRITERION //

// Welcome to regex hell, enjoy your stay
const CRITERION = {
    // x.y = "string"
    "equals_string": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*"(.*?)"$/,
    // x.y = -3.0
    "equals_number": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // x.y = true
    "equals_boolean": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*(true|false)$/,
    // x.y > 3
    "greater_than": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*>[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // x.y >= 3
    "greater_equal": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*>=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // x.y < 3
    "less_than": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // x.y <= 3
    "less_equal": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // 1 < x.y < 3
    "lt_lt": /^([+-]?[0-9]*[.]?[0-9]+)[ \t]*<[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // 1 < x.y <= 3
    "lt_le": /^([+-]?[0-9]*[.]?[0-9]+)[ \t]*<[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // 1 <= x.y < 3
    "le_lt": /^([+-]?[0-9]*[.]?[0-9]+)[ \t]*<=[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // 1 <= x.y <= 3
    "le_le": /^([+-]?[0-9]*[.]?[0-9]+)[ \t]*<=[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // x.y exists
    "exists": /^([a-zA-Z][a-zA-Z._\-0-9]*) [ \t]*exists$/,
    // dummy 3
    "dummy": /^dummy [ \t]*([-+]?\d+)$/,
    // fail 0.3
    "fail": /^fail [ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
    // is_big_folk
    "preset": /^([a-zA-Z][a-zA-Z_\-0-9]*)$/
};

function criterionWithKey(key, type, value) {
    obj = {};
    let firstDotIndex = key.indexOf(".");
    if(firstDotIndex > -1) {
        obj["table"] = key.substring(0, firstDotIndex);
        validateField(obj["table"], "table")
        obj["field"] = key.substring(firstDotIndex + 1);
    } else {
        obj["field"] = key;
    }
    
    validateField(obj["field"], "field");
    
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
    throw new SyntaxError("Cannot convert \"" + str + "\" to boolean");
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

function toRange(key, min, max) {
    if(min == max) {
        return criterionWithKey(key, "equals", min);
    }
    return criterionWithKey(key, "range", [min, max]);
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
            return toRange(result[2], min, max);
        case "lt_le":
            min = modifyIfInteger(result[1], 1);
            max = parseFloat(result[3]);
            return toRange(result[2], min, max);
        case "le_lt":
            min = parseFloat(result[1]);
            max = modifyIfInteger(result[3], -1);
            return toRange(result[2], min, max);
        case "le_le":
            min = parseFloat(result[1]);
            max = parseFloat(result[3]);
            return toRange(result[2], min, max);
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

// CRITERIA //

function parseCriteria(str) {
    str = str.trim();
    let criteria = [];
    let tokenList = splitString(str);
    for(let tokenStr of tokenList) {
        criteria.push(parseCriterion(tokenStr));
    }
    return criteria;
}

// RULE //

// rule (criteria...) {body...}
const STANDARD_RULE = /^rule[ \t]*\(([.\S\s]*?)\)[ \t]*{([.\S\s]*?)}$/;
// rule label (criteria...) {body...}
const LABELLED_RULE = /^rule[ \t]*([a-zA-Z][a-zA-Z.\-_0-9]*)[ \t]*\(([.\S\s]*?)\)[ \t]*{([.\S\s]*?)}$/;
function parseRule(str) {
    str = str.trim();
    let result;
    let obj = {};
    
    // Standard rule statement
    result = STANDARD_RULE.exec(str);
    if(result != null) {
        let criteriaStr = result[1];
        let bodyStr = result[2];
        return createRule(criteriaStr, bodyStr, obj);
    }
    
    // Rule statement with label
    result = LABELLED_RULE.exec(str);
    if(result != null) {
        obj["label"] = result[1];
        let criteriaStr = result[2];
        let bodyStr = result[3];
        return createRule(criteriaStr, bodyStr, obj);
    }
    
    throw new SyntaxError("Unable to parse rule \"" + str + "\"");
}

function createRule(criteriaStr, bodyStr, obj) {
    let presets = [];
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

// lines = [lines...]
const LINES_STATEMENT = /^lines[ \t]*=[ \t]*\[([.\S\s]*?)\]$/;
// lines = "label"
const LINES_LABEL_STATEMENT = /^lines[ \t]*=[ \t]*"([a-zA-Z][a-zA-Z0-9\-_]*)"$/;
// list name = [items...]
const LIST_STATEMENT = /^list[ \t]*([a-zA-Z][a-zA-Z0-9\-_]*)[ \t]*=[ \t]*\[([.\S\s]*?)\]$/;
function parseRuleBody(str, obj) {
    str = str.trim();
    let result;
    let tokenList = splitRuleBody(str);
    let lines = null;
    let lists = {};

    for(let tokenStr of tokenList) {
        tokenStr = tokenStr.trim();
        
        // Speech line
        result = LINES_STATEMENT.exec(tokenStr);
        if(result != null) {
            if(lines != null) {
                throw new SyntaxError("Speech line is already defined in this block");
            }
            lines = parseList(result[1], true);
            continue;
        }

        // Speech line referencing a label
        result = LINES_LABEL_STATEMENT.exec(tokenStr);
        if(result != null) {
            if(lines != null) {
                throw new SyntaxError("Speech line is already defined in this block");
            }
            lines = result[1];
            continue;
        }

        // List statement
        result = LIST_STATEMENT.exec(tokenStr);
        if(result != null) {
            let listName = result[1];
            let listContents = parseList(result[2], false);
            if(lists.hasOwnProperty(listName)) {
                throw new SyntaxError("List \"" + listName + "\" is already defined in this block");
            }
            validateSymbol(listName);
            lists[listName] = listContents;
            continue;
        }

        throw new SyntaxError("Unable to parse statement in speech body \"" + tokenStr + "\"");
    }

    if(Object.keys(lists).length > 0) {
        obj["lists"] = lists;
    }
    
    if(lines == null) {
        throw new SyntaxError("Speech lines were not defined for this block!");
    }
    
    // Check for slash delimiters
    for(let i = 0; i < lines.length; ++i) {
        if(typeof lines[i] === "string") {
            if(lines[i].indexOf('/') > -1) {
                lines[i] = splitAndTrim(lines[i], '/');
            }
        }
    }
    validateSpeechLines(lines);
    obj["line"] = lines;

    return obj;
}

function splitAndTrim(str, delimiter) {
    arr = str.trim().split(delimiter);
    for(let i = 0; i < arr.length; ++i) {
        arr[i] = arr[i].trim(0);
    }
    return arr;
}

function splitRuleBody(str) {
    let list = [];
    let item = "";
    
    for(let i = 0; i < str.length; ++i) {
        let ch = str.charAt(i);
        
        if(ch == '\n') {
            // New statement
            item = item.trim();
            if(item.length) {
                list.push(item);
            }
            item = "";
        } else if(ch == '[') {
            // Escape nested brackets
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
            // Add character
            item += ch;
        }
    }
    
    // Add trailing statement
    item = item.trim();
    if(item.length) {
        list.push(item);
    }
    return list;
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

// "string"
const STRING = /^"(.*?)"$/;
// [items...]
const LIST = /^\[([.\S\s]*?)\]$/;
function parseListItem(str, allowInnerList) {
    str = str.trim();
    let result;
    
    // String item
    result = STRING.exec(str);
    if(result != null) {
        return result[1];
    }
    
    // Inner list item
    result = LIST.exec(str);
    if(result != null) {
        if(!allowInnerList) {
            throw new SyntaxError("This list does not allow inner lists!");
        }
        return parseList(result[1], false);
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
    validateField(categoryName, "category name");
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

// group name {body...}
const ROOT_GROUP = /^group [ \t]*([a-zA-Z][a-zA-Z.\-_0-9]*)[ \t]*{([.\S\s]*?)}$/;
// group name extends parent {body...}
const CHILD_GROUP = /^group [ \t]*([a-zA-Z][a-zA-Z.\-_0-9]*) [ \t]*extends [ \t]*([a-zA-Z][a-zA-Z.\-_0-9]*)[ \t]*{([.\S\s]*?)}$/;
function parseSpeechbank(str) {
    str = removeComments(str);
    let result;
    
    // root group
    result = ROOT_GROUP.exec(str);
    if(result != null) {
        let groupName = result[1];
        validateField(groupName, "group name");
        let speechbankBody = parseSpeechbankBody(result[2], {});
        return [groupName, speechbankBody];
    }
    
    // child group
    result = CHILD_GROUP.exec(str);
    if(result != null) {
        let groupName = result[1];
        validateField(groupName, "group name");
        let parent = result[2];
        validateField(parent, "parent");
        let obj = {
            "parent": parent
        };
        let speechbankBody = parseSpeechbankBody(result[3], obj);
        return [groupName, speechbankBody];
    }
    
    throw new SyntaxError("File must start with \"group <group name> ...\"");
}

// category name {body...}
const CATEGORY = /^category ([a-zA-Z][a-zA-Z.\-_0-9]*)[ \t]*{([.\S\s]*?)}$/;
function parseSpeechbankBody(str, obj) {
    str = str.trim();
    let speechbank = {};
    let lists = {};
    let tokenList = splitStatements(str);
    
    for(let tokenStr of tokenList) {
        tokenStr = tokenStr.trim();
        let result;
        
        // Category statement
        result = CATEGORY.exec(tokenStr);
        if(result != null) {
            parseCategory(tokenStr, speechbank);
            continue;
        }
        
        // List statement
        result = LIST_STATEMENT.exec(tokenStr);
        if(result != null) {
            let listName = result[1];
            let listContents = parseList(result[2], false);
            if(lists.hasOwnProperty(listName)) {
                throw new SyntaxError("List \"" + listName + "\" is already defined in this block");
            }
            validateSymbol(listName);
            lists[listName] = listContents;
            continue;
        }
        
        throw new SyntaxError("Unable to parse statement in speechbank body \"" + tokenStr + "\"");
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
// Remove all comments in the program
// Note: This does not escape strings
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
            // Escape string
            item += '"';
            ++i;
            while(str.charAt(i) != '"' && i < str.length) {
                ch = str.charAt(i);
                if(ch == '\\') {
                    // Escape, add the next character instead
                    ch = str.charAt(++i);
                }
                item += ch;
                ++i;
            }
            item += '"';
        } else if(ch == ',' || ch == '\n') {
            // New item
            item = item.trim();
            if(item.length) {
                list.push(item);
            }
            item = "";
        } else if(ch == '[') {
            // Inner list
            if(!allowList) {
                throw new SyntaxError("This list does not support inner lists!");
            }
            
            // Only supports one level of inner list
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
            // Add character
            item += ch;
        }
    }
    
    // Add trailing item
    item = item.trim();
    if(item.length) {
        list.push(item);
    }

    return list;
}

// Split by newlines, escape by curly and square brackets
function splitStatements(str) {
    let list = [];
    let item = "";
    
    for(let i = 0; i < str.length; ++i) {
        let ch = str.charAt(i);
        
        if(ch == '\n') {
            // New statement
            item = item.trim();
            if(item.length) {
                list.push(item);
            }
            item = "";
        } else if(ch == '{') {
            // Escape curly brackets
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
            // Escape square brackets
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
            // Add character
            item += ch;
        }
    }
    
    // Add trailing statement
    item = item.trim();
    if(item.length) {
        list.push(item);
    }
    return list;
}

// VALIDATION //

function validateSpeechLines(lines) {
    for(line of lines) {
        if(Array.isArray(line)) {
            if(line.length <= 0) {
                warn("Warning: Speechline contains empty list in " + lines);
            }
            validateSpeechLines(line);
            continue;
        }
        
        if(typeof line !== "string") {
            throw new SyntaxError("Unknown data type for line \"" + lines + "\"");
        }
        
        if(line.length <= 0) {
            warn("Warning: Speechline contains empty string in " + lines);
        }
        
        let nextSymbol;
        let fromIndex = 0;
        do {
            nextSymbol = line.indexOf('@', fromIndex);
            if(nextSymbol > -1) {
                fromIndex = nextSymbol + 1;
                nextSpace = line.indexOf(' ', fromIndex);
                if(nextSpace < 0) {
                    nextSpace = line.length;
                }
                while(isPunctuation(line.charAt(nextSpace - 1))) {
                    --nextSpace;
                }
                
                let symbolName = line.substring(nextSymbol + 1, nextSpace);
                validateSymbol(symbolName);
                fromIndex = nextSpace;
            }
        } while(nextSymbol > -1);
    }
}

function validateSymbol(symbolName) {
    if(symbolName.length <= 0) {
        warn("Warning: Found empty symbol \"@\"!");
    }
    if(!isMacroCase(symbolName)) {
        warn("Warning: The symbol \"@" + symbolName + "\" should be in Macro Case! (ex. FIRST_SECOND)");
    }
}

function isPunctuation(ch) {
    return ch == '!' || ch == '.' || ch == '?' || ch == ',';
}

const MACRO_CASE = /^[A-Z_0-9]+$/;
function isMacroCase(str) {
    for(let i = 0; i < str.length; ++i) {
        let ch = str.charAt(i);
        if(!MACRO_CASE.test(ch)) {
            return false;
        }
    }
    return true;
}

const SNAKE_CASE = /^[a-z_0-9]+$/;
function isSnakeCase(str) {
    for(let i = 0; i < str.length; ++i) {
        let ch = str.charAt(i);
        if(!SNAKE_CASE.test(ch)) {
            return false;
        }
    }
    return true;
}

// TODO: Optional: Fix comments
// TODO: Add definitions for the preset files and compiling all
// TODO: Option to compile all, maybe with a flag to aid compilation

function validateField(field, fieldName) {
    if(field.length <= 0) {
        warn("Warning: Found empty " + fieldName + "!");
    }
    if(!isSnakeCase(field)) {
        warn("Warning: The " + fieldName + " \"" + field + "\" should be in Snake Case! (ex. first_second)");
    }
}

// LOGGING //
// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
const RESET = "%s\x1b[0m";
const COLOR_ERROR = "\x1b[31m";
const COLOR_WARNING = "\x1b[33m";
const COLOR_LOG = "\x1b[34m";
const COLOR_SUCCESS = "\x1b[32m";

function error(str) {
    console.error(COLOR_ERROR + RESET, str);
}

function warn(str) {
    if(showWarnings) {
        console.warn(COLOR_WARNING + RESET, str);
    }
}

function log(str) {
    console.log(COLOR_LOG + RESET, str);
}

function success(str) {
    console.log(COLOR_SUCCESS + RESET, str);
}

// MAIN //

function compileSpeechbank(data) {
    let result;
    try {
        result = parseSpeechbank(data);
    } catch(err) {
        error("Failed to parse! " + err.name + ": " + err.message);
        return;
    }
    
    const fileName = result[0];
    const fileData = result[1];
    const outPath = "out/" + escape(fileName) + ".json"
    fs.writeFileSync(outPath, JSON.stringify(fileData, null, 2));
    success("Compiled successfully to " + outPath);
}

// Config
let mode = null;
let showWarnings = true;

function main(args) {
    if(args.length < 3) {
        error("Error: You must enter a file name to process! Usage: node compile.js [flags...] <file name>");
        return;
    }
    const start = Date.now();
    
    const filePath = args[args.length - 1];
    const flags = args.slice(2, args.length - 1);
    
    for(let flag of flags) {
        flag = flag.toLowerCase();
        
        if(flag == "--standard") {
            if(mode == null) {
                mode = "standard";
            } else {
                warn("Warning: Mode is already set to \"" + mode + "\", ignoring flag \"" + flag + "\"");
            }
        }
        
        if(flag == "--all") {
            if(mode == null) {
                mode = "all";
            } else {
                warn("Warning: Mode is already set to \"" + mode + "\", ignoring flag \"" + flag + "\"");
            }
        }
        
        if(flag == "--rulepreset") {
            if(mode == null) {
                mode = "rulepreset";
            } else {
                warn("Warning: Mode is already set to \"" + mode + "\", ignoring flag \"" + flag + "\"");
            }
        }
        
        if(flag == "--listpreset") {
            if(mode == null) {
                mode = "rulepreset";
            } else {
                warn("Warning: Mode is already set to \"" + mode + "\", ignoring flag \"" + flag + "\"");
            }
        }
        
        if(flag == "--nowarnings") {
            showWarnings = false;
        }
    }
    
    // Default
    if(mode == null) {
        mode = "standard";
    }
    
    if(mode == "standard") {
        log("Parsing speechbank file: " + filePath);
        const data = fs.readFileSync(filePath, "utf8");
        compileSpeechbank(data);
    } else if(mode == "rulepreset") {
        log("Parsing rule preset file: " + filePath);
    } else if(mode == "listpreset") {
        log("Parsing list preset file: " + filePath);
    } else if(mode == "all") {
        log("Compiling all scripts inside: " + filePath);    
    }
    
    const end = Date.now();
    log("Execution time: " + (end - start) + "ms");
}

main(process.argv);