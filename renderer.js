import { FreeCost } from '../api/Costs';
import { theory } from '../api/Theory';
import { ui } from '../api/ui/UI';
import { Utils } from '../api/Utils';
import { Vector3 } from '../api/Vector3';
import { LayoutOptions } from '../api/ui/properties/LayoutOptions';
import { TextAlignment } from '../api/ui/properties/TextAlignment';
import { Thickness } from '../api/ui/properties/Thickness';
import { Color } from '../api/ui/properties/Color';
import { TouchType } from '../api/ui/properties/TouchType';

/*
Disclaimer: The consensus around L-system's grammar is generally not much
consistent. Therefore, the symbols used here may mean different things in
different implementations. One such example is that \ and / may be swapped; or
that + would turn the cursor clockwise instead of counter (as implemented here).
Another example would be that < and > are used instead of \ and /.

The maths used in this theory do not resemble any sort of correctness either,
particularly referencing the horrible butchery of quaternions, and all the
camera rotation slander in the world. In this theory, the vector is initially
heading in the X-axis, unlike the Y-axis which is way more common in common
implementations of any kind. I'm just a unit circle kind of person.

If the X is half of a laughing face, then the Y represents my waifu Ms. Y, and
the Z stands for Zombies.

(c) 2022 Temple of Pan (R) (TM) All rights reversed.
*/

var id = 'L_systems_renderer';
var name = 'L-systems Renderer';
var description = 'An educational tool that lets you draw various fractal ' +
                  'figures and plants.\n\nFeatures:\n- Can store a whole ' +
                  'army of systems!\n- Stochastic (randomised) systems\n' +
                  '- Switch between camera modes: fixed (scaled) and cursor-' +
                  'focused\n- Stroke options\n\nWarning: As of 0.18, the '+
                  'renderer\'s configuration will be messed up due to format ' +
                  'changes to the internal state.';
var authors = 'propfeds#5988\n\nThanks to:\nSir Gilles-Philippe Paillé, for ' +
              'providing help with quaternions';
var versionStr = 'v0.19 WIP';
var version = 0.182;
var time = 0;
var page = 0;
var offlineDrawing = true;
var gameIsOffline = false;
var altCurrencies = true;
var tickDelayMode = true;

/**
 * Represents a linear congruential generator.
 */
class LCG
{
    /**
     * @constructor
     * @param {number} [seed] (default: 0) the starting seed for the generator.
     */
    constructor(seed = 0)
    {
        /**
         * @type {number} the mod of this realm.
         * @public but not really.
         */
        this.m = 0x80000000; // 2**31;
        /**
         * @type {number} some constant
         * @public but shouldn't be.
         */
        this.a = 1103515245;
        /**
         * @type {number} some other constant.
         * @public please leave me pretty be.
         */
        this.c = 12345;
        /**
         * @type {number} the LCG's current state.
         * @public honestly.
         */
        this.state = seed % this.m;
    }

    /**
     * Returns a random integer within [0, 2^31).
     * @returns {number} the next integer in the generator.
     */
    nextInt()
    {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state;
    }
    /**
     * Returns a random floating point number within [0, 1] or [0, 1).
     * @param {boolean} [includeEnd] (default: false) whether to include the
     * number 1 in the range.
     * @returns {number} the floating point, corresponding to the next integer.
     */
    nextFloat(includeEnd = false)
    {
        if(includeEnd)
        {
            // [0, 1]
            return this.nextInt() / (this.m - 1);
        }
        else
        {
            // [0, 1)
            return this.nextInt() / this.m;
        }
    }
    /**
     * Returns a random integer within a range of [start, end).
     * @param {number} start the range's lower bound.
     * @param {number} end the range's upper bound, plus 1.
     * @returns {number} the integer.
     */
    nextRange(start, end)
    {
        // [start, end)
        let size = end - start;
        return start + Math.floor(this.nextFloat() * size);
    }
    /**
     * Returns a random element from an array.
     * @param {array} array the array.
     * @returns the element.
     */
    choice(array)
    {
        return array[this.nextRange(0, array.length)];
    }
}

/**
 * Represents a quaternion.
 */
class Quaternion
{
    /**
     * @constructor
     * @param {number} w (default: 1) the real component.
     * @param {number} x (default: 0) the imaginary i component.
     * @param {number} y (default: 0) the imaginary j component.
     * @param {number} z (default: 0) the imaginary k component.
     */
    constructor(w = 1, x = 0, y = 0, z = 0)
    {
        /**
         * @type {number} the real component.
         * @public
         */
        this.w = w;
        /**
         * @type {number} the imaginary i component.
         * @public
         */
        this.x = x;
        /**
         * @type {number} the imaginary j component.
         * @public
         */
        this.y = y;
        /**
         * @type {number} the imaginary k component.
         * @public
         */
        this.z = z;
    }

    /**
     * Computes the sum of the current quaternion with another. Does not modify
     * the original quaternion.
     * @param {Quaternion} quat this other quaternion.
     * @returns {Quaternion} the sum.
     */
    add(quat)
    {
        return new Quaternion(
            this.w + quat.w,
            this.x + quat.x,
            this.y + quat.y,
            this.z + quat.z
        );
    }
    /**
     * Computes the product of the current quaternion with another. Does not
     * modify the original quaternion.
     * @param {Quaternion} quat this other quaternion.
     * @returns {Quaternion} the product.
     */
    mul(quat)
    {
        let t0 = this.w * quat.w - this.x * quat.x -
        this.y * quat.y - this.z * quat.z;
        let t1 = this.w * quat.x + this.x * quat.w +
        this.y * quat.z - this.z * quat.y;
        let t2 = this.w * quat.y - this.x * quat.z +
        this.y * quat.w + this.z * quat.x;
        let t3 = this.w * quat.z + this.x * quat.y -
        this.y * quat.x + this.z * quat.w;
        return new Quaternion(t0, t1, t2, t3);
    }
    /**
     * Computes the negation of a quaternion. The negation also acts as the
     * inverse if the quaternion's norm is 1, which is the case with rotation
     * quaternions.
     * @returns {Quaternion} the negation.
     */
    neg()
    {
        return new Quaternion(this.w, -this.x, -this.y, -this.z);
    }
    /**
     * Returns a rotation vector from the quaternion.
     * @returns {Vector3} the rotation vector.
     */
    getRotVector()
    {
        let r = this.neg().mul(xAxisQuat).mul(this);
        return new Vector3(r.x, r.y, r.z);
    }
    /**
     * Returns the quaternion's string representation.
     * @returns {string} the string.
     */
    toString()
    {
        return `${getCoordString(this.w)} + ${getCoordString(this.x)}i + 
        ${getCoordString(this.y)}j + ${getCoordString(this.z)}k`;
    }
}

class LSystem
{
    constructor(axiom, rules, turnAngle = 30, seed = 0)
    {
        this.axiom = axiom;
        this.rules = new Map();
        this.ignoreList = '';
        for(let i = 0; i < rules.length; ++i)
        {
            if(rules[i] !== '')
            {
                let rs = rules[i].split('=');
                if(rs.length < 2)
                {
                    if(i == 0)
                        this.ignoreList = rs[0];
                    continue;
                }
                for(let i = 0; i < 2; ++i)
                    rs[i] = rs[i].trim();

                let rder = rs[1].split(',');
                if(rder.length == 1)
                    this.rules.set(rs[0], rs[1]);
                else
                {
                    for(let i = 0; i < rder; ++i)
                        rder[i] = rder[i].trim();
                    this.rules.set(rs[0], rder);
                }
            }
        }
        this.turnAngle = turnAngle;
        this.halfAngle = this.turnAngle * Math.PI / 360;
        let s = Math.sin(this.halfAngle);
        let c = Math.cos(this.halfAngle);
        this.rotations = new Map();
        this.rotations.set('+', new Quaternion(c, 0, 0, -s));
        this.rotations.set('-', new Quaternion(c, 0, 0, s));
        this.rotations.set('&', new Quaternion(c, 0, -s, 0));
        this.rotations.set('^', new Quaternion(c, 0, s, 0));
        this.rotations.set('\\', new Quaternion(c, -s, 0, 0));
        this.rotations.set('/', new Quaternion(c, s, 0, 0));

        this.seed = seed;
        this.random = new LCG(this.seed);
    }

