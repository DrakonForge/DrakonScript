"use strict"
import { logger as builtInLogger } from "./logger.js"
let logger = builtInLogger;

const CANNOT_INVERT = ["dummy", "fail"];

class CompileError extends Error {
    constructor(...args) {
        super(...args);
        Error.captureStackTrace(this, CompileError);
    }
}

export function setLogger(obj) {
    logger = obj;
}

export function compileSpeechbank(tree) {
    const speechbankName = tree["id"];
    const defs = tree["defs"];
    const symbols = [];
    const speechbank = {};
    for(const def of defs) {
        const type = def["type"];
        if(type == "category") {
            const categoryInfo = parseCategory(def);
            const categoryName = categoryInfo[0];
            const categoryData = categoryInfo[1];
            speechbank[categoryName] = categoryData;
        } else if(type == "symbol") {
            const symbol = parseSymbol(def);
            symbols.push(symbol);
        } else {
            throw new CompileError("Unknown definition type '" + type + "' in group");
        }
    }

    const data = {};
    if(tree.hasOwnProperty("parent")) {
        data["parent"] = tree["parent"];
    }
    if(symbols.length > 0) {
        data["symbols"] = symbols;
    }
    if(Object.keys(speechbank).length > 0) {
        data["speechbank"] = speechbank;
    }

    return [speechbankName, data];
}

function parseCategory(categoryDef) {
    const defs = categoryDef["defs"];
    const categoryName = categoryDef["name"];
    const rules = [];

    for(const def of defs) {
        const type = def["type"];
        if(type == "rule") {
            const rule = parseRule(def);
            rules.push(rule);
        } else {
            throw new CompileError("Unknown definition type '" + type + "' in category");
        }
    }

    return [categoryName, rules];
}

function parseRule(ruleDef) {
    const data = {};
    const criteriaDef = ruleDef["criteria"];

    if(ruleDef.hasOwnProperty("name")) {
        data["name"] = ruleDef["name"];
    }

    if(criteriaDef.length > 0) {
        const criteria = [];
        const presets = [];
        for(const criterionDef of criteriaDef) {
            const criterion = parseCriterion(criterionDef);
            if(criterion.hasOwnProperty("type")) {
                criteria.push(criterion);
            } else {
                presets.push(criterion);
            }
        }

        if(presets.length > 0) {
            data["presets"] = presets;
        }

        if(criteria.length > 0) {
            data["criteria"] = criteria;
        }
    }

    if(ruleDef.hasOwnProperty("defs")) {
        const defs = ruleDef["defs"];
        const lines = [];
        const symbols = [];
        const actions = [];
        let linesValue = null;

        for(const def of defs) {
            const type = def["type"];
            if(type == "lines") {
                if(linesValue != null) {
                    throw new CompileError("Cannot have multiple lines definitions in a rule");
                }
                if(def.hasOwnProperty("preset")) {
                    // Preset definition
                    const presetDef = def["preset"];
                    linesValue = extractContext(presetDef, {}, "category", "name");
                } else {
                    // Normal lines
                    const linesDef = def["lines"];
                    for(const lineDef of linesDef) {
                        const line = parseLine(lineDef);
                        lines.push(line);
                    }

                    if(lines.length > 0) {
                        linesValue = lines;
                    }
                }
            } else if(type == "symbol") {
                const symbol = parseSymbol(def);
                symbols.push(symbol);
            } else if(type == "action") {
                // Context action
                delete def["type"];
                checkAction(def);
                actions.push(def);
            } else if(type == "trigger") {
                // TODO: Event Triggers, type of non-context action
                // Nothing for now
            }
        }

        if(symbols.length > 0) {
            data["symbols"] = symbols;
        }
        if(actions.length > 0) {
            data["actions"] = actions;
        }
        if(linesValue != null) {
            data["lines"] = linesValue;
        }
    }

    return data;
}

