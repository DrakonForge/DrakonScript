"use strict"
import { parser } from "../src/parser.js"

// LOGGER //
let loggerEl = $("#console");
const logger = {
    log(str) {
        // Blue shows up poorly in web, so we'll use the default one instead
        console.log(str);
        $("<p>").addClass("console-msg log").text(str).appendTo(loggerEl);
    },
    warn(str) {
        console.warn(str);
        $("<p>").addClass("console-msg warn").text(str).appendTo(loggerEl);
    },
    error(str) {
        console.error(str);
        $("<p>").addClass("console-msg error").text(str).appendTo(loggerEl);
    },
    success(str) {
        console.log(str);
        $("<p>").addClass("console-msg success").text(str).appendTo(loggerEl);
    },
    clear() {
        loggerEl.empty();
    }
};

// INITIAL SETTINGS //
const THEME_PREFIX = "cm-s-";
const SUPPORTED_THEMES = ["default", "vscode-dark", "base16-light", "base16-dark"];
const DEFAULT_THEME = "vscode-dark";
const DEFAULT_FONT_SIZE = 16;
const TAB_SIZE = 2;
const SAMPLE_PROGRAM = `
group fruit_vendor extends townsfolk {
  list FRUIT = [ "apples", "oranges", "mangoes", "pineapples", "watermelons", "avocadoes" ]
  category greeting {
    rule () {
      lines = [
        "Hello! Would you like to buy some @FRUIT?"
        "Hello there! I have @FRUIT for a lucky customer!"
      ]
    }
    rule (is_friend=true, dummy 2) {
      lines = [
        "Hello, @NAME! Would you like some @FRUIT today?"
        "How are you doing, @NAME! Care for some @FRUIT?"
        "Always nice to talk to you, @NAME. Are you here to buy @FRUIT again?"
      ]
    }
    rule (time="morning", fail 0.5) {
      list TOPIC = [ "weather", "tv show", "fireworks", "news", "stars", "moon" ]
      lines = [
        "Good morning, @NAME!"
        [
          "Hey, @NAME!"
          "Did you see the @TOPIC last night?"
        ]
      ]
    }
  }
  
  category farewell {
    rule () {
      lines = [
        "Goodbye!"
        "See you soon!"
        "Farewell!"
        "Until we meet again!"
      ]
    }
    
    rule (first_meeting=true) {
      lines = [
        "It was nice meeting you!"
        "I hope I'll see you around!"
      ]
    }
  }
}
`.trim();

// EDITOR SETUP //
// https://codemirror.net/doc/manual.html#config

let drknEditor = CodeMirror($("#drakonscript")[0], {
    "value": SAMPLE_PROGRAM,
    "mode": "drakonscript",
    "theme": DEFAULT_THEME,
    "indentUnit": TAB_SIZE,
    "tabSize": TAB_SIZE,
    "smartIndent": true,
    "electricChars": true,
    "lineNumbers": true,
    "autoCloseBrackets": true,
    "highlightSelectionMatches": true,
    "matchBrackets": true,
    "scrollbarStyle": "overlay"
});

let jsonEditor = CodeMirror($("#json")[0], {
    "value": "",
    "mode": "javascript",
    "theme": DEFAULT_THEME,
    "indentUnit": TAB_SIZE,
    "tabSize": TAB_SIZE,
    "smartIndent": true,
    "electricChars": true,
    "lineNumbers": false,
    "autoCloseBrackets": true,
    "scrollbarStyle": "overlay"
});

// WINDOW RESIZERS //
// https://htmldom.dev/create-resizable-split-views/

const createHorizontalSplit = (() => {
    const MIN_COLLAPSE_PERC = 10;   // %
    const DIVIDER_WIDTH = 7;    // px
    
    return function(resizer, editors, initialWidth) {
        const leftSide = resizer.prev();
        const rightSide = resizer.next();
        let x = 0;
        let leftWidth = 0;
        editors = editors || [];
        
        const mouseMoveHandler = function(e) {
            //https://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window

            // How far the mouse has been moved
            const dx = e.clientX - x;

            let newLeftWidth = ((leftWidth + dx) * 100) / resizer[0].parentNode.getBoundingClientRect().width;
            updateWidth(newLeftWidth);
            
            resizer.css("cursor", "col-resize");
            $(document.body).css("cursor", "col-resize");

            leftSide.css({
                "user-select": "none",
                "pointer-events": "none"
            });

            rightSide.css({
                "user-select": "none",
                "pointer-events": "none"
            });
        };

        const mouseUpHandler = function() {
            resizer.css("cursor", "");
            $(document.body).css("cursor", "");

            leftSide.css({
                "user-select": "",
                "pointer-events": ""
            });
            
            rightSide.css({
                "user-select": "",
                "pointer-events": ""
            });

            // Remove the handlers of `mousemove` and `mouseup`
            $(document).off('mousemove', mouseMoveHandler);
            $(document).off('mouseup', mouseUpHandler);
        };

        // Handle the mousedown event
        // that's triggered when user drags the resizer
        const mouseDownHandler = function(e) {
            // Get the current mouse position
            x = e.clientX;
            leftWidth = leftSide[0].getBoundingClientRect().width;

            // Attach the listeners to `document`
            $(document).on('mousemove', mouseMoveHandler);
            $(document).on('mouseup', mouseUpHandler);
        };
        
        const updateWidth = function(leftPercent) {
            const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            const dividerPercent = (DIVIDER_WIDTH * 100.0 / windowWidth);
            let rightPercent = 100.0 - leftPercent - dividerPercent;

            if(leftPercent < MIN_COLLAPSE_PERC) {
                leftSide.hide();
                leftPercent = 0;
                rightPercent = 100 - dividerPercent;
            } else {
                leftSide.show();
            }
            
            if(leftPercent > 100 - MIN_COLLAPSE_PERC) {
                rightSide.hide();
                leftPercent = 100 - dividerPercent;
                rightPercent = 0;
            } else {
                rightSide.show();   
            }

            leftSide.css("width", leftPercent + "%");
            rightSide.css("width", rightPercent + "%");
            
            // Update editor width
            for(let editor of editors) {
                editor.setSize("100%", null);
            }
        };
        
        // Attach the handler
        resizer.on('mousedown', mouseDownHandler);
        
        if(initialWidth != null) {
            updateWidth(initialWidth);
        }
        
        return {
            updateWidth  
        };
    };
})();

