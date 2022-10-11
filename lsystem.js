import { Vector3 } from '../api/Vector3';


class LSystem
{
    constructor(axiom, rules, turnAngle = 30)
    {
        this.axiom = axiom;
        this.rules = new Map();
        for(i = 0; i < rules.length; ++i)
        {
            if(rules[i] !== '')
            {
                let rs = rules[i].split('=');
                this.rules.set(rs[0], rs[1]);
            }
        }
        this.turnAngle = turnAngle;
    }
}

class Renderer
{
    #time = 0;
    #levels = [];
    #maxLevel = -1;     // may use levels.length-1 instead
    #currentLevel = -1;
    #state = new Vector3(0, 0, 0);
    #stack = [];
    #stackSize = 0;     // may use stack.length-1 instead
    #idStack = [];
    #idStackSize = 0;   // may use idStack.length-1 instead
    #idx = 0;
    constructor(system, initScale = 1, figureScale = 2, xCentre = 0, yCentre = 0, upright = false)
    {
        this.system = system;
        this.initScale = initScale;
        this.figureScale = figureScale;
        this.xCentre = xCentre;
        this.yCentre = yCentre;
        this.upright = upright;
    }
}

var arrow = LSystem('X', ['F=FF', 'X=F[+X][-X]FX']);
var renderer = Renderer(arrow, 2, 2, 1, 0, true);


var derive = (states, rules) =>
{
    let result = '';
    for(let i = 0; i < states.length; ++i)
    {
        if(rules.has(states[i]))
            result += rules.get(states[i]);
        else
            result += states[i];
    }
    return result;
}

var updateSystem = (level) =>
{
    if(s[0] === undefined)
        s[0] = `[${axiom}]`;
    for(let i = maxS + 1; i <= level; ++i)
        if(s[i] === undefined)
            s[i] = derive(s[i - 1], rules);
    maxS = level;
}

var resetSystem = () =>
{
    state = new Vector3(0, 0, 0);
    stack = [];
    stackSize = 0;
    idStack = [];
    idStackSize = 0;
    idx = 0;
    theory.clearGraph();
    theory.invalidateTertiaryEquation();
}