    derive(state)
    {
        let result = '';
        for(let i = 0; i < state.length; ++i)
        {
            if(this.rules.has(state[i]))
            {
                let rder = this.rules.get(state[i]);
                if(typeof rder === 'string')
                    result += rder;
                else
                    result += rder[this.random.nextRange(0, rder.length)];
            }
            else
                result += state[i];
        }
        return result;
    }
    setSeed(seed)
    {
        this.seed = seed;
        this.random = new LCG(this.seed);
    }

    toString()
    {
        let result = `${this.axiom} ${this.turnAngle} ${this.seed} 
        ${this.ignoreList}`;
        for(let [key, value] of this.rules)
        {
            if(typeof value === 'string')
                result += ` ${key}=${value}`;
            else
                result += ` ${key}=${value.join(',')}`;
        }
        return result;
    }
}

class Renderer
{
    constructor(system, initScale = 1, figureScale = 2, cursorFocused = false,
        camX = 0, camY = 0, camZ = 0, followFactor = 0.15, loopMode = 0,
        upright = false, quickDraw = false, quickBacktrack = false,
        backtrackList = '+-&^\\/|[]')
    {
        this.system = system;
        this.initScale = initScale;
        this.figureScale = figureScale;
        this.cursorFocused = cursorFocused;
        this.camera = new Vector3(camX, camY, camZ);
        this.followFactor = followFactor;
        this.loopMode = loopMode;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.backtrackList = backtrackList;

        this.state = new Vector3(0, 0, 0);
        this.ori = new Quaternion();
        this.reverse = false;
        this.levels = [];
        this.lvl = -1;
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        this.firstPoint = true;
        this.lastCamera = new Vector3(0, 0, 0);
        this.update(0);
    }

    update(level, seedChanged = false)
    {
        let clearGraph = this.loopMode != 2 && level <= this.lvl;
        let start = seedChanged ? 0 : this.levels.length;
        let charCount = 0;
        for(let i = start; i <= level; ++i)
        {
            if(i == 0)
                this.levels[i] = `[${this.system.axiom}]`;
            else
                this.levels[i] = this.system.derive(this.levels[i - 1]);
            
            // Threshold to prevent maximum statements error
            charCount += this.levels[i].length;
            if(charCount >= 25000)
            {
                this.lvl = i;
                return;
            }
        }
        this.lvl = level;
        this.reset(clearGraph);
    }
    reset(clearGraph = true)
    {
        this.state = new Vector3(0, 0, 0);
        this.ori = new Quaternion();
        this.reverse = false;
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        this.firstPoint = true;
        if(clearGraph)
            theory.clearGraph();
        theory.invalidateTertiaryEquation();
    }
    configure(initScale, figureScale, cursorFocused, camX, camY, camZ,
        followFactor, loopMode, upright, quickDraw, quickBacktrack,
        backtrackList)
    {
        let requireReset = (initScale != this.initScale) ||
        (figureScale != this.figureScale) || (upright != this.upright) ||
        (quickDraw != this.quickDraw) ||
        (quickBacktrack != this.quickBacktrack) ||
        (backtrackList != this.backtrackList);

        this.initScale = initScale;
        this.figureScale = figureScale;
        this.cursorFocused = cursorFocused;
        this.camera = new Vector3(camX, camY, camZ);
        this.followFactor = followFactor;
        this.loopMode = loopMode;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.backtrackList = backtrackList;

        if(requireReset)
            this.reset();
    }
    configureStaticCamera(initScale, figureScale, camX, camY, camZ, upright)
    {
        let requireReset = (initScale != this.initScale) ||
        (figureScale != this.figureScale) || (upright != this.upright);

        this.initScale = initScale;
        this.figureScale = figureScale;
        this.camera = new Vector3(camX, camY, camZ);
        this.upright = upright;

        if(requireReset)
            this.reset();
    }
    applySystem(system)
    {
        this.system = system;
        this.levels = [];
        l.level = 0;
        this.update(0);
    }
    rerollSeed(seed)
    {
        this.system.setSeed(seed);
        this.update(this.lvl, true);
    }
    forward()
    {
        if(this.reverse)
            this.state -= this.ori.getRotVector();
        else
            this.state += this.ori.getRotVector();
    }

    draw(level)
    {
        if(this.lvl != level)
            this.update(level);

        if(this.firstPoint)
        {
            this.firstPoint = false;
            return;
        }

        let i;
        for(i = this.idx; i < this.levels[this.lvl].length; ++i)
        {
            switch(this.levels[this.lvl][i])
            {
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
                    this.ori = this.system.rotations.get('\\').mul(this.ori);
                    break;
                case '/':
                    this.ori = this.system.rotations.get('/').mul(this.ori);
                    break;
                case '|':
                    this.reverse = !this.reverse;
                    break;
                case '[':
                    this.idStack.push(this.stack.length);
                    this.stack.push([this.state, this.ori]);
                    break;
                case ']':
                    if(this.loopMode == 0 && this.stack.length == 1)
                    {
                        return;
                    }
                    let t = this.stack.pop();
                    this.state = t[0];
                    this.ori = t[1];
                    if(this.stack.length ==
                        this.idStack[this.idStack.length - 1])
                    {
                        this.idStack.pop();
                        this.idx = i + 1;
                        if(this.idx >= this.levels[this.lvl].length)
                        {
                            this.idx = 0;
                            if(this.loopMode == 2)
                                l.buy(1);
                            this.reverse = false;
                        }
                    }
                    return;
                default:
                    if(this.system.ignoreList.includes(
                        this.levels[this.lvl][i]))
                        break;
                    let breakAhead = this.backtrackList.includes(
                        this.levels[this.lvl][i + 1]);
                    if(!this.quickBacktrack || breakAhead)
                        this.stack.push([this.state, this.ori]);
                    this.forward();
                    this.idx = i + 1;
                    if(this.quickDraw && !breakAhead)
                        break;
                    else
                        return;
            }
        }
    }
    getCentre()
    {
        if(this.cursorFocused)
            return -this.getCursor(this.lvl);
        if(this.upright)
            return new Vector3(this.camera.y, this.camera.x, -this.camera.z);
        return new Vector3(-this.camera.x, this.camera.y, -this.camera.z);
    }
    getCursor()
    {
        let coords = this.state / (this.initScale * this.figureScale **
            this.lvl);
        if(this.upright)
            return new Vector3(-coords.y, -coords.x, coords.z);
        return new Vector3(coords.x, -coords.y, coords.z);
    }
    getCamera()
    {
        if(this.cursorFocused)
        {
            let newCamera = this.getCentre() * this.followFactor +
            this.lastCamera * (1 - this.followFactor);
            this.lastCamera = newCamera;
            return newCamera;
        }
        else
            return this.getCentre();
    }
    getAngles()
    {
        return this.ori;
    }
    getProgress()
    {
        return Math.max(this.idx - 1, 0) * 100 /
        (this.levels[this.lvl].length - 2);
    }
    getProgressString()
    {
        return `i=${Math.max(this.idx - 1, 0)}/
        ${this.levels[this.lvl].length - 2}&
        (${getCoordString(this.getProgress())}\\%)`;
    }
    getStateString()
    {
        return `\\begin{matrix}x=${getCoordString(this.state.x)},&y=
        ${getCoordString(this.state.y)},&z=${getCoordString(this.state.z)},&
        ${this.getProgressString()}\\end{matrix}`;
    }
    getOriString()
    {
        return `\\begin{matrix}q=${this.ori.toString()},&
        ${this.getProgressString()}\\end{matrix}`;
    }
    toString()
    {
        return`${this.initScale} ${this.figureScale} 
        ${this.cursorFocused ? 1 : 0} ${this.camera.x} ${this.camera.y} 
        ${this.camera.z} ${this.followFactor} ${this.loopMode} 
        ${this.upright ? 1 : 0} ${this.quickDraw ? 1 : 0} 
        ${this.quickBacktrack ? 1 : 0} ${this.backtrackList}`;
    }
}

