# DrakonScript Command Line Tool

The command line tool is used to compile and test the generation of speech lines. It uses my [Contextual Dialogue](https://github.com/DrakonForge/ContextualDialogue) system to read the JSON output and generate speech lines.

The following guide is written for Windows users, though other platforms should have similar steps.

### Getting Started

To use this tool, the following installations are needed:

* [Java](https://www.oracle.com/java/technologies/downloads/) 16 or newer
* [Node.js](https://nodejs.org/en/download/) v16.13.0 or newer

You can run `java --version` and `node --version` in your command line to check the respective existence and versions of these installations.

### Adding DrakonScript Files

Yu can use the online [DrakonScript Code Editor](https://drakonforge.github.io/DrakonScript/) to write DrakonScript files. After writing the file, save the **DrakonScript** file (not the JSON file) to the `speechbanks` folder of this repository, which is the default input folder (you can change this below).

### Running the Script

Open a command line in the root folder of this repository. Then you can run `node generate.js`.

#### Optional Arguments

The following optional arguments are available to produce different results. You can use them by appending them (separated by spaces) after `node generate.js`. For example, `node generate.js --count=100` generates 100 speech lines instead of the default of 10.

| **Usage** | **Description** | **Default** |
| --- | --- | --- |
| --input=\<file path\> | Specifies the input directory where **DrakonScript** files are located. | `speechbanks` |
| --output=\<file path\> | Specifies the output directory which is populated with **JSON** files. | `generated/compiled`
| --context=\<file path\> | Specifies the context file describing the **context** tables available to the speech query. | `context.json`
| --group=\<name\> | Specifies the **group** to generate speech lines from. | `fruit_vendor`
| --category=\<name\> | Specifies the **category** to generate speech lines from. | `greeting`
| --count=\<integer\> | Specifies the **number** of speech lines to generate. | `10`
| --debug | Includes **debug messages** in the output, which may be useful for explaining how certain lines were tokenized or selected. | `false`
| --noprint | **Skips** printing the generated speech lines, which may be useful when `count` is a large number. | `false`
| --generate | Generates the **JavaScript parser file** from the Jison grammar, which may be useful to export to other programs. | `false`
| --minify | Generates **minified** JSON instead of formatted JSON, which reduces file size (but also readability) without changing the interpreter's behavior. | `false`