function checkAction(action) {
    const op = action["op"];
    const value = action.hasOwnProperty("value") ? action["value"] : null;
    if(value == null) {
        delete action["value"];
    }

    if(op == "set") {
        if(value == null) {
            throw new CompileError("Value must exist for set operation");
        }
        if(isContext(value)) {
            action["op"] = "set_dynamic";
        } else {
            if(Array.isArray(value)) {
                checkListTypes(value);
                action["op"] = "set_list";
            } else {
                action["op"] = "set_static";
            }
        }
    } else if(op == "add") {
        if(value == null) {
            throw new CompileError("Value must exist for add operation");
        }
        if(typeof value !== "number") {
            throw new CompileError("Value must be a number for add operation");
        }
    } else if(op == "sub") {
        if(value == null) {
            throw new CompileError("Value must exist for sub operation");
        }
        if(typeof value !== "number") {
            throw new CompileError("Value must be a number for sub operation");
        }
        action["op"] = "add";
        action["value"] = -value;
    } else if(op == "mult") {
        if(value == null) {
            throw new CompileError("Value must exist for mult operation");
        }
        if(typeof value !== "number") {
            throw new CompileError("Value must be a number for mult operation");
        }
    } else if(op == "div") {
        if(value == null) {
            throw new CompileError("Value must exist for div operation");
        }
        if(typeof value !== "number") {
            throw new CompileError("Value must be a number for div operation");
        }
        action["op"] = "mult";
        action["value"] = 1.0 / value;
    } else if(op == "remove") {
        if(value != null) {
            throw new CompileError("Value should not exist for set operation");
        }
    } else if(op == "invert") {
        if(value != null) {
            throw new CompileError("Value should not exist for set operation");
        }
    } else {
        throw new CompileError("Invalid operation \"" + op + "\"");
    }
}

function parseLine(lineDef) {
    if(typeof lineDef === "string") {
        return lineDef;
    } else if(Array.isArray(lineDef)) {
        return lineDef.join("/");
    }
    throw new CompileError("Unknown line definition '" + lineDef + "'");
}

function parseSymbol(symbolDef) {
    const name = symbolDef["name"];
    const exp = symbolDef["exp"];

    return {
        "name": name,
        "exp": exp
    };
}

function parseCriterion(criterionDef) {
    const type = criterionDef["type"];
    const args = criterionDef.hasOwnProperty("args") ? criterionDef["args"] : null;

    if(type == "preset") {
        const arg = args[0];
        if(isContext(arg)) {
            return extractContext(arg, {}, "category", "name");
        }
        throw new CompileError("Invalid criterion, cannot be a lone value unless it is a preset");
    }

    if(type == "eq") {
        return buildEqualsCriterion(args[0], args[1]);
    }

    if(type == "neq") {
        return invertCriterion(buildEqualsCriterion(args[0], args[1]));
    }

    if(type == "gt") {
        const context = args[0];
        const value = toNumber(args[1]);
        if(!isContext(context)) {
            throw new CompileError("First argument must always be a context variable");
        }
        if(typeof value !== "number") {
            throw new CompileError("> can only be applied to a number");
        }
        const data = buildCriterion("min", context);
        data["value"] = value;
        if(isInteger(value)) {
            data["value"] += 1;
        } else {
            logger.warn("> is equivalent to >= when applied to floats, use >= instead");
        }
        return data;
    }

    if(type == "lt") {
        const context = args[0];
        const value = toNumber(args[1]);
        if(!isContext(context)) {
            throw new CompileError("First argument must always be a context variable");
        }
        const data = buildCriterion("max", context);
        data["value"] = value;
        if(isInteger(value)) {
            data["value"] -= 1;
        } else {
            logger.warn("< is equivalent to <= when applied to floats, use >= instead");
        }
        return data;
    }

    if(type == "ge") {
        const context = args[0];
        const value = toNumber(args[1]);
        if(!isContext(context)) {
            throw new CompileError("First argument must always be a context variable");
        }
        const data = buildCriterion("min", context);
        data["value"] = value;
        return data;
    }

    if(type == "le") {
        const context = args[0];
        const value = toNumber(args[1]);
        if(!isContext(context)) {
            throw new CompileError("First argument must always be a context variable");
        }
        const data = buildCriterion("max", context);
        data["value"] = value;
        return data;
    }

    if(type == "le_le") {
        const context = args[1];
        const min = toNumber(args[0]);
        const max = toNumber(args[2]);
        if(!isContext(context)) {
            throw new CompileError("Middle argument must always be a context variable");
        }
        const data = buildCriterion("range", context);
        data["value"] = [min, max];
        return data;
    }

    if(type == "lt_le") {
        const context = args[1];
        const min = toNumber(args[0]);
        const max = toNumber(args[2]);
        if(!isContext(context)) {
            throw new CompileError("Middle argument must always be a context variable");
        }
        const data = buildCriterion("range", context);
        data["value"] = [min, max];
        if(isInteger(min)) {
            data["value"][0] += 1;
        } else {
            logger.warn("< is equivalent to <= when applied to floats, use >= instead");
        }
        return data;
    }

    if(type == "le_lt") {
        const context = args[1];
        const min = toNumber(args[0]);
        const max = toNumber(args[2]);
        if(!isContext(context)) {
            throw new CompileError("Middle argument must always be a context variable");
        }
        const data = buildCriterion("range", context);
        data["value"] = [min, max];
        if(isInteger(max)) {
            data["value"][1] -= 1;
        } else {
            logger.warn("< is equivalent to <= when applied to floats, use >= instead");
        }
        return data;
    }

    if(type == "lt_lt") {
        const context = args[1];
        const min = toNumber(args[0]);
        const max = toNumber(args[2]);
        if(!isContext(context)) {
            throw new CompileError("Middle argument must always be a context variable");
        }
        const data = buildCriterion("range", context);
        data["value"] = [min, max];
        if(isInteger(min)) {
            data["value"][0] += 1;
        } else {
            logger.warn("< is equivalent to <= when applied to floats, use >= instead");
        }
        if(isInteger(max)) {
            data["value"][1] -= 1;
        } else {
            logger.warn("< is equivalent to <= when applied to floats, use >= instead");
        }
        return data;
    }

    if(type == "exists") {
        return buildCriterion("exists", args[0]);
    }

    if(type == "empty") {
        return buildCriterion("empty", args[0]);
    }

    if(type == "nonempty") {
        return invertCriterion(buildCriterion("empty", args[0]));
    }

    if(type == "includes") {
        const data = buildCriterion("includes", args[0]);
        const value = args[1];
        checkListTypes(value);
        data["value"] = value;
        return data;
    }

    if(type == "excludes") {
        const data = buildCriterion("includes", args[0]);
        const value = args[1];
        checkListTypes(value);
        data["value"] = value;
        return invertCriterion(data);
    }

    if(type == "dummy") {
        const value = Number(args[0]);
        if(!isInteger(value)) {
            throw new CompileError("Dummy value must be an integer");
        }
        if(value == 0) {
            throw new CompileError("'dummy 0' is redundant");
        }
        return {
            "type": "dummy",
            "value": value
        };
    }

    if(type == "fail") {
        const value = Number(args[0]);
        if(value >= 1) {
            throw new CompileError("'fail " + value + "' will always fail");
        } else if(value <= 0) {
            throw new CompileError("'fail " + value + "' will always succeed");
        }
        return {
            "type": "fail",
            "value": value
        };
    }

    if(type == "negate") {
        const criterion = parseCriterion(args[0]);
        if(!criterion.hasOwnProperty("type")) {
            throw new CompileError("Cannot invert a preset");
        }
        if(CANNOT_INVERT.includes(criterion["type"])) {
            throw new CompileError("Cannot invert criterion of type " + criterion["type"]);
        }
        return invertCriterion(criterion);
    }

    throw new CompileError("Unknown criterion type '" + type + "'");
}