var xAxisQuat = new Quaternion(0, 1, 0, 0);
var getCoordString = (x) => x.toFixed(x >= -0.01 ?
    (x < 10 ? 3 : (x < 100 ? 2 : 1)) :
    (x <= -10 ? (x <= -100 ? 0 : 1) : 2));

var arrow = new LSystem('X', ['F=FF', 'X=F[+X][-X]FX'], 30);
var renderer = new Renderer(arrow, 1, 2, false, 1);

var savedSystems = new Map();
var globalSeed = new LCG(Date.now());
var manualPages =
[
    {
        title: 'The Main Screen',
        contents: `The main screen consists of the renderer and its controls.
        \n\nLevel: the system\'s level. Pressing + or - will derive/revert the 
        system respectively. Pressing the Level button will reveal all levels 
        of the system.\n\nTickspeed: controls the renderer\'s drawing speed (up 
        to 10 lines/sec, which produces less accurate lines).\nPressing the 
        Tickspeed button will toggle between tick delay and tickspeed mode.\n
        (Tip: holding + or - will buy/refund a variable in bulk.)\n\nReroll: 
        located on the top right. Pressing this button will reroll the 
        system\'s seed (for stochastic systems).`
    },
    {
        title: 'A Primer on L-systems',
        contents: `Developed in 1968 by biologist Aristid Lindenmayer, an 
        L-system is a formal grammar that describes the growth of a sequence 
        (string). It is often used to model plants and draw fractal figures.
        \n\nTerms:\nAxiom: the starting sequence.\nRules: how each symbol in 
        the sequence is derived per level. Each rule is written in the form of: 
        {symbol}={derivation(s)}\n\nSymbols:\nAny letter: moves cursor forward 
        to draw.\n+ -: rotates cursor on the z-axis (yaw), counter-/clockwise 
        respectively.\n& ^: rotates cursor on the y-axis (pitch).\n\\ /: 
        rotates cursor on the x-axis (roll).\n|: reverses cursor direction.\n[ ]
        : allows for branches by queueing cursor positions on a stack.\n, : 
        separates between derivations (for stochastic systems).`
    },
    {
        title: 'Tips on Constructing an L-system',
        contents: `Each letter can be used to mean different things, such as 
        drawing a flower, emulating growth stages, alternating between 
        patterns, etc.\nTraditionally, F is used to mean forward, and X to 
        create new branches.\n\nBrackets work in a stack mechanism, therefore 
        every [ has to be properly followed by a ] in the same production rule.
        \n\nTo create a stochastic system, simply list several derivations in 
        the same rule, separated by a , (comma). One of those derivations will 
        be randomly selected per symbol whenever the system is derived.
        \nGenerally, to keep a degree of uniformity in the system, it is 
        advised for the derivations to be similar in shape.`
    },
    {
        title: 'Configuring your L-system',
        contents: `Configure the visual representation of your L-system with 
        the renderer menu.\n\nInitial scale: zooms out by this much for every 
        figure.\nFigure scale: zooms the figure out by a multiplier per level.
        \n\nCamera mode: toggles between static and cursor-focused.\nCentre: 
        sets camera position for level 0 (this follows figure scale, and is 
        based on non-upright coordinates).\nCamera follow factor: changes how 
        quickly the camera chases the cursor.\n(Note: figure scale and camera 
        centre needs to be experimented manually for each individual L-system.)
        \n\nOffline drawing: when enabled, no longer resets the graph while 
        tabbed out.\nUpright x-axis: rotates figure by 90 degrees 
        counter-clockwise around the z-axis.\n\nQuickdraw: skips over 
        consecutive straight lines.\nQuick backtrack: similarly, but on the way 
        back.\nBacktrack list: sets stopping symbols for quickdraw/backtrack.`
    },
    {
        title: 'Example: Arrow weed',
        contents: `Meet the default system. It tastes like mint.\n\nAxiom: 
        X\nF=FF\nX=F[+X][-X]FX\nTurning angle: 30°\n\nScale: 1, 2\nCamera 
        centre: (1, 0, 0)`,
        system: arrow,
        config: [1, 2, 1, 0, 0, false]
    },
    {
        title: 'Example: Dragon curve',
        contents: `Also known as the Heighway dragon.\n\nAxiom: FX\nY=-FX-Y\nX=X
        +YF+\nTurning angle: 90°\n\nScale: 2, sqrt(2)\nCamera centre: (0, 0, 0)
        `,
        system: new LSystem('FX', ['Y=-FX-Y', 'X=X+YF+'], 90),
        config: [2, Math.sqrt(2), 0, 0, 0, false]
    },
    {
        title: 'Example: Stochastic weed',
        contents: `It generates a random shape every time it rolls!\n\nAxiom: 
        F\nF=FF\nX=F-[[X]+X]+F[+FX]-X,\n     F+[[X]-X]-F[-FX]+X\nTurning angle: 
        22.5°\n\nScale: 1, 2\nCamera centre: (1, 0, 0)`,
        system: new LSystem('X', [
            'F=FF',
            'X=F-[[X]+X]+F[+FX]-X,F+[[X]-X]-F[-FX]+X'
        ], 22.5),
        config: [1, 2, 1, 0, 0, true]
    },
    {
        title: 'Example: Lucky flower',
        contents: `How tall can it grow until it sprouts a flower? Reroll to 
        find out!\n\nAxiom: A\nA=I[L]B,\n     I[L]A,\n     I[L][R]B,\n     
        IF\nB=I[R]A,\n     I[R]B,\n     I[L][R]A,\n     IF\nL=---I,\n     --I,
        \n     ----I\nR=+++I,\n     ++I,\n     ++++I\nF=[---[I+I]--I+I][+++[I-I]
        ++I-I]I\nTurning angle: 12°`,
        system: new LSystem('A', [
            'A=I[L]B,I[L]A,I[L][R]B,IF',
            'B=I[R]A,I[R]B,I[L][R]A,IF',
            'L=---I,--I,----I',
            'R=+++I,++I,++++I',
            'F=[---[I+I]--I+I][+++[I-I]++I-I]I'
        ], 12),
        config: [3, 1.1, 0.7, 0, 0, true]
    },
    {
        title: 'Example: Blackboard tree (3D)',
        contents: `A blackboard tree (Alstonia scholaris) when it\'s still tiny.
        \n\nAxiom: F\nF=Y[++++++MF][-----NF][^^^^^OF][&&&&&PF]\nM=Z-M\nN=Z
        +N\nO=Z&O\nP=Z^P\nY=Z-ZY+\nZ=ZZ\nTurning angle: 8°\n\nScale: 2, 
        2\nCamera centre: (1.5, 0, 0)`,
        system: new LSystem('F', [
            'F=Y[++++++MF][-----NF][^^^^^OF][&&&&&PF]',
            'M=Z-M',
            'N=Z+N',
            'O=Z&O',
            'P=Z^P',
            'Y=Z-ZY+',
            'Z=ZZ'
        ], 8),
        config: [2, 2, 0.6, 0, 0, true]
    },
    {
        title: 'Example: Hilbert curve (3D)',
        contents: `If you set to high tickspeed, it look like brainz.\n\nAxiom: 
        X\nX=^/XF^/XFX-F^\\\\XFX&F+\\\\XFX-F\\X-\\\nTurning angle: 90°\nIgnore: 
        X\n\nScale: 1, 2\nCamera centre: (0.5, -0.5, -0.5)`,
        system: new LSystem('X', [
            'X',
            'X=^/XF^/XFX-F^\\\\XFX&F+\\\\XFX-F\\X-\\'
        ], 90),
        config: [1, 2, 0.5, 0.5, 0.5, false]
    },
    {
        title: 'Example: Fern (3D)',
        contents: `Source: https://observablehq.com/@kelleyvanevert/
        3d-l-systems\n\nAxiom: FFFA\nA=[++++++++++++++FC]B^+B[--------------FD]B
        +BA\nC=[---------FF][+++++++++FF]B&&+C\nD=[---------FF][+++++++++FF]B&&
        -D\nTurning angle: 4°`,
        system: new LSystem('FFFA', [
            'A=[++++++++++++++FC]B^+B[--------------FD]B+BA',
            'C=[---------FF][+++++++++FF]B&&+C',
            'D=[---------FF][+++++++++FF]B&&-D'
        ], 4),
        config: [3, 1.3, 0.6, 0, 0, true]
    },
    {
        title: 'Example: Cultivar FF (Botched)',
        contents: `Represents a common source of carbohydrates.\n\nAxiom: 
        X\nF=FF\nX=F-[[X]+X]+F[-X]-X\nTurning angle: 15°\n\nScale: 1, 2\nCamera 
        centre: (1, 0, 0)`,
        system: new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[-X]-X'], 15),
        config: [1, 2, 1, 0, 0, true]
    },
    {
        title: 'Example: Cultivar FXF (Botched)',
        contents: `Commonly called the Cyclone, cultivar FXF resembles a coil 
        of barbed wire. Legends have it, once a snake moult has weathered 
        enough, a new life is born unto the tattered husk, and from there, it 
        stretches.\n\nAxiom: X\nF=F[+F]XF\nX=F-[[X]+X]+F[-FX]-X\nTurning angle: 
        27°`,
        system: new LSystem('X', ['F=F[+F]XF', 'X=F-[[X]+X]+F[-FX]-X'], 27),
        config: [1.5, 2, 0.15, -0.5, 0, false]
    },
    {
        title: 'Example: Cultivar XEXF (Botched)',
        contents: `Bearing the shape of a thistle, cultivar XEXF embodies the 
        strength and resilience of nature against the harsh logarithm drop-off. 
        It also smells really, really good.\n\nAxiom: X\nE=XEXF-\nF=FX+[E]
        X\nX=F-[X+[X[++E]F]]+F[X+FX]-X\nTurning angle: 22.5°`,
        system: new LSystem('X', [
            'E=XEXF-',
            'F=FX+[E]X',
            'X=F-[X+[X[++E]F]]+F[X+FX]-X'
        ], 22.5),
        config: [1, 3, 0.75, -0.25, 0, true]
    }
];

