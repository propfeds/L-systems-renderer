import { FreeCost } from '../api/Costs';
import { theory } from '../api/Theory';
import { Utils } from '../api/Utils';
import { Vector3 } from '../api/Vector3';
import { ui } from '../api/ui/UI';
import { Color } from '../api/ui/properties/Color';
import { LayoutOptions } from '../api/ui/properties/LayoutOptions';
import { TextAlignment } from '../api/ui/properties/TextAlignment';
import { Thickness } from '../api/ui/properties/Thickness';
import { TouchType } from '../api/ui/properties/TouchType';
import { Localization } from '../api/Localization';

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

If the X is the eyes of a laughing face, then the Y represents my waifu Ms. Y,
and the Z stands for Zombies.

(c) 2022 Temple of Pan (R) (TM) All rights reversed.
*/

var id = 'L_systems_renderer';
var getName = (language) =>
{
    let names =
    {
        en: 'L-systems Renderer',
    };

    if(language in names)
        return names[language];

    return names.en;
}
var getDescription = (language) =>
{
    let descs =
    {
        en:
`An educational tool that lets you model various fractal figures and plants.

Features:
- Can store a whole army of systems!
- Stochastic (randomised) and 3D systems
- Camera modes: static and cursor-focused (lerp)
- Speed and stroke options

Warning: As of v0.18, the renderer's configuration will be messed up due to ` +
`format changes to the internal state.`,
    };

    if(language in descs)
        return descs[language];

    return descs.en;
}
var authors =   'propfeds#5988\n\nThanks to:\nSir Gilles-Philippe Paillé, ' +
                'for providing help with quaternions';
var version = 0.19;

let time = 0;
let page = 0;
let offlineDrawing = false;
let gameIsOffline = false;
let altCurrencies = true;
let tickDelayMode = false;
let resetLvlOnConstruct = true;
let savedSystems = new Map();

