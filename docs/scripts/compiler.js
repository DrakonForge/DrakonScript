"use strict"
import { logger as builtInLogger } from "./logger.js"
let logger = builtInLogger;

const CANNOT_INVERT = ["Dummy", "Fail"];

class CompileError extends Error {
    constructor(...args) {
        super(...args);
        Error.captureStackTrace(this, CompileError);
    }
}

export function setLogger(obj) {
    logger = obj;
}

export function compileGroup(tree) {
    const name = tree["Id"];
    const defs = tree["Defs"];
    const symbols = [];
    const categories = [];
    for(const def of defs) {
        const type = def["Type"];
        if(type == "Category") {
            const category = parseCategory(def);
            categories.push(category);
        } else if(type == "Symbol") {
            const symbol = parseSymbol(def);
            symbols.push(symbol);
        } else {
            throw new CompileError("Unknown definition type '" + type + "' in group");
        }
    }

    const data = {};
    if(tree.hasOwnProperty("Parent")) {
        data["Parent"] = tree["Parent"];
    }
    if(symbols.length > 0) {
        data["Symbols"] = symbols;
    }
    if(Object.keys(categories).length > 0) {
        data["Categories"] = categories;
    }

    return [name, data];
}

function parseCategory(categoryDef) {
    const category = {
        "Name": categoryDef["Name"]
    };
    
    if(categoryDef.hasOwnProperty("Defs")) {
        const rules = [];
        const ruleDefs = categoryDef["Defs"];
        for(const ruleDef of ruleDefs) {
            const rule = parseRule(ruleDef);
            rules.push(rule);
        }
        category["Rules"] = rules;
    }
    
    return category;
}

function parseRule(ruleDef) {
    const data = {};
    const criteriaDef = ruleDef["Criteria"];

    if(ruleDef.hasOwnProperty("Name")) {
        data["Name"] = ruleDef["Name"];
    }

    if(criteriaDef.length > 0) {
        const criteria = [];
        const presets = [];
        for(const criterionDef of criteriaDef) {
            const criterion = parseCriterion(criterionDef);
            if(criterion.hasOwnProperty("Type")) {
                criteria.push(criterion);
            } else {
                presets.push(criterion);
            }
        }

        // TODO combine with criteria
        if(presets.length > 0) {
            data["Presets"] = presets;
        }

        if(criteria.length > 0) {
            data["Criteria"] = criteria;
        }
    }

    if(ruleDef.hasOwnProperty("Defs")) {
        const defs = ruleDef["Defs"];
        const symbols = [];
        let responses = [];
        let hasTextResponse = false;

        for(const def of defs) {
            const type = def["Type"];
            if(type == "Text") {
                if(hasTextResponse) {
                    throw new CompileError("Cannot have multiple text responses in a rule");
                }
                hasTextResponse = true;
                const responseDefs = def["Value"];
                let responseValue;
                if(typeof responseDefs === "string") {
                    // Named rule
                    responseValue = extractContext(responseDefs, {}, "Category", "Name");
                    // TODO: Make sure this is right for named rules, probably doesn't work
                } else {
                    // Normal lines
                    const lines = [];
                    for(const responseDef of responseDefs) {
                        const line = parseLine(responseDef);
                        lines.push(line);
                    }

                    if(lines.length > 0) {
                        responseValue = lines;
                    }
                }
                responses.push({
                    "Type": "Text",
                    "Value": responseValue
                });
            } else if(type == "Symbol") {
                const symbol = parseSymbol(def);
                symbols.push(symbol);
            } else if(type == "Context") {
                // Context action
                const contextAction = parseContextAction(def);
                responses.push(contextAction);
            } else if(type == "Event") {
                // TODO: Event Triggers, type of non-context action
                // Nothing for now
            }
        }

        if(symbols.length > 0) {
            data["Symbols"] = symbols;
        }
        if(responses.length) {
            data["Responses"] = responses;
        }
    }

    return data;
}