const createVerticalSplit = (() => {
    const MIN_COLLAPSE_PERC = 10;   // %
    const DIVIDER_WIDTH = 7;    // px

    return function(resizer, editors, initialWidth) {
        const topSide = resizer.prev();
        const botSide = resizer.next();
        let y = 0;
        let topHeight = 0;
        editors = editors || [];

        const mouseMoveHandler = function(e) {
            //https://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window

            // How far the mouse has been moved
            const dy = e.clientY - y;

            let newLeftWidth = ((topHeight + dy) * 100) / resizer[0].parentNode.getBoundingClientRect().height;
            updateWidth(newLeftWidth);

            resizer.css("cursor", "row-resize");
            $(document.body).css("cursor", "row-resize");

            topSide.css({
                "user-select": "none",
                "pointer-events": "none"
            });

            botSide.css({
                "user-select": "none",
                "pointer-events": "none"
            });
        };

        const mouseUpHandler = function() {
            resizer.css("cursor", "");
            $(document.body).css("cursor", "");

            topSide.css({
                "user-select": "",
                "pointer-events": ""
            });

            botSide.css({
                "user-select": "",
                "pointer-events": ""
            });
            
            // Remove the handlers of `mousemove` and `mouseup`
            $(document).off('mousemove', mouseMoveHandler);
            $(document).off('mouseup', mouseUpHandler);
        };

        // Handle the mousedown event
        // that's triggered when user drags the resizer
        const mouseDownHandler = function(e) {
            // Get the current mouse position
            y = e.clientY;
            topHeight = topSide[0].getBoundingClientRect().height;

            // Attach the listeners to `document`
            $(document).on('mousemove', mouseMoveHandler);
            $(document).on('mouseup', mouseUpHandler);
        };

        const updateWidth = function(topPercent) {
            const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            const dividerPercent = (DIVIDER_WIDTH * 100 / windowHeight);
            let botPercent = 100 - topPercent - dividerPercent;

            if(topPercent < MIN_COLLAPSE_PERC) {
                topSide.hide();
                topPercent = 0;
                botPercent = 100 - dividerPercent;
            } else {
                topSide.show();
            }

            if(topPercent > 100 - MIN_COLLAPSE_PERC) {
                botSide.hide();
                topPercent = 100 - dividerPercent;
                botPercent = 0;
            } else {
                botSide.show();
            }

            topSide.css("height", topPercent + "%");
            botSide.css("height", botPercent + "%");

            // Update editor width
            for(let editor of editors) {
                editor.setSize(null, "100%");
            }
        };

        // Attach the handler
        resizer.on('mousedown', mouseDownHandler);

        if(initialWidth != null) {
            updateWidth(initialWidth);
        }

        return {
            updateWidth
        };
    };
})();

// FUNCTIONS //

function compile() {
    logger.clear();
    let text = drknEditor.getValue();
    let result;
    try {
        result = parser.parseSpeechbank(text);
    } catch(err) {
        logger.error("Failed to parse! " + err.name + ": " + err.message);
        return;
    }
    logger.success("Compiled successfully!");
    let resultText = JSON.stringify(result[1], null, TAB_SIZE);
    jsonEditor.setValue(resultText);
}

let currentTheme = "";
function setTheme(theme) {
    if(!SUPPORTED_THEMES.includes(theme)) {
        logger.error("Theme " + theme + " is not supported!");
        return;
    }
    $(".container").removeClass(THEME_PREFIX + currentTheme);
    $(".container").addClass(THEME_PREFIX + theme);
    drknEditor.setOption("theme", theme);
    jsonEditor.setOption("theme", theme);
    currentTheme = theme;
}

function setFontSize(fontSize) {
    $(".CodeMirror").css("font-size", fontSize + "px");
    $("#console").css("font-size", fontSize + "px");
}

// EVENTS //

$(".select-theme").on("change", function() {
    setTheme(this.value);
});

$(".select-font").on("change", function () {
    setFontSize(this.value);
});

$(".button-compile").on("click", function() {
    compile();
});

// INIT //

function init() {
    parser.setLogger(logger);
    setTheme(DEFAULT_THEME);
    setFontSize(DEFAULT_FONT_SIZE);
    const editorSplit = createHorizontalSplit($(".editor-resizer"), [drknEditor, jsonEditor], 70);
    const outputSplit = createVerticalSplit($(".output-resizer"), [jsonEditor], 70);
    compile();
}
init();