const MAX_CHARS_PER_TICK = 10000;
const locStrings =
{
    en:
    {        
        equationOverlay: 'v0.19.1: Winter Sweep (WIP)',

        rendererLoading: '\\begin{{matrix}}Loading...&\\text{{Lv. {0}}}&({1}\\text{{ chars}})\\end{{matrix}}',

        currencyTime: ' (elapsed)',

        varLvDesc: '\\text{{Level: }}{0}{1}',
        varTdDesc: '\\text{{Tick delay: }}{0}\\text{{ sec}}',
        varTdDescInf: '\\text{{Tick delay: }}\\infty',
        varTsDesc: '\\text{{Tickspeed: }}{0}/\\text{{sec}}',

        saPatienceTitle: 'Watching Grass Grow',
        saPatienceDesc: 'Let the renderer draw a 10-minute long figure or ' +
        'playlist.',
        saPatienceHint: 'Be patient.',

        btnSave: 'Save',
        btnDefault: 'Reset to Defaults',
        btnAdd: 'Add',
        btnConstruct: 'Construct',
        btnDelete: 'Delete',
        btnView: 'View',
        btnClipboard: 'Clipboard',
        btnPrev: 'Previous',
        btnNext: 'Next',
        btnClose: 'Close',

        btnMenuLSystem: 'L-system menu',
        btnMenuRenderer: 'Renderer menu',
        btnMenuSave: 'Save/load',
        btnMenuTheory: 'Theory settings',
        btnMenuManual: 'Manual',

        menuLSystem: 'L-system Menu',
        labelAxiom: 'Axiom: ',
        labelAngle: 'Turning angle (°): ',
        labelRules: 'Production rules: ',
        labelIgnored: 'Ignored symbols: ',
        labelSeed: 'Seed (for stochastic systems): ',

        menuRenderer: 'Renderer Menu',
        labelInitScale: 'Initial scale: ',
        labelFigScale: 'Figure scale per level: ',
        labelCamMode: 'Camera mode: {0}',
        camModes: ['Static', 'Cursor-focused'],
        labelCamCentre: 'Centre (x, y, z): ',
        labelFollowFactor: 'Follow factor (0-1): ',
        labelLoopMode: 'Looping mode: {0}',
        loopModes: ['Off', 'Level', 'Playlist'],
        labelUpright: 'Upright x-axis: ',
        labelQuickdraw: 'Quickdraw straight lines: ',
        labelQuickBT: 'Quick backtrack: ',
        labelBTList: 'Backtrack list: ',

        menuSave: 'Save/Load Menu',
        currentSystem: 'Current system: ',
        savedSystems: 'Saved systems: ',

        menuClipboard: 'Clipboard Menu',

        menuNaming: 'Name System',
        defaultSystemName: 'Untitled L-system',
        duplicateSuffix: ' (copy)',

        menuTheory: 'Theory Settings',
        labelOfflineDrawing: 'Offline drawing: ',
        labelResetLvl: 'Reset level on construction: ',
        labelTerEq: 'Tertiary equation: {0}',
        terEqModes: ['Coordinates', 'Orientation'],

        menuManual: 'Manual ({0}/{1})',
        manual:
        [
            {
                title: 'The Main Screen',
                contents:
`The main screen consists of the renderer and its controls.

Level: the system's level. Pressing + or - will derive/revert the system ` +
`respectively. Pressing the Level button will reveal all levels of the system.
(Tip: holding + or - will buy/refund the variable in bulks of 10.)

Tickspeed: controls the renderer's drawing speed (up to 10 lines/sec, which ` +
`produces less accurate lines).
Pressing the Tickspeed button will toggle between Tickspeed and Tick delay ` +
`modes.
(Tip: holding - on Tickspeed will create an 'anchor' and pause the renderer. ` +
`Holding + afterwards will return the renderer to the previously 'anchored' ` +
`speed.)

Reroll: located on the top right. Pressing this button will reroll the ` +
`system's seed (for stochastic systems).`
            },
            {
                title: 'A Primer on L-systems',
                contents:
`Developed in 1968 by biologist Aristid Lindenmayer, an L-system is a formal ` +
`grammar that describes the growth of a sequence (string). It is often used ` +
`to model plants and draw fractal figures.

Terms:
Axiom: the starting sequence.
Rules: how each symbol in the sequence is derived per level. Each rule is ` +
`written in the form of: {symbol}={derivation(s)}

Symbols:
Any letter: moves cursor forward to draw.
+ -: rotates cursor on the z-axis (yaw), counter-/clockwise respectively.
& ^: rotates cursor on the y-axis (pitch).
\\ /: rotates cursor on the x-axis (roll).
|: reverses cursor direction.
[ ]: allows for branches by queueing cursor positions on a stack.
, : separates between derivations (for stochastic systems).`
            },
            {
                title: 'Tips on Constructing an L-system',
                contents:
`Although traditionally F is used to go forward, each letter can be used to ` +
`mean different things, such as drawing a flower, emulating growth stages, ` +
`alternating between patterns, etc.

For some simple systems, a symbol (often X) is used to resemble the ` +
`fractal's shape.

Brackets work in a stack mechanism, therefore every [ has to be properly ` +
`followed by a ] in the same production rule.

To create a stochastic system, simply list several derivations in the same ` +
`rule, separated by a , (comma). One of those derivations will be randomly ` +
`selected per symbol whenever the system is derived.
Generally, to keep a degree of uniformity in the system, it is advised for ` +
`the derivations to be similar in shape.`
            },
            {
                title: 'Configuring your L-system',
                contents:
`Configure the visual representation of your L-system with the renderer menu.

Initial scale: zooms out by this much for every figure.
Figure scale: zooms the figure out by a multiplier per level.

Camera mode: toggles between static and cursor-focused.
Centre: sets camera position for level 0 (this follows figure scale, and is ` +
`based on non-upright coordinates).
Camera follow factor: changes how quickly the camera chases the cursor.
(Note: figure scale and camera centre needs to be experimented manually for ` +
`each individual L-system.)

Looping mode: Level mode repeats a single level, while the Playlist mode ` +
`draws levels consecutively.
Upright x-axis: rotates figure by 90 degrees counter-clockwise around the ` +
`z-axis.

Quickdraw: skips over consecutive straight lines.
Quick backtrack: similarly, but on the way back.
Backtrack list: sets stopping symbols for quickdraw/backtrack.`
            },
            {
                title: 'Example: Arrow weed',
                contents:
`Meet the default system. It tastes like mint.

Axiom: X
F=FF
X=F[+X][-X]FX
Turning angle: 30°

Applies static camera:
Scale: 1, 2
Centre: (1, 0, 0)`
            },
            {
                title: 'Example: Dragon curve',
                contents:
`Also known as the Heighway dragon.

Axiom: FX
Y=-FX-Y
X=X+YF+
Turning angle: 90°

Applies static camera:
Scale: 4, sqrt(2)
Centre: (0, 0, 0)`
            },
            {
                title: 'Example: Stochastic weed',
                contents:
`It generates a random shape every time it rolls!

Axiom: X
F=FF
X=F-[[X]+X]+F[+FX]-X,
     F+[[X]-X]-F[-FX]+X
Turning angle: 22.5°

Applies static camera:
Scale: 1, 2
Centre: (1, 0, 0)
Upright`
            },
            {
                title: 'Example: Lucky flower',
                contents:
`How tall can it grow until it sprouts a flower? Reroll to find out!

Axiom: A
A=I[L]B,
     I[L]A,
     I[L][R]B,
     IF
B=I[R]A,
     I[R]B,
     I[L][R]A,
     IF
L=---I,
     --I,
     ----I
R=+++I,
     ++I,
     ++++I
F=[---[I+I]--I+I][+++[I-I]++I-I]I
Turning angle: 12°

Applies static camera:
Scale: 6, 1
Centre: (1, 0, 0)
Upright`
            },
            {
                title: 'Example: Blackboard tree (3D)',
                contents:
`A blackboard tree (Alstonia scholaris) when it's still tiny.

Axiom: F
F=Y[++++++MF][-----NF][^^^^^OF][&&&&&PF]
M=Z-M
N=Z+N
O=Z&O
P=Z^P
Y=Z-ZY+
Z=ZZ
Turning angle: 8°

Applies static camera:
Scale: 2, 2
Centre: (1.5, 0, 0)
Upright`
            },
            {
                title: 'Example: Hilbert curve (3D)',
                contents:
`If you set to high tickspeed, it look like brainz.

Axiom: X
X=^/XF^/XFX-F^\\\\XFX&F+\\\\XFX-F\\X-\\
Turning angle: 90°
Ignore: X

Applies static camera:
Scale: 1, 2
Centre: (0.5, -0.5, -0.5)`
            },
            {
                title: 'Example: Fern (3D)',
                contents:
`Source: https://observablehq.com/@kelleyvanevert/3d-l-systems

Axiom: FFFA
A=[++++++++++++++FC]B^+B[--------------FD]B+BA
C=[---------FF][+++++++++FF]B&&+C
D=[---------FF][+++++++++FF]B&&-D
Turning angle: 4°

Applies static camera: (mathematically unproven)
Scale: 3, 1.3
Centre: (0.6, 0, 0)
Upright`
            },
            {
                title: 'Example: Cultivar FF (Botched)',
                contents:
`Represents a common source of carbohydrates.

Axiom: X
F=FF
X=F-[[X]+X]+F[-X]-X
Turning angle: 15°

Applies static camera:
Scale: 1, 2
Centre: (1, 0, 0)
Upright`
            },
            {
                title: 'Example: Cultivar FXF (Botched)',
                contents:
`Commonly called the Cyclone, cultivar FXF resembles a coil of barbed wire. ` +
`Legends have it, once a snake moult has weathered enough, a new life is ` +
`born unto the tattered husk, and from there, it stretches.

Axiom: X
F=F[+F]XF
X=F-[[X]+X]+F[-FX]-X
Turning angle: 27°

Applies static camera: (mathematically unproven)
Scale: 1.5, 2
Centre: (0.15, -0.5, 0)`
            },
            {
                title: 'Example: Cultivar XEXF (Botched)',
                contents:
`Bearing the shape of a thistle, cultivar XEXF embodies the strength and ` +
`resilience of nature against the harsh logarithm drop-off. It also smells ` +
`really, really good.

Axiom: X
E=XEXF-
F=FX+[E]X
X=F-[X+[X[++E]F]]+F[X+FX]-X
Turning angle: 22.5°

Applies static camera: (mathematically unproven)
Scale: 1, 3
Centre: (0,75, -0,25, 0)
Upright`
            }
        ],

        menuSequence: 'Sequences Menu',
        labelLevelSeq: 'Level {0}: ',

        rerollSeed: 'You are about to reroll the system\'s seed.',
    }
};