var init = () =>
{
    if(altCurrencies)
    {
        roll = theory.createCurrency(' = x');
        pitch = theory.createCurrency(' = y');
        yaw = theory.createCurrency(' = z');
    }
    else
    {
        // yaw = theory.createCurrency('° (yaw)', '\\degree_z');
        // pitch = theory.createCurrency('° (pitch)', '\\degree_y');
        // roll = theory.createCurrency('° (roll)', '\\degree_x');
        roll = theory.createCurrency('i');
        pitch = theory.createCurrency('j');
        yaw = theory.createCurrency('k');
    }
    // progress = theory.createCurrency('%');

    // l (Level)
    {
        let getDesc = (level) => `\\text{Level: }${level.toString()}`;
        let getInfo = (level) => `\\text{Lv. }${level.toString()}`;
        l = theory.createUpgrade(0, yaw, new FreeCost);
        l.getDescription = (_) => Utils.getMath(getDesc(l.level));
        l.getInfo = (amount) => Utils.getMathTo(getInfo(l.level),
        getInfo(l.level + amount));
        l.canBeRefunded = (_) => true;
        l.boughtOrRefunded = (_) => renderer.update(l.level);
    }
    // ts (Tickspeed)
    {
        let getDesc = (level) =>
        {
            if(tickDelayMode)
                return `\\text{Tick delay: }${(level / 10).toString()}
                \\text{ sec}`;
            return `\\text{Tickspeed: }${level.toString()}/\\text{sec}`;
        }
        let getInfo = (level) => `\\text{Ts=}${level.toString()}/s`;
        ts = theory.createUpgrade(1, pitch, new FreeCost);
        ts.getDescription = (_) => Utils.getMath(getDesc(ts.level));
        ts.getInfo = (amount) => Utils.getMathTo(getInfo(ts.level),
        getInfo(ts.level + amount));
        ts.maxLevel = 10;
        ts.canBeRefunded = (_) => true;
        ts.boughtOrRefunded = (_) => time = 0;
    }
}

var alwaysShowRefundButtons = () => true;

var timeCheck = (elapsedTime) =>
{
    if(tickDelayMode)
    {
        time += 1;
        return time >= ts.level;
    }
    time += elapsedTime;
    return time >= 1 / ts.level - 1e-8
}

var tick = (elapsedTime, multiplier) =>
{
    if(ts.level == 0)
        return;

    if(timeCheck(elapsedTime))
    {
        if(game.isCalculatingOfflineProgress)
            gameIsOffline = true;
        else if(gameIsOffline)
        {
            // Probably triggers only once when reloading
            if(!offlineDrawing)
                renderer.reset();
            gameIsOffline = false;
        }

        if(!gameIsOffline || offlineDrawing)
        {
            renderer.draw(l.level);
            if(altCurrencies)
            {
                roll.value = renderer.state.x;
                pitch.value = renderer.state.y;
                yaw.value = renderer.state.z;
            }
            else
            {
                let angles = renderer.getAngles();
                yaw.value = angles.z;
                pitch.value = angles.y;
                roll.value = angles.x;
            }
            // progress.value = renderer.getProgress();
            theory.invalidateTertiaryEquation();
        }
        if(tickDelayMode)
            time = 0;
        else
            time -= 1 / ts.level;
    }
}

var getEquationOverlay = () =>
{
    let result = ui.createLatexLabel
    ({
        text: versionStr,
        displacementX: 6,
        displacementY: 4,
        fontSize: 9,
        textColor: Color.TEXT_MEDIUM
    });
    return result;
}

var createVariableButton = (variable, height) =>
{
    let frame = ui.createFrame
    ({
        heightRequest: height,
        padding: new Thickness(10, 2),
        verticalOptions: LayoutOptions.CENTER,
        content: ui.createLatexLabel
        ({
            text: () => variable.getDescription(),
            verticalOptions: LayoutOptions.CENTER,
            textColor: Color.TEXT_MEDIUM
        }),
        borderColor: Color.TRANSPARENT
    });
    return frame;
}

