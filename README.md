# DrakonScript: A Scripting Language for Contextual Dialogue

> **Table of Contents**

> * [Inspiration](#inspiration)
> * [Core Concepts](#core-concepts)
> * [Syntax](#syntax)
> * [Using the Web Editor](#using-the-web-editor)
> * [Using the Command Line Tool](#using-the-command-line-tool)
> * [Extending this System](#extending-this-system)

**DrakonScript** is a domain-specific scripting language for defining **contextual dialogue**. It compiles directly to [JSON](https://www.json.org/json-en.html), a widely supported data format that can be worked with using a variety of other programming languages. While these JSON files only store the speechbank definitions, they can be used with any **dialogue system** as a backend, including my **[Contextual Dialogue](https://github.com/DrakonForge/ContextualDialogue)** implementation in Java, which is made specifically for DrakonScript. This repository features two ways of parsing DrakonScript:

1. A **[web editor](#using-the-web-editor)** for DrakonScript, which features basic syntax highlighting and compilation. One is publicly hosted **[here](https://drakonforge.github.io/DrakonScript/)**.
2. A **[command line tool](#using-the-command-line-tool)**.

Unlike scripting languages in visual novel engines such as [RenPy](https://www.renpy.org/) or [Twine](https://twinery.org/), which are designed for choice-based narratives, DrakonScript is designed for writing **dialogue barks**: one-line callouts or exclamations that non-player characters (NPCs) might say in games such as *Assassin's Creed*, *The Last of Us*, and other open-world/adventure titles. Instead of a scripted conversation, barks are generally triggered by an **in-game event** and are ideally tailored to the current situation (or **context**) in order to make the NPC's reaction feel realistic. For example:

> *"She's over there, behind the car!"* — When an enemy spots the player in their hiding place.
> 
> *"That's not looking too good, brother!"* — When the player takes damage at low health.
> 
> *"Huh? Is someone there?"* — When a guard is alerted to some strange disturbance, of course followed by:
> 
> *"Must have been the wind."* — When the guard gives up their search.

These dialogue barks are used to communicate both the NPC's intention and personality to the player. There are some excellent resources to learn more about writing dialogue barks [here](https://sarah-beaulieu.com/en/writing-barks-for-video-games) and [here](https://indiegamewriting.com/writing-2-world-building-with-barks/).

## Inspiration

This system for dialogue barks is heavily inspired by [Elan Ruskin's GDC talk on Rules Databases for Contextual Dialogue](https://www.gdcvault.com/play/1015528/AI-driven-Dynamic-Dialog-through), with more components inspired from [Jason Gregory's talk on A Context-Aware Character Dialog System](https://www.gdcvault.com/play/1020386/A-Context-Aware-Character-Dialog). Unlike the systems described in both talks, this system is targeted towards text-based dialogue, though it can easily be applied to voice lines, animations, and other responses. It is also intended to be usable for many different kinds of projects as a general interface for contextual selection.

For my own projects, the goal of this system was to make the creation of rules databases (which previously had to be written in JSON) as easy as possible for writers. It also incorporates concepts from Programming Languages and Compiler Construction theory that I learned in university.

## Core Concepts

Each DrakonScript file represents a single **group**, which is a collection of NPCs that use that speechbank. NPCs with different dialogue should have their own DrakonScript files. Within each group are multiple **categories**, which represent the different kinds of things that NPC might say. For example, they might want to say something when they get hurt, greet the player, or see something suspicious. Each of these broad concepts that could possibly generate a speech line should be their own category.

Each category consists of a list of **rules**, which are a set of **criteria** paired to a list of **possible responses** if that criteria matches. Each criterion is a **yes or no** question about the current **context** of the game, which can pass or fail depending on the current game state. The rule matches if and only if **all of its criteria match**, and rules can have an arbitrary number of criteria (including zero) to support speech lines with varying levels of specificity.

When pairing this with a dialogue system backend, the dialogue system can request a line from a certain **group** and **category**, passing along the current **context** (some of which may be specific to the NPC, such as how close they are to the player or if they are an enemy of the player). Then, the dialogue system can find **matching rules** based on their criteria, and pick a random **response** from them which is used as the dialogue bark.

## Syntax

DrakonScript is designed to be easy to use and features light and intuitive syntax. It is mainly inspired by JavaScript, though the two languages are far from equivalent.

DrakonScript uses **brackets** to enclose large blocks, while **newlines** separate statements. Semicolons are not used whatsoever, and DrakonScript does not rely on whitespace or indentation unlike languages such as Python. By convention, all keywords and variables are written in `snake_case`.

Like in JavaScript, `//` and `/* ... */` are used for single-line and multi-line comments, respectively.

### File Structure

```js
group fruit_vendor {
  // A category for when this NPC greets the player.
  category greeting {
    // A rule that matches when it is currently morning
    rule (time = "morning") {
      lines = [
        // Possible speech lines the NPC can say if this rule matches
        "Good morning! How are you on this fine day, @name?"
      ]
    }

    // A rule that matches when the weather is sunny
    rule (weather = "sunny") {
      lines = [
        "It's a fine day to be out and about!"
      ]
    }

    // A rule with no criteria which always matches
    rule () {
      lines = [
        "Hello! How are you?"
      ]
    }
  }

  // A category for when the player buys an item from this NPC.
  category buy_item {
    // More rules...
  }
}
```

### Rules

The general syntax for a rule is as follows:

```js
rule [name] ([criterion1, criterion2, criterion3, ...]) {
  // statements...
}
```

The **name** and **criteria** values are entirely optional. The rule's **name** allows it to be referenced by other rules, which can be useful in a variety of situations (see **[Other Syntax](#other-syntax)**). The rule's **criteria** define the conditions by which the rule is allowed to match, and are separated by **commas**.

The most common rule statement is `lines = ...`; however, **context manipulation** and **symbol definition** statements are also supported within rule blocks.

### Context Keys

**Context keys** represent facts about the world. They are written as `table.key`, representing the property `key` of the context table `table`. The table can be omitted, such as simply `key`. When referenced in symbols, it is prefixed with a `#` character, such as `@symbol_name = #table.key`.

When querying or setting context, the value of a context key is limited to the following types:

* A string
* A number (integer or float)
* A boolean
* An array (list) of strings or integers

### Criteria

**Criteria** are **yes or no questions** that are used to define the conditions for when a rule matches. These criteria generally ask questions about the **context**, referencing context keys similarly to variables in general-purpose programming languages.

The following criterion types are available:

* `x = "string"`, `x = 3`, `x = true`: Checks if a context key is **equal** to a given value. Works for strings, numbers, and booleans, though not lists. Note that checking floating-point equality is [generally a bad idea](https://www.theregister.com/2006/08/12/floating_point_approximation/), so it's best to use ranges when comparing these.
* `x != "string"`, `x != 3`, `x != true`: Checks if a context key is **not equal** to a given value. Can be very useful for strings, though mostly redundant for booleans.
* `x > 3`, `x >= 4`: Checks if a context key is **greater than** the given number. A "strictly greater than" statement attempts to resolve to a "greater than or equal to" statement, treating the value as integers. Therefore, the two criteria listed in this example are actually **equivalent**. It is recommended only to use `>=` when working with floats.
* `x < 3`, `x <= 2`: Same behavior for the **less than** case. It is recommended only to use `<=` when working with floats.
* `2 <= x <= 5`: Checks if a context key is within a given **range** of numbers. If `<` is used, it will attempt to resolve to `<=` like the other inequality statements. If the minimum value is equal to the maximum value such as in the statement `1 < x < 3`, it will resolve to an equality comparison (in this case, `x = 2`).
* `x > y`, `x = y`: Compares two context keys **dynamically**. Supports `=`, `!=`, `>=`, `<=`, `>`, and `<`, though ranges are not supported.
* `x exists`: Checks if a context key exists.

#### List-Specific Criterion

The following criterion can only be used when the context key is a **list**:

* `x includes "apple"`: Whether the list stored in context key `x` **includes** the given value.
* `x excludes "apple"`: Whether the list stored in context key `x` **does not include** the given value.
* `x empty`: Whether the list stored in context key `x` is **empty**.
* `x nonempty`: Whether the list stored in context key `x` is **not empty**.

#### Special Criterion

The following criterion are not based on the current context, but are instead markers writers can use to modify how likely a rule is to be matched or selected:

* `dummy 3`: Adds the given integer value to this rule's **priority**, which determines which rules get checked first or prioritized. Useful to artificially raise or lower the priority of a rule.
* `fail 0.3`: A criterion that has a set chance (within `(0.0, 1.0)`) to **fail randomly**, disqualifying the rule for a random percentage of queries. The given example has a 30% chance to fail randomly. `fail 0.0` would always succeed and `fail 1.0` would always fail, so both statements are redundant and not allowed by the parser.

#### Alternate Criterion

Although criteria generally are all conjunctions (combined using `AND` statements), DrakonScript provides limited support for **alternate** criterion with the **equals**, **not equals**, **includes**, and **excludes** criterion, allowing the context key to equal (or not equal) one of multiple options. This can be written in two ways for **equals** and **not equals**:

1. `x = [ "option1", "option2", "option3" ]`: Allows context key `x` to be any of the three listed values.
2. `x = "option1" | "option2" | "option3"`: Same meaning using syntax similar to an `OR` statement in general-purpose programming languages.

For **includes** and **excludes**, they look like this instead:

1. `x includes [ "option1", "option2", "option3" ]`
2. `x includes "option1" | "option2" | "option3"`

Note that this means that `x` includes *any* of the three options, not *all* three options. If `excludes` is used instead, this means that `x` **cannot** include *any* of the three options (a direct inversion of the statement).

#### Inverting Criterion

All criterion, with the exception of **dummy** and **fail** criterion, can be inverted by prefixing it with a `!` character. Redundant statements such as `!x != 3` will properly simplify to `x = 3` in the parser. For example, `!drink exists` checks if a context key named `drink` does *not* exist.

### Speech Lines

The speech lines or **responses** for a rule can be defined using the `lines = ...` statement. This is generally done by setting the line equal to an array, like so:

```js
response {
  "Line 1"
  "Line 2"
  "Line 3"
  [
    "Multi-line 1"
    "Multi-line 2"
  ]
}
```

Commas between speech lines are not necessary. In addition, an **inner array** can be used to define a response containing multiple lines. This compiles to a single line with the individual lines join together with `/` characters, which can be used by your dialogue backend to separate lines. The above example's multi-line response would compile to `"Multi-line 1/Multi-line 2"`.

### Symbols

**Symbols** are aliases for various expressions, such as a list, number, or function. They are written in the form `@symbol_name = <exp>`, and can be defined on the **group level** (alongside `category` statements) or on the **rule level** (alongside `lines` and other statements).

Symbols are useful for creating a shorthand for various expressions. For example, defining a symbol for a list `@MyList = [ "item 1", "item 2", "item 3" ]` means that instead of writing the entire list again, you can instead reference it with `@MyList`. Symbols are meant to be **immutable**, which means attempting to define a symbol more than one may lead to errors depending on your dialogue system implementation.

### Functions

DrakonScript supports the use of pre-defined **functions**, which perform an operation on its arguments and return a single result. using the following syntax: `@functionName(arg1, arg2, arg3)`. These are differentiated from symbols by the use of parentheses at the end. Functions are valid expressions in symbol statements and can also be chained together, e.g. `@Result = @f(@g(X), Y)`.

Functions are defined entirely by the **dialogue system** backend—while DrakonScript allows the syntax for them, there are no pre-defined functions solely within DrakonScript and **new functions cannot be defined in DrakonScript**.

### Manipulating Context

DrakonScript supports mutable **context**, providing statements to manipulate context directly from rules. Context keys can be modified in the following ways:

* `set X.Y = <value>`: Set context key `X.Y` equal to the given value. Note that only certain values for context are supported. This can also be used to set one context key to the value of another, such as `set X.Y = X.Z`.
* `set X.Y += <number>`: Add the given number to context key `X.Y`. Also works for `-=`, `*=`, `/=`, and `%=` for subtraction, multiplication, division, and modulo, respectively.
* `remove X.Y`: Removes context key `X.Y` from the current context.
* `invert X.Y`: Only works if context key `X.Y` is a boolean. Inverts the boolean, so `false` becomes `true` and vice versa.

### Other Syntax

#### Alternative Group Definitions

There are two other ways to define groups, namely:

1. `group a extends b { ... }`: Defines a new group `a` as the child or subclass of group `b`. Can be used by the dialogue system implementation to establish **inheritance** or hierarchy between speechbanks.
2. `preset { ... }`: Defines a special **preset** speechbank that the dialogue system can use as the "default" parent speechbank if one is not explicitly defined.

#### Named Rules

A previously defined rule's name can be used as a criterion of another rule, which instead adds the previous rule to the **presets** field of the current rule. This can be used to inherit the criteria of a previously defined (preset) rule without needing to type it all over again, though this behavior is dependent on your dialogue system. For example:

```js
// Given a named rule
rule named_rule (x > 3, y > 4, z < 3) {
  // statements...
}

// Equivalent to: rule (x > 3, y > 4, z < 3, x < 6)
rule (named_rule, x < 6) {
  // statements
}
```

#### Response Preset

Instead of the standard `lines = [ ... ]` definition within a rule, you can use `lines = <rule_name>`. This will make the response for this rule exactly match the response of previously defined named rule, which is useful for designing multiple different conditions that can point to the exact same response.

## Using the Web Editor

The **[DrakonScript Code Editor](https://drakonforge.github.io/DrakonScript/)** provides an easy interface for writing and parsing DrakonScript files. This provides limited syntax highlighting, as a language extension for most popular code editors does not yet exist.

You can write DrakonScript on the left window. Then, you can press **Compile** to see the output on the right windows. The upper right window is the **JSON output**, where you can see the actual output of the file in more verbose JSON. The bottom right window is the **console**, which informs you of any compilation errors or successes. The following buttons across the top are available:

* **Theme**: Choose a visual theme. Currently supports Visual Studio Code (default), Base 16 Light, Base 16 Dark, and CodeMirror Light.
* **Font Size**: Choose a font size. Defaults to 16.
* **Load From File**: Choose a DrakonScript file (with a `.drkn` ending) from your local files to import into the editor.
* **Copy DrakonScript**: Copies the content of the DrakonScript editor window into your clipboard.
* **Download DrakonScript**: Downloads the content of the DrakonScript editor window as a DrakonScript (`.drkn`) file. The file name is set automatically from the group name.
* **Copy JSON**: Copies the content of the JSON output to your clipboard.
* **Download JSON**: Downloads the content of the JSON output into a JSON file. The file name is set automatically from the group name.
* **Save** (`Ctrl-S`): Saves the current working file to local storage. Only **one** DrakonScript file can be saved in local storage at a time. *If local storage is cleared, the working file is lost! Make sure to download anything you want to preserve long-term.*
* **Compile** (`Ctrl-R`): Attempts to compile DrakonScript into JSON, updating the JSON output. See the console for errors, if any.

## Using the Command Line Tool

The guide on how to use the command line tool can be found **[here](https://github.com/DrakonForge/DrakonScript/blob/main/CommandLineTool.md)**.

## Extending this System

### Writing Speech Lines

My [Contextual Dialogue](https://github.com/DrakonForge/ContextualDialogue) implementation supports the use of symbols, context, and more within speech line text, allowing for lines such as `"Hello, @name!"` to be properly replaced with something like `"Hello, Drakonkinst!"`. This functionality is not handled by the DrakonScript parser, and is entirely up to your dialogue system backend.

### Dialogue System Implementation

As JSON files are transferred between the DrakonScript parser and the system that actually reads the data and generates the lines, you can write your own dialogue system backend with DrakonScript if it supports the same JSON format (the expected JSON format is detailed [here](https://github.com/DrakonForge/ContextualDialogue/blob/main/Implementation.md#json-format)).

### Outside of Text-based Games

In a text-based game, speech lines are usually the exact line the NPC says such as "Hello there!" or "General Kenobi!". However, you can write the responses as **file paths** or **IDs** instead to make them point to audio or animation files, which means this language can be used for **voice lines** and other kinds of games.