let menuLang = Localization.language;
/**
 * Returns a localised string.
 * @param {string} name the internal name of the string.
 * @returns {string} the string.
 */

let getLoc = (name, lang = menuLang) =>
{
    if(lang in locStrings && name in locStrings[lang])
        return locStrings[lang][name];

    if(name in locStrings.en)
        return locStrings.en[name];
    
    return `String not found: ${lang}.${name}`;
}

/**
 * Returns a string of a fixed decimal number, with a fairly uniform width.
 * @returns {string} the string.
 */
let getCoordString = (x) => x.toFixed(x >= -0.01 ?
    (x <= 9.999 ? 3 : (x <= 99.99 ? 2 : 1)) :
    (x < -9.99 ? (x < -99.9 ? 0 : 1) : 2)
);

/**
 * Represents a linear congruential generator.
 */
class LCG
{
    /**
     * @constructor
     * @param {number} seed (default: 0) the starting seed for the generator.
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
     * @param {any[]} array the array.
     * @returns the element.
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
     * @static the initial x-axis quaternion used for rotations.
     */
    static xAxis = new Quaternion(0, 1, 0, 0);
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
         * @public
         */
        this.r = r;
        /**
         * @type {number} the imaginary i component.
         * @public
         */
        this.i = i;
        /**
         * @type {number} the imaginary j component.
         * @public
         */
        this.j = j;
        /**
         * @type {number} the imaginary k component.
         * @public
         */
        this.k = k;
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
     * @returns {Quaternion} the product.
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
     * Computes the negation of a quaternion. The negation also acts as the
     * inverse if the quaternion's norm is 1, which is the case with rotation
     * quaternions.
     * @returns {Quaternion} the negation.
     */
    neg()
    {
        return new Quaternion(this.r, -this.i, -this.j, -this.k);
    }
    /**
     * Returns a rotation vector from the quaternion.
     * @returns {Vector3} the rotation vector.
     */
    getRotVector()
    {
        let r = this.neg().mul(Quaternion.xAxis).mul(this);
        return new Vector3(r.i, r.j, r.k);
    }
    /**
     * Returns the quaternion's string representation.
     * @returns {string} the string.
     */
    toString()
    {
        return `${getCoordString(this.r)} + ${getCoordString(this.i)}i + ${getCoordString(this.j)}j + ${getCoordString(this.k)}k`;
    }
}

/**
 * Represents an L-system.
 */
class LSystem
{
    /**
     * @constructor
     * @param {string} axiom the starting sequence.
     * @param {string[]} rules the production rules.
     * @param {number} turnAngle (default: 30) the turning angle (in degrees).
     * @param {number} seed (default: 0) the seed (for stochastic systems).
     */
    constructor(axiom, rules, turnAngle = 30, seed = 0)
    {
        /**
         * @type {string} the starting sequence.
         * @public
         */
        this.axiom = axiom;
        /**
         * @type {string[]} the production rules.
         * @public
         */
        this.rules = new Map();
        /**
         * @type {string} a list of symbols ignored by the renderer.
         * @public
         */
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
        /**
         * @type {number} the turning angle (in degrees).
         * @public
         */
        this.turnAngle = turnAngle;
        /**
         * @type {number} half the turning angle (in radians).
         * @public
         */
        this.halfAngle = this.turnAngle * Math.PI / 360;
        let s = Math.sin(this.halfAngle);
        let c = Math.cos(this.halfAngle);
        /**
         * @type {Map<string, Quaternion>} a map of rotation quaternions for
         * quicker calculations.
         * @public but shouldn't be.
         */
        this.rotations = new Map();
        this.rotations.set('+', new Quaternion(c, 0, 0, -s));
        this.rotations.set('-', new Quaternion(c, 0, 0, s));
        this.rotations.set('&', new Quaternion(c, 0, -s, 0));
        this.rotations.set('^', new Quaternion(c, 0, s, 0));
        this.rotations.set('\\', new Quaternion(c, -s, 0, 0));
        this.rotations.set('/', new Quaternion(c, s, 0, 0));
        /**
         * @type {number} the seed (for stochastic systems).
         * @public
         */
        this.seed = seed;
        /**
         * @type {LCG} the LCG used for random number generation.
         * @public not sure, ask Itsuki.
         */
        this.random = new LCG(this.seed);
    }