var createMinusButton = (variable, height) =>
{
    let bc = () => variable.level > 0 ?
    Color.MINIGAME_TILE_BORDER : Color.TRANSPARENT;
    let frame = ui.createFrame
    ({
        column: 0,
        heightRequest: height,
        padding: new Thickness(10, 2),
        verticalOptions: LayoutOptions.CENTER,
        content: ui.createLatexLabel
        ({
            text: '-',
            horizontalOptions: LayoutOptions.CENTER,
            verticalOptions: LayoutOptions.CENTER,
            textColor: () => variable.level > 0 ? Color.TEXT : Color.TEXT_MEDIUM
        }),
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED)
            {
                frame.borderColor = bc;
                Sound.playClick();
                variable.refund(1);
            }
            else if(e.type == TouchType.LONGPRESS)
            {
                frame.borderColor = bc;
                Sound.playClick();
                variable.refund(-1);
            }
            else if(e.type == TouchType.PRESSED)
            {
                frame.borderColor = Color.BORDER;
            }
            else if(e.type == TouchType.CANCELLED)
            {
                frame.borderColor = bc;
            }
        },
        borderColor: bc
    });
    return frame;
}

var createPlusButton = (variable, height, quickbuyAmount = 10) =>
{
    let bc = () => variable.level < variable.maxLevel ?
    Color.MINIGAME_TILE_BORDER : Color.TRANSPARENT;
    let frame = ui.createFrame
    ({
        column: 1,
        heightRequest: height,
        padding: new Thickness(10, 2),
        verticalOptions: LayoutOptions.CENTER,
        content: ui.createLatexLabel
        ({
            text: '+',
            horizontalOptions: LayoutOptions.CENTER,
            verticalOptions: LayoutOptions.CENTER,
            textColor: () => variable.level < variable.maxLevel ?
            Color.TEXT : Color.TEXT_MEDIUM
        }),
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED)
            {
                frame.borderColor = bc;
                Sound.playClick();
                variable.buy(1);
            }
            else if(e.type == TouchType.LONGPRESS)
            {
                frame.borderColor = bc;
                Sound.playClick();
                for(let i = 0; i < quickbuyAmount; ++i)
                    variable.buy(1);
            }
            else if(e.type == TouchType.PRESSED)
            {
                frame.borderColor = Color.BORDER;
            }
            else if(e.type == TouchType.CANCELLED)
            {
                frame.borderColor = bc;
            }
        },
        borderColor: bc
    });
    return frame;
}

var createMenuButton = (menuFunc, name, height) =>
{
    let frame = ui.createFrame
    ({
        heightRequest: height,
        padding: new Thickness(10, 2),
        verticalOptions: LayoutOptions.CENTER,
        content: ui.createLatexLabel
        ({
            text: name,
            verticalOptions: LayoutOptions.CENTER,
            textColor: Color.TEXT
        }),
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                frame.borderColor = Color.MINIGAME_TILE_BORDER;
                Sound.playClick();
                let menu = menuFunc();
                menu.show();
            }
            else if(e.type == TouchType.PRESSED)
            {
                frame.borderColor = Color.BORDER;
            }
            else if(e.type == TouchType.CANCELLED)
            {
                frame.borderColor = Color.MINIGAME_TILE_BORDER;
            }
        },
        borderColor: Color.MINIGAME_TILE_BORDER
    });
    return frame;
}

// For example: The level variable button opens the sequence menu
var createClickableVariableButton = (variable, callback, height) =>
{
    let frame = ui.createFrame
    ({
        heightRequest: height,
        padding: new Thickness(10, 2),
        verticalOptions: LayoutOptions.CENTER,
        content: ui.createLatexLabel
        ({
            text: () => variable.getDescription(),
            verticalOptions: LayoutOptions.CENTER,
            textColor: Color.TEXT
        }),
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                frame.borderColor = Color.MINIGAME_TILE_BORDER;
                callback();
            }
            else if(e.type == TouchType.PRESSED)
            {
                frame.borderColor = Color.BORDER;
            }
            else if(e.type == TouchType.CANCELLED)
            {
                frame.borderColor = Color.MINIGAME_TILE_BORDER;
            }
        },
        borderColor: Color.MINIGAME_TILE_BORDER
    });
    return frame;
}

var getUpgradeListDelegate = () =>
{
    let height = ui.screenHeight * 0.055;

    let openSeqMenu = () =>
    {
        let menu = createSequenceMenu();
        menu.show();
    }
    let lvlButton = createClickableVariableButton(l, openSeqMenu, height);
    lvlButton.row = 0;
    lvlButton.column = 0;

    let toggleTDM = () =>
    {
        tickDelayMode = !tickDelayMode;
    }
    let tsButton = createClickableVariableButton(ts, toggleTDM, height);
    tsButton.row = 1;
    tsButton.column = 0;

    let sysButton = createMenuButton(createSystemMenu, 'L-system menu', height);
    sysButton.row = 0;
    sysButton.column = 0;
    let cfgButton = createMenuButton(createConfigMenu, 'Renderer menu', height);
    cfgButton.row = 0;
    cfgButton.column = 1;
    let expButton = createMenuButton(createSaveMenu, 'Save/load', height);
    expButton.row = 1;
    expButton.column = 0;
    let manualButton = createMenuButton(createManualMenu, 'Manual', height);
    manualButton.row = 1;
    manualButton.column = 1;

    let stack = ui.createScrollView
    ({
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    padding: new Thickness(0, 3),
                    columnSpacing: 3,
                    rowSpacing: 3,
                    rowDefinitions: [height, height],
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        lvlButton,
                        ui.createGrid
                        ({
                            row: 0,
                            column: 1,
                            columnSpacing: 3,
                            columnDefinitions: ['50*', '50*'],
                            children:
                            [
                                createMinusButton(l, height),
                                createPlusButton(l, height)
                            ]
                        }),
                        tsButton,
                        ui.createGrid
                        ({
                            row: 1,
                            column: 1,
                            columnSpacing: 3,
                            columnDefinitions: ['50*', '50*'],
                            children:
                            [
                                createMinusButton(ts, height),
                                createPlusButton(ts, height)
                            ]
                        })
                    ]
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    // margin: new Thickness(0, 2, 0, 3)
                }),
                ui.createGrid
                ({
                    padding: new Thickness(0, 3),
                    columnSpacing: 3,
                    rowSpacing: 3,
                    rowDefinitions: [height, height],
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        sysButton,
                        cfgButton,
                        expButton,
                        manualButton
                    ]
                })
            ]
        })
    });
    return stack;
}

