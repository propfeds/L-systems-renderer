import { FreeCost } from '../api/Costs';
import { theory } from '../api/Theory';
import { Utils } from '../api/Utils';
import { Vector3 } from '../api/Vector3';
import { ui } from '../api/ui/UI';
import { Color } from '../api/ui/properties/Color';
import { FontFamily } from '../api/ui/properties/FontFamily';
import { Keyboard } from '../api/ui/properties/Keyboard';
import { LayoutOptions } from '../api/ui/properties/LayoutOptions';
import { TextAlignment } from '../api/ui/properties/TextAlignment';
import { Thickness } from '../api/ui/properties/Thickness';
import { TouchType } from '../api/ui/properties/TouchType';
import { Localization } from '../api/Localization';
import { MathExpression } from '../api/MathExpression';
import { ClearButtonVisibility } from '../api/ui/properties/ClearButtonVisibility';
import { LineBreakMode } from '../api/ui/properties/LineBreakMode';
import { BigNumber } from '../api/BigNumber';
import { Upgrade } from '../api/Upgrades';
import { Button } from '../api/ui/Button';
import { Frame } from '../api/ui/Frame';

var id = 'parametric_L_systems_renderer';
var getName = (language) =>
{
    let names =
    {
        en: 'Param. L-systems Renderer',
    };

    return names[language] || names.en;
}
var getDescription = (language) =>
{
    let descs =
    {
        en:
`An educational tool that allows you to model plants, mostly.

Supported L-system features:
- Parametric, context-sensitive (2L) systems
- Stochastic (randomised) rules
- 3D turtle controls
- Polygon modelling

Other features:
- Can save a whole army of systems!
- Camera modes: static and turtle-following
- Drawing speed and advanced stroke options!`,
    };

    return descs[language] || descs.en;
}
var authors =   'propfeds#5988\n\nThanks to:\nSir Gilles-Philippe Paillé, ' +
                'for providing help with quaternions\nskyhigh173#3120, for ' +
                'suggesting clipboard and JSON internal state formatting';
var version = 0;

let time = 0;
let page = 0;
let offlineReset = true;
let gameIsOffline = false;
let altTerEq = false;
let tickDelayMode = false;
let resetLvlOnConstruct = true;
let measurePerformance = false;
let debugCamPath = false;
let maxCharsPerTick = 1250;
let menuLang = Localization.language;

let savedSystems = new Map();

let getImageSize = (width) =>
{
    if(width >= 1080)
        return 48;
    if(width >= 720)
        return 36;
    if(width >= 360)
        return 24;

    return 20;
}

let getBtnSize = (width) =>
{
    if(width >= 1080)
        return 96;
    if(width >= 720)
        return 72;
    if(width >= 360)
        return 48;

    return 40;
}

let getMediumBtnSize = (width) =>
{
    if(width >= 1080)
        return 88;
    if(width >= 720)
        return 66;
    if(width >= 360)
        return 44;

    return 36;
}

let getSmallBtnSize = (width) =>
{
    if(width >= 1080)
        return 80;
    if(width >= 720)
        return 60;
    if(width >= 360)
        return 40;

    return 32;
}

const BUTTON_HEIGHT = getBtnSize(ui.screenWidth);
const SMALL_BUTTON_HEIGHT = getSmallBtnSize(ui.screenWidth);
const ENTRY_CHAR_LIMIT = 5000;
const TRIM_SP = /\s+/g;
const LS_RULE = /(.+):(.+)=(.*)/;
// Context doesn't need to check for nested brackets!
const LS_CONTEXT =
/((.)(\(([^\)]+)\))?<)?((.)(\(([^\)]+)\))?)(>(.)(\(([^\)]+)\))?)?/;
const CTX_IGNORE_LIST = new Set('FfT+-&^\\/|{.}%~$');
const BACKTRACK_LIST = new Set('+-&^\\/|[$T');
// TODO: copy from locStrings downward

/**
 * Represents an instance of the Xorshift RNG.
 */
class Xorshift
{
    /**
     * @constructor
     * @param {number} seed must be initialized to non-zero.
     */
    constructor(seed = 1752)
    {
        this.state = seed;
        this.mod = 0x100000000;
                // 0x ffffffff + 1
    }
    /**
     * Returns a random integer within [0, 2^32) probably.
     * @returns {number}
     */
    get nextInt()
    {
        let x = this.state;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        this.state = x;
        return this.state;
    }
    /**
     * Returns a random floating point number within [0, 1] or [0, 1).
     * @param {boolean} [includeEnd] (default: false) whether to include the
     * number 1 in the range.
     * @returns {number}
     */
    nextFloat(includeEnd = false)
    {
        let result;
        if(includeEnd)  // [-1, 1]
            result = this.nextInt / (this.mod - 1);
        else            // [-1, 1)
            result = this.nextInt / this.mod;

        return (result + 1) / 2;
    }
    /**
     * Returns a random integer within a range of [start, end).
     * @param {number} start the range's lower bound.
     * @param {number} end the range's upper bound, plus 1.
     * @returns {number}
     */
    nextRange(start, end)
    {
        // [start, end)
        let size = end - start;
        return start + Math.floor(this.nextFloat() * size);
    }
    /**
     * Returns a random element from an array.
     * @param {any[]} array the array.
     * @returns {any}
     */
    choice(array)
    {
        return array[this.nextRange(0, array.length)];
    }
}

/**
 * Represents one hell of a quaternion.
 */
class Quaternion
{
    /**
     * @constructor
     * @param {number} r (default: 1) the real component.
     * @param {number} i (default: 0) the imaginary i component.
     * @param {number} j (default: 0) the imaginary j component.
     * @param {number} k (default: 0) the imaginary k component.
     */
    constructor(r = 1, i = 0, j = 0, k = 0)
    {
        /**
         * @type {number} the real component.
         */
        this.r = r;
        /**
         * @type {number} the imaginary i component.
         */
        this.i = i;
        /**
         * @type {number} the imaginary j component.
         */
        this.j = j;
        /**
         * @type {number} the imaginary k component.
         */
        this.k = k;
    }