    /**
     * Derive a sequence from the input string.
     * @param {string} state the input string.
     * @returns {string} the derivation.
     */
    derive(sequence, start = 0)
    {
        let result = '';
        for(let i = start; i < sequence.length; ++i)
        {
            if(result.length > MAX_CHARS_PER_TICK)
            {
                return {
                    next: i,
                    result: result
                };
            }
            if(this.rules.has(sequence[i]))
            {
                let rder = this.rules.get(sequence[i]);
                if(typeof rder === 'string')
                    result += rder;
                else
                    result += rder[this.random.nextRange(0, rder.length)];
            }
            else
                result += sequence[i];
        }
        return {
            next: 0,
            result: result
        };
    }
    /**
     * Sets the system's seed.
     * @param {number} seed the seed.
     */
    setSeed(seed)
    {
        this.seed = seed;
        this.random = new LCG(this.seed);
    }
    /**
     * Returns the system's string representation.
     * @returns {string} the string.
     */
    toString()
    {
        let result = `${this.axiom} ${this.turnAngle} ${this.seed} ${this.ignoreList}`;
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

/**
 * The renderer handles all logic for drawing the L-system.
 */
class Renderer
{
    /**
     * @constructor
     * @param {LSystem} system the L-system to be handled.
     * @param {number} initScale (default: 1; non-zero) the initial scale.
     * @param {number} figureScale (default: 2; non-zero) the per-level scale.
     * @param {boolean} cursorFocused (default: false) the camera mode.
     * @param {number} camX (default: 0) the camera's x-axis centre.
     * @param {number} camY (default: 0) the camera's y-axis centre.
     * @param {number} camZ (default: 0) the camera's z-axis centre.
     * @param {number} followFactor (default: 0.15; between 0 and 1) the
     * camera's cursor-following speed.
     * @param {number} loopMode (default: 0; between 0 and 2) the renderer's
     * looping mode.
     * @param {boolean} upright (default: false) whether to rotate the system
     * around the z-axis by 90 degrees.
     * @param {boolean} quickDraw (default: false) whether to skip through
     * straight lines on the way forward.
     * @param {boolean} quickBacktrack (default: false) whether to skip through
     * straight lines on the way backward.
     * @param {string} backtrackList (default: '+-&^\\/|[]') a list of symbols
     * to act as stoppers for backtracking.
     */
    constructor(system, initScale = 1, figureScale = 2, cursorFocused = false,
        camX = 0, camY = 0, camZ = 0, followFactor = 0.15, loopMode = 0,
        upright = false, quickDraw = false, quickBacktrack = false,
        backtrackList = '+-&^\\/|[]')
    {
        /**
         * @type {LSystem} the L-system being handled.
         * @public
         */
        this.system = system;
        /**
         * @type {number} the initial scale.
         * @public
         */
        this.initScale = initScale == 0 ? 1 : initScale;
        /**
         * @type {number} the per-level scale.
         * @public
         */
        this.figureScale = figureScale == 0 ? 1 : figureScale;
        /**
         * @type {boolean} the camera mode.
         * @public
         */
        this.cursorFocused = cursorFocused;
        /**
         * @type {Vector3} the camera's coordinates.
         * @public
         */
        this.camera = new Vector3(camX, camY, camZ);
        /**
         * @type {number} the follow factor.
         * @public
         */
        this.followFactor = Math.min(Math.max(followFactor, 0), 1);
        /**
         * @type {number} the looping mode.
         * @public
         */
        this.loopMode = Math.round(Math.min(Math.max(loopMode, 0), 2));
        /**
         * @type {boolean} the x-axis' orientation.
         * @public
         */
        this.upright = upright;
        /**
         * @type {boolean} whether to skip through straight lines on the way
         * forward.
         * @public
         */
        this.quickDraw = quickDraw;
        /**
         * @type {boolean} whether to skip through straight lines on the way
         * back.
         * @public
         */
        this.quickBacktrack = quickBacktrack;
        /**
         * @type {string} a list of symbols to act as stoppers for backtracking.
         * @public
         */
        this.backtrackList = backtrackList;
        /**
         * @type {Vector3} the cursor's position.
         * @public but shouldn't be.
         */
        this.state = new Vector3(0, 0, 0);
        /**
         * @type {Quaternion} the cursor's orientation.
         * @public stay away from me.
         */
        this.ori = new Quaternion();
        /**
         * @type {boolean} whether the cursor's orientation is reversed.
         * @public please leave this be.
         */
        this.reverse = false;
        /**
         * @type {string[]} stores the system's every level.
         * @public don't touch me.
         */
        this.levels = [];
        /**
         * @type {number} the current level (updates after buying the variable).
         * @public don't modify this please.
         */
        this.lvl = -1;
        /**
         * @type {number} the maximum level loaded.
         * @public don't mothify this either.
         */
        this.loaded = -1;
        /**
         * @type {number} the load target.
         * @public don't.
         */
        this.loadTarget = 0;
        /**
         * @type {[Vector3, Quaternion][]} stores cursor states for brackets.
         * @public no.
         */
        this.stack = [];
        /**
         * @type {number[]} stores the indices of the stack.
         * @public don't touch this.
         */
        this.idStack = [];
        /**
         * @type {number} the current index of the sequence.
         * @public don't know.
         */
        this.idx = 0;
        /**
         * @type {number} the elapsed time.
         * @public
         */
        this.elapsed = 0;
        /**
         * @type {Vector3} the last tick's camera position.
         * @public didn't tell you so.
         */
        this.lastCamera = new Vector3(0, 0, 0);
        /**
         * @type {number} the next index to update for the current level.
         * @public I told you so many times that you shouldn't access these.
         */
        this.nextDeriveIdx = 0;
        this.update(0);
    }

    /**
     * Updates the renderer's level.
     * @param {number} level the target level.
     * @param {boolean} seedChanged (default: false) whether the seed has
     * changed.
     */
    update(level, seedChanged = false)
    {
        let clearGraph = this.loopMode != 2 || level < this.lvl || seedChanged;

        if(this.lvl != level)
        {
            this.reset(clearGraph);
            this.lvl = level;
        } 

        this.loadTarget = Math.max(level, this.loadTarget);

        let charCount = 0;
        for(let i = this.loaded + 1; i <= this.loadTarget; ++i)
        {
            // Threshold to prevent maximum statements error
            if(charCount > MAX_CHARS_PER_TICK)
                return;

            if(i == 0)
            {
                this.levels[i] = `[${this.system.axiom}]`;
                charCount += this.levels[i].length;
                this.nextDeriveIdx = 0;
            }
            else
            {
                let ret = this.system.derive(this.levels[i - 1],
                    this.nextDeriveIdx);
                if(this.nextDeriveIdx == 0)
                    this.levels[i] = ret.result;
                else
                    this.levels[i] += ret.result;
                
                this.nextDeriveIdx = ret.next;
                charCount += ret.result;
            }
            if(this.nextDeriveIdx == 0)
                ++this.loaded;
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
        this.ori = new Quaternion();
        this.reverse = false;
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        if(clearGraph)
        {
            this.elapsed = 0;
            theory.clearGraph();
        }
        theory.invalidateTertiaryEquation();
    }
    /**
     * Configures every parameter of the renderer, except the system.
     * @param {number} initScale the initial scale.
     * @param {number} figureScale the per-level scale.
     * @param {boolean} cursorFocused the camera mode.
     * @param {number} camX the camera's x-axis centre.
     * @param {number} camY the camera's y-axis centre.
     * @param {number} camZ the camera's z-axis centre.
     * @param {number} followFactor the camera's cursor-following speed.
     * @param {number} loopMode the renderer's looping mode.
     * @param {boolean} upright whether to rotate the system around the z-axis
     * by 90 degrees.
     * @param {boolean} quickDraw whether to skip through straight lines on the
     * way forward.
     * @param {boolean} quickBacktrack whether to skip through straight lines
     * on the way backward.
     * @param {string} backtrackList a list of symbols to act as stoppers for
     * backtracking.
     */
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
    /**
     * Configures only the parameters related to the static camera mode.
     * @param {number} initScale the initial scale.
     * @param {number} figureScale the per-level scale.
     * @param {number} camX the camera's x-axis centre.
     * @param {number} camY the camera's y-axis centre.
     * @param {number} camZ the camera's z-axis centre.
     * @param {boolean} upright whether to rotate the system around the z-axis
     * by 90 degrees.
     */
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
    /**
     * Applies a new L-system to the renderer.
     * @param {LSystem} system the new system.
     */
    applySystem(system)
    {
        this.system = system;
        this.levels = [];
        this.nextDeriveIdx = 0;
        this.loaded = -1;
        this.loadTarget = 0;
        if(resetLvlOnConstruct)
            l.level = 0;
        this.update(l.level);
    }
    /**
     * Rerolls the seed of the current system, according to the global LCG.
     * @param {number} seed the seed.
     */
    rerollSeed(seed)
    {
        this.system.setSeed(seed);
        this.nextDeriveIdx = 0;
        this.loaded = -1;
        this.loadTarget = this.lvl;
        this.update(this.lvl, true);
    }
    /**
     * Moves the cursor forward.
     */
    forward()
    {
        if(this.reverse)
            this.state -= this.ori.getRotVector();
        else
            this.state += this.ori.getRotVector();
    }
    /**
     * Ticks the clock.
     */
    tick(dt)
    {
        if(this.lvl > this.loaded + 1)
            return;

        if(this.loopMode == 0 && this.idx >= this.levels[this.lvl].length)
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
        I can guarantee that because the game runs on one thread, the renderer
        would always load faster than it draws.
        */
        if(level > this.loaded)
            this.update(level);

        if(level > this.loaded + 1)
            return;

        if(onlyUpdate)
            return;

        if(this.elapsed == 0)
            return;

        if(this.idx >= this.levels[this.lvl].length)
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
                    if(this.stack.length == 0)
                        return;

                    let t = this.stack.pop();
                    this.state = t[0];
                    this.ori = t[1];
                    if(this.stack.length ==
                    this.idStack[this.idStack.length - 1])
                    {
                        this.idStack.pop();
                        this.idx = i + 1;
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
    /**
     * Returns the camera centre's coordinates.
     * @returns {Vector3} the coordinates.
     */
    getCentre()
    {
        if(this.cursorFocused)
            return -this.getCursor(this.lvl);
        if(this.upright)
            return new Vector3(this.camera.y, this.camera.x, -this.camera.z);
        return new Vector3(-this.camera.x, this.camera.y, -this.camera.z);
    }
    /**
     * Returns the cursor's coordinates.
     * @returns {Vector3} the coordinates.
     */
    getCursor()
    {
        let coords = this.state / (this.initScale * this.figureScale **
            this.lvl);
        if(this.upright)
            return new Vector3(-coords.y, -coords.x, coords.z);
        return new Vector3(coords.x, -coords.y, coords.z);
    }
    /**
     * Returns the camera's coordinates.
     * @returns {Vector3} the coordinates.
     */
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
    /**
     * Returns the cursor's orientation.
     * @returns {Quaternion} the orientation.
     */
    getAngles()
    {
        return this.ori;
    }
    /**
     * Returns the elapsed time.
     */
    getElapsedTime()
    {
        return [
            Math.floor(this.elapsed / 60),
            this.elapsed % 60
        ];
    }
    /**
     * Returns the current progress on this level.
     * @returns {number[]} the current progress in fractions.
     */
    getProgressFrac()
    {
        return [Math.max(Math.min(this.idx - 1,
        this.levels[this.lvl].length - 2), 0),
        (this.levels[this.lvl].length - 2)];
    }
    /**
     * Returns the current progress on this level.
     * @returns {number} (between 0 and 100) the current progress.
     */
    getProgressPercent()
    {
        if(typeof this.levels[this.lvl] == 'undefined')
            return 0;

        let pf = this.getProgressFrac();
        return pf[0] * 100 / pf[1];
    }
    /**
     * Returns the current progress as a string.
     * @returns {string} the string.
     */
    getProgressString()
    {
        let pf = this.getProgressFrac();
        return `i=${pf[0]}/${pf[1]}`;
    }
    /**
     * Returns a loading message.
     * @returns {string} the string.
     */
    getLoadingString()
    {
        return Localization.format(getLoc('rendererLoading'), this.loaded + 1,
        this.levels[this.loaded + 1].length);
    }
    /**
     * Returns the cursor's position as a string.
     * @returns {string} the string.
     */
    getStateString()
    {
        if(typeof this.levels[this.lvl] == 'undefined')
            return this.getLoadingString();

        return `\\begin{matrix}x=${getCoordString(this.state.x)},&y=${getCoordString(this.state.y)},&z=${getCoordString(this.state.z)},&${this.getProgressString()}\\end{matrix}`;
    }
    /**
     * Returns the cursor's orientation as a string.
     * @returns {string} the string.
     */
    getOriString()
    {
        if(typeof this.levels[this.lvl] == 'undefined')
            return this.getLoadingString();

        return `\\begin{matrix}q=${this.ori.toString()},&${this.getProgressString()}\\end{matrix}`;
    }
    /**
     * Returns the renderer's string representation.
     * @returns {string} the string.
     */
    toString()
    {
        return`${this.initScale} ${this.figureScale} ${this.cursorFocused ? 1 : 0} ${this.camera.x} ${this.camera.y} ${this.camera.z} ${this.followFactor} ${this.loopMode} ${this.upright ? 1 : 0} ${this.quickDraw ? 1 : 0} ${this.quickBacktrack ? 1 : 0} ${this.backtrackList}`;
    }
}

let arrow = new LSystem('X', ['F=FF', 'X=F[+X][-X]FX'], 30);
let renderer = new Renderer(arrow, 1, 2, false, 1);
let globalSeed = new LCG(Date.now());
let manualSystems =
[
    {},
    {},
    {},
    {},
    {
        system: arrow,
        config: [1, 2, 1, 0, 0, false]
    },
    {
        system: new LSystem('FX', ['Y=-FX-Y', 'X=X+YF+'], 90),
        config: [4, Math.sqrt(2), 0, 0, 0, false]
    },
    {
        system: new LSystem('X', [
            'F=FF',
            'X=F-[[X]+X]+F[+FX]-X,F+[[X]-X]-F[-FX]+X'
        ], 22.5),
        config: [1, 2, 1, 0, 0, true]
    },
    {
        system: new LSystem('A', [
            'A=I[L]B,I[L]A,I[L][R]B,IF',
            'B=I[R]A,I[R]B,I[L][R]A,IF',
            'L=---I,--I,----I',
            'R=+++I,++I,++++I',
            'F=[---[I+I]--I+I][+++[I-I]++I-I]I'
        ], 12),
        config: [6, 1, 1, 0, 0, true]
    },
    {
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
        system: new LSystem('X', [
            'X',
            'X=^/XF^/XFX-F^\\\\XFX&F+\\\\XFX-F\\X-\\'
        ], 90),
        config: [1, 2, 0.5, 0.5, 0.5, false]
    },
    {
        system: new LSystem('FFFA', [
            'A=[++++++++++++++FC]B^+B[--------------FD]B+BA',
            'C=[---------FF][+++++++++FF]B&&+C',
            'D=[---------FF][+++++++++FF]B&&-D'
        ], 4),
        config: [3, 1.3, 0.6, 0, 0, true]
    },
    {
        system: new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[-X]-X'], 15),
        config: [1, 2, 1, 0, 0, true]
    },
    {
        system: new LSystem('X', ['F=F[+F]XF', 'X=F-[[X]+X]+F[-FX]-X'], 27),
        config: [1.5, 2, 0.15, -0.5, 0, false]
    },
    {
        system: new LSystem('X', [
            'E=XEXF-',
            'F=FX+[E]X',
            'X=F-[X+[X[++E]F]]+F[X+FX]-X'
        ], 22.5),
        config: [1, 3, 0.75, -0.25, 0, true]
    }
];
var l, ts;

var init = () =>
{
    min = theory.createCurrency(getLoc('currencyTime'));
    progress = theory.createCurrency('%');

    // l (Level)
    {
        let getDesc = (level) => Localization.format(getLoc('varLvDesc'),
        level.toString(), renderer.loopMode == 2 ? '+' : '');
        let getInfo = (level) => `\\text{Lv. }${level.toString()}`;
        l = theory.createUpgrade(0, progress, new FreeCost);
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
            {
                if(level == 0)
                    return getLoc('varTdDescInf');
                return Localization.format(getLoc('varTdDesc'),
                (level / 10).toString());
            }
            return Localization.format(getLoc('varTsDesc'), level.toString());
        }
        let getInfo = (level) => `\\text{Ts=}${level.toString()}/s`;
        ts = theory.createUpgrade(1, progress, new FreeCost);
        ts.getDescription = (_) => Utils.getMath(getDesc(ts.level));
        ts.getInfo = (amount) => Utils.getMathTo(getInfo(ts.level),
        getInfo(ts.level + amount));
        ts.maxLevel = 10;
        ts.canBeRefunded = (_) => true;
        ts.boughtOrRefunded = (_) => time = 0;
    }

    theory.createSecretAchievement(0, null,
        getLoc('saPatienceTitle'),
        getLoc('saPatienceDesc'),
        getLoc('saPatienceHint'),
        () => min.value > 9.6
    );
}

var alwaysShowRefundButtons = () => true;

let timeCheck = (elapsedTime) =>
{
    if(ts.level == 0)
        return false;

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
            renderer.draw(l.level);

        if(tickDelayMode)
            time = 0;
        else
            time -= 1 / ts.level;
    }
    else
    {
        // Updates have to be at full speed
        renderer.draw(l.level, true);
    }

    if(ts.level > 0 && (!gameIsOffline || offlineDrawing))
        renderer.tick(elapsedTime);
    let msTime = renderer.getElapsedTime();
    min.value = msTime[0] + msTime[1] / 100;
    progress.value = renderer.getProgressPercent();
    theory.invalidateTertiaryEquation();
}

var getEquationOverlay = () =>
{
    let result = ui.createLatexLabel
    ({
        text: getLoc('equationOverlay'),
        displacementX: 5,
        displacementY: 4,
        fontSize: 9,
        textColor: Color.TEXT_MEDIUM
    });
    return result;
}

let createVariableButton = (variable, height) =>
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

let createMinusButton = (variable, height, symbol = '-', quickbuyAmount = 10,
useAnchor = false, anchor = null) =>
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
            text: symbol,
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
                if(useAnchor && !anchor.active)
                    anchor.value = variable.level;
            }
            else if(e.type == TouchType.LONGPRESS)
            {
                if(useAnchor)
                    anchor.value = variable.level;
                frame.borderColor = bc;
                Sound.playClick();
                variable.refund(quickbuyAmount);
                if(useAnchor)
                    anchor.active = true;
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

let createPlusButton = (variable, height, symbol = '+', quickbuyAmount = 10,
useAnchor = false, anchor = null) =>
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
            text: symbol,
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
                if(useAnchor && !anchor.active)
                    anchor.value = variable.level;
            }
            else if(e.type == TouchType.LONGPRESS)
            {
                frame.borderColor = bc;
                Sound.playClick();

                let q = quickbuyAmount;
                if(useAnchor && anchor.active)
                {
                    q = Math.min(q, anchor.value - variable.level);
                    if(q == 0)
                        q = quickbuyAmount;
                }
                for(let i = 0; i < q; ++i)
                    variable.buy(1);

                if(useAnchor)
                {
                    if(!anchor.active)
                        anchor.value = variable.level;
                    else
                        anchor.active = false;
                }
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

let createMenuButton = (menuFunc, name, height) =>
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
let createClickableVariableButton = (variable, callback, height) =>
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

    let sysButton = createMenuButton(createSystemMenu, getLoc('btnMenuLSystem'),
    height);
    sysButton.row = 0;
    sysButton.column = 0;
    let cfgButton = createMenuButton(createConfigMenu,
    getLoc('btnMenuRenderer'),
    height);
    cfgButton.row = 0;
    cfgButton.column = 1;
    let slButton = createMenuButton(createSaveMenu, getLoc('btnMenuSave'),
    height);
    slButton.row = 1;
    slButton.column = 0;
    let theoryButton = createMenuButton(createWorldMenu,
    getLoc('btnMenuTheory'),
    height);
    theoryButton.row = 1;
    theoryButton.column = 1;
    let manualButton = createMenuButton(createManualMenu,
    getLoc('btnMenuManual'), height);
    manualButton.row = 2;
    manualButton.column = 0;

    let lastTsLevel =
    {
        value: ts.level,
        active: false
    };

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
                                createMinusButton(l, height, '–'),
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
                                createMinusButton(ts, height, '–', 10, true,
                                lastTsLevel),
                                createPlusButton(ts, height, '+', 10, true,
                                lastTsLevel)
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
                    rowDefinitions: [height, height, height],
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        sysButton,
                        cfgButton,
                        slButton,
                        theoryButton,
                        manualButton
                    ]
                })
            ]
        })
    });
    return stack;
}