function parseContextAction(actionDef) {
    const data = {
        "Type": "Context",
        "Value": {
            "Op": actionDef["Op"],
            "Table": actionDef["Context"]["Table"],
            "Key": actionDef["Context"]["Key"]
        }
    };
    
    let value = null;
    if(actionDef.hasOwnProperty("Value")) {
        value = actionDef["Value"]
        data["Value"]["Value"] = value;
    }

    const op = actionDef["Op"];
    
    // Check values and types
    if(op == "Set") {
        if(value == null) {
            throw new CompileError("Value must exist for set operation");
        }
        if(Array.isArray(value)) {
            checkListTypes(value);
        }
    } else if(op == "Add") {
        if(value == null) {
            throw new CompileError("Value must exist for add operation");
        }
        if(typeof value !== "number") {
            throw new CompileError("Value must be a number for add operation");
        }
    } else if(op == "Sub") {
        if(value == null) {
            throw new CompileError("Value must exist for sub operation");
        }
        if(typeof value !== "number") {
            throw new CompileError("Value must be a number for sub operation");
        }
    } else if(op == "Mult") {
        if(value == null) {
            throw new CompileError("Value must exist for mult operation");
        }
        if(typeof value !== "number") {
            throw new CompileError("Value must be a number for mult operation");
        }
    } else if(op == "Div") {
        if(value == null) {
            throw new CompileError("Value must exist for div operation");
        }
        if(typeof value !== "number") {
            throw new CompileError("Value must be a number for div operation");
        }
        if(value == 0) {
            throw new CompileError("Canot divide by zero for div operation");
        }
    } else if(op == "Remove") {
        if(value != null) {
            throw new CompileError("Value should not exist for set operation");
        }
    } else if(op == "Invert") {
        if(value != null) {
            throw new CompileError("Value should not exist for set operation");
        }
    } else {
        throw new CompileError("Invalid operation \"" + op + "\"");
    }
    return data;
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
    // 1 level of flattening
    return {
        "Name": symbolDef["Name"],
        "Type": symbolDef["Value"]["Type"],
        "Value": symbolDef["Value"]["Value"]
    };
}

