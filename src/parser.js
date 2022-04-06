"use strict"

import * as fs from 'fs'
import * as path from 'path'
import pkg from 'jison'
import { compileSpeechbank } from "../docs/scripts/compiler.js"
import { logger } from "../docs/scripts/logger.js";

const { Parser } = pkg;
const GRAMMAR_PATH = path.join(".", "src", "DrakonScript.jison");
const GENERATED_DIR = path.join(".", "generated");
const GENERATED_NAME = "drakonscript.js";
let parser = null;

function createParser() {
    const grammar = fs.readFileSync(GRAMMAR_PATH, "utf8") + '\n';
    parser = new Parser(grammar);
    logger.log("Parser created");
}

export function generateParserFile() {
    if(parser == null) {
        // Read grammar
        createParser();
    }
    const parserSource = parser.generate();
    if(!fs.existsSync(GENERATED_DIR)) {
        fs.mkdirSync(GENERATED_DIR, { recursive: true });
    }
    const generatedPath = path.join(GENERATED_DIR, GENERATED_NAME);
    fs.writeFileSync(generatedPath, parserSource);
    logger.success("Parser file generated");
}

export function parseSpeechbank(data) {
    if(parser == null) {
        createParser();
    }
    
    return compileSpeechbank(parser.parse(data));
}