function buildEqualsCriterion(context, value) {
    if(!isContext(context)) {
        throw new CompileError("First argument must always be a context variable");
    }

    const data = buildCriterion("equals", context);

    if(isContext(value)) {
        data["type"] = "equals_dynamic";
        extractContext(value, data, "other_table", "other_field", data);
    } else {
        if(isDecimal(value)) {
            throw new CompileError("Equals should not be used with floating-point numbers");
        }
        if(Array.isArray(value)) {
            if(value.length <= 0) {
                throw new CompileError("Must specify at least one value");
            }
            if(value.length > 1) {
                checkListTypes(value);
            } else {
                value = value[0];
            }

        }
        data["value"] = value;
    }
    return data;
}

function checkListTypes(arr) {
    for(let el of arr) {
        if(!isInteger(el) && typeof el !== "string") {
            throw new CompileError("Lists should contain only strings and integers");
        }
    }
}

function buildCriterion(type, context) {
    const data = { "type": type };
    extractContext(context, data);
    return data;
}

function isContext(arg) {
    return typeof arg === "object" && arg.hasOwnProperty("context");
}

function isDecimal(arg) {
    return typeof arg === "number" && arg % 1 !== 0;
}

function isInteger(arg) {
    return typeof arg === "number" && arg % 1 === 0;
}

function invertCriterion(criterion) {
    if(criterion.hasOwnProperty("inverse")) {
        logger.warn("Redundant double inversion on criterion of type " + criterion["type"]);
        if(criterion["inverse"]) {
            delete criterion["inverse"];
        } else {
            criterion["inverse"] = true;
        }
    } else {
        criterion["inverse"] = true;
    }
    return criterion;
}

function toNumber(value) {
    value = Number(value);
    if(isNaN(value)) {
        throw new CompileError("Value is not a number");
    }
    return value;
}

function extractContext(context, obj = {}, tableName = "table", contextName = "field") {
    if(context.hasOwnProperty("table")) {
        obj[tableName] = context["table"];
    }
    obj[contextName] = context["context"];
    return obj;
}