let createConfigMenu = () =>
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
        }
    });
    let tmpCFC = renderer.cursorFocused;
    let CFCLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelCamMode'),
        getLoc('camModes')[Number(tmpCFC)]),
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
                CFCLabel.text = Localization.format(getLoc('labelCamMode'),
                getLoc('camModes')[Number(tmpCFC)]);
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
                text: getLoc('labelCamCentre'),
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
        text: getLoc('labelFollowFactor'),
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
        }
    });
    let tmpLM = renderer.loopMode;
    let LMLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelLoopMode'),
        getLoc('loopModes')[tmpLM]),
        row: 0,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });
    let LMSlider = ui.createSlider
    ({
        row: 0,
        column: 1,
        minimum: 0,
        maximum: 2,
        value: tmpLM,
        // minimumTrackColor: Color.MINIGAME_TILE_BORDER,
        // maximumTrackColor: Color.BORDER,
        // thumbImageSource: ImageSource.UPGRADES,
        onValueChanged: () =>
        {
            tmpLM = Math.round(LMSlider.value);
            LMLabel.text = Localization.format(getLoc('labelLoopMode'),
            getLoc('loopModes')[tmpLM]);
        },
        onDragCompleted: () =>
        {
            Sound.playClick();
            LMSlider.value = tmpLM;
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
        text: getLoc('labelBTList'),
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
        title: getLoc('menuRenderer'),
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
                                        text: getLoc('labelInitScale'),
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    iScaleEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelFigScale'),
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
                                    LMLabel,
                                    LMSlider,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelUpright'),
                                        row: 1,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    uprightSwitch,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelQuickdraw'),
                                        row: 2,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    QDSwitch,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelQuickBT'),
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
                            text: getLoc('btnSave'),
                            row: 0,
                            column: 0,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                renderer.configure(tmpIScale, tmpFScale,
                                    tmpCFC, tmpCX, tmpCY, tmpCZ, tmpFF, tmpLM,
                                    tmpUpright, tmpQD, tmpQB, tmpEXB);
                                menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnDefault'),
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

let createSystemMenu = () =>
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
        text: getLoc('btnAdd'),
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
        title: getLoc('menuLSystem'),
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
                                        text: getLoc('labelAxiom'),
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    axiomEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelAngle'),
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
                                        text: getLoc('labelRules'),
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
                                        text: getLoc('labelIgnored'),
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    ignoreEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelSeed'),
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
                    text: getLoc('btnConstruct'),
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

let createNamingMenu = (title, values) =>
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
        title: getLoc('menuNaming'),
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
                    text: getLoc('btnSave'),
                    onClicked: () =>
                    {
                        Sound.playClick();
                        while(savedSystems.has(tmpName))
                            tmpName += getLoc('duplicateSuffix');
                        savedSystems.set(tmpName, values);
                        menu.hide();
                    }
                })
            ]
        })
    });
    return menu;
}