var createConfigMenu = () =>
{
    let tmpIScale = renderer.initScale;
    let iScaleEntry = ui.createEntry
    ({
        text: tmpIScale.toString(),
        row: 0,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpIScale = Number(nt);
        }
    });
    let tmpFScale = renderer.figureScale;
    let fScaleEntry = ui.createEntry
    ({
        text: tmpFScale.toString(),
        row: 1,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpFScale = Number(nt);
            if(tmpFScale == 0)
                tmpFScale = 1;
        }
    });
    let tmpCFC = renderer.cursorFocused;
    let camModes = ['Static', 'Cursor-focused'];
    let CFCLabel = ui.createLatexLabel
    ({
        text: `Camera mode: ${camModes[Number(tmpCFC)]}`,
        row: 2,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });
    let CFCSwitch = ui.createSwitch
    ({
        isToggled: tmpCFC,
        row: 2,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpCFC = !tmpCFC;
                CFCSwitch.isToggled = tmpCFC;
                camLabel.isVisible = !tmpCFC;
                camGrid.isVisible = !tmpCFC;
                FFLabel.isVisible = tmpCFC;
                FFEntry.isVisible = tmpCFC;
                CFCLabel.text = `Camera mode: ${camModes[Number(tmpCFC)]}`;
            }
        }
    });
    let tmpCX = renderer.camera.x;
    let tmpCY = renderer.camera.y;
    let tmpCZ = renderer.camera.z;
    let camLabel = ui.createGrid
    ({
        row: 3,
        column: 0,
        columnDefinitions: ['55*', '15*'],
        isVisible: !tmpCFC,
        children:
        [
            ui.createLatexLabel
            ({
                text: 'Centre (x, y, z): ',
                row: 0,
                column: 0,
                verticalOptions: LayoutOptions.CENTER
            }),
            ui.createEntry
            ({
                text: tmpCX.toString(),
                row: 0,
                column: 1,
                horizontalTextAlignment: TextAlignment.END,
                onTextChanged: (ot, nt) =>
                {
                    tmpCX = Number(nt);
                }
            })
        ]
    });
    let camGrid = ui.createGrid
    ({
        row: 3,
        column: 1,
        columnDefinitions: ['50*', '50*'],
        isVisible: !tmpCFC,
        children:
        [
            ui.createEntry
            ({
                text: tmpCY.toString(),
                row: 0,
                column: 0,
                horizontalTextAlignment: TextAlignment.END,
                onTextChanged: (ot, nt) =>
                {
                    tmpCY = Number(nt);
                }
            }),
            ui.createEntry
            ({
                text: tmpCZ.toString(),
                row: 0,
                column: 1,
                horizontalTextAlignment: TextAlignment.END,
                onTextChanged: (ot, nt) =>
                {
                    tmpCZ = Number(nt);
                }
            })
        ]
    });
    let tmpFF = renderer.followFactor;
    let FFLabel = ui.createLatexLabel
    ({
        text: 'Follow factor (0-1): ',
        row: 3,
        column: 0,
        verticalOptions: LayoutOptions.CENTER,
        isVisible: tmpCFC
    });
    let FFEntry = ui.createEntry
    ({
        text: tmpFF.toString(),
        row: 3,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        isVisible: tmpCFC,
        onTextChanged: (ot, nt) =>
        {
            tmpFF = Number(nt);
            tmpFF = Math.min(Math.max(tmpFF, 0), 1);
        }
    });
    let tmpOD = renderer.loopMode;
    let loopModes = ['Off', 'Level', 'Playlist'];
    let ODLabel = ui.createLatexLabel
    ({
        text: `Looping mode: ${loopModes[tmpOD]}`,
        row: 0,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });
    let ODSlider = ui.createSlider
    ({
        row: 0,
        column: 1,
        minimum: 0,
        maximum: 2,
        value: tmpOD,
        // minimumTrackColor: Color.MINIGAME_TILE_BORDER,
        // maximumTrackColor: Color.BORDER,
        onValueChanged: () =>
        {
            tmpOD = Math.round(ODSlider.value);
            ODLabel.text = `Looping mode: ${loopModes[tmpOD]}`;
        },
        onDragCompleted: () =>
        {
            Sound.playClick();
            ODSlider.value = tmpOD;
        }
    });
    let tmpUpright = renderer.upright;
    let uprightSwitch = ui.createSwitch
    ({
        isToggled: tmpUpright,
        row: 1,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpUpright = !tmpUpright;
                uprightSwitch.isToggled = tmpUpright;
            }
        }
    });
    let tmpQD = renderer.quickDraw;
    let QDSwitch = ui.createSwitch
    ({
        isToggled: tmpQD,
        row: 2,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpQD = !tmpQD;
                QDSwitch.isToggled = tmpQD;
            }
        }
    });
    let tmpQB = renderer.quickBacktrack;
    let QBSwitch = ui.createSwitch
    ({
        isToggled: tmpQB,
        row: 3,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpQB = !tmpQB;
                QBSwitch.isToggled = tmpQB;
            }
        }
    });
    let tmpEXB = renderer.backtrackList;
    let EXBLabel = ui.createLatexLabel
    ({
        text: 'Backtrack list: ',
        row: 4,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });
    let EXBEntry = ui.createEntry
    ({
        text: tmpEXB,
        row: 4,
        column: 1,
        onTextChanged: (ot, nt) =>
        {
            tmpEXB = nt;
        }
    });

    let menu = ui.createPopup
    ({
        title: 'Renderer Menu',
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createScrollView
                ({
                    content: ui.createStackLayout
                    ({
                        children:
                        [
                            ui.createGrid
                            ({
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: 'Initial scale: ',
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    iScaleEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: 'Figure scale per level: ',
                                        row: 1,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    fScaleEntry,
                                    CFCLabel,
                                    CFCSwitch,
                                    camLabel,
                                    camGrid,
                                    FFLabel,
                                    FFEntry
                                ]
                            }),
                            ui.createBox
                            ({
                                heightRequest: 1,
                                margin: new Thickness(0, 6)
                            }),
                            ui.createGrid
                            ({
                                // rowDefinitions: [40, 40, 40, 40, 40],
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    ODLabel,
                                    ODSlider,
                                    ui.createLatexLabel
                                    ({
                                        text: 'Upright x-axis: ',
                                        row: 1,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    uprightSwitch,
                                    ui.createLatexLabel
                                    ({
                                        text: 'Quickdraw straight lines: ',
                                        row: 2,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    QDSwitch,
                                    ui.createLatexLabel
                                    ({
                                        text: 'Quick backtrack: ',
                                        row: 3,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    QBSwitch,
                                    EXBLabel,
                                    EXBEntry
                                ]
                            })
                        ]
                    })
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createGrid
                ({
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        ui.createButton
                        ({
                            text: 'Save',
                            row: 0,
                            column: 0,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                renderer.configure(tmpIScale, tmpFScale,
                                    tmpCFC, tmpCX, tmpCY, tmpCZ, tmpFF, tmpOD,
                                    tmpUpright, tmpQD, tmpQB, tmpEXB);
                                menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: 'Reset to Defaults',
                            row: 0,
                            column: 1,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                let currentSystem = renderer.system;
                                renderer = new Renderer(currentSystem);
                                menu.hide();
                            }
                        })
                    ]
                })
                
            ]
        })
    })
    return menu;
}

