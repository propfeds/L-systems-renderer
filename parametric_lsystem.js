import { MathExpression } from "../api/MathExpression";

const LS_RULE_PATTERN = /(.+):(.+)=([^:]+)(:(.+))?/g;
const LS_SYMBOL_PATTERN = /(.)(\(([^\)]+)\))?/g;

class ParametricLSystem
{
    constructor(axiom = '', rules = [], turnAngle = 0, seed = 0,
    ignoreList = '', models = {})
    {
        // User input
        this.rawAxiom = axiom;
        this.rawRules = rules;
        // First, let's use rules to determine the variable declarations
        let rulesMatches = [];
        for(let i = 0; i < rules.length; ++i)
        {
            rulesMatches.push([...rules[i].matchAll(LS_RULE_PATTERN)]);
            // console.log(rulesMatches[i].toString());
            // Indices 1, 2, 3, 5 are context, condition, derivation and chance
        }
        // Use regex magic to separate
        let axiomMatches = [...axiom.matchAll(LS_SYMBOL_PATTERN)];
        this.axiom = '';
        this.axiomParams = [];
        // let axiomReassembly = '';
        for(let i = 0; i < axiomMatches.length; ++i)
        {
            // axiomReassembly += axiomMatches[i][0];
            this.axiom += axiomMatches[i][1];
            this.axiomParams.push(axiomMatches[i][3]);
        }
        // console.log(this.axiom);
        // console.log(axiomReassembly);
        for(let i = 0; i < this.axiomParams.length; ++i)
        {
            if(typeof this.axiomParams[i] == 'undefined')
                continue;

            let params = this.axiomParams[i].split(',');
            // console.log(params)
            for(let j = 0; j < params.length; ++j)
                params[j] = MathExpression.parse(params[j]).evaluate();
            this.axiomParams[i] = params;
            // Maybe leave them at BigNumber?
        }
        // console.log(this.axiomParams.toString());
    }
}