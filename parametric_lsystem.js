const LS_RULE_PATTERN = /(.+):(.+)=([^:]+)(:(.+))?/g;
const LS_SYMBOL_PATTERN = /(.)(\(([^\)]+)\))?/g;

class ParametricLSystem
{
    constructor(axiom, rules, turnAngle = 30, seed = 0, ignoreList = '',
    models = {})
    {
        this.userInput =
        {
            axiom: axiom,
            rules: rules,
            turnAngle: turnAngle,
            seed: seed,
            ignoreList: ignoreList
        };
        // First, let's use rules to determine the variable declarations
        let rulesMatches = [];
        for(let i = 0; i < rules.length; ++i)
        {
            rulesMatches.push([...rules[i].matchAll(LS_RULE_PATTERN)]);
            log(rulesMatches[i].toString());
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
        // log(axiomReassembly);
        // log(this.axiom);
        // log(this.axiomParams);
    }
}