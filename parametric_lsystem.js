import { MathExpression } from "../api/MathExpression";

const TRIM_SP = /\s+/g;
const LS_RULE = /(.+):(.+)=(([^:]+)(:([^,]+))?)(,([^:]+)(:([^,]+))?)*/;
// Context doesn't need to check for nested brackets!
const LS_CONTEXT =
/((.)(\(([^\)]+)\))?<)?((.)(\(([^\)]+)\))?)(>(.)(\(([^\)]+)\))?)?/;
// But individual symbols do.

class ParametricLSystem
{
    constructor(axiom = '', rules = [], turnAngle = 0, seed = 0,
    ignoreList = '', tropism = 0, variables = {})
    {
        // User input
        this.userInput =
        {
            axiom: axiom,
            rules: this.getPurged(rules),
            turnAngle: turnAngle,
            seed: seed,
            ignoreList: ignoreList,
            tropism: tropism,
            variables: variables
        };
        // Use regex magic to separate
        let axiomMatches = this.parseSequence(axiom.replace(TRIM_SP, ''));
        this.axiom = axiomMatches.sequence;
        this.axiomParams = axiomMatches.params;

        // console.log(this.axiom);
        // console.log(this.axiomParams);
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
        // This is a context ignore list. Turtle ignores all except for Ff.
        this.ignoreList = new Set('FfT+-&^\\/|{.}%~$');
        
        let ruleMatches = [];
        for(let i = 0; i < rules.length; ++i)
        {
            ruleMatches.push([...rules[i].replace(TRIM_SP, '').match(
            LS_RULE)]);
            // console.log(ruleMatches[i].toString());
            // Indices 1, 2, 4+4k, 6+4k are context, condition, derivation and
            // probability respectively
        }
        this.rules = new Map();
        for(let i = 0; i < ruleMatches.length; ++i)
        {
            // [i][1]: context
            let contextMatch = [...ruleMatches[i][1].match(LS_CONTEXT)];
            // Indices 2, 4, 6, 8, 10, 12 are the symbols and parameters of
            // left, middle, and right respectively
            if(typeof contextMatch[6] === 'undefined')
                continue;
            
            let tmpRule = {};
            let ruleParams = {};
            {
                let params = contextMatch[8].split(',');
                for(let j = 0; j < params.length; ++j)
                    ruleParams[params[j]] = ['m', j];
            }
            tmpRule.left = contextMatch[2];
            if(tmpRule.left)
            {
                let params = contextMatch[4].split(',');
                for(let j = 0; j < params.length; ++j)
                    ruleParams[params[j]] = ['l', j];
            }
            tmpRule.right = contextMatch[10];
            {
                let params = contextMatch[12].split(',');
                for(let j = 0; j < params.length; ++j)
                {
                    ruleParams[params[j]] = ['r', j];
                }
            }
            tmpRule.params = ruleParams;
            /*  // O(1) lookup with O(n) memory, I think
            ruleParams = {
                'a': ['m', 0],
                'b': ['l', 0],
                'c': ['r', 0],
                'd': ['r', 1]
            };
            */
            tmpRule.paramMap = (v, l, m, r) =>
            {
                let pos = tmpRule.params[v][0];
                switch(pos)
                {
                    case 'm':
                        if(m)
                            return m[tmpRule.params[v][1]];
                    case 'l':
                        if(l)
                            return l[tmpRule.params[v][1]];
                    case 'r':
                        if(r)
                            return r[tmpRule.params[v][1]];
                }
                // MathExpression eval: (v) => rule.paramMap(v, params[l], ...)
            }

            // [i][2]: condition
            tmpRule.condition = MathExpression.parse(ruleMatches[i][2]);

            // let a = new ParametricLSystem('[+(30)G]F/(180)A(2)', ['A(t):t==0=[+(30)G]F/(180)A(2):0.5,[-(30)G]F\(180)A(2):0.5']);
            // [i][4+4k]: derivation(s)
            // [i][6+4k]: probability
            // j = 4k
            for(let j = 0; j + 4 < ruleMatches[i].length; j += 4)
            {
                if(typeof ruleMatches[i][j + 4] === 'undefined')
                    continue;

                let tmpDeriv = this.parseSequence(ruleMatches[i][j + 4]);
                if(typeof tmpRule.derivations === 'string')
                {
                    tmpRule.derivations = [tmpRule.derivations,
                    tmpDeriv.sequence];
                    tmpRule.parameters = [tmpRule.parameters, tmpDeriv.params];
                    if(ruleMatches[i][j + 6])
                        tmpRule.chances = [tmpRule.chances,
                        MathExpression.parse(ruleMatches[i][j + 6])];
                    else
                        tmpRule.chances = [tmpRule.chances,
                        MathExpression.parse('1')];
                }
                else
                {
                    tmpRule.derivations.push(tmpDeriv.sequence);
                    tmpRule.parameters.push(tmpDeriv.params);
                    if(ruleMatches[i][j + 6])
                        tmpRule.chances.push(MathExpression.parse(
                        ruleMatches[i][j + 6]));
                    else
                        tmpRule.chances.push(MathExpression.parse('1'));
                }
            }

            // Finally, push rule
            if(contextMatch[6] == '~')
            {
                if(!this.models.has(contextMatch[6]))
                    this.models.set(contextMatch[6], []);
                this.models.get(contextMatch[6]).push(tmpRule);
            }
            else
            {
                if(!this.rules.has(contextMatch[6]))
                    this.rules.set(contextMatch[6], []);
                this.rules.get(contextMatch[6]).push(tmpRule);
            }
        }
    }