var createSystemMenu = () =>
{
    let tmpAxiom = renderer.system.axiom;
    let axiomEntry = ui.createEntry
    ({
        text: tmpAxiom,
        row: 0,
        column: 1,
        onTextChanged: (ot, nt) =>
        {
            tmpAxiom = nt;
        }
    });
    let tmpAngle = renderer.system.turnAngle;
    let angleEntry = ui.createEntry
    ({
        text: tmpAngle.toString(),
        row: 0,
        column: 3,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpAngle = Number(nt);
        }
    });
    let tmpRules = [];
    tmpRules.push(renderer.system.ignoreList);
    for(let [key, value] of renderer.system.rules)
    {
        if(typeof value === 'string')
            tmpRules.push(`${key}=${value}`);
        else
            tmpRules.push(`${key}=${value.join(',')}`);
    }
    let ruleEntries = [];
    for(let i = 1; i < tmpRules.length; ++i)
    {
        ruleEntries.push(ui.createEntry
        ({
            text: tmpRules[i],
            onTextChanged: (ot, nt) =>
            {
                tmpRules[i] = nt;
            }
        }));
    }
    let ruleStack = ui.createStackLayout
    ({
        children: ruleEntries
    });
    let addRuleButton = ui.createButton
    ({
        text: 'Add',
        row: 0,
        column: 1,
        // heightRequest: 40,
        onClicked: () =>
        {
            Sound.playClick();
            let i = ruleEntries.length;
            ruleEntries.push(ui.createEntry
            ({
                text: '',
                onTextChanged: (ot, nt) =>
                {
                    tmpRules[i + 1] = nt;
                }
            }));
            ruleStack.children = ruleEntries;
        }
    });
    let ignoreEntry = ui.createEntry
    ({
        text: tmpRules[0],
        row: 0,
        column: 1,
        onTextChanged: (ot, nt) =>
        {
            tmpRules[0] = nt;
        }
    });
    let tmpSeed = renderer.system.seed;
    let seedEntry = ui.createEntry
    ({
        text: tmpSeed.toString(),
        row: 1,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpSeed = Number(nt);
        }
    });

    let menu = ui.createPopup
    ({
        title: 'L-system Menu',
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createScrollView
                ({
                    content: ui.createStackLayout
                    ({
                        children:
                        [
                            ui.createGrid
                            ({
                                columnDefinitions: ['20*', '30*', '30*', '20*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: 'Axiom: ',
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    axiomEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: 'Turning angle (°): ',
                                        row: 0,
                                        column: 2,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    angleEntry,
                                ]
                            }),
                            ui.createGrid
                            ({
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: 'Production rules: ',
                                        verticalOptions: LayoutOptions.CENTER,
                                        margin: new Thickness(0, 6)
                                    }),
                                    addRuleButton
                                ]
                            }),
                            ruleStack,
                            ui.createGrid
                            ({
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: 'Ignored symbols: ',
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    ignoreEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: 'Seed (for stochastic systems): ',
                                        row: 1,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    seedEntry
                                ]
                            })
                        ]
                    })
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createButton
                ({
                    text: 'Construct',
                    onClicked: () =>
                    {
                        Sound.playClick();
                        renderer.applySystem(new LSystem(tmpAxiom, tmpRules,
                            tmpAngle, tmpSeed));
                        menu.hide();
                    }
                })
            ]
        })
    })
    return menu;
}

var createNamingMenu = (title, values) =>
{
    let tmpName = title;
    let nameEntry = ui.createEntry
    ({
        text: tmpName,
        onTextChanged: (ot, nt) =>
        {
            tmpName = nt;
        }
    });
    let menu = ui.createPopup
    ({
        title: 'Name System',
        content: ui.createStackLayout
        ({
            children:
            [
                nameEntry,
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createButton
                ({
                    text: 'Save',
                    onClicked: () =>
                    {
                        Sound.playClick();
                        while(savedSystems.has(tmpName))
                            tmpName += ' (copy)';
                        savedSystems.set(tmpName, values);
                        menu.hide();
                    }
                })
            ]
        })
    });
    return menu;
}

var createClipboardMenu = (values) =>
{
    let tmpSys = values;
    let sysEntry = ui.createEntry
    ({
        text: tmpSys,
        onTextChanged: (ot, nt) =>
        {
            tmpSys = nt;
        }
    });
    let menu = ui.createPopup
    ({
        title: 'Clipboard Menu',
        content: ui.createStackLayout
        ({
            children:
            [
                sysEntry,
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createButton
                ({
                    text: 'Construct',
                    onClicked: () =>
                    {
                        Sound.playClick();
                        let systemValues = tmpSys.split(' ');
                        renderer.applySystem(new LSystem(systemValues[0],
                            systemValues.slice(3), Number(systemValues[1]),
                            Number(systemValues[2])));
                        menu.hide();
                    }
                })
            ]
        })
    });
    return menu;
}

var createViewMenu = (title) =>
{
    values = savedSystems.get(title);

    let systemValues = values.split(' ');

    let menu;
    let tmpAxiom = systemValues[0];
    let tmpAngle = Number(systemValues[1]);
    let tmpRules = systemValues.slice(3);

    let ruleEntries = [];
    for(let i = 0; i < tmpRules.length; ++i)
    {
        if(i == 0)
        {
            let rs = tmpRules[i].split('=');
            if(rs.length >= 2)
            {
                tmpRules.unshift('');
            }
        }
        else
        {
            ruleEntries.push(ui.createEntry
            ({
                text: tmpRules[i]
            }));
        }
    }
    let tmpSeed = Number(systemValues[2]);

    menu = ui.createPopup
    ({
        title: title,
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createScrollView
                ({
                    content: ui.createStackLayout
                    ({
                        children:
                        [
                            ui.createGrid
                            ({
                                columnDefinitions: ['20*', '30*', '30*', '20*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: 'Axiom: ',
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    ui.createEntry
                                    ({
                                        text: tmpAxiom,
                                        row: 0,
                                        column: 1
                                    }),
                                    ui.createLatexLabel
                                    ({
                                        text: 'Turning angle (°): ',
                                        row: 0,
                                        column: 2,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    ui.createEntry
                                    ({
                                        text: tmpAngle.toString(),
                                        row: 0,
                                        column: 3,
                                        horizontalTextAlignment:
                                        TextAlignment.END
                                    }),
                                ]
                            }),
                            ui.createLatexLabel
                            ({
                                text: 'Production rules: ',
                                verticalOptions: LayoutOptions.CENTER,
                                margin: new Thickness(0, 6)
                            }),
                            ui.createStackLayout
                            ({
                                children: ruleEntries
                            }),
                            ui.createGrid
                            ({
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: 'Ignored symbols: ',
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    ui.createEntry
                                    ({
                                        text: tmpRules[0],
                                        row: 0,
                                        column: 1
                                    }),
                                    ui.createLatexLabel
                                    ({
                                        text: 'Seed (for stochastic systems): ',
                                        row: 1,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    ui.createEntry
                                    ({
                                        text: tmpSeed.toString(),
                                        row: 1,
                                        column: 1,
                                        horizontalTextAlignment:
                                        TextAlignment.END
                                    })
                                ]
                            })
                        ]
                    })
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createGrid
                ({
                    minimumHeightRequest: 64,
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        ui.createButton
                        ({
                            text: 'Construct',
                            row: 0,
                            column: 0,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                renderer.applySystem(new LSystem(tmpAxiom,
                                    tmpRules, tmpAngle, tmpSeed));
                                menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: 'Delete',
                            row: 0,
                            column: 1,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                savedSystems.delete(title);
                                menu.hide();
                            }
                        })
                    ]
                })
            ]
        })
    })
    return menu;
}

