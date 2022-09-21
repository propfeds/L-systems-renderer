import { FreeCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { BigNumber } from "../api/BigNumber";
import { theory } from "../api/Theory";
import { Utils } from "../api/Utils";
import { Vector3 } from "../api/Vector3";

var id = "L_systems_renderer"
var name = "L-systems Renderer";
var description = "An implementation .";
var authors = "Gilles-Minh Minh";
var version = 0.01;

var derive = (state, rules) =>
{
    let result = '';
    for(let i = 0; i < state.length; ++i)
    {
        if(rules.has(state[i]))
            result += rules.get(state[i]);
        else
            result += state[i];
    }
    return result;
}

const rules = new Map();
rules.set('F', 'FF');
rules.set('X', 'F-[[X]+X]+F[-X]-X');
// rules.set('Y', '-FX-Y');
const axiom = '[X]';
const figureScale = 2;
const turnAngle = Math.PI/6;

let s = [];
s[0] = `${axiom}`;

for(let i = 1; i < 7; ++i)
{
    s[i] = derive(s[i - 1], rules);
}

let turnLeft = (v) => new Vector3(v.x, v.y, v.z + 1);
let turnRight = (v) => new Vector3(v.x, v.y, v.z - 1);
let forward = (v) => new Vector3(v.x + Math.cos(turnAngle * v.z), v.y + Math.sin(turnAngle * v.z), v.z);
let swizzle = (v) => new Vector3(v.y, -v.x, 0);
let centre = (level) => new Vector3(figureScale ** level, 0, 0);

let state = new Vector3(0, 0, 0);
let stack = [];
let stackSize = 0;
let idx = 0;
let time = 0;


var init = () => {
    angle = theory.createCurrency('°', '\\circ');
    index = theory.createCurrency('i');
    // l
    {
        let getDesc = (level) => 'lvl=' + getL(level).toString();
        let getInfo = (level) => 'lvl=' + getL(level).toString();
        l = theory.createUpgrade(0, angle, new FreeCost);
        l.getDescription = (amount) => Utils.getMath(getDesc(l.level));
        l.getInfo = (amount) => Utils.getMathTo(getInfo(l.level), getInfo(l.level + amount));
        l.boughtOrRefunded = (_) => resetSystem();
        l.canBeRefunded = (_) => true;
    }
    // q1 (Tickspeed)
    // Starts with 0, then goes to 1 and beyond?
    {
        let getDesc = (level) => "q_1=" + (level > 0 ? "1.28^{" + (level - 1) + "}" : "\\text{off}");
        let getDescNum = (level) => "q_1=" + getQ1(level).toString();
        q1 = theory.createUpgrade(1, angle, new FreeCost);
        q1.getDescription = (_) => Utils.getMath(getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(getDescNum(q1.level), getDescNum(q1.level + amount));
        q1.canBeRefunded = (_) => true;
    }
    // q2 (Tickspeed)
    // Literally the same as q1, just more expensive
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
        q2 = theory.createUpgrade(2, angle, new FreeCost);
        q2.getDescription = (_) => Utils.getMath(getDesc(q2.level));
        q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
        q2.canBeRefunded = (_) => true;
    }
    resetSystem();
}

var alwaysShowRefundButtons = () => true;

var tick = (elapsedTime, multiplier) =>
{
    let tickSpeed = getTickspeed();

    if(tickSpeed.isZero)
        return;
    
    let timeLimit = 1 / tickSpeed.Min(BigNumber.TEN).toNumber();
    time += elapsedTime;

    if(time >= timeLimit - 1e-8)
    {
        let lvl = getL(l.level);
        for(let i = idx; i < s[lvl].length; i++)
        {
            if(s[lvl][i] == '+')
                state = turnLeft(state);
            else if(s[lvl][i] == '-')
                state = turnRight(state);
            else if(s[lvl][i] == '[')
            {
                stack[stackSize] = state;
                stackSize++;
            }
            else if(s[lvl][i] == ']')
            {
                stackSize--;
                state = stack[stackSize];
                idx = i + 1;
                break;
            }
            else
            {
                state = forward(state);
                idx = i + 1;
                break;
            }
        }
        if(idx >= s[lvl].length)
            idx = 0;

        if(tickSpeed > BigNumber.TEN)
            time = 0;
        else
            time -= timeLimit;

        angle.value = state.z * turnAngle * 180 / Math.PI;
        index.value = idx;
        theory.invalidateTertiaryEquation();
    }
}

var getInternalState = () => `${time}`;

var setInternalState = (stateStr) =>
{
    let values = stateStr.split(' ');
    if(values.length > 0) time = parseBigNumber(values[0]);
}

var resume = () => resetSystem();

var resetSystem = () =>
{
    state = new Vector3(0, 0, 0);
    stack = [];
    stackSize = 0;
    idx = 0;
    theory.clearGraph();
    theory.invalidateTertiaryEquation();
}

var getTertiaryEquation = () => `\\begin{matrix}x=${getCoordString(state.x)},&y=${getCoordString(state.y)},&z=${getCoordString(state.z)}\\end{matrix}`;

var getCoordString = (x) => x.toFixed(x >= 0 ? (x < 10 ? 3 : 2) : (x <= -10 ? 1 : 2));

var getPublicationMultiplier = (tau) => tau;
var getPublicationMultiplierFormula = (symbol) => `${symbol}`;
var getTau = () => BigNumber.ZERO;
var get3DGraphPoint = () => swizzle((state - centre(getL(l.level))) / (figureScale ** getL(l.level)));
// var get3DGraphPoint = () => swizzle(state / (2 ** getL(l.level)));

var postPublish = () =>
{
    resetSystem();
    time = 0;
}

var getQ1 = (level) => (level > 0 ? BigNumber.from(1.28).pow(level - 1) : 0);
var getQ2 = (level) => BigNumber.TWO.pow(level);
var getTickspeed = () => getQ1(q1.level) * getQ2(q2.level);
var getL = (level) => level % 7;

init();