"use strict"
import { logger as builtInLogger } from "./logger.js"

export const parser = (() => {
    // Allow logger to change behavior
    let logger = builtInLogger;

    // CRITERION //

    // Welcome to regex hell, enjoy your stay
    const CRITERION = {
        // x.y = "string"
        "equals_string": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*"(.*?)"$/,
        // x.y = -3.0
        "equals_number": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
        // x.y = true
        "equals_boolean": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*(true|false)$/,
        // x.y != "string"
        "not_equals_string": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*!=[ \t]*"(.*?)"$/,
        // x.y != -3.0
        "not_equals_number": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*!=[ \t]*([+-]?[0-9]*[.]?[0-9]+)$/,
        // x.y != true
        "not_equals_boolean": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*!=[ \t]*(true|false)$/,
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
        "preset": /^([a-zA-Z][a-zA-Z_\-0-9]*)$/,
        // x.y = x.z
        "equals_dynamic": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*=[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)$/,
        // x.y != x.z
        "not_equals_dynamic": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*!=[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)$/,
        // x.y < x.z
        "less_than_dynamic": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)$/,
        // x.y <= x.z
        "less_equal_dynamic": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*<=[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)$/,
        // x.y > x.z
        "greater_than_dynamic": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*>[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)$/,
        // x.y >= x.z
        "greater_equal_dynamic": /^([a-zA-Z][a-zA-Z._\-0-9]*)[ \t]*>=[ \t]*([a-zA-Z][a-zA-Z._\-0-9]*)$/,
        // list includes "item"
        "includes": /^([a-zA-Z][a-zA-Z._\-0-9]*) [ \t]*includes [ \t]*([.\S\s]+?)$/,
        // list excludes "item"
        "excludes": /^([a-zA-Z][a-zA-Z._\-0-9]*) [ \t]*excludes [ \t]*([.\S\s]+?)$/,
    };

    function extractTable(key) {
        let firstDotIndex = key.indexOf(".");
        if(firstDotIndex > -1) {
            return key.substring(0, firstDotIndex);
        }
        return null;
    }
    
    function criterionWithKey(key, type, value, inverse) {
        let obj = {};
        let table = extractTable(key);
        
        if(table != null) {
            obj["table"] = table;
            obj["field"] = key.substring(table.length + 1);
            validateField(table, "table");
        } else {
            obj["field"] = key;
        }

        validateField(obj["field"], "field");

        obj["type"] = type;
        if(value != null) {
            obj["value"] = value;
        }
        
        if(inverse) {
            obj["inverse"] = true;
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
    
    function isBothInteger(a, b) {
        return isInteger(a) && isInteger(b);
    }

    function modifyIfInteger(num, modifier) {
        if(isInteger(num)) {
            return num + modifier;
        }
        return num;
    }

    function toRange(key, min, max, inverse) {
        if(min == max) {
            return criterionWithKey(key, "equals", min, inverse);
        }
        if(min > max) {
            throw new SyntaxError("Error: No possible value between " + min + " and " + max + ", this criterion will never be true");
        }
        return criterionWithKey(key, "range", [min, max], inverse);
    }
    
    function getIntOrString(val) {
        if(isInteger(val)) {
            return parseInt(val);
        }
        const result = STRING.exec(val);
        if(result != null) {
            return result[1];
        }
        throw new SyntaxError("Expected integer or string!");
    }
    
    function handleDynamicCriterion(key1, key2, type, inverse) {
        let obj = {};
        
        let table1 = extractTable(key1);
        if(table1 != null) {
            obj["table"] = table1;
            validateField(table1, "table");
            obj["field"] = key1.substring(table1.length + 1);
        } else {
            obj["field"] = key1;
        }
        validateField(obj["field"], "field");
        
        obj["type"] = type;

        let table2 = extractTable(key2);
        if(table2 != null) {
            obj["other_table"] = table2;
            validateField(table2, "table");
            obj["other_field"] = key2.substring(table2.length + 1);
        } else {
            obj["other_field"] = key2;
        }
        validateField(obj["other_field"], "field");
        
        if(inverse) {
            obj["inverse"] = true;
        }
        
        return obj;
    }

    function parseCriterion(str) {
        str = str.trim();
        let inverse = false;
        if(str.charAt(0) == '!') {
            inverse = true;
            str = str.substring(1).trim();
        }
        let type = null;
        let result = null;
        for(let k in CRITERION) {
            result = CRITERION[k].exec(str);
            if(result != null) {
                type = k;
                break;
            }
        }

        if(type == null) {
            throw new SyntaxError("Unable to parse criterion \"" + str + "\"");
        }

        let min, max, value;

        switch(type) {
            case "equals_string":
                return criterionWithKey(result[1], "equals", result[2], inverse);
            case "equals_number":
                value = parseFloat(result[2]);
                return criterionWithKey(result[1], "equals", value, inverse);
            case "equals_boolean":
                return criterionWithKey(result[1], "equals", toBoolean(result[2]), inverse);
            case "not_equals_string":
                return criterionWithKey(result[1], "equals", result[2], !inverse);
            case "not_equals_number":
                return criterionWithKey(result[1], "equals", parseFloat(result[2]), !inverse);
            case "not_equals_boolean":
                return criterionWithKey(result[1], "equals", toBoolean(result[2]), !inverse);
            case "greater_than":
                value = parseFloat(result[2]);
                if(isInteger(value)) {
                    value = modifyIfInteger(value, 1);
                } else {
                    logger.warn("Warning: " + result[1] + " > " + value + " is interpreted as " + result[1] + " >= " + value + " instead, you might want to change this to avoid ambiguity");
                }
                return criterionWithKey(result[1], "min", value, inverse);
            case "greater_equal":
                return criterionWithKey(result[1], "min", parseFloat(result[2]), inverse);
            case "less_than":
                value = parseFloat(result[2]);
                if(isInteger(value)) {
                    value = modifyIfInteger(value, -1);
                } else {
                    logger.warn("Warning: " + result[1] + " < " + value + " is interpreted as " + result[1] + " <= " + value + " instead, you might want to change this to avoid ambiguity");
                }
                return criterionWithKey(result[1], "max", value, inverse);
            case "less_equal":
                return criterionWithKey(result[1], "max", parseFloat(result[2]), inverse);
            case "lt_lt":
                min = parseFloat(result[1]);
                max = parseFloat(result[3]);
                if(isBothInteger(min, max)) {
                    min = modifyIfInteger(min, 1);
                    max = modifyIfInteger(max, -1);
                } else {
                    logger.warn("Warning: " + min + " < " + result[2] + " < " + max + " is interpreted as " + min + " <= " + result[2] + " <= " + max + " instead, you might want to change this to avoid ambiguity");
                }
                return toRange(result[2], min, max, inverse);
            case "lt_le":
                min = parseFloat(result[1]);
                max = parseFloat(result[3]);
                if(isBothInteger(min, max)) {
                    min = modifyIfInteger(min, 1);
                } else {
                    logger.warn("Warning: " + min + " < " + result[2] + " <= " + max + " is interpreted as " + min + " <= " + result[2] + " <= " + max + " instead, you might want to change this to avoid ambiguity");
                }
                return toRange(result[2], min, max, inverse);
            case "le_lt":
                min = parseFloat(result[1]);
                max = parseFloat(result[3]);
                if(isBothInteger(min, max)) {
                    max = modifyIfInteger(max, -1);
                } else {
                    logger.warn("Warning: " + min + " <= " + result[2] + " < " + max + " is interpreted as " + min + " <= " + result[2] + " <= " + max + " instead, you might want to change this to avoid ambiguity");
                }
                return toRange(result[2], min, max, inverse);
            case "le_le":
                min = parseFloat(result[1]);
                max = parseFloat(result[3]);
                return toRange(result[2], min, max, inverse);
            case "exists":
                return criterionWithKey(result[1], "exists", null, inverse);
            case "dummy":
                if(inverse) {
                    throw new SyntaxError("Dummy criterion cannot be inversed");
                }
                return { "type": "dummy", "value": parseInt(result[1]) };
            case "fail":
                if(inverse) {
                    throw new SyntaxError("Fail criterion cannot be inversed");
                }
                return { "type": "fail", "value": parseFloat(result[1]) };
            case "preset":
                if(inverse) {
                    throw new SyntaxError("Preset criterion cannot be inversed");
                }
                return result[1];
            case "equals_dynamic":
                return handleDynamicCriterion(result[1], result[2], "equals_dynamic", inverse);
            case "not_equals_dynamic":
                return handleDynamicCriterion(result[1], result[2], "equals_dynamic", !inverse);
            case "less_than_dynamic":
                return handleDynamicCriterion(result[1], result[2], "less_than_dynamic", inverse);
            case "less_equal_dynamic":
                return handleDynamicCriterion(result[1], result[2], "less_equal_dynamic", inverse);
            case "greater_than_dynamic":
                return handleDynamicCriterion(result[1], result[2], "greater_than_dynamic", inverse);
            case "greater_equal_dynamic":
                return handleDynamicCriterion(result[1], result[2], "greater_equal_dynamic", inverse);
            case "includes":
                return criterionWithKey(result[1], "includes", getIntOrString(result[2]), inverse);
            case "excludes":
                return criterionWithKey(result[1], "includes", getIntOrString(result[2]), !inverse);
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
    const LABELLED_RULE = /^rule[ \t]*([a-zA-Z][a-zA-Z._0-9]*)[ \t]*\(([.\S\s]*?)\)[ \t]*{([.\S\s]*?)}$/;
    function parseRule(str, allLabels, predefinedSymbols) {
        str = str.trim();
        let result;
        let obj = {};

        // Standard rule statement
        result = STANDARD_RULE.exec(str);
        if(result != null) {
            let criteriaStr = result[1];
            let bodyStr = result[2];
            return createRule(criteriaStr, bodyStr, obj, predefinedSymbols);
        }

        // Rule statement with label
        result = LABELLED_RULE.exec(str);
        if(result != null) {
            let label = result[1];
            
            if(allLabels.includes(label)) {
                throw new SyntaxError("Label \"" + label + "\" already exists in this speechbank");
            }
            
            allLabels.push(label);
            obj["label"] = label;
            let criteriaStr = result[2];
            let bodyStr = result[3];
            return createRule(criteriaStr, bodyStr, obj, predefinedSymbols);
        }

        throw new SyntaxError("Unable to parse rule \"" + str + "\"");
    }

    function createRule(criteriaStr, bodyStr, obj, predefinedSymbols) {
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

        parseRuleBody(bodyStr, obj, predefinedSymbols);
        return obj;
    }

    // lines = [lines...]
    const LINES_STATEMENT = /^lines[ \t]*=[ \t]*\[([.\S\s]*?)\]$/;
    // lines = "label"
    const LINES_LABEL_STATEMENT = /^lines[ \t]*=[ \t]*"([a-zA-Z][a-zA-Z0-9_]*)"$/;
    // list name = [items...]
    const LIST_STATEMENT = /^list [ \t]*([a-zA-Z][a-zA-Z0-9_]*)[ \t]*=[ \t]*\[([.\S\s]*?)\]$/;
    // predefined symbol SYMBOL
    const PREDEFINED_SYMBOL_STATEMENT = /^predefined symbol [ \t]*([a-zA-Z][a-zA-Z0-9_]*)$/;
    // symbol X = "key"
    const SYMBOL_STATEMENT = /^symbol [ \t]*([a-zA-Z][a-zA-Z0-9_]*)[ \t]*=[ \t]*"([a-zA-Z][a-zA-Z0-9._]*)"$/
    function parseRuleBody(str, obj, predefinedSymbols) {
        str = str.trim();
        let result;
        let tokenList = splitRuleBody(str);
        let lines = null;
        let lists = {};
        let symbols = {};
        let actions = [];

        for(let tokenStr of tokenList) {
            tokenStr = tokenStr.trim();

            // Speech line
            result = LINES_STATEMENT.exec(tokenStr);
            if(result != null) {
                if(lines != null) {
                    throw new SyntaxError("Speech line is already defined in this block");
                }
                lines = parseList(result[1], true);
                if(lines.length <= 0) {
                    throw new SyntaxError("Speech lines cannot be empty");
                }
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
            
            // Predefined symbol
            result = PREDEFINED_SYMBOL_STATEMENT.exec(tokenStr);
            if(result != null) {
                let symbolName = result[1];
                if(predefinedSymbols.includes(symbolName) || symbols.hasOwnProperty(symbolName)) {
                    throw new SyntaxError("Symbol \"" + symbolName + "\" is already defined in this block");
                }
                validateSymbol(symbolName);
                predefinedSymbols.push(symbolName);
                continue;
            }
            
            // Symbol
            result = SYMBOL_STATEMENT.exec(tokenStr);
            if(result != null) {
                let symbolName = result[1];
                let value = result[2];
                if(predefinedSymbols.includes(symbolName) || symbols.hasOwnProperty(symbolName)) {
                    throw new SyntaxError("Symbol \"" + symbolName + "\" is already defined in this block");
                }
                validateSymbol(symbolName);
                symbols[symbolName] = value;
                continue;
            }
            
            let action = handleActions(tokenStr);
            if(action != null) {
                actions.push(action);
                continue;
            }

            throw new SyntaxError("Unable to parse statement in speech body \"" + tokenStr + "\"");
        }

        if(Object.keys(lists).length > 0) {
            obj["lists"] = lists;
        }
        
        if(Object.keys(symbols).length > 0) {
            obj["symbols"] = symbols;
        }
        
        if(predefinedSymbols.length > 0) {
            obj["predefined_symbols"] = predefinedSymbols;
        }

        if(lines != null) {
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
        }
        
        if(actions.length > 0) {
            obj["actions"] = actions;
        }

        return obj;
    }
    
    // set x.y = 3
    const SET_EQUAL = /^set [ \t]*([a-zA-Z][a-zA-Z0-9._]*)[ \t]*\=[ \t]*([.\S\s]+?)$/;
    const SET_ADD = /^set [ \t]*([a-zA-Z][a-zA-Z0-9._]*)[ \t]*\+=[ \t]*([.\S\s]+?)$/;
    const SET_SUB = /^set [ \t]*([a-zA-Z][a-zA-Z0-9._]*)[ \t]*\-=[ \t]*([.\S\s]+?)$/;
    const SET_MULT = /^set [ \t]*([a-zA-Z][a-zA-Z0-9._]*)[ \t]*\*=[ \t]*([.\S\s]+?)$/;
    const SET_DIV = /^set [ \t]*([a-zA-Z][a-zA-Z0-9._]*)[ \t]*\/=[ \t]*([.\S\s]+?)$/;
    const REMOVE = /^remove [ \t]*([a-zA-Z][a-zA-Z0-9._]*)$/;
    const TRIGGER = /^trigger [ \t]*([.\S\s]*?)$/;
    const INCREMENT = /^set [ \t]*([a-zA-Z][a-zA-Z0-9._]*)[ \t]*\+\+$/;
    const DECREMENT = /^set [ \t]*([a-zA-Z][a-zA-Z0-9._]*)[ \t]*\-\-$/;
    const INVERT = /^invert [ \t]*([a-zA-Z][a-zA-Z0-9._]*)$/;
    const NUMBER = /^([+-]?[0-9]*[.]?[0-9]+)$/;
    const BOOLEAN = /^(true|false)$/;
    const CONTEXT = /^([a-zA-Z][a-zA-Z0-9._]*)$/;
    function handleActions(tokenStr) {
        let result;
        
        result = TRIGGER.exec(tokenStr);
        if(result != null) {
            // TODO: Parse arguments
            return createAction("trigger", null, result[1]);
        }
        
        result = REMOVE.exec(tokenStr);
        if(result != null) {
            return createAction("remove", result[1], null);
        }
        
        result = INCREMENT.exec(tokenStr);
        if(result != null) {
            return createAction("add", result[1], 1);
        }

        result = DECREMENT.exec(tokenStr);
        if(result != null) {
            return createAction("add", result[1], -1);
        }
        
        result = SET_ADD.exec(tokenStr);
        if(result != null) {
            let value = parseFloat(result[2]);
            if(isNaN(value)) {
                logger.error("Cannot add by \"" + result[2] + "\"");
                return null;
            }
            return createAction("add", result[1], value);
        }
        
        result = SET_SUB.exec(tokenStr);
        if(result != null) {
            let value = parseFloat(result[2]);
            if(isNaN(value)) {
                logger.error("Cannot subtract by \"" + result[2] + "\"");
                return null;
            }
            return createAction("add", result[1], -value);
        }
        
        result = SET_MULT.exec(tokenStr);
        if(result != null) {
            let value = parseFloat(result[2]);
            if(isNaN(value)) {
                logger.error("Cannot multiply by \"" + result[2] + "\"");
                return null;
            }
            return createAction("mult", result[1], value);
        }
        
        result = SET_DIV.exec(tokenStr);
        if(result != null) {
            let value = parseFloat(result[2]);
            if(isNaN(value)) {
                logger.error("Cannot divide by \"" + result[2] + "\"");
                return null;
            }
            if(value == 0) {
                logger.error("Cannot divide by zero");
                return null;
            }
            return createAction("mult", result[1], 1 / value);
        }
        
        result = INVERT.exec(tokenStr);
        if(result != null) {
            return createAction("invert", result[1], null);
        }
        
        result = SET_EQUAL.exec(tokenStr);
        if(result != null) {
            let value = result[2].trim();
            let valueResult;
            
            valueResult = STRING.exec(value);
            if(valueResult != null) {
                return createAction("set_string", result[1], valueResult[1]);
            }

            valueResult = NUMBER.exec(value);
            if(valueResult != null) {
                return createAction("set_number", result[1], parseFloat(value));
            }

            valueResult = BOOLEAN.exec(value);
            if(valueResult != null) {
                return createAction("set_boolean", result[1], toBoolean(value));
            }
            
            if(CONTEXT.test(value)) {
                let otherKey = null;
                let table = extractTable(value);
                if(table != null) {
                    let field = value.substring(table.length + 1);
                    validateField(table, "table");
                    validateField(field, "field");
                    otherKey = {
                        "table": table,
                        "field": field
                    };
                } else {
                    validateField(value, "field");
                    otherKey = {
                        "field": value
                    };
                }
                return createAction("set_dynamic", result[1], otherKey)
            }
            
            return null;
        }
        
        return null;
    }
    
    function createAction(type, key, value) {
        // Split key into table and field
        let obj = {
            "type": type
        };
        
        if(key != null) {
            let table = extractTable(key);
            if(table != null) {
                obj["table"] = table;
                validateField(table, "table");
                obj["field"] = key.substring(table.length + 1);
            } else {
                obj["field"] = key;
            }
            validateField(obj["field"], "field");
        }
        
        if(value != null) {
            obj["value"] = value;
        }
        
        return obj;
    }

    function splitAndTrim(str, delimiter) {
        let arr = str.trim().split(delimiter);
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
                let level = -1;
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
            let innerList = parseList(result[1], false);
            if(result.length <= 0) {
                throw new SyntaxError("Inner list of speech lines cannot be empty");
            }
            return innerList;
        }

        throw new SyntaxError("Unable to parse list item \"" + str + "\"");
    }

    // CATEGORY //

    function parseCategory(str, obj, allLabels, predefinedSymbols) {
        str = str.trim();

        let result = CATEGORY.exec(str);
        if(result == null) {
            throw new SyntaxError("Error: Cannot parse category \"" + str + "\"");
        }

        let categoryName = result[1];
        validateField(categoryName, "category name");
        let rules = parseCategoryBody(result[2], allLabels, predefinedSymbols);
        if(obj.hasOwnProperty(categoryName)) {
            throw new SyntaxError("Category \"" + categoryName + "\" is already defined!");
        }
        if(rules.length > 0) {
            obj[categoryName] = rules;
        }
        return obj;
    }

    function parseCategoryBody(str, allLabels, predefinedSymbols) {
        str = str.trim();
        let tokenList = splitStatements(str);
        let rules = [];

        for(let tokenStr of tokenList) {
            rules.push(parseRule(tokenStr, allLabels, predefinedSymbols))
        }

        return rules;
    }

    // SPEECHBANK //

    // group name {body...}
    const ROOT_GROUP = /^group [ \t]*([a-zA-Z][a-zA-Z._0-9]*)[ \t]*{([.\S\s]*?)}$/;
    // group name extends parent {body...}
    const CHILD_GROUP = /^group [ \t]*([a-zA-Z][a-zA-Z._0-9]*) [ \t]*extends [ \t]*([a-zA-Z][a-zA-Z._0-9]*)[ \t]*{([.\S\s]*?)}$/;
    // preset {body...}
    const PRESET = /^preset[ \t]*{([.\S\s]*?)}$/;
    const PRESET_NAME = "preset";
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
            if(groupName == PRESET_NAME) {
                logger.warn("\"" + PRESET_NAME + "\" is a reserved group name, use \"preset { ... }\" instead!")
            }
            let parent = result[2];
            validateField(parent, "parent");
            if(parent == PRESET_NAME) {
                logger.warn("Parent \"" + PRESET_NAME + "\" is redundant, can leave this blank");
            }
            let obj = {
                "parent": parent
            };
            let speechbankBody = parseSpeechbankBody(result[3], obj);
            return [groupName, speechbankBody];
        }
        
        result = PRESET.exec(str);
        if(result != null) {
            let speechbankBody = parseSpeechbankBody(result[1], {});
            return [PRESET_NAME, speechbankBody]
        }

        throw new SyntaxError("Script must start with \"group <group name> ...\"");
    }

    // category name {body...}
    const CATEGORY = /^category ([a-zA-Z][a-zA-Z._0-9]*)[ \t]*{([.\S\s]*?)}$/;
    function parseSpeechbankBody(str, obj) {
        str = str.trim();
        let speechbank = {};
        let lists = {};
        let symbols = {};
        let predefinedSymbols = [];
        let tokenList = splitStatements(str);
        let allLabels = [];

        for(let tokenStr of tokenList) {
            tokenStr = tokenStr.trim();
            let result;

            // Category statement
            result = CATEGORY.exec(tokenStr);
            if(result != null) {
                parseCategory(tokenStr, speechbank, allLabels, predefinedSymbols);
                continue;
            }

            // List statement
            result = LIST_STATEMENT.exec(tokenStr);
            if(result != null) {
                let listName = result[1];
                let listContents = parseList(result[2], false);
                if(listContents.length <= 0) {
                    throw new SyntaxError("List cannot be empty");
                }
                if(lists.hasOwnProperty(listName)) {
                    throw new SyntaxError("List \"" + listName + "\" is already defined in this block");
                }
                validateSymbol(listName);
                lists[listName] = listContents;
                continue;
            }
            
            result = PREDEFINED_SYMBOL_STATEMENT.exec(tokenStr);
            if(result != null) {
                let symbolName = result[1];
                if(predefinedSymbols.includes(symbolName) || symbols.hasOwnProperty(symbolName)) {
                    throw new SyntaxError("Symbol \"" + symbolName + "\" is already defined in this block");
                }
                validateSymbol(symbolName);
                predefinedSymbols.push(symbolName);
                continue;
            }

            result = SYMBOL_STATEMENT.exec(tokenStr);
            if(result != null) {
                let symbolName = result[1];
                let value = result[2];
                if(predefinedSymbols.includes(symbolName) || symbols.hasOwnProperty(symbolName)) {
                    throw new SyntaxError("Symbol \"" + symbolName + "\" is already defined in this block");
                }
                validateSymbol(symbolName);
                let table = extractTable(value);
                if(table == null) {
                    throw new SyntaxError("Symbol \"" + symbolName + "\" context key must define a table explicitly");
                }
                validateField(table, "table");
                let field = value.substring(table.length + 1);
                validateField(field, "field");
                symbols[symbolName] = {
                    "table": table,
                    "field": field
                };
                continue;
            }

            throw new SyntaxError("Unable to parse statement in speechbank body \"" + tokenStr + "\"");
        }

        if(Object.keys(lists).length > 0) {
            obj["lists"] = lists;
        }
        
        if(Object.keys(symbols).length > 0) {
            obj["symbols"] = symbols;
        }

        if(predefinedSymbols.length > 0) {
            obj["predefined_symbols"] = predefinedSymbols;
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
        return str.trim().replace(COMMENTS, "").trim();
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
                let level = -1;
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
                let level = -1;
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
        for(let line of lines) {
            if(Array.isArray(line)) {
                if(line.length <= 0) {
                    logger.warn("Warning: Speechline contains empty list in " + lines);
                }
                validateSpeechLines(line);
                continue;
            }

            if(typeof line !== "string") {
                throw new SyntaxError("Unknown data type for line \"" + lines + "\"");
            }

            if(line.length <= 0) {
                logger.warn("Warning: Speechline contains empty string in " + lines);
            }

            let nextSymbol;
            let fromIndex = 0;
            do {
                nextSymbol = line.indexOf('@', fromIndex);
                if(nextSymbol > -1) {
                    fromIndex = nextSymbol + 1;
                    let nextSpace = line.indexOf(' ', fromIndex);
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
            logger.warn("Warning: Found empty symbol \"@\"!");
        }
        if(!isMacroCase(symbolName)) {
            logger.warn("Warning: The symbol \"@" + symbolName + "\" should be in Macro Case! (ex. FIRST_SECOND)");
        }
    }

    function isPunctuation(ch) {
        return ch == '!' || ch == '.' || ch == '?' || ch == ','
            || ch == '[' || ch == ']' || ch == '{' || ch == '}';
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

    function setLogger(obj) {
        logger = obj;
    }

    // TODO: Optional: Fix comments
    // TODO: Add definitions for the preset files and compiling all
    // TODO: Option to compile all, maybe with a flag to aid compilation

    function validateField(field, fieldName) {
        if(field.length <= 0) {
            logger.warn("Warning: Found empty " + fieldName + "!");
        }
        if(!isSnakeCase(field)) {
            logger.warn("Warning: The " + fieldName + " \"" + field + "\" should be in Snake Case! (ex. first_second)");
        }
    }
    
    function getName(str) {
        str = removeComments(str);
        let firstLineEnd = str.indexOf("\n");
        if(firstLineEnd < 0) {
            return null;
        }
        let firstLine = str.substring(0, firstLineEnd);
        let words = firstLine.split(" ");
        if(words[0] == "group" && words.length >= 2) {
            return words[1];
        }
        return null;
    }
    
    return {
        parseSpeechbank, setLogger, getName
    };
})();