let createClipboardMenu = (values) =>
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
        title: getLoc('menuClipboard'),
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
                    text: getLoc('btnConstruct'),
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

let createViewMenu = (title) =>
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
                                        text: getLoc('labelAxiom'),
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
                                        text: getLoc('labelAngle'),
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
                                text: getLoc('labelRules'),
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
                                        text: getLoc('labelIgnored'),
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
                                        text: getLoc('labelSeed'),
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
                            text: getLoc('btnConstruct'),
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
                            text: getLoc('btnDelete'),
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

let createSaveMenu = () =>
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
            text: getLoc('btnView'),
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
        title: getLoc('menuSave'),
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
                            text: getLoc('currentSystem'),
                            row: 0,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnClipboard'),
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
                            text: getLoc('btnSave'),
                            row: 0,
                            column: 2,
                            // heightRequest: 40,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                let namingMenu = createNamingMenu(
                                    getLoc('defaultSystemName'),
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
                    text: getLoc('savedSystems'),
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

let createManualMenu = () =>
{
    let manualPages = getLoc('manual');

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
        title: Localization.format(getLoc('menuManual'), page + 1,
        getLoc('manual').length),
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
                            text: getLoc('btnPrev'),
                            row: 0,
                            column: 0,
                            isVisible: () => page > 0,
                            onClicked: () =>
                            {
                                if(page > 0)
                                {
                                    Sound.playClick();
                                    --page;
                                    menu.title = Localization.format(
                                        getLoc('menuManual'), page + 1,
                                        getLoc('manual').length
                                    );
                                    pageTitle.text = manualPages[page].title;
                                    pageContents.text =
                                    manualPages[page].contents;
                                }
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnConstruct'),
                            row: 0,
                            column: 1,
                            isVisible: () => 'system' in manualSystems[page],
                            onClicked: () =>
                            {
                                Sound.playClick();
                                renderer.applySystem(
                                manualSystems[page].system);
                                if('config' in manualSystems[page])
                                {
                                    let a = manualSystems[page].config;
                                    renderer.configureStaticCamera(...a);
                                }
                                menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnNext'),
                            row: 0,
                            column: 2,
                            isVisible: () => page < manualPages.length - 1,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                if(page < manualPages.length - 1)
                                {
                                    ++page;
                                    menu.title = Localization.format(
                                        getLoc('menuManual'), page + 1,
                                        getLoc('manual').length
                                    );
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

let createSequenceMenu = () =>
{
    let tmpLvls = [];
    for(let i = 0; i < renderer.levels.length; ++i)
    {
        tmpLvls.push(ui.createLatexLabel
        ({
            text: Localization.format(getLoc('labelLevelSeq'), i),
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
        title: getLoc('menuSequence'),
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
                    text: getLoc('btnClose'),
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

let createWorldMenu = () =>
{
    let tmpOD = offlineDrawing;
    let ODSwitch = ui.createSwitch
    ({
        isToggled: tmpOD,
        row: 0,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpOD = !tmpOD;
                ODSwitch.isToggled = tmpOD;
            }
        }
    });
    let tmpRL = resetLvlOnConstruct;
    let RLSwitch = ui.createSwitch
    ({
        isToggled: tmpRL,
        row: 1,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpRL = !tmpRL;
                RLSwitch.isToggled = tmpRL;
            }
        }
    });
    let tmpAC = altCurrencies;
    let ACLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelTerEq'),
        getLoc('terEqModes')[Number(tmpAC)]),
        row: 2,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });
    let ACSwitch = ui.createSwitch
    ({
        isToggled: tmpAC,
        row: 2,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpAC = !tmpAC;
                ACSwitch.isToggled = tmpAC;
                ACLabel.text = Localization.format(getLoc('labelTerEq'),
                getLoc('terEqModes')[Number(tmpAC)]);
            }
        }
    });

    let menu = ui.createPopup
    ({
        title: getLoc('menuTheory'),
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    columnDefinitions: ['70*', '30*'],
                    rowDefinitions: [40, 40, 40],
                    children:
                    [
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelOfflineDrawing'),
                            row: 0,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ODSwitch,
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelResetLvl'),
                            row: 1,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        RLSwitch,
                        ACLabel,
                        ACSwitch
                    ]
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createButton
                ({
                    text: getLoc('btnSave'),
                    onClicked: () =>
                    {
                        Sound.playClick();
                        offlineDrawing = tmpOD;
                        resetLvlOnConstruct = tmpRL;
                        altCurrencies = tmpAC;
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
    let result = `${version} ${time} ${page} ${offlineDrawing ? 1 : 0} ${altCurrencies ? 1 : 0} ${tickDelayMode ? 1 : 0} ${resetLvlOnConstruct ? 1 : 0}`;
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
    if(worldValues.length > 3)
        offlineDrawing = Boolean(Number(worldValues[3]));
    if(worldValues.length > 4)
        altCurrencies = Boolean(Number(worldValues[4]));
    if(worldValues.length > 5)
        tickDelayMode = Boolean(Number(worldValues[5]));
    if(worldValues.length > 6)
        resetLvlOnConstruct = Boolean(Number(worldValues[6]));

    if(values.length > 1)
    {
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

        if(values.length > 2)
        {
            let systemValues = values[2].split(' ');
            let system = new LSystem(systemValues[0], systemValues.slice(3),
            Number(systemValues[1]), Number(systemValues[2]));
            renderer = new Renderer(system, ...rendererValues);
        }
        else
            renderer = new Renderer(arrow, ...rendererValues);
    }
    
    for(let i = 3; i + 1 < values.length; i += 2)
        savedSystems.set(values[i], values[i + 1]);
}

var canResetStage = () => true;

var getResetStageMessage = () => getLoc('rerollSeed');

var resetStage = () => renderer.rerollSeed(globalSeed.nextInt());

var getTertiaryEquation = () =>
{
    if(altCurrencies)
        return renderer.getOriString();

    return renderer.getStateString();
}

var get3DGraphPoint = () => renderer.getCursor();

var get3DGraphTranslation = () => renderer.getCamera();

init();