var createSaveMenu = () =>
{
    let menu;
    let getSystemGrid = () =>
    {
        let children = [];
        let i = 0;
        for(let [key, value] of savedSystems)
        {
            children.push(ui.createLatexLabel
            ({
                text: key,
                row: i,
                column: 0,
                verticalOptions: LayoutOptions.CENTER
            }));
            let btn = createViewButton(key);
            btn.row = i;
            btn.column = 1;
            children.push(btn);
            ++i;
        }
        return children;
    };
    let createViewButton = (title) =>
    {
        let btn = ui.createButton
        ({
            text: 'View',
            row: 0,
            column: 1,
            // heightRequest: 40,
            onClicked: () =>
            {
                Sound.playClick();
                let viewMenu = createViewMenu(title, systemGrid);
                viewMenu.onDisappearing = () =>
                {
                    systemGrid.children = getSystemGrid();
                };
                viewMenu.show();
            }
        });
        return btn;
    };
    let systemGrid = ui.createGrid
    ({
        columnDefinitions: ['70*', '30*'],
        children: getSystemGrid() 
    });

    menu = ui.createPopup
    ({
        title: 'Save/Load Menu',
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    columnDefinitions: ['40*', '30*', '30*'],
                    children:
                    [
                        ui.createLatexLabel
                        ({
                            text: 'Current system: ',
                            row: 0,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createButton
                        ({
                            text: 'Clipboard',
                            row: 0,
                            column: 1,
                            onClicked: () =>
                            {
                                let clipMenu = createClipboardMenu(
                                    renderer.system.toString());
                                clipMenu.show();
                            }
                        }),
                        ui.createButton
                        ({
                            text: 'Save',
                            row: 0,
                            column: 2,
                            // heightRequest: 40,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                let namingMenu = createNamingMenu(
                                    'Untitled L-system',
                                    renderer.system.toString(), systemGrid);
                                namingMenu.onDisappearing = () =>
                                {
                                    systemGrid.children = getSystemGrid();
                                };
                                namingMenu.show();
                                // menu.hide();
                            }
                        })
                    ]
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createLatexLabel
                ({
                    text: 'Saved systems: ',
                    verticalOptions: LayoutOptions.CENTER,
                    margin: new Thickness(0, 6)
                }),
                ui.createScrollView
                ({
                    // heightRequest: ui.screenHeight * 0.25,
                    content: systemGrid
                })
            ]
        })
    })
    return menu;
}

var createManualMenu = () =>
{
    let pageTitle = ui.createLatexLabel
    ({
        // padding: new Thickness(0, 0),
        text: manualPages[page].title,
        horizontalOptions: LayoutOptions.CENTER,
        verticalOptions: LayoutOptions.CENTER
    });
    let pageContents = ui.createLabel
    ({
        // fontFamily: FontFamily.CMU_REGULAR,
        fontSize: 16,
        text: manualPages[page].contents
    });

    let menu = ui.createPopup
    ({
        title: `Manual (${page + 1}/${manualPages.length})`,
        content: ui.createStackLayout
        ({
            children:
            [
                pageTitle,
                ui.createFrame
                ({
                    padding: new Thickness(6, 6),
                    heightRequest: ui.screenHeight * 0.3,
                    content: ui.createScrollView
                    ({
                        content: pageContents
                    })
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createGrid
                ({
                    columnDefinitions: ['30*', '30*', '30*'],
                    children:
                    [
                        ui.createButton
                        ({
                            text: 'Previous',
                            row: 0,
                            column: 0,
                            isVisible: () => page > 0,
                            onClicked: () =>
                            {
                                if(page > 0)
                                {
                                    Sound.playClick();
                                    --page;
                                    menu.title = `Manual (${page + 1}/
                                    ${manualPages.length})`;
                                    pageTitle.text = manualPages[page].title;
                                    pageContents.text =
                                    manualPages[page].contents;
                                }
                            }
                        }),
                        ui.createButton
                        ({
                            text: 'Construct',
                            row: 0,
                            column: 1,
                            isVisible: () => 'system' in manualPages[page],
                            onClicked: () =>
                            {
                                Sound.playClick();
                                renderer.applySystem(manualPages[page].system);
                                if('config' in manualPages[page])
                                {
                                    let a = manualPages[page].config;
                                    renderer.configureStaticCamera(...a);
                                }
                                menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: 'Next',
                            row: 0,
                            column: 2,
                            isVisible: () => page < manualPages.length - 1,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                if(page < manualPages.length - 1)
                                {
                                    ++page;
                                    menu.title = `Manual (${page + 1}/
                                    ${manualPages.length})`;
                                    pageTitle.text = manualPages[page].title;
                                    pageContents.text =
                                    manualPages[page].contents;
                                }
                            }
                        })
                    ]
                })
            ]
        })
    })
    return menu;
}

var createSequenceMenu = () =>
{
    let tmpLvls = [];
    for(let i = 0; i < renderer.levels.length; ++i)
    {
        tmpLvls.push(ui.createLatexLabel
        ({
            text: `Level ${i}: `,
            row: i,
            column: 0,
            verticalOptions: LayoutOptions.CENTER
        }));
        tmpLvls.push(ui.createEntry
        ({
            text: renderer.levels[i].slice(1, -1),
            row: i,
            column: 1
        }));
    }
    let seqGrid = ui.createGrid
    ({
        columnDefinitions: ['20*', '80*'],
        children: tmpLvls
    });

    let menu = ui.createPopup
    ({
        title: `Sequences Menu`,
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createScrollView
                ({
                    // heightRequest: ui.screenHeight * 0.3,
                    content: seqGrid
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createButton
                ({
                    text: 'Close',
                    onClicked: () =>
                    {
                        Sound.playClick();
                        menu.hide();
                    }
                })
            ]
        })
    });
    return menu;
}

var getInternalState = () =>
{
    let result = `${version} ${time} ${page} ${offlineDrawing ? 1 : 0} 
    ${altCurrencies ? 1 : 0} ${tickDelayMode ? 1 : 0}`;
    result += `\n${renderer.toString()}\n${renderer.system.toString()}`;
    for(let [key, value] of savedSystems)
    {
        result += `\n${key}\n${value}`;
    }
    return result;
}

var setInternalState = (stateStr) =>
{
    let values = stateStr.split('\n');

    let worldValues = values[0].split(' ');
    if(worldValues.length > 1)
        time = parseBigNumber(worldValues[1]);
    if(worldValues.length > 2)
        page = Number(worldValues[2]);
    // Offline Drawing
    if(worldValues.length > 4)
        altCurrencies = Boolean(Number(worldValues[4]));
    if(worldValues.length > 5)
        tickDelayMode = Boolean(Number(worldValues[5]));

    let systemValues = values[2].split(' ');
    let system = new LSystem(systemValues[0], systemValues.slice(3),
    Number(systemValues[1]), Number(systemValues[2]));

    let rendererValues = values[1].split(' ');
    if(rendererValues.length > 0)
        rendererValues[0] = Number(rendererValues[0]);
    if(rendererValues.length > 1)
        rendererValues[1] = Number(rendererValues[1]);
    if(rendererValues.length > 2)
        rendererValues[2] = Boolean(Number(rendererValues[2]));
    if(rendererValues.length > 3)
        rendererValues[3] = Number(rendererValues[3]);
    if(rendererValues.length > 4)
        rendererValues[4] = Number(rendererValues[4]);
    if(rendererValues.length > 5)
        rendererValues[5] = Number(rendererValues[5]);
    if(rendererValues.length > 6)
        rendererValues[6] = Number(rendererValues[6]);
    if(rendererValues.length > 7)
        rendererValues[7] = Number(rendererValues[7]);
    if(rendererValues.length > 8)
        rendererValues[8] = Boolean(Number(rendererValues[8]));
    if(rendererValues.length > 9)
        rendererValues[9] = Boolean(Number(rendererValues[9]));
    if(rendererValues.length > 10)
        rendererValues[10] = Boolean(Number(rendererValues[10]));

    renderer = new Renderer(system, ...rendererValues);
    
    for(let i = 3; i + 1 < values.length; i += 2)
        savedSystems.set(values[i], values[i + 1]);
}

var canResetStage = () => true;

var getResetStageMessage = () => 'You are about to reroll the system\'s seed.';

var resetStage = () => renderer.rerollSeed(globalSeed.nextInt());

var getTertiaryEquation = () =>
{
    if(altCurrencies)
        return renderer.getOriString();
    renderer.getStateString();
}

var get3DGraphPoint = () => renderer.getCursor();

var get3DGraphTranslation = () => renderer.getCamera();

init();
