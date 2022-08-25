"use strict"
import { compileGroup, setLogger } from "./compiler.js"
import { parser } from "./drakonscript-parser.js"

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
const MIN_VISIBLE_PERC = 30;
const SAMPLE_PROGRAM = `
group fruit_vendor extends townsfolk {
  @fruits = [ "apples", "oranges", "mangoes", "pineapples", "watermelons", "avocadoes",
             "cherries", "grapes", "tangerines" ]
  
  category interact {
    rule (!listener.conversation exists, listener.known = false) {
      set listener.conversation = 1
      lines = [
        "Hey! I haven't seen you around these parts."
        "Who goes there? Your face isn't familiar..."
        "What's your name, stranger?"
      ]
    }
    
    rule(!listener.conversation exists, listener.known = true) {
      set listener.conversation = 2
      lines = [
        "Nice to see you again, @name!"
      ]
    }
    
    rule (listener.conversation = 1) {
      set listener.conversation = 2
      lines = [
        "Ah, it's nice to meet you, @name! I'm #speaker.name."
        "@name...What an interesting name! Mine's #speaker.name."
      ]
    }
    
    rule(listener.conversation = 2) {
      set listener.conversation = 3
      lines = [
        "Welcome to my shop! As you can see, I sell fruit here."
      ]
    }
    
    rule(listener.conversation = 3) {
      set listener.conversation = 4
      lines = [
        "@capitalize(@fruits), @fruits, @fruits, @fruits... you name it!"
      ]
    }
    
    rule(listener.conversation >= 4) {
      set listener.conversation += 1
      @topic = [ "weather", "news", "spaceship", "football game" ]
      @num = #speaker.favorite_number
      lines = [
        "@capitalize(@fruits) and @fruits are in season, though @prev(1) are my favorite!"
        "Did you see the @topic today? Crazy, right?"
        "Could I interest you in some @fruits?"
        "We must have talked at least @add(#listener.conversation, -1) times already..."
        "My favorite number is @num. If you square it, you get @mult(@num, @num)!"
      ]
    }
    
    // weather -> world.weather
    rule(listener.conversation >= 4, weather = "rain", fail 0.8) {
      set listener.conversation += 1
      lines = [
        "My, the weather looks dreary today!"
        "Better keep dry!"
        "Best stay out of the rain today, @name!"
      ]
    }
    
    rule(listener.conversation >= 4, weather = "clear", fail 0.8) {
      set listener.conversation += 1
      lines = [
        "Ah, lovely clear skies today!"
        "What a nice breeze today!"
      ]
    }
    
    // Greater than 9 -> 10 or greater
    rule(listener.conversation > 9, dummy 5) {
      lines = [
        "I think we've chatted quite long enough for now, @name!"
        "I have to get back to work, @name!"
        "I'll see you later, @name!"
        "Goodbye, @name!"
        "Time to go, @name!"
      ]
    }
  }
}
`.trim();

// EDITOR SETUP //
// https://codemirror.net/doc/manual.html#config

let hasChanged = false;
let drknEditor = CodeMirror($("#drakonscript")[0], {
    "value": SAMPLE_PROGRAM,
    "mode": "drakonscript",
    "theme": DEFAULT_THEME,
    "indentUnit": TAB_SIZE,
    "tabSize": TAB_SIZE,
    "indentWithTabs": false,
    "smartIndent": true,
    "electricChars": true,
    "lineNumbers": true,
    "autoCloseBrackets": true,
    "highlightSelectionMatches": true,
    "matchBrackets": true,
    "scrollbarStyle": "overlay"
});
drknEditor.on("change", function(cm, change) {
    hasChanged = true;
});

