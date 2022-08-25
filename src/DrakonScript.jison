/* lexical grammar */
%lex

/* Escapes with the help of https://github.com/czurnieden/Little/blob/master/grammar/Little-lexer-and-grammar.jison */

escapechar [\"\\bfnrtv]
escape \\{escapechar}
acceptedchars [^\"\\]+
stringcontents {escape}|{acceptedchars}
stringliteral \"{stringcontents}*\"

%%
/* Ignored */
"//"([^\r^\n])*                 /* skip single-line comments */
"/"[*]([^*]|([*][^/]))*[*]+"/"  /* skip multi-line comments */
\s+                             /* skip whitespace */

/* Keywords */

// Multi-word phrases--a little hacky since whitespace must be exact
"speech group"  return 'speech group';
"simple group"  return 'simple group';
"category override" return 'category override';

"group"         return 'group';
"extends"       return 'extends';
"category"      return 'category';
"rule"          return 'rule';
"response"      return 'response';
"set"           return 'set';
"remove"        return 'remove';
"insert"        return 'insert';
"exists"        return 'exists';
"empty"         return 'empty';
"nonempty"      return 'nonempty';
"includes"      return 'includes';
"excludes"      return 'excludes';
"dummy"         return 'dummy';
"fail"          return 'fail';
"true"          return 'true';
"false"         return 'false';

/* Tokens */
[a-zA-Z][a-zA-Z_0-9]*                               return 'Id';
"@"[a-zA-Z][a-zA-Z_0-9]*  yytext = yytext.slice(1); return 'Symbol';
"#"[a-zA-Z][a-zA-Z_0-9]*"."[a-zA-Z][a-zA-Z_.0-9]*    yytext = yytext.slice(1); return 'Context';
("-")?(0|[1-9][0-9]*)"."[0-9]+                      return 'Float';
("-")?(0|[1-9][0-9]*)                               return 'Integer'
{stringliteral}              yytext = yytext.slice(1,-1).replace(/\\/g,""); return 'String'
<<EOF>>                                             return 'EOF';

/* Operations */
"!="      return '!=';
"+="      return '+=';
"-="      return '-=';
"/="      return '/=';
"*="      return '*=';
"%="      return '%=';
">="      return '>=';
"<="      return '<=';
"++"      return '++';
"--"      return '--';
"*"       return '*';
"/"       return '/';
"-"       return '-';
"+"       return '+';
"="       return '=';
">"       return '>';
"<"       return '<';
","       return ',';
"."       return '.';
"|"       return '|';
"!"       return '!';
"("       return '(';
")"       return ')';
"{"       return '{';
"}"       return '}';
"["       return '[';
"]"       return ']';

/lex

/* language grammar */

/* Define the starting rule */
%start Root

%%

Root 
    : Group EOF
        {return $1;}
    ;

Group
    : 'group' Id '{' GroupDefs '}'
        {$$ = {"Id": $2, "Defs": $4};}
    | 'group' Id 'extends' Id '{' GroupDefs '}'
        {$$ = {"Id": $2, "Parent": $4, "Defs": $6};}
    | 'speech group' Id '{' GroupDefs '}'
        {$$ = {"Id": "$2", "Type": "Speech", "Defs": $4};}
    | 'simple group' Id '{' GroupDefs '}'
        {$$ = {"Id": "$2", "Type": "Simple", "Defs": $4};}
    ;

GroupDefs
    : /* Empty */
        {$$ = [];}
    | GroupDefs GroupDef
        {$1.push($2);$$ = $1;}
    ;

GroupDef
    : 'category' Id '{' CatDefs '}'
        {$$ = {"Type": "Category", "Name": $2, "Defs": $4};}
    | 'category override' Id '{' CatDefs '}'
        {$$ = {"Type": "Category", "Name": $2, "Defs": $4, "Inherit": false};}
    | 'category' Id
        {$$ = {"Type": "Category", "Name": $2};}
    | 'category override' Id
        {$$ = {"Type": "Category", "Name": $2, "Inherit": false};}
    | Symbol '=' Exp
        {$$ = {"Type": "Symbol", "Name": $1, "Value": $3};}
    ;

CatDefs
    : /* Empty */
        {$$ = [];}
    | CatDefs CatDef
        {$1.push($2);$$ = $1;}
    ;
    
CatDef
    /* Rule without label */
    : 'rule' '(' CriteriaOrEmpty ')' '{' RuleDefs '}'
        {$$ = {"Criteria": $3, "Defs": $6}}
    /* Rule with label */
    | 'rule' Id '(' CriteriaOrEmpty ')' '{' RuleDefs '}'
        {$$ = {"Name": $2, "Criteria": $4, "Defs": $7}}
    /* Empty rule with a label */
    | 'rule' Id '(' CriteriaOrEmpty ')'
        {$$ = {"Name": $2, "Criteria": $4}}
    ;

CriteriaOrEmpty
    : /* Empty */
        {$$ = [];}
    | Criteria
        {$$ = $1;}
    ;

Criteria
    : Criterion
        {$$ = [$1]}
    | Criteria ',' Criterion
        {$1.push($3);$$ = $1;}
    ;
    
Criterion
    : Val
        {$$ = {"Type": "Named", "Args": [$1]};}
    | Val '=' PValList
        {$$ = {"Type": "Eq", "Args": [$1, $3]};}
    | Val '!=' PValList
        {$$ = {"Type": "Neq", "Args": [$1, $3]};}
    | Val '>' Val
        {$$ = {"Type": "Gt", "Args": [$1, $3]};}
    | Val '<' Val
        {$$ = {"Type": "Lt", "Args": [$1, $3]};}
    | Val '>=' Val
        {$$ = {"Type": "Ge", "Args": [$1, $3]};}
    | Val '<=' Val
        {$$ = {"Type": "Le", "Args": [$1, $3]};}
    | Val '<=' TId '<=' Val
        {$$ = {"Type": "LeLe", "Args": [$1, $3, $5]};}
    | Val '<' TId '<=' Val
        {$$ = {"Type": "LtLe", "Args": [$1, $3, $5]};}
    | Val '<=' TId '<' Val
        {$$ = {"Type": "LeLt", "Args": [$1, $3, $5]};}
    | Val '<' TId '<' Val
        {$$ = {"Type": "LtLt", "Args": [$1, $3, $5]};}
    | TId 'exists'
        {$$ = {"Type": "Exists", "Args": [$1]};}
    | TId 'empty'
        {$$ = {"Type": "Empty", "Args": [$1]};}
    | TId 'nonempty'
        {$$ = {"Type": "Nonempty", "Args": [$1]};}
    | TId 'includes' PValList
        {$$ = {"Type": "Includes", "Args": [$1, $3]};}
    | TId 'excludes' PValList
        {$$ = {"Type": "Excludes", "Args": [$1, $3]};}
    | 'dummy' Integer
        {$$ = {"Type": "Dummy", "Args": [$2]};}
    | 'fail' Number
        {$$ = {"Type": "Fail", "Args": [$2]};}
    | '!' Criterion
        {$$ = {"Type": "Negate", "Args": [$2]};}
    ;
    
RuleDefs
    : /* Empty */
        {$$ = [];}
    | RuleDefs RuleDef
        {$1.push($2); $$ = $1;}
    ;

RuleDef
    : 'response' '{' Responses '}'
        {$$ = {"Type": "Text", "Value": $3};}
    | 'response' TId
        {$$ = {"Type": "Text", "Value": $2};}
    /* Symbol */
    | Symbol '=' Exp
        {$$ = {"Type": "Symbol", "Name": $1, "Value": $3};}
    /* Context */
    | 'set' TId '=' ValOrList
        {$$ = {"Type": "Context", "Op": "Set", "Context": $2, "Value": $4 };}
    | 'set' TId '+=' Val
        {$$ = {"Type": "Context", "Op": "Add", "Context": $2, "Value": $4 };}
    | 'set' TId '-=' Val
        {$$ = {"Type": "Context", "Op": "Sub", "Context": $2, "Value": $4 };}
    | 'set' TId '*=' Val
        {$$ = {"Type": "Context", "Op": "Mult", "Context": $2, "Value": $4 };}
    | 'set' TId '/=' Val
        {$$ = {"Type": "Context", "Op": "Div", "Context": $2, "Value": $4 };}
    | 'set' '++' TId
        {$$ = {"Type": "Context", "Op": "Add", "Context": $3, "Value": 1 };}
    | 'set' '--' TId
        {$$ = {"Type": "Context", "Op": "Sub", "Context": $3, "Value": 1 };}
    | 'set' TId '++'
        {$$ = {"Type": "Context", "Op": "Add", "Context": $2, "Value": 1 };}
    | 'set' TId '--'
        {$$ = {"Type": "Context", "Op": "Sub", "Context": $2, "Value": 1 };}
    | 'remove' TId
        {$$ = {"Type": "Context", "Op": "Remove", "Context": $2 };}
    | 'invert' TId
        {$$ = {"Type": "Context", "Op": "Invert", "Context": $2 };}
    /* Triggers */
    | 'trigger' TId '(' ExpsOrEmpty ')'
        {$$ = {"Type": "Event", "Name": $2, "Args": $};}
    ;

Responses
    : /* Empty */
        {$$ = [];}
    | Responses Response
        {$1.push($2); $$ = $1;}
    ;

Response1
    : String
        {$$ = $1;}
    | Response1 ','
        {$$ = $1;}
    ;

Response1s
    : /* Empty */
        {$$ = [];}
    | Response1s Response1
        {$1.push($2); $$ = $1;}
    ;

Response
    : Response1
        {$$ = $1;}
    | '[' Response1s ']'
        {$$ = $2;}
    ;

Exp3
    : Integer
        {$$ = {"Type": "Integer", "Value": $1};}
    | Float
        {$$ = {"Type": "Float", "Value": $1};}
    | String
        {$$ = {"Type": "String", "Value": $1};}
    | Context
        {let i = $1.indexOf('.'); $$ = {"Type": "Context", "Value": {"Table": $1.substring(0, i), "Key": $1.substring(i + 1)}};}
    | Symbol
        {$$ = {"Type": "Symbol", "Value": $1};}
    | true
        {$$ = {"Type": "Boolean", "Value": true};}
    | false
        {$$ = {"Type": "Boolean", "Value": false};}
    ;

Exp2
    : Exp3
        {$$ = $1;}
    | Symbol '(' ExpsOrEmpty ')'
        {$$ = {"Type": "Function", "Value": {"Name": $1, "Args": $3}};}
    | '[' ExpsOrEmpty ']'
        {$$ = {"Type": "List", "Value": $2};}
    | '!' Exp2
        {$$ = {"Type": "Function", "Value": { "Name": "negate", "Args": [$2]}};}
    ;
    
Exp1
    : Exp2
        {$$ = $1;}
    | Exp1 '*' Exp2
        {$$ = {"Type": "Function", "Value": { "Name": "negate", "Args": [$1, $3]}};}
    | Exp1 '/' Exp2
        {$$ = {"Type": "Function", "Value": { "Name": "div", "Args": [$1, $3]}};}
    | Exp1 '%' Exp3
        {$$ = {"Type": "Function", "Value": { "Name": "mod", "Args": [$1, $3]}};}
    ;

Exp
    : Exp1
        {$$ = $1;}
    | Exp '+' Exp1
        {$$ = {"Type": "Function", "Value": { "Name": "add", "Args": [$1, $3]}};}
    | Exp '-' Exp1
        {$$ = {"Type": "Function", "Value": { "Name": "sub", "Args": [$1, $3]}};}
    ;
    
    
ExpsOrEmpty
    : /* EMPTY */
        {$$ = [];}
    | Exps
        {$$ = $1;}
    ;

Exps
    : Exp
        {$$ = [$1];}
    | Exps ',' Exp
        {$1.push($3); $$ = $1;}
    ;

TId
    : Id '.' Id
        {$$ = {"Table": $1, "Key": $3};}
    ;

Val
    : Number
        {$$ = $1;}
    | String
        {$$ = $1;}
    | true
        {$$ = true;}
    | false
        {$$ = false;}
    | TId
        {$$ = $1;}
    ;

Vals
    : Val
        {$$ = [$1];}
    | Vals ',' Val
        {$1.push($3);$$ = $1;}
    ;

PVals
    : Val
        {$$ = [$1];}
    | PVals '|' Val
        {$1.push($3);$$ = $1;}
    ;

ValList
    : '[' Vals ']'
        {$$ = $2;}
    ;

ValOrList
    : Val
        {$$ = $1;}
    | ValList
        {$$ = $1;}
    ;

/* Allows values either in an array or separated by | */
PValList
    : ValList
        {$$ = $1;}
    | PVals
        {$$ = $1;}
    ;

Number
    : Integer
        {$$ = Number(yytext);}
    | Float
        {$$ = Number(yytext);}
    ;