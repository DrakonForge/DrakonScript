"use strict"
import { writeFileSync, existsSync, lstatSync, readFileSync, readdirSync, mkdirSync, statSync, unlinkSync, mkdir } from "fs";
import { join } from "path";
import { logger } from "./docs/scripts/logger.js"
import { parseSpeechbank, generateParserFile } from "./src/parser.js"
import { execSync } from "child_process"

/**
 * This entire script is synchronized to allow for gathering metrics.
 */

const JSON_FILE = /\.json$/;
const DRKN_FILE = /\.drkn$/;

// HELPERS //

// Returns whether the path leads to a file.
function isFile(path) {
    return existsSync(path) && lstatSync(path).isFile();
}

// Returns whether the path leads to a directory.
function isDirectory(path) {
    return existsSync(path) && lstatSync(path).isDirectory();
}

// STEPS //

// Recursively deletes all JSON files from the given path
function deleteJSONFiles(path) {
    let files = readdirSync(path).map(file => join(path, file));

    // Iterate over all files
    for(let file of files) {
        const stat = statSync(file);
        if(stat.isDirectory()) {
            // Delete all files in the nested folder
            deleteJSONFiles(file);
        } else {
            // Check if the file is a JSON file
            if(JSON_FILE.test(file)) {
                try {
                    // Delete the file
                    unlinkSync(file);
                } catch(err) {
                    logger.error(`An error occurred deleting file ${file}: ${err.message}`);
                }
            }
        }
    }
}

// Parse all DrakonScript files from inputDir
// and populate outputDir with JSON files
function convertScripts(options, inputDir, outputDir) {
    inputDir = inputDir || options["input_folder"];
    outputDir = outputDir || options["output_folder"];

    // Check if input directory exists
    if(inputDir == null || !isDirectory(inputDir)) {
        throw new Error("Input directory does not exist!");
    }

    // Create output directory if it does not exist
    if(outputDir == null || !isDirectory(outputDir)) {
        if(!isFile(outputDir)) {
            // Make directory
            mkdirSync(outputDir);
        } else {
            // File path may be invalid
            throw new Error("Failed to create output directory!");
        }
    }

    let filenames = readdirSync(inputDir);

    // Recursively iterate through all files in inputDir
    filenames.forEach((file) => {
        let path = join(inputDir, file);

        if(isDirectory(path)) {
            // Parse nested folder
            convertScripts(options, path, join(outputDir, file))
        } else if(isFile(path) && DRKN_FILE.test(file)) {
            // Read DrakonScript file
            let data = readFileSync(path, "utf8");
            let result = parseSpeechbank(data); // Throws an error if parsing fails

            // Must be parsed successfully, write it to outputDir under the same path
            let fileName = result[0];
            let fileData = result[1];
            let outPath = join(outputDir, escape(fileName) + ".json");

            if(options.minify) {
                writeFileSync(outPath, JSON.stringify(fileData));
            } else {
                writeFileSync(outPath, JSON.stringify(fileData, null, 2));
            }
            logger.success("Compiled speechbank to " + outPath);
        } else {
            throw new Error("Unknown file " + path);
        }
    });
}

// Run the ContextualDialogue jar file to read the JSON and produce speech lines
function generateLines(options) {
    let cmd = "java -jar "
        + join("src", "ContextualDialogue.jar") + " "
        + options.output_folder + " "
        + options.context + " "
        + options.group + " "
        + options.category + " "
        + options.num_lines + " "
        + options.debug + " "
        + options.no_output;

    // Run java command
    execSync(cmd, { stdio: 'inherit' });
}

// MAIN //

// Read all arguments
function parseArgs(args) {
    const options = {
        "input_folder": "speechbanks",
        "output_folder": join("generated", "compiled"),
        "context": "context.json",
        "group": "fruit_vendor",
        "category": "greeting",
        "debug": false,
        "no_output": false,
        "generate": false,
        "minify": false,
        "num_lines": 10
    };

    const flags = args.slice(2);
    let numDefault = 0;
    for(let flag of flags) {
        flag = flag.trim().toLowerCase();
        let value = null;
        let sepIndex = flag.indexOf("=");
        if(sepIndex > -1) {
            value = flag.substring(sepIndex + 1);
            flag = flag.substring(0, sepIndex);
        }

        // Handle flags
        if(flag == "--input") {
            if(value == null) {
                logger.error("Input option must specify file path! \"--input=<file path>\"");
            } else {
                options["input_folder"] = value;
            }
        } else if(flag == "--output") {
            if(value == null) {
                logger.error("Output option must specify file path! \"--output=<file path>\"");
            } else {
                options["output_folder"] = value;
            }
        } else if(flag == "--context") {
            if(value == null) {
                logger.error("Context option must specify file path! \"--context=<file path>\"");
            } else {
                options["context"] = value;
            }
        } else if(flag == "--group") {
            if(value == null) {
                logger.error("Group option must specify group! \"--group=<group>\"");
            } else {
                options["group"] = value;
            }
        } else if(flag == "--category") {
            if(value == null) {
                logger.error("Category option must specify category! \"--category=<category>\"");
            } else {
                options["category"] = value;
            }
        } else if(flag == "--numlines") {
            if(value == null) {
                logger.error("NumLines option must specify number! \"--numlines=<number>\"");
            } else {
                options["num_lines"] = parseInt(value);
                if(options["num_lines"] < 1) {
                    logger.error("Number of lines must be at least 1!");
                    options["num_lines"] = 1;
                }
            }
        } else if(flag == "--debug") {
            options["debug"] = true;
        } else if(flag == "--noprint") {
            options["no_output"] = true;
        } else if(flag == "--generate") {
            options["generate"] = true;
        } else if(flag == "--minify") {
            options["minify"] = true;
        } else if(flag.startsWith("--")) {
            logger.error("Unrecognized flag \"" + flag + "\"!");
            continue;
        } else

            // Handle positional arguments
            if(numDefault == 0) {
                logger.log("Setting Group from positional argument " + flag);
                options["group"] = flag;
                numDefault++;
            } else if(numDefault == 1) {
                logger.log("Setting Category from positional argument " + flag);
                options["category"] = flag;
                numDefault++;
            } else if(numDefault == 2) {
                logger.log("Setting NumLines from positional argument " + flag);
                options["num_lines"] = parseInt(flag);
                numDefault++;
                continue;
            }
    }
    return options;
}

function main(args) {
    const start = Date.now();
    let options = parseArgs(args);

    if(!isDirectory(options.output_folder)) {
        mkdirSync(options.output_folder, { recursive: true });
    }

    deleteJSONFiles(options.output_folder);

    if(options.generate) {
        generateParserFile();
    }

    logger.log("\nConverting scripts...");
    convertScripts(options);

    //logger.log("\nGenerating lines...");
    //generateLines(options);

    const end = Date.now();
    logger.success("\nTotal execution time: " + (end - start) + "ms");
}

try {
    main(process.argv);
} catch(err) {
    logger.error("Script failed! " + err.name + ": " + err.message);
    logger.error(err.stack);
}