let jsonEditor = CodeMirror($("#json")[0], {
    "value": "",
    "mode": "javascript",
    "theme": DEFAULT_THEME,
    "indentUnit": TAB_SIZE,
    "tabSize": TAB_SIZE,
    "indentWithTabs": false,
    "smartIndent": true,
    "electricChars": true,
    "lineNumbers": false,
    "autoCloseBrackets": true,
    "highlightSelectionMatches": true,
    "matchBrackets": true,
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
        
        const getDividerWidth = function() {
            const windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
            return (DIVIDER_WIDTH * 100.0 / windowWidth);
        };
        
        const getLeftWidth = function() {
            // How far the mouse has been moved
            return (leftSide[0].getBoundingClientRect().width * 100) / resizer[0].parentNode.getBoundingClientRect().width;
        };
        
        const getRightWidth = function() {
            return 100 - getLeftWidth() - getDividerWidth();
        };
        
        const mouseMoveHandler = function(e) {
            //https://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window

            const dx = e.clientX - x;
            const leftPercent = ((leftWidth + dx) * 100) / resizer[0].parentNode.getBoundingClientRect().width;
            updateWidth(leftPercent);
            
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
            const dividerPercent = getDividerWidth();
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
            updateWidth, getLeftWidth, getRightWidth, getDividerWidth
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
        
        const getDividerWidth = function() {
            const windowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;
            return (DIVIDER_WIDTH * 100 / windowHeight);
        };
        
        const getTopWidth = function() {
            // How far the mouse has been moved
            return (topSide[0].getBoundingClientRect().height * 100) / resizer[0].parentNode.getBoundingClientRect().height;
        };
        
        const getBotWidth = function() {
            return 100 - getTopWidth() - getDividerWidth();
        };

        const mouseMoveHandler = function(e) {
            //https://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window

            // How far the mouse has been moved
            const dy = e.clientY - y;
            const topPercent = ((topHeight + dy) * 100) / resizer[0].parentNode.getBoundingClientRect().height;
            updateWidth(topPercent);

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
            const dividerPercent = getDividerWidth();
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
            updateWidth, getTopWidth, getBotWidth, getDividerWidth
        };
    };
})();

// FUNCTIONS //

function compile() {
    logger.clear();
    clearJSON();
    let text = drknEditor.getValue();
    let result;
    try {
        result = compileGroup(parser.parse(text));
    } catch(err) {
        logger.error("Failed to parse! " + err.name + ": " + err.message);
        ensureConsoleVisible();
        return;
    }
    logger.success("Compiled successfully!");
    let resultText = JSON.stringify(result[1], null, TAB_SIZE);
    jsonEditor.setValue(resultText);
    ensureJSONVisible();
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
    localStorage.setItem(THEME_KEY, theme);
}

function setFontSize(fontSize) {
    $(".CodeMirror").css("font-size", fontSize + "px");
    $("#console").css("font-size", fontSize + "px");
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
}

const COMPRESSION_FORMAT = "Base64";
const SAVE_KEY = "drakonscript-save";
function save() {
    const data = drknEditor.getValue()
    const compressed = LZUTF8.compress(data, { "outputEncoding": COMPRESSION_FORMAT });
    localStorage.setItem(SAVE_KEY, compressed);
    logger.success("Successfully saved to local storage! Size: " + (byteCount(compressed) / 1000) + "kB");
    hasChanged = false;
}

function load() {
    const compressed = localStorage.getItem(SAVE_KEY);
    if(compressed == null || compressed.length <= 0) {
        return;
    }
    const data = LZUTF8.decompress(compressed, { "inputEncoding": COMPRESSION_FORMAT });
    drknEditor.setValue(data);
    logger.log("Successfully loaded from local storage! Size: " + (byteCount(compressed) / 1000) + "kB");
}

function autosave() {
    if(hasChanged) {
        logger.log("Autosaving...");
        save();
    }
}

function byteCount(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}

function downloadDrakonScript() {
    const value = drknEditor.getValue();
    if(value.length <= 0) {
        logger.warn("Nothing to download!");
        return;
    }
    logger.log("Downloading...");
    let fileName = parser.getName(value);
    if(fileName == null) {
        fileName = "script";
    }
    downloadFile(fileName + ".drkn", value);
    logger.success("Created file!");
}

function copyDrakonScript() {
    copyToClipboard(drknEditor.getValue());
}

function downloadJSON() {
    const value = jsonEditor.getValue();
    if(value.length <= 0) {
        logger.warn("Nothing to download!");
        return;
    }
    
    logger.log("Downloading...");

    let fileName;
    try {
        const parsed = parser.parseGroup(drknEditor.getValue());
        fileName = parsed[0];
    } catch(err) {
        fileName = "script";
    }

    downloadFile(fileName + ".json", value);
    logger.success("Created file!");
}

function copyJSON() {
    copyToClipboard(jsonEditor.getValue());
}

function clearJSON() {
    jsonEditor.setValue("");
}

// https://stackoverflow.com/questions/16215771/how-to-open-select-file-dialog-via-js
function uploadDrakonScript() {
    logger.log("Waiting for the user to provide a file...");
    $(".file-input").trigger("click");
}

function minifyJSON() {
    try {
        jsonEditor.setValue(JSON.stringify(JSON.parse(jsonEditor.getValue())));
    } catch(err) {
        logger.error("Not valid JSON, failed to minify!");
    }
}

