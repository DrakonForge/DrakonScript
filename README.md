# DrakonScript: A Custom Scripting Language for Contextual Dialogue

> **Table of Contents**
>
> - [Motivation](#motivation)
> - [Concepts](#concepts)
> - [Language Overview](#language-overview)
> - [Technical](#technical)
> - [How to Use the Web Editor](#how-to-use-the-web-editor)
> - [Interpreter](#interpreter)

**DrakonScript** is my custom scripting language for writing contextual dialogue. It allows writers to define a list of speech lines (text) and an arbitrary set of criteria by which they can appear.

## Motivation

I developed this language as a part of a contextual dialogue system. It is designed for dialogue systems that focus on random generation and "ambient" dialogue.

The system of arbitrary criteria is largely based on [Elan Ruskin's GDC talk on *Rules Databases for Contextual Dialogue*](https://www.gdcvault.com/play/1015528/AI-driven-Dynamic-Dialog-through), with more components inspired by from [Jason Gregory's talk on *A Context-Aware Character Dialog System*](https://www.gdcvault.com/play/1020386/A-Context-Aware-Character-Dialog). Unlike the systems described in both talks, my system is targeted towards text-based dialogue instead of audio/animations, though it can as easily be applied to voice lines.

This project's goal was to make the creation of rules databases (which previously had to be written in JSON) as easy as possible for developers. It also incorporates concepts from Programming Languages theory I've learned in university.

## Concepts

DrakonScript is designed to be easy to use and features light and intuitive syntax. It resembles languages like JavaScript and Java, but makes the syntax as simplistic as possible while still keeping the code orderly.

This parser compiles DrakonScript **directly to JSON**, where it can be used by other systems as a more unambiguous data format. DrakonScript files generally use a new file extension, `.drkn`.

It is important to understand that this parser is only one part of a **larger system**. The purpose of the parser is to translate DrakonScript to JSON, which represents the "front-end" or writer . The **integration into game logic**, including **speech line generation**, must be handled by an external **interpreter** that works with the resulting JSON files. While my interpreter is not included in this project, JSON is a common enough data format that it should be possible to write your own in your language of choice. **The purpose of this project is to make speechbank file creation more intuitive, not to actually generate the lines**.

I will mention that the current version of this system, even with an interpreter, is not [Turing-complete](https://en.wikipedia.org/wiki/Turing_completeness) and is therefore not a true programming language. In the future, I may add "actions" that allow certain rules to modify the context dictionary or trigger events (including other dialogue), which would make this language Turing-complete.

## Language Overview

Each DrakonScript file defines a speechbank for a single **group**, which is declared at the beginning of the file (such as `group fruit_vendor { ... }`). The `extends` keyword can be used to declare another group as its **parent**, which may allow it to inherit its parent's speechbank (such as `group fruit_vendor extends townsfolk { ... }`, in which the new `fruit_vendor` speechbank may inherit properties from a previously defined `townsfolk` speechbank).

The speechbank is further broken down into **categories** (declared with `category greeting { ... }`). Each category consists of a list of **rules** (declared as `rule ( <criteria> ) { ... }`), which define a set of **criteria** that determine if its contents can be used. Its contents may consist of a **lines** field, which defines a list of lines that may be used, as well as **lists** that are only used within the scope of that rule.

The [**web editor**](https://drakonforge.github.io/DrakonScript/)'s default input provides an example of a complete DrakonScript program.

### General Syntax

DrakonScript attempts to use as little syntax as possible without being as whitespace-reliant as a language like Python. **Brackets** are largely used to enclose blocks. **Newlines** generally separate statements, though **commas** may also be used to separate them in the same line. This means that this:

```js
list @LETTERS = [ "a", "b", "c" ]
```

Has exactly the same meaning as this:

```js
list @LETTERS = [
    "a"
    "b"
    "c"
]
```

Note the lack of commas in the second statement—since the list items are separated by newlines, the commas are optional. The same applies for **speech lines** and other statements.

In addition, symbol names are generally in `MACRO_CASE` (to clearly differentiate them from normal text) while rule labels, group names, and category names are generally written in `snake_case`. The parser will produce non-fatal warnings if these naming conventions are not followed.

### Lists

**Lists** (declared with `list @SYMBOL = [ "item1", "item2", ... ]`) are variables that may be declared **globally** for the speechbank or within a specific **rule**. You can use lists to assign a list of possibilities to a symbol, then use that symbol within speech lines to randomly select a possibility.

Global lists can be used anywhere in the speechbank, while rule-specific lists can only be used for speech lines within that rule. Depending on the interpreter, the speechbank may also inherit global lists from its parent speechbank.

Lists may also be declared **anywhere** in the speechbank or rule. However, when parsed they will be automatically **hoisted** to the top to be parsed before any category/speech line, respectively.

### Criteria

**Criteria** define when a rule matches or not, and its speech lines may be used. It is composed of zero or more **criterion** (to make a rule with no criteria, simply leave it empty `()`), separated by **commas**. These criterion check themselves against **context keys** provided by the interpreter, which are essentially variables.

The following criterion types are available:

- `x = "string"`, `x = 3`, `x = true`: Checks if a context key is equal to the given value. Works for strings, numbers, and booleans. Note that checking for floating-point inequality is [probably a bad idea](https://www.theregister.com/2006/08/12/floating_point_approximation/), so it's likely best to stick to integers.
- `x != "string"`, `x != 3`, `x != true`. Checks if a context key is *not* equal to the given value. Can be very useful for strings, though a little redundant for booleans.
- `x > 3`, `x >= 4`: Checks if a context key is greater than the given value. For integers, a statement like `x > 3` will be simplified into `x >= 4` automatically*.
- `x < 3`, `x <= 2`: Same for the "less than" case.
- `2 <= x <= 5`: Checks if a context key is within a given range. `<` can also be used here for integers, but this will be simplified like discussed above. If the minimum value is equal to the maximum value, the criterion will be simplified to an equals comparison.
- `x = y`, `x > y`: Compares two context keys dynamically. Supports `=`, `!=`, `>=`, `<=`, `>`, and `<`. Fails if either key does not exist.
- `x exists`: Checks if a context key exists, no matter what value is assigned to it.
- `dummy 5`: In my interpreter, a rule's priority is usually determined by the number of criteria it has, so it matches the most specific rules first. Dummy criteria adds the given integer value (which may also be negative) to the rule's priority to modify it, which has a number of uses.
- `fail 0.3`: A random criteria that has a set chance (within `[0.0, 1.0]`) to fail randomly. For example, the given example has a 30% chance to fail randomly. Any number below 0 will give a 0% chance to fail, while any number above 1 will give a 100% chance to fail (as such, both cases are redundant).
- `preset`: My interpreter allows **rule presets** to be defined in a separate file. Once declared, simply the preset's name may be used as a criterion, and will add all criteria from that rule preset to the current rule. For example, if a preset named `is_morning` contains the criterion `daytime < 0.5`, then `rule (is_morning, rooster exists) { ... }` declares a rule with the criteria that `daytime` is less than 0.5 and a `rooster` context key exists.

*\*Comparisons in the interpreter always simplify to `<=` and `>=`, so ideally to check for `>` and `<` you should include an additional `!=` or `dummy` criterion to make sure one rule is picked consistently.*

#### Specifying Table

For any context key, you can also specify a specific **table** to look it up from through the notation `table.key`. If the table is not specified, the interpreter may search for a matching table (my interpreter searches a list of commonly used tables by their priority).

#### Inverting Criterion

Inserting a `!` in front of the criterion will **invert** its condition, if possible. For example, `!name="Drakonkinst"` checks that the `name` field is *not* "Drakonkinst". Dummy and Fail criterion cannot be inverted, and inverting the not-equals or equals case (such as `!x!="value"`) is largely redundant.

### Speech Lines

Speech lines are a list of strings. If the rule associated with them matches, a random line is selected from the list to play.

Note that speech line parsing is largely not handled by this parser, though it is important to understand this process if an interpreter is also available and speech can actually be generated.

Speech lines normally consist of literal text. However, you may also use **symbols**, referenced as `@SYMBOL`, which "fills in the blank" by evaluatating that symbol. These are usually lists like defined above, where it fills in the blank with a random item from the list. However, any predefined symbols from the interpreter may also be used, such as `@NAME` in the example to refer to the player's name.

#### Inner Lists and Multi-Line Speech Lines

The `lines` field also supports **inner lists**, which indicate a **multi-line speech line**. For example, this code:

```js
lines = [
    "line1"
    "line2"
    [
        "innerLine1"
        "innerLine2"   
    ]
    "line3"
]
```

Declares **four** speech lines, one of which is a multi-line entry containing two lines. Multi-lines are handed based on the interpreter, and usually indicate that its lines should be played in order.

In addition, the `/` character can be used to create multi-line statements within a normal line. For example, the above example is equivalent to this code:

```js
lines = [
    "line1"
    "line2"
    "innerLine1 / innerLine2"
    "line3"
] 
```

Nesting lines multiple times is not permitted since it would not make sense.

#### Labels for Alternative Rules

Rules can optionally have a **label** that may be used by rules declared later, declared with `rule <label> ( <criteria> ) { ... }`. Then instead of instead of providing a list for a rule's `lines` field, you can set `lines = "<label>"` where the label is a previously defined rule. This will set that rule's `lines` field equal to the labelled rule's `lines` field, allowing it to re-use speech lines without needing to type them again (including any rule-specific lists)! This provides a method of creating alternate conditions for a set of speechlines, as either rule can match to them.

Note that **order of rules matters** in this case, as a label can only be used as a replacement for speech lines when a rule with that label has been previously defined.

## Technical

The parser uses [regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions) to parse the program. This means it does not attempt to evaluate anything nor warn you if anything is "missing"; it works entirely based on pattern matching and will fail if a pattern cannot be matched.

This repository features two methods of parsing DrakonScript:

1) A [Node.js](https://nodejs.org/en/) script that can parse DrakonScript files into JSON.
   - To run this, open a command line in this folder then run `node compile.js <filename>`. The resulting JSON will be placed in an `out/` subdirectory.
   - Alternatively, you can run `node compile.js --all <folder>` to attempt to compile every script in the given folder.

2) A custom web-based editor built for developing with DrakonScript, using [CodeMirror](https://codemirror.net/) and [jQuery](https://jquery.com/) among other libraries. Try it out [**here**](https://drakonforge.github.io/DrakonScript/)!
   - If you want to develop using your own code editor, I found that JavaScript-based syntax highlighting works best, though you will most likely need to disable error highlighting. There are numerous solutions to this end; for [Visual Studio Code](https://code.visualstudio.com/) I made a private **DrakonScript Language Extension** to differentiate these from normal JavaScript files.

## How to Use the Web Editor

My custom web-based code editor can be found [**here**](https://drakonforge.github.io/DrakonScript/). The left window is **DrakonScript**, while the right side features the resulting **JSON output** and the **console** (which will inform you of any errors of successes). Making edits in the DrakonScript window and then pressing **Compile** will produce the resulting parsed JSON. The following buttons and dropdowns at the top are available:

- **Theme**: Choose a visual theme. Currently supports Visual Studio Code, Base 16 Light, Base 16 Dark, and CodeMirror Light.
- **Font Size**: Choose a font size.
- **Load From a File**: Choose a DrakonScript file from your local files to import into the editor.
- **Copy DrakonScript**: Copies the content in the DrakonScript editor into your clipboard.
- **Download DrakonScript**: Downloads the content in the DrakonScript editor as a DrakonScript file. The file name is based on the group name, if available.
- **Copy JSON**: Copies the content in the JSON output into your clipboard.
- **Download JSON**: Downloads the content in the JSON output as a JSON file. The file name is based on the group name, if available.
- **Save**: Saves the current working file to local storage, using [LZUTF8](https://github.com/rotemdan/lzutf8.js/) to compress the file. Most browsers support up to 5 MB of local storage, so this will likely only be exceeded for extremely large files. *If local storage is cleared, the working file will be lost! Make sure to download anything you want to preserve long-term.*
- **Compile**: Attempts to compile DrakonScript into JSON, updating the JSON output. See the console for errors, if any. For performance, JSON will not update in real-time when you are editing DrakonScript!

## Interpreter Implementation

This repository does not include an interpreter, which unfortunately means a large portion of the contextual speech system is not implemented.

Hopefully, the JSON output format provides an idea of how speechbank files could be interpreted. If you're looking to build your own interpreter, I would recommend the following:

- Watch [Elan Ruskin's GDC talk on *Rules Databases for Contextual Dialogue*](https://www.gdcvault.com/play/1015528/AI-driven-Dynamic-Dialog-through), which largely inspired this project.
  - Create a context dictionary implementation that can store information about the world, in order to separate the game logic from what the writers are able to use.
  - Prioritize and *sort* rules by specificity, taking into account the dummy criteria where necessary. This ensures that the first rule that matches is usually the best, allowing you to stop early.
  - Hierarchical hashing is provided through group and category, which means that only a small portion of the database needs to be searched.
  - All static criterion comparisons can be done using the same `min <= x <= max` comparison, even strings (when stored as numerical symbols)! If done cleverly, you can avoid the branching penalty for these criterion.
- If you're going for text-based speech generation, helpful tools like randomly choosing from lists is only a start--implement some additional tools that can be used within **speech lines** to aid writers.