    /**
     * Computes the sum of the current quaternion with another. Does not modify
     * the original quaternion.
     * @param {Quaternion} quat this other quaternion.
     * @returns {Quaternion}
     */
    add(quat)
    {
        return new Quaternion(
            this.r + quat.r,
            this.i + quat.i,
            this.j + quat.j,
            this.k + quat.k
        );
    }
    /**
     * Computes the product of the current quaternion with another. Does not
     * modify the original quaternion.
     * @param {Quaternion} quat this other quaternion.
     * @returns {Quaternion}
     */
    mul(quat)
    {
        let t0 = this.r * quat.r - this.i * quat.i -
        this.j * quat.j - this.k * quat.k;
        let t1 = this.r * quat.i + this.i * quat.r +
        this.j * quat.k - this.k * quat.j;
        let t2 = this.r * quat.j - this.i * quat.k +
        this.j * quat.r + this.k * quat.i;
        let t3 = this.r * quat.k + this.i * quat.j -
        this.j * quat.i + this.k * quat.r;
        return new Quaternion(t0, t1, t2, t3);
    }
    /**
     * Rotates the quaternion by some degrees.
     * @param {number} degrees degrees.
     * @param {string} symbol the corresponding symbol in L-system language.
     */
    rotate(degrees = 0, symbol = '+')
    {
        if(degrees == 0)
            return this;

        let halfAngle = degrees * Math.PI / 360;
        let s = Math.sin(halfAngle);
        let c = Math.cos(halfAngle);
        let rotation;
        switch(symbol)
        {
            case '+':
                rotation = new Quaternion(-c, 0, 0, s);
                break;
            case '-':
                rotation = new Quaternion(-c, 0, 0, -s);
                break;
            case '&':
                rotation = new Quaternion(-c, 0, s, 0);
                break;
            case '^':
                rotation = new Quaternion(-c, 0, -s, 0);
                break;
            case '\\':
                rotation = new Quaternion(-c, s, 0, 0);
                break;
            case '/':
                rotation = new Quaternion(-c, -s, 0, 0);
                break;
            default:
                return this;
        }
        return rotation.mul(this);
    }
    /**
     * Computes the negation of a quaternion. The negation also acts as the
     * inverse if the quaternion's norm is 1, which is the case with rotation
     * quaternions.
     * @returns {Quaternion}
     */
    get neg()
    {
        return new Quaternion(this.r, -this.i, -this.j, -this.k);
    }
    /**
     * Computes the norm of a quaternion.
     * @returns {number}
     */
    get norm()
    {
        return Math.sqrt(this.r ** 2 + this.i ** 2 + this.j ** 2 + this.k ** 2);
    }
    /**
     * Normalises a quaternion.
     * @returns {Quaternion}
     */
    get normalise()
    {
        let n = this.norm;
        return new Quaternion(this.r / n, this.i / n, this.j / n, this.k / n);
    }
    /**
     * Returns a heading vector from the quaternion.
     * @returns {Vector3}
     */
    get headingVector()
    {
        let r = this.neg.mul(xUpQuat).mul(this);
        return new Vector3(r.i, r.j, r.k);
    }
    /**
     * Returns an up vector from the quaternion.
     * @returns {Vector3}
     */
    get upVector()
    {
        let r = this.neg.mul(yUpQuat).mul(this);
        return new Vector3(r.i, r.j, r.k);
    }
    /**
     * Returns a side vector (left or right?) from the quaternion.
     * @returns {Vector3}
     */
    get sideVector()
    {
        let r = this.neg.mul(zUpQuat).mul(this);
        return new Vector3(r.i, r.j, r.k);
    }
    /**
     * (Deprecated) Rotate from a heading vector to another. Inaccurate!
     * @param {Vector3} src the current heading.
     * @param {Vector3} dst the target heading.
     * @returns {Quaternion}
     */
    rotateFrom(src, dst)
    {
        let dp = src.x * dst.x + src.y * dst.y +
        src.z * dst.z;
        let rotAxis;
        if(dp < -1 + 1e-8)
        {
            /* Edge case
            If the two vectors are in opposite directions, just reverse.
            */
            return zUpQuat.mul(this);
        }
        rotAxis = new Vector3(
            src.y * dst.z - src.z * dst.y,
            src.z * dst.x - src.x * dst.z,
            src.x * dst.y - src.y * dst.x,
        );
        let s = Math.sqrt((1 + dp) * 2);
        // I forgore that our quaternions have to be all negative, dunnoe why
        return this.mul(new Quaternion(
            -s / 2,
            rotAxis.x / s,
            rotAxis.y / s,
            rotAxis.z / s
        )).normalise;
    }
    /**
     * https://stackoverflow.com/questions/71518531/how-do-i-convert-a-direction-vector-to-a-quaternion
     * (Deprecated) Applies a gravi-tropism vector to the quaternion. Inaccurat!
     * @param {number} weight the vector's length (negative for upwards).
     * @returns {Quaternion}
     */
    applyTropismVector(weight = 0)
    {
        if(weight == 0)
            return this;

        let curHead = this.headingVector;
        let newHead = curHead - new Vector3(0, weight, 0);
        let n = newHead.length;
        if(n == 0)
            return this;
        newHead /= n;
        let result = this.rotateFrom(curHead, newHead);
        return result;
    }
    /**
     * Applies a gravi-tropism vector to the quaternion.
     * @param {number} weight the branch's susceptibility to bending.
     * @returns {Quaternion}
     */
    applyTropism(weight = 0)
    {
        if(weight == 0)
            return this;

        // a = e * |HxT| (n)
        let curHead = this.headingVector;
        let rotAxis = new Vector3(curHead.z, 0, -curHead.x);
        let n = rotAxis.length;
        if(n == 0)
            return this;
        rotAxis /= n;
        let a = weight * n / 2;
        let s = Math.sin(a);
        let c = Math.cos(a);
        // I don't know why it works the opposite way this time
        return this.mul(new Quaternion(
            -c,
            rotAxis.x * s,
            rotAxis.y * s,
            rotAxis.z * s
        )).normalise;
    }
    /**
     * https://gamedev.stackexchange.com/questions/198977/how-to-solve-for-the-angle-of-a-axis-angle-rotation-that-gets-me-closest-to-a-sp/199027#199027
     * Rolls the quaternion so that its up vector aligns with the earth.
     * @returns {Quaternion}
     */
    alignToVertical()
    {
        // L = V×H / |V×H|
        let curHead = this.headingVector;
        let curUp = this.upVector;
        let side = new Vector3(curHead.z, 0, -curHead.x);
        let n = side.length;
        if(n == 0)
            return this;
        side /= n;
        // U = HxL
        let newUp = new Vector3(
            curHead.y * side.z - curHead.z * side.y,
            curHead.z * side.x - curHead.x * side.z,
            curHead.x * side.y - curHead.y * side.x,
        );
        let a = Math.atan2(
            curUp.x * side.x + curUp.y * side.y + curUp.z * side.z,
            curUp.x * newUp.x + curUp.y * newUp.y + newUp.z * newUp.z,
        ) / 2;
        let s = Math.sin(a);
        let c = Math.cos(a);
        return new Quaternion(-c, s, 0, 0).mul(this).normalise;
    }
    /**
     * Returns the quaternion's string representation.
     * @returns {string}
     */
    toString()
    {
        return `${getCoordString(this.r)} + ${getCoordString(this.i)}i + ${getCoordString(this.j)}j + ${getCoordString(this.k)}k`;
    }
}

/**
 * Represents a parametric L-system.
 */