function ensureDrakonScriptVisible() {
    const leftPercent = editorSplit.getLeftWidth();
    console.log(leftPercent);
    if(leftPercent < MIN_VISIBLE_PERC) {
        editorSplit.updateWidth(MIN_VISIBLE_PERC);
    }
}

function ensureJSONVisible() {
    const rightPercent = editorSplit.getRightWidth();
    if(rightPercent < MIN_VISIBLE_PERC) {
        editorSplit.updateWidth(100 - MIN_VISIBLE_PERC - editorSplit.getDividerWidth());
    }

    const topPercent = outputSplit.getTopWidth();
    if(topPercent < MIN_VISIBLE_PERC) {
        outputSplit.updateWidth(MIN_VISIBLE_PERC);
    }
}

function ensureConsoleVisible() {
    const rightPercent = editorSplit.getRightWidth();
    if(rightPercent < MIN_VISIBLE_PERC) {
        editorSplit.updateWidth(100 - MIN_VISIBLE_PERC - editorSplit.getDividerWidth());
    }

    const botPercent = outputSplit.getBotWidth();
    if(botPercent < MIN_VISIBLE_PERC) {
        outputSplit.updateWidth(100 - MIN_VISIBLE_PERC - outputSplit.getDividerWidth());
    }
}

function copyToClipboard(str) {
    if(!navigator.clipboard) {
        // use old commandExec() way
        const el = document.createElement('textarea');
        el.value = str;
        el.select();
        document.execCommand('copy');
        logger.success("Successfully copied to clipboard!");
    } else {
        navigator.clipboard.writeText(str).then(
            function () {
                logger.success("Successfully copied to clipboard!");
            })
            .catch(function () {
                    logger.error("Failed to copy to clipboard!");
                });
    }
}

// https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
function downloadFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

const FONT_SIZE_KEY = "drakonscript-font-size";
const THEME_KEY = "drakonscript-theme";
function loadSettings() {
    let fontSize = localStorage.getItem(FONT_SIZE_KEY);
    if(fontSize == null) {
        fontSize = DEFAULT_FONT_SIZE;
    }
    setFontSize(fontSize);
    $(".select-font").val(fontSize);
    
    let theme = localStorage.getItem(THEME_KEY);
    if(theme == null) {
        theme = DEFAULT_THEME;
    }
    setTheme(theme);
    $(".select-theme").val(theme);
    
    logger.success("Settings loaded!");
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

$(".button-save").on("click", function () {
    save();
});

$(".button-upload").on("click", function() {
   uploadDrakonScript(); 
});

$(".button-download-drkn").on("click", function() {
    downloadDrakonScript();
});

$(".button-download-json").on("click", function() {
    downloadJSON();
});

$(".button-copy-drkn").on("click", function () {
    copyDrakonScript();
});

$(".button-copy-json").on("click", function () {
    copyJSON();
});

$(".button-minify-json").on("click", function() {
    minifyJSON();
});

$(window).bind("keydown", function (event) {
    if(event.ctrlKey || event.metaKey) {
        switch(String.fromCharCode(event.which).toLowerCase()) {
            case 's':
                event.preventDefault();
                save();
                break;
            case 'r':
                event.preventDefault();
                compile();
                break;
        }
    }
});

$(".file-input").on("change", e => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.readAsText(file, "UTF-8");

    logger.log("Attempting to load file...");
    reader.onload = readerEvent => {
        const content = readerEvent.target.result;
        drknEditor.setValue(content);
        logger.success("Successfully loaded file!");
        clearJSON();
        ensureDrakonScriptVisible();
    };
});

window.onbeforeunload = function(e) {
    e = e || window.event;
    
    // Do not prompt user if all changes are saved
    if(!hasChanged) {
        return null;
    }
    
    // For IE and Firefox prior to version 4
    if(e) {
        e.returnValue = "Reload site? You may still have unsaved changes.";
    }

    // For Safari
    return "Reload site? You may still have unsaved changes.";
}

// Autosaving
const AUTOSAVE_INTERVAL = 30 * 1000;
setInterval(autosave, AUTOSAVE_INTERVAL);

// INIT //

let editorSplit;
let outputSplit;
function init() {
    setLogger(logger);
    loadSettings();
    editorSplit = createHorizontalSplit($(".editor-resizer"), [drknEditor, jsonEditor], 70);
    outputSplit = createVerticalSplit($(".output-resizer"), [jsonEditor], 70);
    load();
    compile();
}

$(function() {
    init();
});