    /**
     * Parse a sequence to return one array of characters and one of parameters.
     * @param {string} sequence the sequence to be parsed.
     * @returns {object}
     */
    parseSequence(sequence)
    {
        let result = '';
        let resultParams = [];
        let bracketLvl = 0;
        let start = null;
        for(let i = 0; i < sequence.length; ++i)
        {
            switch(sequence[i])
            {
                case ' ':
                    log('Blank space detected.')
                    break;
                case '(':
                    ++bracketLvl;
                    if(bracketLvl == 1)
                        start = i + 1;
                    break;
                case ')':
                    if(!bracketLvl)
                    {
                        log('You\'ve clearly made a bracket error.');
                        break;
                    }
                    --bracketLvl;
                    if(!bracketLvl)
                        resultParams.push(MathExpression.parse(
                        sequence.slice(start, i)));
                    break;
                default:
                    if(bracketLvl)
                        break;
                    
                    result += sequence[i];
                    if(sequence[i + 1] != '(')
                        resultParams.push(null);
                    break;
            }
        }
        return {
            sequence: result,
            params: resultParams
        };
        // Tested this out on Chrome console, it worked.
    }

    getAncestree(sequence)
    {
        // Scanning behaviour should be very similar to renderer drawing.
        let stack = [];
        let idxStack = [];
        let ancestors = [];
        let children = [];
        for(let i = 0; i < sequence.length; ++i)
        {
            switch(sequence[i])
            {
                case ' ':
                    log('Blank space detected.')
                    break;
                case '[':
                    idxStack.push(stack.length);
                    break;
                case ']':
                    if(stack.length == 0)
                    {
                        log('You\'ve clearly made a bracket error.');
                        break;
                    }
                    while(stack.length > idxStack[idxStack.length - 1])     
                        stack.pop();

                    idxStack.pop();
                    break;
                default:
                    let ignored = this.ignoreList.has(sequence[i]);
                    if(ignored)
                        break;
                    
                    if(stack.length > 0)
                    {
                        let ancIdx = stack[stack.length - 1];
                        ancestors[i] = ancIdx;
                        if(typeof children[ancIdx] === 'undefined')
                            children[ancIdx] = [];
                        children[ancIdx].push(i);
                    }

                    stack.push(i);
                    break;
            }
        }
        return {
            ancestors: ancestors,
            children: children
        };
        // Tested this out on Chrome console, it worked.
    }
}