class LSystem
{
    /**
     * @constructor
     * @param {string} axiom the starting sequence.
     * @param {string[]} rules the production rules.
     * @param {string} turnAngle the turning angle (in degrees).
     * @param {number} seed the seed used for stochastic systems.
     * @param {string} ignoreList a list of symbols to be ignored by the turtle.
     * @param {string} tropism the tropism factor.
     * @param {object} variables NOT IMPLEMENTED
     */
    constructor(axiom = '', rules = [], turnAngle = 0, seed = 0,
    ignoreList = '', tropism = 0, variables = {})
    {
        // User input
        this.userInput =
        {
            axiom: axiom,
            rules: this.purgeEmpty(rules),
            turnAngle: turnAngle,
            seed: seed,
            ignoreList: ignoreList,
            tropism: tropism,
            variables: variables
        };
        let axiomMatches = this.parseSequence(axiom.replace(TRIM_SP, ''));
        this.axiom = axiomMatches.result;
        this.axiomParams = axiomMatches.params;

        // Manually calculate axiom parameters
        for(let i = 0; i < this.axiomParams.length; ++i)
        {
            if(!this.axiomParams[i])
                continue;

            let params = this.axiomParams[i].split(',');
            for(let j = 0; j < params.length; ++j)
                params[j] = MathExpression.parse(params[j]).evaluate();
            this.axiomParams[i] = params;
            // Maybe leave them at BigNumber?
        }
        
        let ruleMatches = [];
        for(let i = 0; i < rules.length; ++i)
        {
            ruleMatches.push([...rules[i].replace(TRIM_SP, '').match(
            LS_RULE)]);
            // Indices 1, 2, 3 are context, condition, and all derivations
        }
        this.rules = new Map();
        this.models = new Map();
        for(let i = 0; i < ruleMatches.length; ++i)
        {
            // [i][1]: context
            let contextMatch = [...ruleMatches[i][1].match(LS_CONTEXT)];
            // Indices 2, 4, 6, 8, 10, 12 are the symbols and parameters of
            // left, middle, and right respectively
            if(!contextMatch[6])
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
            if(tmpRule.right)
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
                let result = null;
                switch(pos)
                {
                    case 'm':
                        if(m)
                        {
                            result = m[tmpRule.params[v][1]];
                            break;
                        }
                    case 'l':
                        if(l)
                        {
                            result = l[tmpRule.params[v][1]];
                            break;
                        }
                    case 'r':
                        if(r)
                        {
                            result = r[tmpRule.params[v][1]];
                            break;
                        }
                }
                // log(`${v} = ${result}`);
                return result;
                // MathExpression eval: (v) => rule.paramMap(v, params[l], ...)
            }

            // [i][2]: condition
            if(ruleMatches[i][2])
                tmpRule.condition = MathExpression.parse(ruleMatches[i][2]);
            else
                tmpRule.condition = MathExpression.parse('true');

            // [i][3]: everything else
            let tmpRuleMatches = ruleMatches[i][3].split(',');
            for(let j = 0; j < tmpRuleMatches.length; ++j)
            {
                if(typeof tmpRuleMatches[j] === 'undefined')
                    continue;

                tmpRuleMatches[j] = tmpRuleMatches[j].split(':');
                let tmpDeriv = this.parseSequence(tmpRuleMatches[j][0]);
                let derivParams = tmpDeriv.params;
                for(let k = 0; k < derivParams.length; ++k)
                {
                    if(!derivParams[k])
                        continue;

                    let params = derivParams[k].split(',');
                    for(let l = 0; l < params.length; ++l)
                        params[l] = MathExpression.parse(params[l]);

                    derivParams[k] = params;
                }
                if(typeof tmpRule.derivations === 'string')
                {
                    tmpRule.derivations = [tmpRule.derivations,
                    tmpDeriv.result];
                    tmpRule.parameters = [tmpRule.parameters, derivParams];
                    if(tmpRuleMatches[j][1])
                        tmpRule.chances = [tmpRule.chances,
                        MathExpression.parse(tmpRuleMatches[j][1])];
                    else
                        tmpRule.chances = [tmpRule.chances,
                        MathExpression.parse('1')];
                }
                else if(!tmpRule.derivations)
                {
                    tmpRule.derivations = tmpDeriv.result;
                    tmpRule.parameters = derivParams;
                    if(tmpRuleMatches[j][1])
                        tmpRule.chances = MathExpression.parse(
                        tmpRuleMatches[j][1]);
                    else
                        tmpRule.chances = MathExpression.parse('1');
                }
                else    // Already an array
                {
                    tmpRule.derivations.push(tmpDeriv.result);
                    tmpRule.parameters.push(derivParams);
                    if(tmpRuleMatches[j][1])
                        tmpRule.chances.push(MathExpression.parse(
                        tmpRuleMatches[j][1]));
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

        this.ignoreList = new Set(ignoreList);

        this.RNG = new Xorshift(seed);
        this.halfAngle = MathExpression.parse(turnAngle.toString()).evaluate() *
        Math.PI / 360;
        
        this.rotations = new Map();
        let s = Math.sin(this.halfAngle);
        let c = Math.cos(this.halfAngle);
        this.rotations.set('+', new Quaternion(-c, 0, 0, s));
        this.rotations.set('-', new Quaternion(-c, 0, 0, -s));
        this.rotations.set('&', new Quaternion(-c, 0, s, 0));
        this.rotations.set('^', new Quaternion(-c, 0, -s, 0));
        this.rotations.set('\\', new Quaternion(-c, s, 0, 0));
        this.rotations.set('/', new Quaternion(-c, -s, 0, 0));

        this.tropism = MathExpression.parse(tropism.toString()).evaluate();
    }

    /**
     * Parse a sequence to return one array of characters and one of parameters.
     * Is only used when initialising the L-system.
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
                        resultParams.push(sequence.slice(start, i));
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
            result: result,
            params: resultParams
        };
        // Tested this out on Chrome console, it worked.
    }
    /**
     * Returns and ancestree and a child tree for a sequence.
     * @param {string} sequence the sequence.
     * @returns {object}
     */
    getAncestree(sequence)
    {
        // Scanning behaviour should be very similar to renderer drawing.
        let stack = [];
        let idxStack = [];
        let ancestors = [];
        let children = [];
        let i;  // Piece of shit Javascript doesn't let me put the let in the
        // for loop normally.
        for(i = 0; i < sequence.length; ++i)
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
                    let ignored = CTX_IGNORE_LIST.has(sequence[i]);
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

    /**
     * Derive a sequence from the input string. `next` denotes the starting
     * position to be derived next tick. `result` contains the work completed
     * for the current tick.
     * @param {string} sequence the input string.
     * @returns {{next: number, result: string}}
     */
    derive(sequence, seqParams, ancestors, children, start = 0)
    {
        let result = '';
        let resultParams = [];
        for(let i = start; i < sequence.length; ++i)
        {
            if(result.length > maxCharsPerTick)
            {
                return {
                    next: i,
                    result: result,
                    params: resultParams
                };
            }
            let deriv;
            let derivParams = null;
            if(sequence[i] == '%')
            {
                let branchLvl = 0;
                for(; i < sequence.length; ++i)
                {
                    switch(sequence[i])
                    {
                        case '[':
                            ++branchLvl;
                            break;
                        case ']':
                            --branchLvl;
                            break;
                    }
                    if(branchLvl < 0)
                        break;
                }
                if(sequence[i] == ']')
                    deriv = sequence[i];
                else
                    continue;
            }
            else if(sequence[i] == '~')
                continue;
            else if(this.rules.has(sequence[i]))
            {
                let tmpRules = this.rules.get(sequence[i]);
                for(let j = 0; j < tmpRules.length; ++j)
                {
                    // Left and right first
                    if(tmpRules[j].left && tmpRules[j].left !=
                    sequence[ancestors[i]])
                        continue;

                    let right = -1;
                    if(tmpRules[j].right)
                    {
                        for(let k = 0; k < children[i].length; ++k)
                        {
                            if(tmpRules[j].right == sequence[children[i][k]])
                            {
                                right = children[i][k];
                                break;
                            }
                        }
                        if(right == -1)
                            continue;
                    }

                    let tmpParamMap = (v) => tmpRules[j].paramMap(v,
                    seqParams[ancestors[i]], seqParams[i], seqParams[right]);
                    // Next up is the condition
                    if(!tmpRules[j].condition.evaluate(tmpParamMap))
                        continue;

                    if(typeof tmpRules[j].derivations === 'string')
                    {
                        deriv = tmpRules[j].derivations;
                        if(tmpRules[j].parameters)
                        {
                            derivParams = [];
                            for(let k = 0; k < tmpRules[j].parameters.length;
                            ++k)
                            {
                                let derivPi = null;
                                for(let l = 0; l < tmpRules[j].parameters[k].
                                length; ++l)
                                {
                                    if(tmpRules[j].parameters[k][l])
                                    {
                                        if(!derivPi)
                                            derivPi = [];
                                        derivPi.push(
                                        tmpRules[j].parameters[k][l].evaluate(
                                        tmpParamMap));
                                    }
                                }
                                derivParams.push(derivPi);
                            }
                        }
                        break;
                    }
                    else    // Stochastic time
                    {
                        let roll = this.RNG.nextFloat();
                        let chanceSum = 0;
                        let choice = -1;
                        for(let k = 0; k < tmpRules[j].derivations.length; ++k)
                        {
                            // Example
                            // roll: 0.50
                            // chance 1: 0.00 - 0.49
                            // sum after 1: 0.50
                            // chance 2: 0.50 - 0.99
                            // sum after 2: 1 (select!)
                            chanceSum += tmpRules[j].chances[k].evaluate(
                            tmpParamMap);
                            if(chanceSum > roll)    // select this
                            {
                                choice = k;
                                deriv = tmpRules[j].derivations[k];
                                if(tmpRules[j].parameters[k])
                                {
                                    derivParams = [];
                                    for(let l = 0; l < tmpRules[j].
                                    parameters[k].length; ++l)
                                    {
                                        let derivPi = null;
                                        if(tmpRules[j].parameters[k][l])
                                        {
                                            for(let m = 0; m < tmpRules[j].
                                            parameters[k][l].length; ++m)
                                            {
                                                if(tmpRules[j].
                                                parameters[k][l][m])
                                                {
                                                    if(!derivPi)
                                                        derivPi = [];
                                                    derivPi.push(tmpRules[j].
                                                    parameters[k][l][m].
                                                    evaluate(tmpParamMap));
                                                }
                                            }
                                        }
                                        derivParams.push(derivPi);
                                    }
                                }
                                break;
                            }
                        }
                        // log(`roll = ${roll} choice = ${choice}`)
                        if(choice == -1)
                            continue;
                        break;
                    }
                }
            }
            else
            {
                deriv = sequence[i];
                derivParams = [seqParams[i]];
            }

            result += deriv;
            if(derivParams)
                resultParams.push(...derivParams);
            else
                resultParams.push(derivParams);
        }
        return {
            next: 0,
            result: result,
            params: resultParams
        };
    }

    deriveModel(symbol, params)
    {
        let result = '';
        let resultParams = [];
        if(this.models.has(symbol))
        {
            let tmpRules = this.models.get(symbol);
            for(let j = 0; j < tmpRules.length; ++j)
            {
                let tmpParamMap = (v) => tmpRules[j].paramMap(v,
                null, null, params);
                // Next up is the condition
                if(!tmpRules[j].condition.evaluate(tmpParamMap))
                    continue;

                if(typeof tmpRules[j].derivations === 'string')
                {
                    result = tmpRules[j].derivations;
                    if(tmpRules[j].parameters)
                    {
                        for(let k = 0; k < tmpRules[j].parameters.length;
                        ++k)
                        {
                            let derivPi = null;
                            for(let l = 0; l < tmpRules[j].parameters[k].
                            length; ++l)
                            {
                                if(tmpRules[j].parameters[k][l])
                                {
                                    if(!derivPi)
                                        derivPi = [];
                                    derivPi.push(
                                    tmpRules[j].parameters[k][l].evaluate(
                                    tmpParamMap));
                                }
                            }
                            resultParams.push(derivPi);
                        }
                    }
                    break;
                }
                else    // Stochastic time
                {
                    // Models can be drawn any time, thus, the RNG should be
                    // separate from actual rule processing.
                    let roll = globalRNG.nextFloat();
                    let chanceSum = 0;
                    let choice = -1;
                    for(let k = 0; k < tmpRules[j].derivations.length; ++k)
                    {
                        // Example
                        // roll: 0.50
                        // chance 1: 0.00 - 0.49
                        // sum after 1: 0.50
                        // chance 2: 0.50 - 0.99
                        // sum after 2: 1 (select!)
                        chanceSum += tmpRules[j].chances[k].evaluate(
                        tmpParamMap);
                        if(chanceSum > roll)    // select this
                        {
                            choice = k;
                            result = tmpRules[j].derivations[k];
                            if(tmpRules[j].parameters[k])
                            {
                                for(let l = 0; l < tmpRules[j].
                                parameters[k].length; ++l)
                                {
                                    let derivPi = null;
                                    if(tmpRules[j].parameters[k][l])
                                    {
                                        for(let m = 0; m < tmpRules[j].
                                        parameters[k][l].length; ++m)
                                        {
                                            if(tmpRules[j].
                                            parameters[k][l][m])
                                            {
                                                if(!derivPi)
                                                    derivPi = [];
                                                derivPi.push(tmpRules[j].
                                                parameters[k][l][m].
                                                evaluate(tmpParamMap));
                                            }
                                        }
                                    }
                                    resultParams.push(derivPi);
                                }
                            }
                            break;
                        }
                    }
                    // log(`roll = ${roll} choice = ${choice}`)
                    if(choice == -1)
                        continue;
                    break;
                }
            }
        }
        return {
            result: result,
            params: resultParams
        };
    }

    reconstruct(sequence, params)
    {
        let result = '';
        for(let i = 0; i < sequence.length; ++i)
        {
            result += sequence[i];
            if(params[i])
                result += `(${params[i].join(', ')})`;
        }
        return result;
    }
    /**
     * Purge the rules of empty lines.
     * @param {string[]} rules rules.
     * @returns {string[]}
     */
    purgeEmpty(rules)
    {
        let result = [];
        let idx = 0;
        for(let i = 0; i < rules.length; ++i)
        {
            // I hope this deep-copies
            if(rules[i])
            {
                result[idx] = rules[i];
                ++idx;
            }
        }
        return result;
    }
    /**
     * Returns a deep copy (hopefully) of the user input to prevent overwrites.
     * @returns {{
     *  axiom: string,
     *  rules: string[],
     *  turnAngle: string,
     *  seed: number,
     *  ignoreList: string,
     *  tropism: string,
     *  variables: object
     * }}
     */
    get object()
    {
        return {
            axiom: this.userInput.axiom,
            rules: this.purgeEmpty(this.userInput.rules),
            turnAngle: this.userInput.turnAngle,
            seed: this.userInput.seed,
            ignoreList: this.userInput.ignoreList,
            tropism: this.userInput.tropism,
            variables: this.userInput.variables
        };
    }
    /**
     * Returns the system's string representation.
     * @returns {string}
     */
    toString()
    {
        return JSON.stringify(this.object, null, 4);
    }
}

/**
 * The renderer handles all logic for drawing the L-system.
 */
class Renderer
{
    /**
     * @constructor
     * @param {LSystem} system the L-system to be handled.
     * @param {string} figureScale the zoom level expression.
     * @param {boolean} cameraMode the camera mode.
     * @param {string} camX the camera's x-axis centre.
     * @param {string} camY the camera's y-axis centre.
     * @param {string} camZ the camera's z-axis centre.
     * @param {number} followFactor the camera's cursor-following speed.
     * @param {number} loopMode the renderer's looping mode.
     * @param {boolean} upright whether to rotate the system around the z-axis
     * by 90 degrees.
     * @param {boolean} quickDraw whether to skip through straight lines on the
     * way forward.
     * @param {boolean} quickBacktrack whether to skip through straight lines on
     * the way backward.
     * @param {boolean} loadModels whether to load dedicated models for symbols.
     * @param {boolean} backtrackTail whether to backtrack at the end of a loop.
     * @param {boolean} hesitateApex whether to stutter for 1 tick at apices.
     * @param {boolean} hesitateFork whether to stutter for 1 tick at forks.
     */
    constructor(system, figureScale = 1, cameraMode = 0, camX = 0, camY = 0,
    camZ = 0, followFactor = 0.15, loopMode = 0, upright = false,
    quickDraw = false, quickBacktrack = false, loadModels = true,
    backtrackTail = false, hesitateApex = true, hesitateFork = true)
    {
        /**
         * @type {LSystem} the L-system being handled.
         */
        this.system = system;
        /**
         * @type {string} kept for comparison in the renderer menu.
         */
        this.figScaleStr = figureScale.toString();
        /**
         * @type {MathExpression} the figure scale expression.
         */
        this.figScaleExpr = MathExpression.parse(this.figScaleStr);
        /**
         * @type {number} the calculated figure scale.
         */
        this.figureScale = 1;
        /**
         * @type {boolean} the camera mode.
         */
        this.cameraMode = Math.round(Math.min(Math.max(cameraMode, 0), 2));
        /**
         * @type {string} kept for comparison in the renderer menu.
         */
        this.camXStr = camX.toString();
        /**
         * @type {string} kept for comparison in the renderer menu.
         */
        this.camYStr = camY.toString();
        /**
         * @type {string} kept for comparison in the renderer menu.
         */
        this.camZStr = camZ.toString();
        /**
         * @type {MathExpression} the camera x expression.
         */
        this.camXExpr = MathExpression.parse(this.camXStr);
        /**
         * @type {MathExpression} the camera y expression.
         */
        this.camYExpr = MathExpression.parse(this.camYStr);
        /**
         * @type {MathExpression} the camera z expression.
         */
        this.camZExpr = MathExpression.parse(this.camZStr);
        /**
         * @type {Vector3} the calculated static camera coordinates.
         */
        this.camCentre = new Vector3(0, 0, 0);
        /**
         * @type {number} the follow factor.
         */
        this.followFactor = Math.min(Math.max(followFactor, 0), 1);
        /**
         * @type {number} the looping mode.
         */
        this.loopMode = Math.round(Math.min(Math.max(loopMode, 0), 2));
        /**
         * @type {boolean} the x-axis' orientation.
         */
        this.upright = upright;
        /**
         * @type {boolean} whether to skip through straight lines on the way
         * forward.
         */
        this.quickDraw = quickDraw;
        /**
         * @type {boolean} whether to skip through straight lines on the way
         * back.
         */
        this.quickBacktrack = quickBacktrack;
        /**
         * @type {boolean} whether to load models.
         */
        this.loadModels = loadModels;
        /**
         * @type {boolean} whether to backtrack at the end.
         */
        this.backtrackTail = backtrackTail;
        /**
         * @type {boolean} whether to hesitate at apices.
         */
        this.hesitateApex = hesitateApex;
        /**
         * @type {boolean} whether to hesitate at forks.
         */
        this.hesitateFork = hesitateFork;
        /**
         * @type {Vector3} the turtle's position.
         */
        this.state = new Vector3(0, 0, 0);
        /**
         * @type {Quaternion} the turtle's orientation.
         */
        this.ori = this.upright ? uprightQuat : new Quaternion();
        /**
         * @type {string[]} every level of the current system.
         */
        this.levels = [];
        this.levelParams = [];
        // Only stores one level, temporari
        this.ancestors = null;
        this.children = null;
        /**
         * @type {number} the current level (updates after buying the variable).
         */
        this.lv = -1;
        /**
         * @type {number} the maximum level loaded.
         */
        this.loaded = -1;
        /**
         * @type {number} the load target level.
         */
        this.loadTarget = 0;
        /**
         * @type {[Vector3, Quaternion][]} stores cursor states for brackets.
         */
        this.stack = [];
        /**
         * @type {number[]} stores the indices of the other stack.
         */
        this.idxStack = [];
        /**
         * @type {string[]} keeps the currently rendered models.
         */
        this.models = [];
        this.modelParams = [];
        /**
         * @type {number[]} keeps the indices of the other stack.
         */
        this.mdi = [];
        /**
         * @type {number} the current index of the sequence.
         */
        this.i = 0;
        /**
         * @type {number} the elapsed time.
         */
        this.elapsed = 0;
        /**
         * @type {number} the number of turns before the renderer starts working
         * again.
         */
        this.cooldown = 0;
        /**
         * @type {Vector3} the last tick's camera position.
         */
        this.lastCamera = new Vector3(0, 0, 0);
        /**
         * @type {Vector3} the last tick's camera velocity.
         */
        this.lastCamVel = new Vector3(0, 0, 0);
        /**
         * @type {number} the next index to update for the current level.
         */
        this.nextDeriveIdx = 0;
        /**
         * @type {number} how many nested polygons currently in (pls keep at 1).
         */
        this.polygonMode = 0;
    }

    /**
     * Updates the renderer's level.
     * @param {number} level the target level.
     * @param {boolean} seedChanged whether the seed has changed.
     */
    update(level, seedChanged = false)
    {
        let clearGraph = this.loopMode != 2 || level < this.lv || seedChanged;

        if(this.lv != level)
        {
            this.reset(clearGraph);
            this.lv = level;
            this.figureScale = this.figScaleExpr.evaluate(
            v => this.getVariable(v)).toNumber();
            if(this.figureScale == 0)
                this.figureScale = 1;
            this.camCentre = new Vector3
            (
                this.camXExpr.evaluate(v => this.getVariable(v)).toNumber(),
                this.camYExpr.evaluate(v => this.getVariable(v)).toNumber(),
                this.camZExpr.evaluate(v => this.getVariable(v)).toNumber()
            );
        }

        this.loadTarget = Math.max(level, this.loadTarget);

        let charCount = 0;
        for(let i = this.loaded + 1; i <= this.loadTarget; ++i)
        {
            // Threshold to prevent maximum statements error
            if(charCount > maxCharsPerTick)
                return;

            if(i == 0)
            {
                this.levels[i] = this.system.axiom;
                this.levelParams[i] = this.system.axiomParams;
                charCount += this.levels[i].length;
                this.nextDeriveIdx = 0;
            }
            else
            {
                if(!this.ancestors)
                {
                    let at = this.system.getAncestree(this.levels[i - 1]);
                    this.ancestors = at.ancestors;
                    this.children = at.children;
                    charCount += this.ancestors.length;
                }
                let ret = this.system.derive(this.levels[i - 1],
                this.levelParams[i - 1], this.ancestors, this.children,
                this.nextDeriveIdx);
                if(this.nextDeriveIdx == 0)
                {
                    this.levels[i] = ret.result;
                    this.levelParams[i - 1] = ret.params;
                }
                else
                {
                    this.levels[i] += ret.result;
                    this.levelParams[i - 1].push(...ret.params);
                }

                this.nextDeriveIdx = ret.next;
                charCount += ret.result.length;
            }
            if(this.nextDeriveIdx == 0)
            {
                ++this.loaded;
                this.ancestors = null;
                this.children = null;
            }
            else
                return;
        }
        this.reset(clearGraph);
    }
    /**
     * Resets the renderer.
     * @param {boolean} clearGraph whether to clear the graph.
     */
    reset(clearGraph = true)
    {
        this.state = new Vector3(0, 0, 0);
        this.ori = this.upright ? uprightQuat : new Quaternion();
        this.stack = [];
        this.idxStack = [];
        this.i = 0;
        this.models = [];
        this.modelParams = [];
        this.mdi = [];
        this.cooldown = 0;
        this.polygonMode = 0;
        if(clearGraph)
        {
            this.elapsed = 0;
            time = 0;
            theory.clearGraph();
        }
        theory.invalidateTertiaryEquation();
    }
    /**
     * Configures every parameter of the renderer, except the system.
     * @param {string} figureScale the zoom level expression.
     * @param {boolean} cameraMode the camera mode.
     * @param {string} camX the camera's x-axis centre.
     * @param {string} camY the camera's y-axis centre.
     * @param {string} camZ the camera's z-axis centre.
     * @param {number} followFactor the camera's cursor-following speed.
     * @param {number} loopMode the renderer's looping mode.
     * @param {boolean} upright whether to rotate the system around the z-axis
     * by 90 degrees.
     * @param {boolean} quickDraw whether to skip through straight lines on the
     * way forward.
     * @param {boolean} quickBacktrack whether to skip through straight lines
     * on the way backward.
     * @param {boolean} loadModels whether to load dedicated models for symbols.
     * @param {boolean} backtrackTail whether to backtrack at the end of a loop.
     * @param {boolean} hesitateApex whether to stutter for 1 tick at apices.
     * @param {boolean} hesitateFork whether to stutter for 1 tick at forks.
     */
    configure(figureScale, cameraMode, camX, camY, camZ, followFactor,
    loopMode, upright, quickDraw, quickBacktrack, loadModels, backtrackTail,
    hesitateApex, hesitateFork)
    {
        let requireReset = (figureScale !== this.figScaleStr) ||
        (upright != this.upright) || (quickDraw != this.quickDraw) ||
        (quickBacktrack != this.quickBacktrack) ||
        (loadModels != this.loadModels) ||
        (hesitateApex != this.hesitateApex) ||
        (hesitateFork != this.hesitateFork);

        this.figScaleStr = figureScale.toString();
        this.figScaleExpr = MathExpression.parse(this.figScaleStr);
        this.figureScale = this.figScaleExpr.evaluate(
        v => this.getVariable(v)).toNumber();
        if(this.figureScale == 0)
            this.figureScale = 1;
        this.cameraMode = cameraMode;
        this.camXStr = camX.toString();
        this.camYStr = camY.toString();
        this.camZStr = camZ.toString();
        this.camXExpr = MathExpression.parse(this.camXStr);
        this.camYExpr = MathExpression.parse(this.camYStr);
        this.camZExpr = MathExpression.parse(this.camZStr);
        this.camCentre = new Vector3
        (
            this.camXExpr.evaluate(v => this.getVariable(v)).toNumber(),
            this.camYExpr.evaluate(v => this.getVariable(v)).toNumber(),
            this.camZExpr.evaluate(v => this.getVariable(v)).toNumber()
        );
        this.followFactor = followFactor;
        this.loopMode = loopMode;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.loadModels = loadModels;
        this.backtrackTail = backtrackTail;
        this.hesitateApex = hesitateApex;
        this.hesitateFork = hesitateFork;

        if(requireReset)
            this.reset();
    }
    /**
     * Configures only the parameters related to the static camera mode.
     * @param {string} figureScale the zoom level expression.
     * @param {string} camX the camera's x-axis centre.
     * @param {string} camY the camera's y-axis centre.
     * @param {string} camZ the camera's z-axis centre.
     * @param {boolean} upright whether to rotate the system around the z-axis
     * by 90 degrees.
     */
    configureStaticCamera(figureScale, camX, camY, camZ, upright)
    {
        let requireReset = (figureScale !== this.figScaleStr) ||
        (upright != this.upright);

        this.figScaleStr = figureScale.toString();
        this.figScaleExpr = MathExpression.parse(this.figScaleStr);
        this.figureScale = this.figScaleExpr.evaluate(
        v => this.getVariable(v)).toNumber();
        if(this.figureScale == 0)
            this.figureScale = 1;
        this.camXStr = camX.toString();
        this.camYStr = camY.toString();
        this.camZStr = camZ.toString();
        this.camXExpr = MathExpression.parse(this.camXStr);
        this.camYExpr = MathExpression.parse(this.camYStr);
        this.camZExpr = MathExpression.parse(this.camZStr);
        this.camCentre = new Vector3
        (
            this.camXExpr.evaluate(v => this.getVariable(v)).toNumber(),
            this.camYExpr.evaluate(v => this.getVariable(v)).toNumber(),
            this.camZExpr.evaluate(v => this.getVariable(v)).toNumber()
        );
        this.upright = upright;

        if(requireReset)
            this.reset();
    }
    /**
     * Applies a new L-system to the renderer.
     * @param {LSystem} system the new system.
     */
    set constructSystem(system)
    {
        this.system = system;
        this.levels = [];
        this.levelParams = [];
        this.nextDeriveIdx = 0;
        this.loaded = -1;
        this.loadTarget = 0;
        if(resetLvlOnConstruct)
            l.level = 0;
        this.update(l.level);
    }
    /**
     * Sets the seed of the current system.
     * @param {number} seed the seed.
     */
    set seed(seed)
    {
        this.system.seed = seed;
        this.nextDeriveIdx = 0;
        this.loaded = -1;
        this.loadTarget = this.lv;
        this.update(this.lv, true);
    }
    /**
     * Moves the cursor forward.
     */
    forward(distance = 1)
    {
        this.state += this.ori.headingVector * distance;
    }
    /**
     * Ticks the clock.
     * @param {number} dt the amount of time passed.
     */
    tick(dt)
    {
        if(this.lv > this.loaded + 1 ||
        typeof this.levels[this.lv] === 'undefined' ||
        this.levels[this.lv].length == 0)
            return;

        if(this.i >= this.levels[this.lv].length && this.loopMode == 0)
            if(!this.backtrackTail || this.stack.length == 0)
                return;

        this.elapsed += dt;
    }
    /**
     * Computes the next cursor position internally.
     * @param {number} level the level to be drawn.
     */
    draw(level, onlyUpdate = false)
    {
        /*
        Behold the broken monster patched by sheer duct tape.
        I can guarantee that because the game runs on one thread, the renderer
        would always load faster than it draws. Unless you make a rule that 
        spawns 10000 plus signs. Please don't do it.
        */
        if(level > this.loaded)
            this.update(level);

        // You can't believe how many times I have to type this typeof clause.
        if(level > this.loaded + 1 ||
        typeof this.levels[this.lv] === 'undefined')
            return;

        if(onlyUpdate)
            return;
        
        // This is to prevent the renderer from skipping the first point.
        if(this.elapsed <= 0.101)
            return;

        /*
        Don't worry, it'll not run forever. This is just to prevent the renderer
        from hesitating for 1 tick every loop.
        */
        let j, t, moved;
        let loopLimit = 2;  // Shenanigans may arise with models? Try this
        for(j = 0; j < loopLimit; ++j)
        {
            if(this.cooldown > 0 && this.polygonMode <= 0)
            {
                --this.cooldown;
                return;
            }

            if(this.models.length > 0)
            {
                // Unreadable pile of shit
                for(; this.mdi[this.mdi.length - 1] <
                this.models[this.models.length - 1].length;
                ++this.mdi[this.mdi.length - 1])
                {
                    switch(this.models[this.models.length - 1][
                    this.mdi[this.mdi.length - 1]])
                    {
                        case ' ':
                            log('Blank space detected.')
                            break;
                        case '+':
                            if(this.modelParams[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]])
                                this.ori = this.ori.rotate(this.modelParams[
                                this.models.length - 1][
                                this.mdi[this.mdi.length - 1]][0].toNumber(),
                                '+');
                            else
                                this.ori = this.system.rotations.get('+').mul(
                                this.ori);
                            break;
                        case '-':
                            if(this.modelParams[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]])
                                this.ori = this.ori.rotate(this.modelParams[
                                this.models.length - 1][
                                this.mdi[this.mdi.length - 1]][0].toNumber(),
                                '-');
                            else
                                this.ori = this.system.rotations.get('-').mul(
                                this.ori);
                            break;
                        case '&':
                            if(this.modelParams[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]])
                                this.ori = this.ori.rotate(this.modelParams[
                                this.models.length - 1][
                                this.mdi[this.mdi.length - 1]][0].toNumber(),
                                '&');
                            else
                                this.ori = this.system.rotations.get('&').mul(
                                this.ori);
                            break;
                        case '^':
                            if(this.modelParams[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]])
                                this.ori = this.ori.rotate(this.modelParams[
                                this.models.length - 1][
                                this.mdi[this.mdi.length - 1]][0].toNumber(),
                                '^');
                            else
                                this.ori = this.system.rotations.get('^').mul(
                                this.ori);
                            break;
                        case '\\':
                            if(this.modelParams[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]])
                                this.ori = this.ori.rotate(this.modelParams[
                                this.models.length - 1][
                                this.mdi[this.mdi.length - 1]][0].toNumber(),
                                '\\');
                            else
                                this.ori = this.system.rotations.get('\\').mul(
                                this.ori);
                            break;
                        case '/':
                            if(this.modelParams[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]])
                                this.ori = this.ori.rotate(this.modelParams[
                                this.models.length - 1][
                                this.mdi[this.mdi.length - 1]][0].toNumber(),
                                '/');
                            else
                                this.ori = this.system.rotations.get('/').mul(
                                this.ori);
                            break;
                        case '|':
                            this.ori = zUpQuat.mul(this.ori);
                            break;
                        case '$':
                            this.ori = this.ori.alignToVertical();
                            break;
                        case 'T':
                            if(this.modelParams[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]])
                                this.ori = this.ori.applyTropism(
                                this.modelParams[this.models.length - 1][
                                this.mdi[this.mdi.length - 1]][0].toNumber());
                            else
                                this.ori = this.ori.applyTropism(
                                this.system.tropism);
                            break;
                        case '~':
                            if(!this.system.models.has(
                            this.models[this.models.length - 1][
                            this.mdi[this.mdi.length - 1] + 1]))
                                break;

                            ++this.mdi[this.mdi.length - 1];
                            let model = this.system.deriveModel(this.models[
                            this.models.length - 1][
                            this.mdi[this.mdi.length - 1]], this.modelParams[
                            this.models.length - 1][
                            this.mdi[this.mdi.length - 1]]);

                            this.models.push(model.result);
                            this.modelParams.push(model.params);
                            this.mdi.push(0);
                            return;
                        case '[':
                            this.idxStack.push(this.stack.length);
                            this.stack.push([this.state, this.ori]);
                            break;
                        case ']':
                            if(this.cooldown > 0 && this.polygonMode <= 0)
                            {
                                --this.cooldown;
                                return;
                            }

                            if(this.stack.length == 0)
                            {
                                log('You\'ve clearly made a bracket error.');
                                break;
                            }

                            moved = this.state !==
                            this.stack[this.stack.length - 1][0];

                            t = this.stack.pop();
                            this.state = t[0];
                            this.ori = t[1];
                            if(this.stack.length ==
                            this.idxStack[this.idxStack.length - 1])
                            {
                                this.idxStack.pop();
                                if(moved)
                                    this.cooldown = 1;
                                if(this.hesitateFork && this.polygonMode <= 0)
                                {
                                    ++this.mdi[this.mdi.length - 1];
                                    return;
                                }
                                else
                                {
                                    break;
                                }
                            }
                            if(this.polygonMode <= 0)
                                return;
                            else
                            {
                                --this.mdi[this.mdi.length - 1];
                                break;
                            }
                        case '%':
                            // Nothing to do here
                            break;
                        case '{':        
                            ++this.polygonMode;
                            break;
                        case '}':
                            --this.polygonMode;
                            break;
                        case '.':
                            if(this.polygonMode <= 0)
                                log('You cannot register a vertex outside of ' +
                                'polygon drawing.');
                            else
                                ++this.mdi[this.mdi.length - 1];
                            return;
                        default:
                            if(this.cooldown > 0 && this.polygonMode <= 0)
                            {
                                --this.cooldown;
                                return;
                            }

                            let ignored = this.system.ignoreList.has(
                            this.models[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]]) ||
                            this.loadModels && this.system.models.has(
                            this.models[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]]);
                            let breakAhead = BACKTRACK_LIST.has(
                            this.models[this.models.length - 1][
                            this.mdi[this.mdi.length - 1] + 1]);
                            let btAhead = this.models[this.models.length - 1][
                            this.mdi[this.mdi.length - 1] + 1] == ']' ||
                            this.mdi[this.mdi.length - 1] ==
                            this.models[this.models.length - 1].length - 1;

                            if(this.hesitateApex && btAhead)
                                this.cooldown = 1;

                            if(this.quickDraw && breakAhead)
                                this.cooldown = 1;

                            moved = this.stack.length == 0 ||
                            (this.stack.length > 0 && this.state !==
                            this.stack[this.stack.length - 1][0]);

                            if(!this.quickBacktrack && moved && !ignored)
                                this.stack.push([this.state, this.ori]);

                            if(!ignored)
                            {
                                if(this.models[this.models.length - 1][
                                this.mdi[this.mdi.length - 1]] == 'F' &&
                                this.modelParams[this.models.length - 1][
                                this.mdi[this.mdi.length - 1]])
                                    this.forward(this.modelParams[
                                    this.models.length - 1][
                                    this.mdi[this.mdi.length - 1]][
                                    0].toNumber());
                                else
                                    this.forward();
                            }

                            if(this.quickBacktrack && breakAhead)
                                this.stack.push([this.state, this.ori]);
                            
                            if(this.quickDraw && !btAhead)
                                break;
                            else if(this.polygonMode <= 0)
                            {
                                ++this.mdi[this.mdi.length - 1];
                                return;
                            }
                            else
                                break;
                    }
                }
                this.models.pop();
                this.modelParams.pop();
                this.mdi.pop();
                ++loopLimit;
                // continue prevents the regular loop from running
                continue;
            }
            for(; this.i < this.levels[this.lv].length; ++this.i)
            {
                // if(this.models.length > 0)
                //     break;
                switch(this.levels[this.lv][this.i])
                {
                    case ' ':
                        log('Blank space detected.')
                        break;
                    case '+':
                        this.ori = this.system.rotations.get('+').mul(this.ori);
                        break;
                    case '-':
                        this.ori = this.system.rotations.get('-').mul(this.ori);
                        break;
                    case '&':
                        this.ori = this.system.rotations.get('&').mul(this.ori);
                        break;
                    case '^':
                        this.ori = this.system.rotations.get('^').mul(this.ori);
                        break;
                    case '\\':
                        this.ori = this.system.rotations.get('\\').mul(
                        this.ori);
                        break;
                    case '/':
                        this.ori = this.system.rotations.get('/').mul(this.ori);
                        break;
                    case '|':
                        this.ori = zUpQuat.mul(this.ori);
                        break;
                    case '$':
                        this.ori = this.ori.alignToVertical();
                        break;
                    case 'T':
                        this.ori = this.ori.applyTropism(this.system.tropism);
                        break;
                    case '~':
                        if(!this.loadModels || !this.system.models.has(
                        this.levels[this.lv][this.i + 1]))
                            break;

                        ++this.i;
                        this.models.push(this.system.models.get(
                        this.levels[this.lv][this.i]));
                        this.mdi.push(0);
                        return;
                    case '[':
                        this.idxStack.push(this.stack.length);
                        this.stack.push([this.state, this.ori]);
                        break;
                    case ']':
                        if(this.cooldown > 0 && this.polygonMode <= 0)
                        {
                            --this.cooldown;
                            return;
                        }

                        if(this.stack.length == 0)
                        {
                            log('You\'ve clearly made a bracket error.');
                            break;
                        }

                        moved = this.state !==
                        this.stack[this.stack.length - 1][0];

                        t = this.stack.pop();
                        this.state = t[0];
                        this.ori = t[1];
                        if(this.stack.length ==
                        this.idxStack[this.idxStack.length - 1])
                        {
                            this.idxStack.pop();
                            if(moved)
                                this.cooldown = 1;
                            if(this.hesitateFork && this.polygonMode <= 0)
                            {
                                ++this.i;
                                return;
                            }
                            else
                            {
                                break;
                            }
                        }
                        if(this.polygonMode <= 0)
                            return;
                        else
                        {
                            --this.i;
                            break;
                        }
                    case '%':
                        // Nothing to do here, all handled by LSystem derivation
                        break;
                    case '{':        
                        ++this.polygonMode;
                        break;
                    case '}':
                        --this.polygonMode;
                        break;
                    case '.':
                        if(this.polygonMode <= 0)
                            log('You cannot register a vertex outside of ' +
                            'polygon drawing.');
                        else
                            ++this.i;
                        return;
                    default:
                        if(this.cooldown > 0 && this.polygonMode <= 0)
                        {
                            --this.cooldown;
                            return;
                        }

                        let ignored = this.system.ignoreList.has(
                        this.levels[this.lv][this.i]) || this.loadModels &&
                        this.system.models.has(this.levels[this.lv][this.i]);
                        let breakAhead = BACKTRACK_LIST.has(
                        this.levels[this.lv][this.i + 1]);
                        let btAhead = this.levels[this.lv][this.i + 1] == ']' ||
                        this.i == this.levels[this.lv].length - 1;

                        if(this.hesitateApex && btAhead)
                            this.cooldown = 1;

                        if(this.quickDraw && breakAhead)
                            this.cooldown = 1;

                        moved = this.stack.length == 0 ||
                        (this.stack.length > 0 && this.state !==
                        this.stack[this.stack.length - 1][0]);

                        if(!this.quickBacktrack && moved && !ignored)
                            this.stack.push([this.state, this.ori]);

                        if(!ignored)
                            this.forward();

                        if(this.quickBacktrack && breakAhead)
                            this.stack.push([this.state, this.ori]);
                        
                        if(this.quickDraw && !btAhead)
                            break;
                        else if(this.polygonMode <= 0)
                        {
                            ++this.i;
                            return;
                        }
                        else
                            break;
                }
            }
            // This is what the renderer will do at the end of a loop
            if(!this.backtrackTail || this.stack.length == 0)
            {
                switch(this.loopMode)
                {
                    case 2:
                        l.buy(1);
                        break;
                    case 1:
                        this.reset(false);
                        break;
                    case 0:
                        return;
                }
            }
            else
            {
                let t = this.stack.pop();
                this.state = t[0];
                this.ori = t[1];
                return;
            }
        }
    }
    /**
     * Return swizzled coordinates according to the in-game system. The game
     * uses Android UI coordinates, which is X-right Y-down Z-face.
     * @param {Vector3} coords the original coordinates.
     * @returns {Vector3}
     */
    swizzle(coords)
    {
        // The game uses left-handed Y-up, aka Y-down coordinates.
        return new Vector3(coords.x, -coords.y, coords.z);
    }
    /**
     * Returns a variable's value for maths expressions.
     * @param {string} v the variable's name.
     * @returns {BigNumber}
     */
    getVariable(v)
    {
        switch(v)
        {
            case 'lv': return BigNumber.from(this.lv);
        }
        return null;
    }
    /**
     * Returns the camera centre's coordinates.
     * @returns {Vector3}
     */
    get centre()
    {
        if(this.cameraMode)
            return -this.cursor;

        return this.swizzle(-this.camCentre / this.figureScale);
    }
    /**
     * Returns the turtle's coordinates.
     * @returns {Vector3}
     */
    get cursor()
    {
        let coords = this.state / this.figureScale;
        return this.swizzle(coords);
    }
    /**
     * Returns the camera's coordinates.
     * @returns {Vector3}
     */
    get camera()
    {
        let newCamera;
        switch(this.cameraMode)
        {
            case 2:
                // I accidentally discovered Bézier curves unknowingly.
                let dist = this.centre - this.lastCamera;
                newCamera = this.lastCamera + dist * this.followFactor ** 2 +
                this.lastCamVel * (1 - this.followFactor) ** 2;
                this.lastCamVel = newCamera - this.lastCamera;
                this.lastCamera = newCamera;
                return newCamera;
            case 1:
                newCamera = this.centre * this.followFactor +
                this.lastCamera * (1 - this.followFactor);
                this.lastCamVel = newCamera - this.lastCamera;
                this.lastCamera = newCamera;
                return newCamera;
            case 0:
                return this.centre;
        }
    }
    /**
     * Returns the static camera configuration.
     * @returns {[string, string, string, string, boolean]}
     */
    get staticCamera()
    {
        return [
            this.figScaleStr,
            this.camXStr,
            this.camYStr,
            this.camZStr,
            this.upright
        ];
    }
    /**
     * Returns the elapsed time.
     * @returns {[number, number]}
     */
    get elapsedTime()
    {
        return [
            Math.floor(this.elapsed / 60),
            this.elapsed % 60
        ];
    }
    /**
     * Returns the current progress on this level, in a fraction.
     * @returns {[number, number]}
     */
    get progressFrac()
    {
        return [this.i, this.levels[this.lv].length];
    }
    /**
     * Returns the current progress on this level, in percent.
     * @returns {number}
     */
    get progressPercent()
    {
        if(typeof this.levels[this.lv] === 'undefined')
            return 0;

        let pf = this.progressFrac;
        let result = pf[0] * 100 / pf[1];
        if(isNaN(result))
            result = 0;

        return result;
    }
    /**
     * Returns the current progress fraction as a string.
     * @returns {string}
     */
    get progressString()
    {
        let pf = this.progressFrac;
        return `i=${pf[0]}/${pf[1]}`;
    }
    /**
     * Returns a loading message.
     * @returns {string}
     */
    get loadingString()
    {
        let len = typeof this.levels[this.loaded + 1] === 'undefined' ? 0 :
        this.levels[this.loaded + 1].length;
        return Localization.format(getLoc('rendererLoading'), this.loaded + 1,
        len);
    }
    /**
     * Returns the cursor's position as a string.
     * @returns {string}
     */
    get stateString()
    {
        if(typeof this.levels[this.lv] === 'undefined')
            return this.loadingString;

        return `\\begin{matrix}x=${getCoordString(this.state.x)},&
        y=${getCoordString(this.state.y)},&z=${getCoordString(this.state.z)},&
        ${this.progressString}\\end{matrix}`;
    }
    /**
     * Returns the cursor's orientation as a string.
     * @returns {string}
     */
    get oriString()
    {
        if(typeof this.levels[this.lv] === 'undefined')
            return this.loadingString;

        return `\\begin{matrix}q=${this.ori.toString()},&${this.progressString}
        \\end{matrix}`;
    }
    /**
     * Returns the object representation of the renderer.
     * @returns {object}
     */
    get object()
    {
        return {
            figureScale: this.figScaleStr,
            cameraMode: this.cameraMode,
            camX: this.camXStr,
            camY: this.camYStr,
            camZ: this.camZStr,
            followFactor: this.followFactor,
            loopMode: this.loopMode,
            upright: this.upright,
            loadModels: this.loadModels,
            quickDraw: this.quickDraw,
            quickBacktrack: this.quickBacktrack,
            backtrackTail: this.backtrackTail,
            hesitateApex: this.hesitateApex,
            hesitateFork: this.hesitateFork
        }
    }
    /**
     * Returns the renderer's string representation.
     * @returns {string}
     */
    toString()
    {
        return JSON.stringify(this.object, null, 4);
    }
}

let a = new LSystem('[+(30)G]F/(180)A(2)', ['A(t):t<=5=[+(30)G]F/(180)A(t+2):0.5,[-(30)G]F\\(180)A(t+2):0.5,:0.5,C:0.5'], 30, 1);
// A(0)
let a0 = 'A';
let a0p = [[BigNumber.ZERO]];
let at0 = a.getAncestree(a0);
let tmpDeriv = a.derive(a0, a0p, at0.ancestors, at0.children, 0);
let a1 = tmpDeriv.result;
let a1p = tmpDeriv.params;
log(a.reconstruct(a1, a1p));

let at1 = a.getAncestree(a1);
tmpDeriv = a.derive(a1, a1p, at1.ancestors, at1.children, 0);
let a2 = tmpDeriv.result;
let a2p = tmpDeriv.params;
log(a.reconstruct(a2, a2p));
