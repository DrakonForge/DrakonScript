"use strict"

// LOGGING //
// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
export const logger = (() => {
    const RESET = "%s\x1b[0m";
    const COLOR_ERROR = "\x1b[31m";
    const COLOR_WARNING = "\x1b[33m";
    const COLOR_LOG = "\x1b[34m";
    const COLOR_SUCCESS = "\x1b[32m";

    let warnings = true;
    
    function error(str) {
        console.error(COLOR_ERROR + RESET, str);
    }

    function warn(str) {
        if(warnings) {
            console.warn(COLOR_WARNING + RESET, str);
        }
    }

    function log(str) {
        console.log(COLOR_LOG + RESET, str);
    }

    function success(str) {
        console.log(COLOR_SUCCESS + RESET, str);
    }

    function showWarnings(flag) {
        warnings = flag;
    }
    
    return {
        error, warn, log, success, showWarnings
    };
})();