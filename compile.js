const fs = require("fs");
const path = require("path");
const logger = require("./src/logger");
const parser = require("./src/parser");

// MAIN //

function compileSpeechbank(data) {
    let result;
    try {
        result = parser.parseSpeechbank(data);
    } catch(err) {
        logger.error("Failed to parse! " + err.name + ": " + err.message);
        return;
    }
    
    const fileName = result[0];
    const fileData = result[1];
    const outPath = path.join("out", escape(fileName) + ".json")
    fs.writeFileSync(outPath, JSON.stringify(fileData, null, 2));
    logger.success("Compiled speechbank to " + outPath);
}

function isFile(path) {
    return fs.existsSync(path) && fs.lstatSync(path).isFile();
}

function isDirectory(path) {
    return fs.existsSync(path) && fs.lstatSync(path).isDirectory();
}

// Config
let mode = null;

function setMode(flag, modeStr) {
    if(mode == null) {
        mode = modeStr;
    } else {
        logger.warn("Warning: Mode is already set to \"" + mode + "\", ignoring flag \"" + flag + "\"");
    }
}

function main(args) {
    if(args.length < 3) {
        logger.error("Error: You must enter a file name to process! Usage: node compile.js [flags...] <file name>");
        return;
    }
    const start = Date.now();
    
    const filePath = args[args.length - 1];
    const flags = args.slice(2, args.length - 1);
    
    for(let flag of flags) {
        flag = flag.toLowerCase();
        
        if(flag == "--standard") {
            setMode(flag, "standard");
        } else if(flag == "--all") {
            setMode(flag, "all");
        } else if(flag == "--rulepreset") {
            setMode(flag, "rulepreset");
        } else if(flag == "--listpreset") {
            setMode(flag, "listpreset");
        } else if(flag == "--nowarnings") {
            logger.showWarnings(false);
        }
    }
    
    // Default
    if(mode == null) {
        mode = "standard";
    }
    
    if(mode == "standard") {
        // Parse a speechbank
        if(!isFile(filePath)) {
            logger.error("Error: " + filePath + " is not a valid file!");
            return;
        }
        logger.log("Parsing speechbank file: " + filePath);
        const data = fs.readFileSync(filePath, "utf8");
        compileSpeechbank(data);
    } else if(mode == "rulepreset") {
        // Parse rule presets
        logger.log("Parsing rule preset file: " + filePath);
    } else if(mode == "listpreset") {
        // Parse list presets
        logger.log("Parsing list preset file: " + filePath);
    } else if(mode == "all") {
        // Parse all files in given folder
        if(!isDirectory(filePath)) {
            logger.error("Error: " + filePath + " is not a valid directory!");
            return;
        }
        logger.log("Compiling all scripts inside: " + filePath);    
        files = fs.readdirSync(filePath);
        files.forEach((file, index) => {
            let innerFilePath = path.join(filePath, file);
            if(isDirectory(innerFilePath)) {
                // do something
            } else if(isFile(innerFilePath)) {
                const data = fs.readFileSync(innerFilePath, "utf8");
                compileSpeechbank(data);
            } else {
                logger.error("Error: Unknown file " + innerFilePath);
            }
        });
    }
    
    const end = Date.now();
    logger.log("Execution time: " + (end - start) + "ms");
}

main(process.argv);