function parseCriterion(criterionDef) {
    const type = criterionDef["Type"];
    const args = criterionDef.hasOwnProperty("Args") ? criterionDef["Args"] : null;

    if(type == "Preset") {
        const arg = args[0];
        if(isContext(arg)) {
            return extractContext(arg, {}, "Category", "Name");
        }
        throw new CompileError("Invalid criterion, cannot be a lone value unless it is a preset");
    }

    if(type == "Eq") {
        return buildEqualsCriterion(args[0], args[1]);
    }

    if(type == "Neq") {
        return invertCriterion(buildEqualsCriterion(args[0], args[1]));
    }

    if(type == "Gt") {
        const context = args[0];
        const value = toNumber(args[1]);
        if(!isContext(context)) {
            throw new CompileError("First argument must always be a context variable");
        }
        if(typeof value !== "number") {
            throw new CompileError("Criterion " + type + " can only be applied to a number");
        }
        const data = buildCriterion("Gt", context);
        data["Value"] = value;
        return data;
    }

    if(type == "Lt") {
        const context = args[0];
        const value = toNumber(args[1]);
        if(!isContext(context)) {
            throw new CompileError("First argument must always be a context variable");
        }
        if(typeof value !== "number") {
            throw new CompileError("Criterion " + type + " can only be applied to a number");
        }
        const data = buildCriterion("Lt", context);
        data["Value"] = value;
        return data;
    }

    if(type == "Ge") {
        const context = args[0];
        const value = toNumber(args[1]);
        if(!isContext(context)) {
            throw new CompileError("First argument must always be a context variable");
        }
        if(typeof value !== "number") {
            throw new CompileError("Criterion " + type + " can only be applied to a number");
        }
        const data = buildCriterion("Ge", context);
        data["Value"] = value;
        return data;
    }

    if(type == "Le") {
        const context = args[0];
        const value = toNumber(args[1]);
        if(!isContext(context)) {
            throw new CompileError("First argument must always be a context variable");
        }
        if(typeof value !== "number") {
            throw new CompileError("Criterion " + type + " can only be applied to a number");
        }
        const data = buildCriterion("Le", context);
        data["Value"] = value;
        return data;
    }

    if(type == "LeLe") {
        const context = args[1];
        const min = toNumber(args[0]);
        const max = toNumber(args[2]);
        if(!isContext(context)) {
            throw new CompileError("Middle argument must always be a context variable");
        }
        // TODO: Check min/max types
        const data = buildCriterion("LeLe", context);
        data["Value"] = [min, max];
        return data;
    }

    if(type == "LtLe") {
        const context = args[1];
        const min = toNumber(args[0]);
        const max = toNumber(args[2]);
        if(!isContext(context)) {
            throw new CompileError("Middle argument must always be a context variable");
        }
        // TODO: Check min/max types
        const data = buildCriterion("LtLe", context);
        data["Value"] = [min, max];
        return data;
    }

    if(type == "LeLt") {
        const context = args[1];
        const min = toNumber(args[0]);
        const max = toNumber(args[2]);
        if(!isContext(context)) {
            throw new CompileError("Middle argument must always be a context variable");
        }
        // TODO: Check min/max types
        const data = buildCriterion("LeLt", context);
        data["Value"] = [min, max];
        return data;
    }

    if(type == "LtLt") {
        const context = args[1];
        const min = toNumber(args[0]);
        const max = toNumber(args[2]);
        if(!isContext(context)) {
            throw new CompileError("Middle argument must always be a context variable");
        }
         // TODO: Check min/max types
        const data = buildCriterion("LtLt", context);
        data["Value"] = [min, max];
        return data;
    }

    if(type == "Exists") {
        return buildCriterion("Exists", args[0]);
    }

    if(type == "Empty") {
        return buildCriterion("Empty", args[0]);
    }

    if(type == "Nonempty") {
        return invertCriterion(buildCriterion("Empty", args[0]));
    }

    if(type == "Includes") {
        const data = buildCriterion("Includes", args[0]);
        const value = args[1];
        checkListTypes(value);
        data["value"] = value;
        return data;
    }

    if(type == "Excludes") {
        const data = buildCriterion("Excludes", args[0]);
        const value = args[1];
        checkListTypes(value);
        data["value"] = value;
        return invertCriterion(data);
    }

    if(type == "Dummy") {
        const value = Number(args[0]);
        if(!isInteger(value)) {
            throw new CompileError("Dummy value must be an integer");
        }
        if(value == 0) {
            throw new CompileError("'dummy 0' is redundant");
        }
        return {
            "Type": "Dummy",
            "Value": value
        };
    }

    if(type == "Fail") {
        const value = Number(args[0]);
        if(value >= 1) {
            throw new CompileError("'fail " + value + "' will always fail");
        } else if(value <= 0) {
            throw new CompileError("'fail " + value + "' will always succeed");
        }
        return {
            "Type": "Fail",
            "Value": value
        };
    }

    if(type == "Negate") {
        const criterion = parseCriterion(args[0]);
        if(!criterion.hasOwnProperty("Type")) {
            throw new CompileError("Cannot invert a preset");
        }
        if(CANNOT_INVERT.includes(criterion["Type"])) {
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

    const data = buildCriterion("Equals", context);

    if(isContext(value)) {
        data["Type"] = "equals_dynamic";
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
        data["Value"] = value;
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
    const data = { "Type": type };
    extractContext(context, data);
    return data;
}

function isContext(arg) {
    return typeof arg === "object" && arg.hasOwnProperty("Table") && arg.hasOwnProperty("Key");
}

function isDecimal(arg) {
    return typeof arg === "number" && arg % 1 !== 0;
}

function isInteger(arg) {
    return typeof arg === "number" && arg % 1 === 0;
}

function invertCriterion(criterion) {
    if(criterion.hasOwnProperty("Inverse")) {
        logger.warn("Redundant double inversion on criterion of type " + criterion["type"]);
        if(criterion["Inverse"]) {
            delete criterion["Inverse"];
        } else {
            criterion["Inverse"] = true;
        }
    } else {
        criterion["Inverse"] = true;
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

function extractContext(context, obj = {}, tableName = "Table", contextName = "Field") {
    obj[tableName] = context["Table"];
    obj[contextName] = context["Context"];
    return obj;
}