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
"group"         return 'group';
"preset"        return 'preset';
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
"#"[a-zA-Z][a-zA-Z_.0-9]*    yytext = yytext.slice(1); return 'Context';
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
%start Speechbank

%%

Speechbank 
    : Group EOF
        {return $1;}
    ;

Group
    : 'group' Id '{' GroupDefs '}'
        {$$ = {"id": $2, "defs": $4};}
    | 'group' Id 'extends' Id '{' GroupDefs '}'
        {$$ = {"id": $2, "parent": $4, "defs": $6};}
    | 'preset' '{' GroupDefs '}'
        {$$ = {"id": "Preset", "defs": $3};}
    ;

GroupDefs
    : /* Empty */
        {$$ = [];}
    | GroupDefs GroupDef
        {$1.push($2);$$ = $1;}
    ;

GroupDef
    : 'category' Id '{' CatDefs '}'
        {$$ = {"type": "category", "name": $2, "defs": $4};}
    | Symbol '=' Exp
        {$$ = {"type": "symbol", "name": $1, "exp": $3};}
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
        {$$ = {"type": "rule", "criteria": $3, "defs": $6}}
    /* Rule with label */
    | 'rule' Id '(' CriteriaOrEmpty ')' '{' RuleDefs '}'
        {$$ = {"type": "rule", "name": $2, "criteria": $4, "defs": $7}}
    /* Empty rule with a label */
    | 'rule' Id '(' CriteriaOrEmpty ')'
        {$$ = {"type": "rule", "name": $2, "criteria": $4}}
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
        {$$ = {"type": "preset", "args": [$1]};}
    | Val '=' PValList
        {$$ = {"type": "eq", "args": [$1, $3]};}
    | Val '!=' PValList
        {$$ = {"type": "neq", "args": [$1, $3]};}
    | Val '>' Val
        {$$ = {"type": "gt", "args": [$1, $3]};}
    | Val '<' Val
        {$$ = {"type": "lt", "args": [$1, $3]};}
    | Val '>=' Val
        {$$ = {"type": "ge", "args": [$1, $3]};}
    | Val '<=' Val
        {$$ = {"type": "le", "args": [$1, $3]};}
    | Val '<=' TId '<=' Val
        {$$ = {"type": "le_le", "args": [$1, $3, $5]};}
    | Val '<' TId '<=' Val
        {$$ = {"type": "lt_le", "args": [$1, $3, $5]};}
    | Val '<=' TId '<' Val
        {$$ = {"type": "le_lt", "args": [$1, $3, $5]};}
    | Val '<' TId '<' Val
        {$$ = {"type": "lt_lt", "args": [$1, $3, $5]};}
    | TId 'exists'
        {$$ = {"type": "exists", "args": [$1]};}
    | TId 'empty'
        {$$ = {"type": "empty", "args": [$1]};}
    | TId 'nonempty'
        {$$ = {"type": "nonempty", "args": [$1]};}
    | TId 'includes' PValList
        {$$ = {"type": "includes", "args": [$1, $3]};}
    | TId 'excludes' PValList
        {$$ = {"type": "excludes", "args": [$1, $3]};}
    | 'dummy' Integer
        {$$ = {"type": "dummy", "args": [$2]};}
    | 'fail' Number
        {$$ = {"type": "fail", "args": [$2]};}
    | '!' Criterion
        {$$ = {"type": "negate", "args": [$2]};}
    ;
    
RuleDefs
    : /* Empty */
        {$$ = [];}
    | RuleDefs RuleDef
        {$1.push($2); $$ = $1;}
    ;

RuleDef
    : 'response' '{' Responses '}'
        {$$ = {"type": "response", "value": $3};}
    | 'response' TId
        {$$ = {"type": "response", "preset": $2};}
    /* Symbol */
    | Symbol '=' Exp
        {$$ = {"type": "symbol", "name": $1, "exp": $3};}
    /* Context */
    | 'set' TId '=' ValOrList
        {$$ = {"type": "action", "op": "set", "context": $2, "value": $4 };}
    | 'set' TId '+=' Val
        {$$ = {"type": "action", "op": "add", "context": $2, "value": $4 };}
    | 'set' TId '-=' Val
        {$$ = {"type": "action", "op": "sub", "context": $2, "value": $4 };}
    | 'set' TId '*=' Val
        {$$ = {"type": "action", "op": "mult", "context": $2, "value": $4 };}
    | 'set' TId '/=' Val
        {$$ = {"type": "action", "op": "div", "context": $2, "value": $4 };}
    | 'set' '++' TId
        {$$ = {"type": "action", "op": "add", "context": $3, "value": 1 };}
    | 'set' '--' TId
        {$$ = {"type": "action", "op": "sub", "context": $3, "value": 1 };}
    | 'set' TId '++'
        {$$ = {"type": "action", "op": "add", "context": $2, "value": 1 };}
    | 'set' TId '--'
        {$$ = {"type": "action", "op": "sub", "context": $2, "value": 1 };}
    | 'remove' TId
        {$$ = {"type": "action", "op": "remove", "context": $2 };}
    | 'invert' TId
        {$$ = {"type": "action", "op": "invert", "context": $2 };}
    /* Triggers */
    | 'trigger' TId '(' ExpsOrEmpty ')'
        {$$ = {"type": "trigger", "name": $2, "args": $};}
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
    : Number
        {$$ = $1;}
    | String
        {$$ = $1;}
    | Context
        {let i = $1.indexOf('.'); if(i > -1) {$$ = {"table": $1.substring(0, i), "context": $1.substring(i + 1)};} else { $$ = {"context": $1};}}
    | Symbol
        {$$ = "@" + $1;}
    | true
        {$$ = true;}
    | false
        {$$ = false;}
    ;

Exp2
    : Exp3
        {$$ = $1;}
    | Symbol '(' ExpsOrEmpty ')'
        {$$ = {"function": $1, "args": $3};}
    | '[' ExpsOrEmpty ']'
        {$$ = $2;}
    | '!' Exp2
        {$$ = {"function": "negate", "args": [$2]}}
    ;
    
Exp1
    : Exp2
        {$$ = $1;}
    | Exp1 '*' Exp2
        {$$ = {"function": "mult", "args": [$1, $3]};}
    | Exp1 '/' Exp2
        {$$ = {"function": "div", "args": [$1, $3]};}
    | Exp1 '%' Exp3
        {$$ = {"function": "mod", "args": [$1, $3]};}
    ;

Exp
    : Exp1
        {$$ = $1;}
    | Exp '+' Exp1
        {$$ = {"function": "add", "args": [$1, $3]};}
    | Exp '-' Exp1
        {$$ = {"function": "sub", "args": [$1, $3]};}
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
    : Id
        {$$ = {"context": $1};}
    | Id '.' Id
        {$$ = {"table": $1, "context": $3};}
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