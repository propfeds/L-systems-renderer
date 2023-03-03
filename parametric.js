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
`An educational tool that allows you to model plants and fractal figures.

Supported L-system features:
- Parametric, context-sensitive (2L) systems
- Stochastic (randomised) rules
- 3D turtle controls
- Polygon modelling

Other features:
- Can save a whole army of systems!
- Camera modes: static and turtle-following
- Drawing speed and advanced stroke options!

Note: Systems from LSR can be ported to P-LSR with minimal changes. However,` +
`the opposite is rarely true.`,
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
let normaliseQuaternions = false;
let maxCharsPerTick = 250;
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
const LS_RULE = /([^:]+)(:(.+))?=(.*)/;
// Context doesn't need to check for nested brackets!
const LS_CONTEXT =
/((.)(\(([^\)]+)\))?<)?((.)(\(([^\)]+)\))?)(>(.)(\(([^\)]+)\))?)?/;
const BACKTRACK_LIST = new Set('+-&^\\/|[$T');

const locStrings =
{
    en:
    {
        versionName: 'v1.0, Mistletoe ed.',
        welcomeSystemName: 'Arrow',
        welcomeSystemDesc: 'Welcome to L-systems Renderer!',
        equationOverlayLong: '{0} – {1}\n\n{2}\n\n{3}',
        equationOverlay: '{0}\n\n{1}',

        rendererBuildingTree: `\\begin{{matrix}}Building\\enspace ancestree...&
        \\text{{Stg. {0}}}&({1}\\text{{ chars}})\\end{{matrix}}`,
        rendererDeriving: `\\begin{{matrix}}Deriving...&\\text{{Stg. {0}}}&({1}
\\text{{ chars}})\\end{{matrix}}`,

        currencyTime: ' (elapsed)',

        varLvDesc: '\\text{{Stage: }}{0}{1}',
        varTdDesc: '\\text{{Tick length: }}{0}\\text{{ sec}}',
        varTdDescInf: '\\text{{Tick length: }}\\infty',
        varTsDesc: '\\text{{Tickspeed: }}{0}/\\text{{sec}}',
        upgResumeInfo: 'Resumes the last rendered system',

        saPatienceTitle: 'You\'re watching grass grow.',
        saPatienceDesc: 'Let the renderer draw a 10-minute long figure or ' +
        'playlist.',
        saPatienceHint: 'Be patient.',

        btnSave: 'Save',
        btnClear: 'Clear All',
        btnDefault: '* Reset to Defaults',
        btnVar: 'Variables',
        btnAdd: 'Add',
        btnUp: '▲',
        btnDown: '▼',
        btnReroll: 'Reroll',
        btnConstruct: 'Construct',
        btnDelete: 'Delete',
        btnView: 'View',
        btnClipboard: 'Clipboard',
        btnOverwrite: 'Overwrite',
        btnSaveCopy: 'Save as Copy',
        btnSelect: 'Select',
        btnSelected: '(Selected)',
        btnPrev: 'Previous',
        btnNext: 'Next',
        btnClose: 'Close',
        btnImport: 'Import',
        btnContents: 'Table of\nContents',
        btnPage: '{0}',

        btnMenuLSystem: 'L-system menu',
        btnMenuRenderer: 'Renderer menu',
        btnMenuSave: 'Save/load',
        btnMenuTheory: 'Settings',
        btnMenuManual: 'User guide',
        btnResume: 'Resume – {0}',
        btnStartMeasure: 'Measure performance',
        btnEndMeasure: 'Stop measuring',

        measurement: '{0}: max {1}ms, avg {2}ms over {3} ticks',

        rerollSeed: 'You are about to reroll the system\'s seed.',
        resetRenderer: 'You are about to reset the renderer.',

        menuSequence: '{0} (Stage {1})',
        labelLevelSeq: 'Stage {0}: {1} chars',
        labelLevelSeqLoading: 'Stage {0}: {1}/{2} chars',
        labelChars: '({0} chars)',

        menuLSystem: 'L-system Menu',
        labelAxiom: 'Axiom: ',
        labelAngle: 'Turning angle (°): ',
        labelRules: 'Production rules: {0}',
        labelIgnored: 'Turtle-ignored: ',
        labelCtxIgnored: 'Context-ignored: ',
        labelTropism: 'Tropism (gravity): ',
        labelSeed: 'Seed (≠ 0): ',
        menuVariables: 'Define Variables',
        labelVars: 'Variables: {0}',

        menuRenderer: 'Renderer Menu',
        labelInitScale: '* Initial scale: ',
        labelFigScale: '* Figure scale: ',
        labelCamMode: 'Camera mode: {0}',
        camModes: ['Fixed', 'Linear', 'Quadratic'],
        labelCamCentre: 'Fixed camera centre (x,): ',
        labelCamOffset: '... centre (y, z): ',
        labelFollowFactor: 'Follow factor (0-1): ',
        labelLoopMode: 'Looping mode: {0}',
        loopModes: ['Off', 'Stage', 'Playlist'],
        labelUpright: '* Upright figure: ',
        labelBTTail: 'Draw tail end: ',
        labelLoadModels: '* Load models: ',
        labelQuickdraw: '* Quickdraw: ',
        labelQuickBT: '* Quick backtrack: ',
        labelHesitate: '* Stutter on backtrack: ',
        labelHesitateApex: '* Stutter at apex: ',
        labelHesitateFork: '* Stutter at fork: ',
        labelOldTropism: '* Alternate tropism method: ',
        labelBTList: '* Backtrack list: ',
        labelRequireReset: '* Modifying this setting will require a reset.',

        menuSave: 'Save/Load Menu',
        labelCurrentSystem: 'Current system: ',
        labelSavedSystems: 'Saved systems: {0}',
        labelApplyCamera: 'Applies static camera: ',

        menuClipboard: 'Clipboard Menu',
        labelTotalLength: 'Total length: {0}',
        labelEntryCharLimit: `Warning: This entry has been capped at {0} ` +
        `characters. Proceed with caution.`,

        menuNaming: 'Save System',
        labelName: 'Title: ',
        defaultSystemName: 'Untitled L-system',
        labelDesc: 'Description: ',
        noDescription: 'No description.',
        duplicateSuffix: ' (copy)',

        menuTheory: 'Theory Settings',
        labelOfflineReset: 'Reset graph on tabbing in: ',
        labelResetLvl: 'Reset to stage 0 on construction: ',
        labelTerEq: 'Tertiary equation: {0}',
        terEqModes: ['Coordinates', 'Orientation'],
        labelMeasure: 'Measure performance: ',
        debugCamPath: 'Debug camera path: ',
        labelMaxCharsPerTick: 'Maximum loaded chars/tick: ',
        labelInternalState: 'Internal state: ',

        menuManual: 'User Guide ({0}/{1})',
        menuTOC: 'Table of Contents',
        labelSource: 'Source: ',
        manualSystemDesc: 'From the user guide, page {0}.',
        manual:
        [
            {
                title: 'Introduction',
                contents:
`Welcome to the Parametric L-systems Renderer! This guide aims to help you ` +
`understand parametric L-systems in detail, as well as instructions on how ` +
`to effectively use this theory to construct and render them. Before using ` +
`the theory however, it is recommended to try out the Classic version first.

Without further a due, let's start discovering the wonders of L-systems.

Notice: A gallery for regular L-systems has opened! Visit that theory instead.`
            },
            {
                title: 'Differences between LSR versions',
                contents:
`First of all, the terminology for Level has been changed to Stage.
That was the only major change.

Anyway. In Parametric, as multiple rules can exist for one symbol, they are ` +
`checked from top to bottom when deriving, regardless of context or condition.
This is different from how it was defined in The Algorithmic Beauty of ` +
`Plants, where rules with a context are prioritised. Therefore, arrange your ` +
`rules accordingly.

The syntax for multiple derivations on the same line has also changed from , ` +
`(comma) to ; (semi-colon), due to the introduction of parameters.

Finally, declaring models now has a different syntax to align more with ` +
`context-sensitivity:
~ > {symbol} = {model}
Referencing a model in another rule still uses the old syntax:
~{symbol}`
            },
            {
                title: 'Context-sensitivity',
                contents:
`One of the main weaknesses in the original L-system syntax comes from the ` +
`fact that each symbol has no way of interacting with other symbols. This ` +
`makes it unfit for applications of cellular automata or modelling forms of ` +
`communication between a plant's organs.

Context-sensitive L-systems allow this to work, by letting a symbol see both ` +
`its ancestor (the symbol to its immediate left), and its child to the right ` +
`(children, if it opens up multiple branches). A context-sensitive rule goes ` +
`as follows:
{left} < {symbol} > {right} = {derivation}
The symbol will only derive according to this rule if its ancestor bears the ` +
`same symbol as {left}, and one of its children bears the same symbol as ` +
`{right}.

Note: P-LSR uses a context-sensitive variant called 2L-systems, where the 2 ` +
`means that a context is determined by two symbols: an ancestor and a child. ` +
`Another variant, 1L-systems, only determines a context in one direction.

Note 2: The list of context-ignored symbols can be configured in the ` + 
`L-system menu. These symbols will be left out of the ancestree computation.`
            },
            {
                title: 'Example: Signal propagation',
                contents:
`A simple signal sent by the concurrent youth. The signal, denoted by the ` +
`letter B, starts from the 🅱ase of the tree and travels to the to🅿️.

Axiom: B[+AAA]A[-AA]A[+A]A
B<A = B
B = A
Context-ignored: +-
Turning angle: 30°

Applies static camera:
Scale: 4
Centre: (0, 2, 0)
Upright`
            },
            {
                title: 'Example: Cellular botanica',
                contents:
`A cellular automaton that has been transformed into a tree. Originally ` +
`studied in 1974 by Hogeweg and Hesper, this is one of the 3584 patterns ` +
`generated in the study using symbols 0 and 1.

Axiom: F1F1F1
0<0>0 = 0
0<0>1 = 1[-F1F1]
0<1>0 = 1
0<1>1 = 1
1<0>0 = 0
1<0>1 = 1F1
1<1>0 = 1
1<1>1 = 0
+ = -
- = +
Turtle-ignored: 01
Context-ignored: F+-
Turning angle: 22.5°

Applies static camera:
Scale: lv+2
Centre: (0, lv/2+1, 0)
Upright`
            },
            {
                title: 'Parametric L-systems: A primer',
                contents:
`With many of the systems we have encountered until now, we know that their ` +
`size can grow quickly, even exponentially. One segment of a tree branch ` +
`could be sixteen Fs long, and its trunk 128 metres. As a result, the ` +
`L-system very quickly loses its readability. Another consequence, is that ` +
`we may not express any length precisely using only integers.
Then, a solution to that would be the ability to embed extra information ` +
`onto each symbol, perhaps to lengthen a segment to the desired ratio, or ` +
`turn around by a specific angle. And thus, Lindenmayer proposed the idea of ` +
`parametric L-systems.

F(d): moves turtle forward by a distance d, and draw a line.
(Note: other letters move by 1 instead of taking the parameter.)
+-&^\\/(a): rotate turtle by an angle of a degrees.
T(g): applies a tropism force of g.
T(g, x, y, z): applies a tropism of g in the direction (x, y, z).`
            },
            {
                title: 'Example: The Koch curve',
                contents:
`The Koch curve belongs to a family of self-similar fractals generated by ` +
`the iterated function systems (IFS) method. An IFS can construct a fractal ` +
`by recursively applying affine transformations (translation, rotation, ` +
`scaling) to an initial figure... an axiom! Many IFSs can be reconstructed ` +
`using parametric L-systems, as long as only lines are involved.

Axiom: F(1)
F(d) = F(d/3)+F(d/3)-(120)F(d/3)+F(d/3)
Turning angle: 60°

Applies static camera:
Scale: 1/2
Centre: (1/2, sqrt(3)/12, 0)`
            },
            {
                title: 'Parametric 2L-systems',
                contents:
`Beyond geometric applications, parametric L-systems allow individual ` +
`symbols to hold additional information such as its state of growth, elapsed ` +
`time, etc. They can be even peeked at in context rules!
The syntax for a parametric rule goes as follows:
{symbol}({param_0},...) : {condition*} = {derivation_0} : {probability**} ;...

Examples:
I(t) : t>0 = FI(t-1)
A(t) : t>5 = B(t+1)CD(t^0.5, t-2)
Example including context:
A(x) < B(y) > C(z) : x+y+z>10 = E((x+y)/2)F((y+z)/2)

Note: All arithmetic processing in parameters is done using the game's ` +
`MathExpression class (just like the formulae for Auto-prestige/supremacy). ` +
`As such, there are several unavailable expressions:
% (modulus)
== (equality)
true, false (keywords)
a ? b : c (conditional ternary)
Conversion from boolean to number is also unavailable.

* When omitted, the condition is assumed to be always true.
** When omitted, the chance is assumed to be 100%.`
            },
            {
                title: 'Example: Stamp stick',
                contents:
`Adopted from an L-system made in Houdini. The symbol J represents 4 organs ` +
`at the same time, with the 'type' parameter controlling which model to load:
type <= 0: leaves,
type <= 1: flower bud,
type <= 2: blooming flower,
type <= 3: closed flower,
and the 's' parameter controlling the model's size.

Variables: b = 2.25
The variable b controls how quickly the model type switches

Axiom: FA(1)
A(t) = F(b/2.5)//[+(24)&B(t)]//[&B(t)]//[&B(t)]A(t+1)
B(t) = ~J(0.15, t/b-2)
J(s, type) = ~J(s*0.75+0.25, type)
~>J(s, type): type<=0 = {[+(32)F(s).-TF(s)TF.-TF(s)..][-(32)F(s)+(16)[TF(s)TF.].]}
~>J(s, type): type<=1 = [F~p(s)/(60)~p(s)/(60)~p(s)]
~>p(s) = {[+F(s/2).--F(s/2).][-F(s/2).].}
~>J(s, type): type<=2 = [F~k(s)/(72)~k(s)/(72)~k(s)/(72)~k(s)/(72)~k(s)]
~>k(s) = {[F(s).+(72)[&F(s-0.3).][F(s)..][^F(s-0.3).].]}
~>J(s, type): type<=3 = [F~m(s)/(72)~m(s)/(72)~m(s)/(72)~m(s)/(72)~m(s)]
~>m(s) = {[+(24)F(s).-F(s/2)..].}
Turning angle: 48°
Tropism: 0.16

Applies static camera:
Scale: 7
Centre: (0, lv/2+1, 0)
Upright`
            },
            {
                title: 'Appendix: Model discussions',
                contents:
`About the differences between LSR models (which disappear after one stage) ` +
`and The Algorithmic Beauty of Plants (which stick around).
The motive behind this mechanism in LSR, is that when a symbol moves to ` +
`another place, the original ~ (tilde) ends up referencing another symbol ` +
`entirely, which both wastes one space and can introduce errors by drawing ` +
`the wrong model.
This design choice is not final, and if feedback can prove its ` +
`inconvenience, further considerations can be made: should it stick around ` +
`like defined in Abop? Should references be ditched entirely and models be ` +
`drawn automatically without having to reference? Will the syntax cease to ` +
`make sense?`
            },
            {
                title: 'Appendix: Credits',
                contents:
`First of all, a biggest thanks goes out to Sir Gilles-Philippe Paillé of ` +
`Conic Games. Without his work on the game Exponential Idle, the foundation ` +
`for this theory, perhaps I would have never found myself writing this page ` +
`today. He, along with the people in the #custom-theories-dev channel, has ` +
`also helped me with numerous problems of custom theories (CT) development.
If by any chance you have not yet tried this game, I highly recommend it. ` +
`The download link is provided at the bottom of this page.`,
                source: 'https://conicgames.github.io/exponentialidle'
            },
            {
                title: 'Credits (2)',
                contents:
`The other massive thanks goes to Algorithmic Botany, the research team that ` +
`has been expanding Lindenmayer's work on L-systems. The site also hosts the ` +
`book 'The Algorithmic Beauty of Plants', which has been the primary source ` +
`of reference in the development of LSR, including the various syntax and ` +
`processing rules, as well as explanations to the scientific motives behind ` +
`the design of L-systems. `
            }
        ]
    }
};

/**
 * Returns a localised string.
 * @param {string} name the string's internal name.
 * @returns {string}
 */
let getLoc = (name, lang = menuLang) =>
{
    if(lang in locStrings && name in locStrings[lang])
        return locStrings[lang][name];

    if(name in locStrings.en)
        return locStrings.en[name];
    
    return `String missing: ${lang}.${name}`;
}

/**
 * Returns a string of a fixed decimal number, with a fairly uniform width.
 * @param {number} x the number.
 * @returns {string}
 */
let getCoordString = (x) => x.toFixed(x >= -0.01 ?
    (x <= 9.999 ? 3 : (x <= 99.99 ? 2 : 1)) :
    (x < -9.99 ? (x < -99.9 ? 0 : 1) : 2)
);

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

        let result = new Quaternion(t0, t1, t2, t3);
        if(normaliseQuaternions)
            return result.normalise;
        else
            return result;
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
        ));
    }
    /**
     * https://stackoverflow.com/questions/71518531/how-do-i-convert-a-direction-vector-to-a-quaternion
     * (Deprecated) Applies a gravi-tropism vector to the quaternion.
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
     * @param {number} x the tropism vector's x component.
     * @param {number} y the tropism vector's y component.
     * @param {number} z the tropism vector's z component.
     * @returns {Quaternion}
     */
    applyTropism(weight = 0, x = 0, y = -1, z = 0)
    {
        if(weight == 0)
            return this;

        // a = e * |HxT| (n)
        let curHead = this.headingVector;
        let rotAxis = new Vector3(
            curHead.y * z - curHead.z * y,
            curHead.z * x - curHead.x * z,
            curHead.x * y - curHead.y * x,
        );
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
        ));
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
        return new Quaternion(-c, s, 0, 0).mul(this);
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
     * @param {string} ctxIgnoreList a list of symbols ignored when deriving
     * context.
     * @param {string} tropism the tropism factor.
     * @param {object} variables globally defined variables for the system.
     */
    constructor(axiom = '', rules = [], turnAngle = 0, seed = 0,
    ignoreList = '', ctxIgnoreList = '', tropism = 0, variables = {})
    {
        // User input
        this.userInput =
        {
            axiom: axiom,
            rules: this.purgeEmpty(rules),
            turnAngle: turnAngle,
            seed: seed,
            ignoreList: ignoreList,
            ctxIgnoreList: ctxIgnoreList,
            tropism: tropism,
            variables: variables
        };
        // I want to transfer them to a map to deep copy them. LS menu uses
        // arrays so we're fine on that.
        this.variables = new Map();
        for(let key in variables)
            this.variables.set(key, MathExpression.parse(variables[key]).
            evaluate());

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
                params[j] = MathExpression.parse(params[j]).evaluate(
                (v) => this.variables.get(v));
            this.axiomParams[i] = params;
            // Maybe leave them at BigNumber?
        }
        
        let ruleMatches = [];
        for(let i = 0; i < this.userInput.rules.length; ++i)
        {
            ruleMatches.push([...this.userInput.rules[i].replace(TRIM_SP, '').
            match(LS_RULE)]);
            // Indices 1, 3, 4 are context, condition, and all derivations
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
            if(contextMatch[8])
            {
                let params = contextMatch[8].split(',');
                for(let j = 0; j < params.length; ++j)
                    ruleParams[params[j]] = ['m', j];
            }
            tmpRule.left = contextMatch[2];
            if(tmpRule.left && contextMatch[4])
            {
                let params = contextMatch[4].split(',');
                for(let j = 0; j < params.length; ++j)
                    ruleParams[params[j]] = ['l', j];
            }
            tmpRule.right = contextMatch[10];
            if(tmpRule.right && contextMatch[12])
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

            // [i][3]: condition
            if(ruleMatches[i][3])
                tmpRule.condition = MathExpression.parse(ruleMatches[i][3]);
            else
                tmpRule.condition = MathExpression.parse('1');

            // [i][4]: everything else
            // Doing just comma instead of semi-colon will ruin the parameters!
            let tmpRuleMatches = ruleMatches[i][4].split(';');
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
                if(!this.models.has(contextMatch[10]))
                    this.models.set(contextMatch[10], []);
                this.models.get(contextMatch[10]).push(tmpRule);
            }
            else
            {
                if(!this.rules.has(contextMatch[6]))
                    this.rules.set(contextMatch[6], []);
                this.rules.get(contextMatch[6]).push(tmpRule);
            }
        }

        this.ignoreList = new Set(ignoreList);
        this.ctxIgnoreList = new Set(ctxIgnoreList);

        this.RNG = new Xorshift(seed);
        this.halfAngle = MathExpression.parse(turnAngle.toString()).evaluate(
        (v) => this.variables.get(v)).
        toNumber() * Math.PI / 360;
        
        this.rotations = new Map();
        let s = Math.sin(this.halfAngle);
        let c = Math.cos(this.halfAngle);
        this.rotations.set('+', new Quaternion(-c, 0, 0, s));
        this.rotations.set('-', new Quaternion(-c, 0, 0, -s));
        this.rotations.set('&', new Quaternion(-c, 0, s, 0));
        this.rotations.set('^', new Quaternion(-c, 0, -s, 0));
        this.rotations.set('\\', new Quaternion(-c, s, 0, 0));
        this.rotations.set('/', new Quaternion(-c, -s, 0, 0));

        this.tropism = MathExpression.parse(tropism.toString()).evaluate(
        (v) => this.variables.get(v)).
        toNumber();
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
    getAncestree(sequence, task = {})
    {
        // Scanning behaviour should be very similar to renderer drawing.
        let tmpStack = task.stack || [];
        let tmpIdxStack = task.idxStack || [];
        let tmpAncestors = task.ancestors || [];
        let tmpChildren = task.children || [];
        let i = task.start || 0;
        for(; i < sequence.length; ++i)
        {
            if(i - task.start > maxCharsPerTick)
            {
                return {
                    start: i,
                    stack: tmpStack,
                    idxStack: tmpIdxStack,
                    ancestors: tmpAncestors,
                    children: tmpChildren
                };
            }
            switch(sequence[i])
            {
                case ' ':
                    log('Blank space detected.')
                    break;
                case '[':
                    tmpIdxStack.push(tmpStack.length);
                    break;
                case ']':
                    if(tmpStack.length == 0)
                    {
                        log('You\'ve clearly made a bracket error.');
                        break;
                    }
                    while(tmpStack.length > tmpIdxStack[tmpIdxStack.length - 1])
                        tmpStack.pop();

                    tmpIdxStack.pop();
                    break;
                default:
                    let ignored = this.ctxIgnoreList.has(sequence[i]);
                    if(ignored)
                        break;
                    
                    if(tmpStack.length > 0)
                    {
                        let ancIdx = tmpStack[tmpStack.length - 1];
                        tmpAncestors[i] = ancIdx;
                        if(typeof tmpChildren[ancIdx] === 'undefined')
                            tmpChildren[ancIdx] = [];
                        tmpChildren[ancIdx].push(i);
                    }

                    tmpStack.push(i);
                    break;
            }
        }
        return {
            start: 0,
            stack: tmpStack,
            idxStack: tmpIdxStack,
            ancestors: tmpAncestors,
            children: tmpChildren
        };
    }

    /**
     * Derive a sequence from the input string. `next` denotes the starting
     * position to be derived next tick. `result` contains the work completed
     * for the current tick.
     * @param {string} sequence the input string.
     * @returns {{start: number, result: string}}
     */
    derive(sequence, seqParams, ancestors, children, task = {})
    {
        let result = task.derivation || '';
        let resultParams = task.parameters || [];
        let i = task.start || 0;
        let charCount = 0;
        for(; i < sequence.length; ++i)
        {
            if(charCount > maxCharsPerTick)
            {
                return {
                    start: i,
                    charCount: charCount,
                    derivation: result,
                    parameters: resultParams
                };
            }
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
                {
                    result += sequence[i];
                    ++charCount;
                    resultParams.push(null);
                }
                else
                    continue;
            }
            else if(sequence[i] == '~')
                continue;
            else if(this.rules.has(sequence[i]))
            {
                let tmpRules = this.rules.get(sequence[i]);
                let ruleChoice = -1;
                for(let j = 0; j < tmpRules.length; ++j)
                {
                    // Left and right first
                    if(tmpRules[j].left && tmpRules[j].left !=
                    sequence[ancestors[i]])
                        continue;

                    let right = -1;
                    if(tmpRules[j].right)
                    {
                        if(children[i])
                        {
                            for(let k = 0; k < children[i].length; ++k)
                            {
                                if(tmpRules[j].right == sequence[children[i][
                                k]])
                                {
                                    right = children[i][k];
                                    break;
                                }
                            }
                        }
                        if(right == -1)
                            continue;
                    }

                    let tmpParamMap = (v) => this.variables.get(v) ||
                    tmpRules[j].paramMap(v, seqParams[ancestors[i]],
                    seqParams[i], seqParams[right]);
                    // Next up is the condition
                    if(tmpRules[j].condition.evaluate(tmpParamMap) ==
                    BigNumber.ZERO)
                        continue;

                    if(typeof tmpRules[j].derivations === 'string')
                    {
                        result += tmpRules[j].derivations;
                        charCount += tmpRules[j].derivations.length;
                        if(tmpRules[j].parameters)
                        {
                            for(let k = 0; k < tmpRules[j].parameters.length;
                            ++k)
                            {
                                let derivPi = null;
                                if(tmpRules[j].parameters[k])
                                {
                                    for(let l = 0; l < tmpRules[j].parameters[
                                    k].length; ++l)
                                    {
                                        if(tmpRules[j].parameters[k][l])
                                        {
                                            if(!derivPi)
                                                derivPi = [];
                                            derivPi.push(tmpRules[j].
                                            parameters[k][l].evaluate(
                                            tmpParamMap));
                                        }
                                    }
                                }
                                resultParams.push(derivPi);
                            }
                        }
                        ruleChoice = j;
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
                                result += tmpRules[j].derivations[k];
                                charCount += tmpRules[j].derivations[k].length;
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
                        ruleChoice = j;
                        break;
                    }
                }
                if(ruleChoice == -1)
                {
                    result += sequence[i];
                    ++charCount;
                    resultParams.push(...[seqParams[i]]);
                }
            }
            else
            {
                result += sequence[i];
                ++charCount;
                resultParams.push(...[seqParams[i]]);
            }
        }
        return {
            start: 0,
            charCount: charCount,
            derivation: result,
            parameters: resultParams
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
                let tmpParamMap = (v) => this.variables.get(v) ||
                tmpRules[j].paramMap(v, null, null, params);
                // Next up is the condition
                if(tmpRules[j].condition.evaluate(tmpParamMap) ==
                BigNumber.ZERO)
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
                            if(tmpRules[j].parameters[k])
                            {
                                for(let l = 0; l < tmpRules[j].parameters[k].
                                length; ++l)
                                {
                                    if(tmpRules[j].parameters[k][l])
                                    {
                                        if(!derivPi)
                                            derivPi = [];
                                        derivPi.push(tmpRules[j].parameters[k][
                                        l].evaluate(tmpParamMap));
                                    }
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

    reconstruct(sequence, params, task = {})
    {
        let result = task.result || '';
        let i = task.start || 0;
        for(; i < sequence.length; ++i)
        {
            if((i - task.start) * (task.start + 1) > maxCharsPerTick)
            {
                return {
                    start: i,
                    result: result
                }
            }
            result += sequence[i];
            if(params[i])
                result += `(${params[i].join(', ')})`;
        }
        return {
            start: 0,
            result: result
        };
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
     *  ctxIgnoreList: string,
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
            ctxIgnoreList: this.userInput.ctxIgnoreList,
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
         * @type {object} the current ancestree task.
         */
        this.ancestreeTask =
        {
            start: 0
        };
        /**
         * @type {object} the current derivation task.
         */
        this.deriveTask =
        {
            start: 0
        };
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

            if(i == 0 && !('derivation' in this.deriveTask))
            {
                this.deriveTask =
                {
                    start: 0,
                    derivation: this.system.axiom,
                    parameters: this.system.axiomParams
                };
                charCount += this.system.axiom.length;
            }
            else
            {
                // If no ancestor (next is obviously 0): do work
                // If no ancestor and next isn't 0: panik
                // If has ancestor and next is 0: move to derive work
                // If has ancestor and next isn't 0: do work

                while(!('ancestors' in this.ancestreeTask) ||
                ('ancestors' in this.ancestreeTask && this.ancestreeTask.start))
                {
                    let at = this.system.getAncestree(this.levels[i - 1],
                    this.ancestreeTask);
                    charCount += (at.start - this.ancestreeTask.start);
                    this.ancestreeTask = at;
                    if(charCount > maxCharsPerTick)
                        return;
                }
                // TODO: convert derivation to new tasking model
                if(!('derivation' in this.deriveTask) ||
                ('derivation' in this.deriveTask && this.deriveTask.start))
                {
                    let ret = this.system.derive(this.levels[i - 1],
                    this.levelParams[i - 1], this.ancestreeTask.ancestors,
                    this.ancestreeTask.children, this.deriveTask);
                    charCount += ret.charCount;
                    this.deriveTask = ret;
                }
            }
            this.levels[i] = this.deriveTask.derivation;
            this.levelParams[i] = this.deriveTask.parameters;
            if(!this.deriveTask.start)
            {
                ++this.loaded;
                this.ancestreeTask =
                {
                    start: 0
                };
                this.deriveTask =
                {
                    start: 0
                };
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
        this.ancestreeTask =
        {
            start: 0
        };
        this.deriveTask =
        {
            start: 0
        };
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
        this.ancestreeTask =
        {
            start: 0
        };
        this.deriveTask =
        {
            start: 0
        };
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
                            let args = this.modelParams[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]];
                            if(args)
                            {
                                if(args.length >= 4)
                                    this.ori = this.ori.applyTropism(
                                    args[0].toNumber(),
                                    args[1].toNumber(),
                                    args[2].toNumber(),
                                    args[3].toNumber());
                                else
                                    this.ori = this.ori.applyTropism(
                                    args[0].toNumber());
                            }
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
                                {
                                    this.forward(this.modelParams[
                                    this.models.length - 1][
                                    this.mdi[this.mdi.length - 1]][
                                    0].toNumber());
                                }
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
                        if(this.levelParams[this.lv][this.i])
                            this.ori = this.ori.rotate(this.levelParams[
                            this.lv][this.i][0].toNumber(), '+');
                        else
                            this.ori = this.system.rotations.get('+').mul(
                            this.ori);
                        break;
                    case '-':
                        if(this.levelParams[this.lv][this.i])
                            this.ori = this.ori.rotate(this.levelParams[
                            this.lv][this.i][0].toNumber(), '-');
                        else
                            this.ori = this.system.rotations.get('-').mul(
                            this.ori);
                        break;
                    case '&':
                        if(this.levelParams[this.lv][this.i])
                            this.ori = this.ori.rotate(this.levelParams[
                            this.lv][this.i][0].toNumber(), '&');
                        else
                            this.ori = this.system.rotations.get('&').mul(
                            this.ori);
                        break;
                    case '^':
                        if(this.levelParams[this.lv][this.i])
                            this.ori = this.ori.rotate(this.levelParams[
                            this.lv][this.i][0].toNumber(), '^');
                        else
                            this.ori = this.system.rotations.get('^').mul(
                            this.ori);
                        break;
                    case '\\':
                        if(this.levelParams[this.lv][this.i])
                            this.ori = this.ori.rotate(this.levelParams[
                            this.lv][this.i][0].toNumber(), '\\');
                        else
                            this.ori = this.system.rotations.get('\\').mul(
                            this.ori);
                        break;
                    case '/':
                        if(this.levelParams[this.lv][this.i])
                            this.ori = this.ori.rotate(this.levelParams[
                            this.lv][this.i][0].toNumber(), '/');
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
                        let args = this.levelParams[this.lv][this.i];
                        if(args)
                        {
                            if(args.length >= 4)
                                this.ori = this.ori.applyTropism(
                                args[0].toNumber(),
                                args[1].toNumber(),
                                args[2].toNumber(),
                                args[3].toNumber());
                            else
                                this.ori = this.ori.applyTropism(
                                args[0].toNumber());
                        }
                        else
                            this.ori = this.ori.applyTropism(
                            this.system.tropism);
                        break;
                    case '~':
                        if(!this.loadModels || !this.system.models.has(
                        this.levels[this.lv][this.i + 1]))
                            break;

                        ++this.i;
                        let model = this.system.deriveModel(this.levels[
                        this.lv][this.i], this.levelParams[this.lv][this.i]);

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
                        {
                            if(this.levels[this.lv][this.i] == 'F' &&
                            this.levelParams[this.lv][this.i])
                            {
                                this.forward(this.levelParams[this.lv][this.i][
                                0].toNumber());
                            }
                            else
                                this.forward();
                        }

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
        if(typeof this.levels[this.loaded + 1] === 'undefined')
            return Localization.format(getLoc('rendererBuildingTree'),
            this.loaded + 1, this.ancestreeTask.start);
        return Localization.format(getLoc('rendererDeriving'), this.loaded + 1,
        this.levels[this.loaded + 1].length);
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

/**
 * Represents a bunch of buttons for variable controls.
 */
class VariableControls
{
    /**
     * @constructor
     * @param {Upgrade} variable the variable being controlled.
     * @param {boolean} useAnchor whether to use anchor controls.
     * @param {number} quickbuyAmount the amount of levels to buy when held.
     */
    constructor(variable, useAnchor = false, quickbuyAmount = 10)
    {
        /**
         * @type {Upgrade} the variable being controlled.
         */
        this.variable = variable;
        /**
         * @type {Frame} the variable button.
         */
        this.varBtn = null;
        /**
         * @type {Frame} the refund button.
         */
        this.refundBtn = null;
        /**
         * @type {Frame} the buy button.
         */
        this.buyBtn = null;

        /**
         * @type {boolean} whether to use anchor controls.
         */
        this.useAnchor = useAnchor;
        /**
         * @type {number} the anchored variable level.
         */
        this.anchor = this.variable.level;
        /**
         * @type {number} whether the anchor is on.
         */
        this.anchorActive = false;
        /**
         * @type {number} the amount of levels to buy when held.
         */
        this.quickbuyAmount = quickbuyAmount;
    }

    /**
     * Updates all buttons, visually.
     */
    updateAllButtons()
    {
        this.updateDescription();
        this.updateRefundButton();
        this.updateBuyButton();
    }
    /**
     * Updates the variable description written on the button's label.
     */
    updateDescription()
    {
        this.varBtn.content.text = this.variable.getDescription();
    }
    /**
     * Creates a variable button.
     * @param {function(void): void} callback when pressed, calls this function.
     * @param {number} height the button's height.
     * @returns {Frame}
     */
    createVariableButton(callback = null, height = BUTTON_HEIGHT)
    {
        if(this.varBtn)
            return this.varBtn;
        
        let frame = ui.createFrame
        ({
            heightRequest: height,
            cornerRadius: 1,
            padding: new Thickness(10, 2),
            verticalOptions: LayoutOptions.CENTER,
            content: ui.createLatexLabel
            ({
                text: this.variable.getDescription(),
                verticalTextAlignment: TextAlignment.CENTER,
                textColor: Color.TEXT_MEDIUM
            }),
            borderColor: Color.TRANSPARENT
        });
        if(callback)
        {
            frame.borderColor = Color.BORDER;
            frame.content.textColor = Color.TEXT;
            frame.onTouched = (e) =>
            {
                if(e.type == TouchType.PRESSED)
                {
                    frame.borderColor = Color.TRANSPARENT;
                    frame.content.textColor = Color.TEXT_MEDIUM;
                }
                else if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
                {
                    Sound.playClick();
                    frame.borderColor = Color.BORDER;
                    frame.content.textColor = Color.TEXT;
                    callback();
                }
                else if(e.type == TouchType.CANCELLED)
                {
                    frame.borderColor = Color.BORDER;
                    frame.content.textColor = Color.TEXT
                }
            }
        }
        this.varBtn = frame;
        return this.varBtn;
    }
    /**
     * Updates the refund button, visually.
     */
    updateRefundButton()
    {
        this.refundBtn.borderColor = this.variable.level > 0 ? Color.BORDER :
        Color.TRANSPARENT;
        this.refundBtn.content.textColor = this.variable.level > 0 ?
        Color.TEXT : Color.TEXT_MEDIUM;
    }
    /**
     * Creates a refund button.
     * @param {string} symbol the button's label.
     * @param {number} height the button's height.
     * @returns {Frame}
     */
    createRefundButton(symbol = '-', height = BUTTON_HEIGHT)
    {
        if(this.refundBtn)
            return this.refundBtn;

        this.refundBtn = ui.createFrame
        ({
            heightRequest: height,
            cornerRadius: 1,
            padding: new Thickness(10, 2),
            verticalOptions: LayoutOptions.CENTER,
            content: ui.createLatexLabel
            ({
                text: symbol,
                horizontalTextAlignment: TextAlignment.CENTER,
                verticalTextAlignment: TextAlignment.CENTER,
                textColor: this.variable.level > 0 ? Color.TEXT :
                Color.TEXT_MEDIUM
            }),
            onTouched: (e) =>
            {
                if(e.type == TouchType.PRESSED)
                {
                    this.refundBtn.borderColor = Color.TRANSPARENT;
                    this.refundBtn.content.textColor = this.variable.level > 0 ?
                    Color.TEXT_MEDIUM : Color.TEXT_DARK;
                }
                else if(e.type == TouchType.SHORTPRESS_RELEASED)
                {
                    Sound.playClick();
                    this.variable.refund(1);
                }
                else if(e.type == TouchType.LONGPRESS)
                {
                    Sound.playClick();
                    if(this.useAnchor)
                    {
                        this.anchorActive = true;
                        if(this.variable.level > 0)
                            this.anchor = this.variable.level;
                    }
                    this.variable.refund(this.quickbuyAmount);
                }
                else if(e.type == TouchType.CANCELLED)
                {
                    this.updateRefundButton();
                }
            },
            borderColor: this.variable.level > 0 ? Color.BORDER :
            Color.TRANSPARENT
        });
        return this.refundBtn;
    }
    /**
     * Updates the buy button, visually.
     */
    updateBuyButton()
    {
        this.buyBtn.borderColor = this.variable.level < this.variable.maxLevel ?
        Color.BORDER : Color.TRANSPARENT;
        this.buyBtn.content.textColor = this.variable.level <
        this.variable.maxLevel ? Color.TEXT : Color.TEXT_MEDIUM;
    }
    /**
     * Creates a buy button.
     * @param {string} symbol the button's label.
     * @param {number} height the button's height.
     * @returns {Frame}
     */
    createBuyButton(symbol = '+', height = BUTTON_HEIGHT)
    {
        if(this.buyBtn)
            return this.buyBtn;

        this.buyBtn = ui.createFrame
        ({
            heightRequest: height,
            cornerRadius: 1,
            padding: new Thickness(10, 2),
            verticalOptions: LayoutOptions.CENTER,
            content: ui.createLatexLabel
            ({
                text: symbol,
                horizontalTextAlignment: TextAlignment.CENTER,
                verticalTextAlignment: TextAlignment.CENTER,
                textColor: this.variable.level < this.variable.maxLevel ?
                Color.TEXT : Color.TEXT_MEDIUM
            }),
            onTouched: (e) =>
            {
                if(e.type == TouchType.PRESSED)
                {
                    this.buyBtn.borderColor = Color.TRANSPARENT;
                    this.buyBtn.content.textColor = this.variable.level <
                    this.variable.maxLevel ? Color.TEXT_MEDIUM :
                    Color.TEXT_DARK;
                }
                else if(e.type == TouchType.SHORTPRESS_RELEASED)
                {
                    Sound.playClick();
                    this.variable.buy(1);
                }
                else if(e.type == TouchType.LONGPRESS)
                {
                    Sound.playClick();
                    let q = this.quickbuyAmount;
                    if(this.useAnchor && this.anchorActive)
                    {
                        q = Math.min(q, this.anchor - this.variable.level);
                        if(q == 0)
                            q = this.quickbuyAmount;
                        this.anchorActive = false;
                    }
                    for(let i = 0; i < q; ++i)
                        this.variable.buy(1);
                }
                else if(e.type == TouchType.CANCELLED)
                {
                    this.updateBuyButton();
                }
            },
            borderColor: this.variable.level < this.variable.maxLevel ?
            Color.BORDER : Color.TRANSPARENT
        });
        return this.buyBtn;
    }
}

/**
 * Measures performance for a piece of code.
 */
class Measurer
{
    /**
     * @constructor
     * @param {string} title the measurement's title.
     * @param {number} window the sample size.
     */
    constructor(title, window = 10)
    {
        /**
         * @type {string} the measurement's title.
         */
        this.title = title;
        /**
         * @type {number} the sample size.
         */
        this.window = window;
        /**
         * @type {number} the all-time sum.
         */
        this.sum = 0;
        /**
         * @type {number} the window sum.
         */
        this.windowSum = 0;
        /**
         * @type {number} the all-time maximum.
         */
        this.max = 0;
        /**
         * @type {number[]} recent records.
         */
        this.records = [];
        for(let i = 0; i < this.window; ++i)
            this.records[i] = 0;
        /**
         * @type {number} the elapsed time in ticks.
         */
        this.ticksPassed = 0;
        /**
         * @type {number} the most recent moment the function was stamped.
         */
        this.lastStamp = null;
    }

    /**
     * Resets the measurer.
     */
    reset()
    {
        this.sum = 0;
        this.windowSum = 0;
        this.max = 0;
        this.records = [];
        for(let i = 0; i < this.window; ++i)
            this.records[i] = 0;
        this.ticksPassed = 0;
        this.lastStamp = null;
    }
    /**
     * Stamps the measurer.
     */
    stamp()
    {
        if(!this.lastStamp)
            this.lastStamp = Date.now();
        else
        {
            let closingStamp = Date.now();
            let i = this.ticksPassed % this.window;
            this.windowSum -= this.records[i];
            this.records[i] = closingStamp - this.lastStamp;
            this.windowSum += this.records[i];
            this.sum += this.records[i];
            if(this.records[i] > this.max)
            {
                this.max = this.records[i];
                // log(`Boom! ${this.title} took ${this.records[i]}ms.`)
            }
            this.lastStamp = null;
            ++this.ticksPassed;
        }
    }
    /**
     * Returns the window average.
     * @returns {number}
     */
    get windowAvg()
    {
        return this.windowSum / Math.min(this.window, this.ticksPassed);
    }
    /**
     * Returns the all-time average.
     * @returns {number}
     */
    get allTimeAvg()
    {
        return this.sum / this.ticksPassed;
    }
    /**
     * Returns the string for the window average.
     * @returns {string}
     */
    get windowAvgString()
    {
        if(this.ticksPassed == 0)
            return '';

        if(!measurePerformance)
            return '';

        return Localization.format(getLoc('measurement'), this.title,
        getCoordString(this.max), getCoordString(this.windowAvg),
        Math.min(this.window, this.ticksPassed));
    }
    /**
     * Returns the string for the all-time average.
     * @returns {string}
     */
    get allTimeAvgString()
    {
        if(this.ticksPassed == 0)
            return '';

        if(!measurePerformance)
            return '';

        return Localization.format(getLoc('measurement'), this.title,
        getCoordString(this.max), getCoordString(this.allTimeAvg),
        this.ticksPassed);
    }
}

// const sidewayQuat = new Quaternion(1, 0, 0, 0);
const uprightQuat = new Quaternion(-Math.sqrt(2)/2, 0, 0, Math.sqrt(2)/2);
const xUpQuat = new Quaternion(0, 1, 0, 0);
const yUpQuat = new Quaternion(0, 0, 1, 0);
const zUpQuat = new Quaternion(0, 0, 0, 1);

let arrow = new LSystem('X', ['F=FF', 'X=F[+X][-X]FX'], 30);
let renderer = new Renderer(arrow, '2^lv', 0, '2^lv');
let globalRNG = new Xorshift(Date.now());
let contentsTable = [0, 1, 2, 5, 7];
let manualSystems =
{
    3:
    {
        system: new LSystem('B[+AAA]A[-AA]A[+A]A', [
            'B<A=B',
            'B=A'
        ], 30, 0, '', '+-'),
        config: [4, 0, 2, 0, true]
    },
    4:
    {
        system: new LSystem('F1F1F1', [
            '0<0>0=0',
            '0<0>1=1[-F1F1]',
            '0<1>0=1',
            '0<1>1=1',
            '1<0>0=0',
            '1<0>1=1F1',
            '1<1>0=1',
            '1<1>1=0',
            '+=-',
            '-=+'
        ], 22.5, 0, '01', 'F+-'),
        config: ['lv+2', 0, 'lv/2+1', 0, true]
    },
    6:
    {
        system: new LSystem('F(1)', [
            'F(d)=F(d/3)+F(d/3)-(120)F(d/3)+F(d/3)'
        ], 60),
        config: ['1/2', '1/2', 'sqrt(3)/12', 0, false]
    },
    8:
    {
        system: new LSystem('FA(1)', [
            'A(t) = F(b/2.5)//[+(24)&B(t)]//[&B(t)]//[&B(t)]A(t+1)',
            'B(t) = ~J(0.15, t/b-2)',
            'J(s, type) = ~J(s*0.75+0.25, type)',
            '~>J(s, type): type<=0 = {[+(32)F(s).-TF(s)TF.-TF(s)..][-(32)F(s)+(16)[TF(s)TF.].]}',
            '~>J(s, type): type<=1 = [F~p(s)/(60)~p(s)/(60)~p(s)]',
            '~>p(s) = {[+F(s/2).--F(s/2).][-F(s/2).].}',
            '~>J(s, type): type<=2 = [F~k(s)/(72)~k(s)/(72)~k(s)/(72)~k(s)/(72)~k(s)]',
            '~>k(s) = {[F(s).+(72)[&F(s-0.3).][F(s)..][^F(s-0.3).].]}',
            '~>J(s, type): type<=3 = [F~m(s)/(72)~m(s)/(72)~m(s)/(72)~m(s)/(72)~m(s)]',
            '~>m(s) = {[+(24)F(s).-F(s/2)..].}'
        ], '48', 0, '', '', 0.16, {
            'b':'2.25'
        }),
        'config': ['7', '0', 'lv/2+1', '0', true]
    }
};
let tmpSystem = null;
let tmpSystemName = getLoc('welcomeSystemName');
let tmpSystemDesc = getLoc('welcomeSystemDesc');

var l, ts;
// Variable controls
let lvlControls, tsControls;

// Measure drawing performance
let drawMeasurer = new Measurer('renderer.draw()', 30);
let camMeasurer = new Measurer('renderer.camera', 30);

var init = () =>
{
    min = theory.createCurrency(getLoc('currencyTime'));
    progress = theory.createCurrency('%');

    // l (STAGE)
    {
        let getDesc = (level) => Localization.format(getLoc('varLvDesc'),
        level.toString(), renderer.loopMode == 2 ? '+' : '');
        let getInfo = (level) => `\\text{Stg. }${level.toString()}`;
        l = theory.createUpgrade(0, progress, new FreeCost);
        l.getDescription = (_) => Utils.getMath(getDesc(l.level));
        l.getInfo = (amount) => Utils.getMathTo(getInfo(l.level),
        getInfo(l.level + amount));
        l.canBeRefunded = (_) => true;
        l.boughtOrRefunded = (_) =>
        {
            lvlControls.updateAllButtons();
            renderer.update(l.level);
        };
        lvlControls = new VariableControls(l);
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
        };
        let getInfo = (level) => `\\text{Ts=}${level.toString()}/s`;
        ts = theory.createUpgrade(1, progress, new FreeCost);
        ts.getDescription = (_) => Utils.getMath(getDesc(ts.level));
        ts.getInfo = (amount) => Utils.getMathTo(getInfo(ts.level),
        getInfo(ts.level + amount));
        ts.maxLevel = 10;
        ts.canBeRefunded = (_) => true;
        ts.boughtOrRefunded = (_) =>
        {
            tsControls.updateAllButtons();
            time = 0;
        };
        tsControls = new VariableControls(ts, true);
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
    let timeLimit;
    if(tickDelayMode)
    {
        time += 1;
        timeLimit = ts.level;
    }
    else
    {
        time += elapsedTime;
        timeLimit = 1 / ts.level;
    }
    if(time >= timeLimit - 1e-8)
    {
        time -= timeLimit;
        return true;
    }
    return false;
}

var tick = (elapsedTime, multiplier) =>
{
    if(game.isCalculatingOfflineProgress)
    {
        gameIsOffline = true;
        return;
    }
    else if(gameIsOffline)
    {
        // Triggers only once when reloading
        if(offlineReset)
            renderer.reset();
        gameIsOffline = false;
    }

    if(measurePerformance)
        drawMeasurer.stamp();

    if(ts.level == 0)
    {
        // Keep updating even when paused
        renderer.draw(l.level, true);
    }
    else
    {
        renderer.tick(elapsedTime);
        renderer.draw(l.level, !timeCheck(elapsedTime));
    }

    if(measurePerformance)
        drawMeasurer.stamp();

    let msTime = renderer.elapsedTime;
    min.value = 1e-8 + msTime[0] + msTime[1] / 100;
    progress.value = renderer.progressPercent;
    theory.invalidateTertiaryEquation();
}

var getEquationOverlay = () =>
{
    let overlayText = () => Localization.format(getLoc('equationOverlayLong'),
    getLoc('versionName'), tmpSystemName, drawMeasurer.windowAvgString,
    camMeasurer.windowAvgString);

    let result = ui.createLatexLabel
    ({
        text: overlayText,
        margin: new Thickness(5, 4),
        fontSize: 9,
        textColor: Color.TEXT_MEDIUM
    });
    return result;
}

let createButton = (label, callback, height = BUTTON_HEIGHT) =>
{
    let frame = ui.createFrame
    ({
        heightRequest: height,
        cornerRadius: 1,
        padding: new Thickness(10, 2),
        verticalOptions: LayoutOptions.CENTER,
        content: ui.createLatexLabel
        ({
            text: label,
            verticalTextAlignment: TextAlignment.CENTER,
            textColor: Color.TEXT
        }),
        onTouched: (e) =>
        {
            if(e.type == TouchType.PRESSED)
            {
                frame.borderColor = Color.TRANSPARENT;
                frame.content.textColor = Color.TEXT_MEDIUM;
            }
            else if(e.type == TouchType.SHORTPRESS_RELEASED ||
            e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                frame.borderColor = Color.BORDER;
                frame.content.textColor = Color.TEXT;
                callback();
            }
            else if(e.type == TouchType.CANCELLED)
            {
                frame.borderColor = Color.BORDER;
                frame.content.textColor = Color.TEXT;
            }
        },
        borderColor: Color.BORDER
    });
    return frame;
}

var getUpgradeListDelegate = () =>
{
    let openSeqMenu = () =>
    {
        let menu = createSequenceMenu();
        menu.show();
    };
    let lvlButton = lvlControls.createVariableButton(openSeqMenu);
    lvlButton.row = 0;
    lvlButton.column = 0;
    let lvlRefund = lvlControls.createRefundButton('–');
    lvlRefund.column = 0;
    let lvlBuy = lvlControls.createBuyButton();
    lvlBuy.column = 1;

    let toggleTDM = () =>
    {
        tickDelayMode = !tickDelayMode;
        tsControls.updateDescription();
        time = 0;
    };
    let tsButton = tsControls.createVariableButton(toggleTDM);
    tsButton.row = 1;
    tsButton.column = 0;
    let tsRefund = tsControls.createRefundButton('–');
    tsRefund.column = 0;
    let tsBuy = tsControls.createBuyButton();
    tsBuy.column = 1;

    let sysButton = createButton(getLoc('btnMenuLSystem'), () =>
    createSystemMenu().show());
    sysButton.row = 0;
    sysButton.column = 0;
    let cfgButton = createButton(getLoc('btnMenuRenderer'), () =>
    createConfigMenu().show());
    cfgButton.row = 0;
    cfgButton.column = 1;
    let slButton = createButton(getLoc('btnMenuSave'), () =>
    createSaveMenu().show());
    slButton.row = 1;
    slButton.column = 0;
    let manualButton = createButton(getLoc('btnMenuManual'), () =>
    createManualMenu().show());
    manualButton.row = 1;
    manualButton.column = 1;
    let theoryButton = createButton(getLoc('btnMenuTheory'), () =>
    createWorldMenu().show());
    theoryButton.row = 2;
    theoryButton.column = 0;
    let resumeButton = createButton(Localization.format(getLoc('btnResume'),
    tmpSystemName), () =>
    {
        if(tmpSystem)
        {
            renderer.constructSystem = tmpSystem;
            tmpSystem = null;
        }
    }, getMediumBtnSize(ui.screenWidth));
    resumeButton.content.horizontalOptions = LayoutOptions.CENTER;
    resumeButton.isVisible = () => tmpSystem ? true : false;
    resumeButton.margin = new Thickness(0, 0, 0, 2);

    let stack = ui.createScrollView
    ({
        padding: new Thickness(6, 8),
        content: ui.createStackLayout
        ({
            children:
            [
                resumeButton,
                ui.createGrid
                ({
                    columnSpacing: 8,
                    rowSpacing: 6,
                    rowDefinitions:
                    [
                        BUTTON_HEIGHT,
                        BUTTON_HEIGHT
                    ],
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        lvlButton,
                        ui.createGrid
                        ({
                            row: 0,
                            column: 1,
                            columnSpacing: 7,
                            columnDefinitions: ['50*', '50*'],
                            children:
                            [
                                lvlRefund,
                                lvlBuy
                            ]
                        }),
                        tsButton,
                        ui.createGrid
                        ({
                            row: 1,
                            column: 1,
                            columnSpacing: 7,
                            columnDefinitions: ['50*', '50*'],
                            children:
                            [
                                tsRefund,
                                tsBuy
                            ]
                        })
                    ]
                }),
                ui.createBox
                ({
                    heightRequest: 0,
                    // margin: new Thickness(0, 6)
                }),
                ui.createGrid
                ({
                    columnSpacing: 8,
                    rowSpacing: 6,
                    rowDefinitions:
                    [
                        BUTTON_HEIGHT,
                        BUTTON_HEIGHT,
                        BUTTON_HEIGHT
                    ],
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        sysButton,
                        cfgButton,
                        slButton,
                        manualButton,
                        theoryButton
                    ]
                })
            ]
        })
    });
    return stack;
}

let createConfigMenu = () =>
{
    let tmpZE = renderer.figScaleStr;
    let zoomEntry = ui.createEntry
    ({
        text: tmpZE,
        row: 0,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpZE = nt;
        }
    });
    let tmpCM = renderer.cameraMode;
    let CMLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelCamMode'),
        getLoc('camModes')[tmpCM]),
        row: 1,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let CMSlider = ui.createSlider
    ({
        row: 1,
        column: 1,
        minimum: 0,
        maximum: 2,
        value: tmpCM,
        onValueChanged: () =>
        {
            tmpCM = Math.round(CMSlider.value);
            CMSlider.isToggled = tmpCM > 0;
            camLabel.isVisible = tmpCM == 0;
            camGrid.isVisible = tmpCM == 0;
            camOffLabel.isVisible = tmpCM == 0;
            camOffGrid.isVisible = tmpCM == 0;
            FFLabel.isVisible = tmpCM > 0;
            FFEntry.isVisible = tmpCM > 0;
            CMLabel.text = Localization.format(getLoc('labelCamMode'),
            getLoc('camModes')[tmpCM]);
                
        },
        onDragCompleted: () =>
        {
            Sound.playClick();
            CMSlider.value = tmpCM;
        }
    });
    let tmpCX = renderer.camXStr;
    let tmpCY = renderer.camYStr;
    let tmpCZ = renderer.camZStr;
    let camLabel = ui.createLatexLabel
    ({
        text: getLoc('labelCamCentre'),
        isVisible: tmpCM == 0,
        row: 2,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let camGrid = ui.createEntry
    ({
        text: tmpCX,
        isVisible: tmpCM == 0,
        row: 2,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpCX = nt;
        }
    });
    let CYEntry = ui.createEntry
    ({
        text: tmpCY,
        row: 0,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpCY = nt;
        }
    });
    let camOffLabel = ui.createGrid
    ({
        row: 3,
        column: 0,
        columnDefinitions: ['40*', '30*'],
        isVisible: tmpCM == 0,
        children:
        [
            ui.createLatexLabel
            ({
                text: getLoc('labelCamOffset'),
                row: 0,
                column: 0,
                // horizontalTextAlignment: TextAlignment.END,
                verticalTextAlignment: TextAlignment.CENTER
            }),
            CYEntry
        ]
    });
    let camOffGrid = ui.createEntry
    ({
        text: tmpCZ,
        isVisible: tmpCM == 0,
        row: 3,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpCZ = nt;
        }
    });
    let tmpFF = renderer.followFactor;
    let FFLabel = ui.createLatexLabel
    ({
        text: getLoc('labelFollowFactor'),
        row: 2,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER,
        isVisible: tmpCM > 0
    });
    let FFEntry = ui.createEntry
    ({
        text: tmpFF.toString(),
        keyboard: Keyboard.NUMERIC,
        row: 2,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        isVisible: tmpCM > 0,
        onTextChanged: (ot, nt) =>
        {
            tmpFF = Number(nt);
        }
    });
    let tmpUpright = renderer.upright;
    let uprightSwitch = ui.createSwitch
    ({
        isToggled: tmpUpright,
        row: 4,
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
    let tmpLM = renderer.loopMode;
    let LMLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelLoopMode'),
        getLoc('loopModes')[tmpLM]),
        row: 0,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let LMSlider = ui.createSlider
    ({
        row: 0,
        column: 1,
        minimum: 0,
        maximum: 2,
        value: tmpLM,
        // minimumTrackColor: Color.BORDER,
        // maximumTrackColor: Color.TRANSPARENT,
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
    let tmpTail = renderer.backtrackTail;
    let tailSwitch = ui.createSwitch
    ({
        isToggled: tmpTail,
        row: 1,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpTail = !tmpTail;
                tailSwitch.isToggled = tmpTail;
            }
        }
    });
    let tmpModel = renderer.loadModels;
    let modelLabel = ui.createLatexLabel
    ({
        text: getLoc('labelLoadModels'),
        row: 2,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let modelSwitch = ui.createSwitch
    ({
        isToggled: tmpModel,
        row: 2,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpModel = !tmpModel;
                modelSwitch.isToggled = tmpModel;
            }
        }
    });
    let tmpQD = renderer.quickDraw;
    let QDSwitch = ui.createSwitch
    ({
        isToggled: tmpQD,
        row: 0,
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
        row: 1,
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
    let tmpHesA = renderer.hesitateApex;
    let hesALabel = ui.createLatexLabel
    ({
        text: getLoc('labelHesitateApex'),
        row: 2,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let hesASwitch = ui.createSwitch
    ({
        isToggled: tmpHesA,
        row: 2,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpHesA = !tmpHesA;
                hesASwitch.isToggled = tmpHesA;
            }
        }
    });
    let tmpHesN = renderer.hesitateFork;
    let hesNLabel = ui.createLatexLabel
    ({
        text: getLoc('labelHesitateFork'),
        row: 3,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let hesNSwitch = ui.createSwitch
    ({
        isToggled: tmpHesN,
        row: 3,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpHesN = !tmpHesN;
                hesNSwitch.isToggled = tmpHesN;
            }
        }
    });

    let menu = ui.createPopup
    ({
        title: getLoc('menuRenderer'),
        isPeekable: true,
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createScrollView
                ({
                    heightRequest: ui.screenHeight * 0.36,
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
                                        text: getLoc('labelFigScale'),
                                        row: 0,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    zoomEntry,
                                    CMLabel,
                                    CMSlider,
                                    camLabel,
                                    camGrid,
                                    camOffLabel,
                                    camOffGrid,
                                    FFLabel,
                                    FFEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelUpright'),
                                        row: 4,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    uprightSwitch,
                                ]
                            }),
                            ui.createBox
                            ({
                                heightRequest: 1,
                                margin: new Thickness(0, 6)
                            }),
                            ui.createGrid
                            ({
                                rowDefinitions:
                                [
                                    SMALL_BUTTON_HEIGHT,
                                    SMALL_BUTTON_HEIGHT,
                                    SMALL_BUTTON_HEIGHT
                                ],
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    LMLabel,
                                    LMSlider,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelBTTail'),
                                        row: 1,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    tailSwitch,
                                    modelLabel,
                                    modelSwitch
                                ]
                            }),
                            ui.createBox
                            ({
                                heightRequest: 1,
                                margin: new Thickness(0, 6)
                            }),
                            ui.createGrid
                            ({
                                rowDefinitions:
                                [
                                    SMALL_BUTTON_HEIGHT,
                                    SMALL_BUTTON_HEIGHT,
                                    SMALL_BUTTON_HEIGHT,
                                    SMALL_BUTTON_HEIGHT
                                ],
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelQuickdraw'),
                                        row: 0,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    QDSwitch,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelQuickBT'),
                                        row: 1,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    QBSwitch,
                                    hesALabel,
                                    hesASwitch,
                                    hesNLabel,
                                    hesNSwitch
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
                ui.createLatexLabel
                ({
                    text: getLoc('labelRequireReset'),
                    margin: new Thickness(0, 0, 0, 4),
                    verticalTextAlignment: TextAlignment.CENTER
                }),
                ui.createGrid
                ({
                    minimumHeightRequest: BUTTON_HEIGHT,
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
                                renderer.configure(tmpZE, tmpCM, tmpCX, tmpCY,
                                tmpCZ, tmpFF, tmpLM, tmpUpright, tmpQD, tmpQB,
                                tmpModel, tmpTail, tmpHesA, tmpHesN);
                                lvlControls.updateDescription();
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
                                let rx = new Renderer();
                                zoomEntry.text = rx.figScaleStr;
                                CMSlider.value = rx.cameraMode;
                                camGrid.text = rx.camXStr;
                                CYEntry.text = rx.camYStr;
                                camOffGrid.text = rx.camZStr;
                                FFEntry.text = rx.followFactor.toString();
                                LMSlider.value = rx.loopMode;
                                tmpUpright = rx.upright;
                                uprightSwitch.isToggled = rx.upright;
                                tmpQD = rx.quickDraw;
                                QDSwitch.isToggled = rx.quickDraw;
                                tmpQB = rx.quickBacktrack;
                                QBSwitch.isToggled = rx.quickBacktrack;
                                tmpModel = rx.loadModels;
                                modelSwitch.isToggled = rx.loadModels;
                                tmpTail = rx.backtrackTail;
                                tailSwitch.isToggled = rx.backtrackTail;
                                tmpHesA = rx.hesitateApex;
                                hesASwitch.isToggled = rx.hesitateApex;
                                tmpHesN = rx.hesitateFork;
                                hesNSwitch.isToggled = rx.hesitateFork;
                                lvlControls.updateDescription();
                                // menu.hide();
                            }
                        })
                    ]
                })
            ]
        })
    })
    return menu;
}

let createVariableMenu = (variables) =>
{
    // Q: Does Object.entries mean that its contents are references, and 
    // therefore overwritable from afar?
    let tmpVars = [];
    let varEntries = [];
    for(let i = 0; i < variables.length; ++i)
    {
        // I'm just making sure these are deep copied
        tmpVars[i] = [];
        tmpVars[i][0] = variables[i][0];
        tmpVars[i][1] = variables[i][1];

        varEntries.push(ui.createEntry
        ({
            row: i,
            column: 0,
            text: tmpVars[i][0],
            clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
            onTextChanged: (ot, nt) =>
            {
                tmpVars[i][0] = nt;
            }
        }));
        varEntries.push(ui.createLatexLabel
        ({
            text: '=',
            row: i,
            column: 1,
            horizontalTextAlignment: TextAlignment.CENTER,
            verticalTextAlignment: TextAlignment.CENTER
        }));
        varEntries.push(ui.createEntry
        ({
            row: i,
            column: 2,
            text: tmpVars[i][1],
            horizontalTextAlignment: TextAlignment.END,
            clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
            onTextChanged: (ot, nt) =>
            {
                tmpVars[i][1] = nt;
            }
        }));
    }
    let varsLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelVars'), tmpVars.length),
        verticalTextAlignment: TextAlignment.CENTER,
        margin: new Thickness(0, 12)
    });
    let varStack = ui.createGrid
    ({
        columnDefinitions: ['50*', '20*', '30*'],
        children: varEntries
    });
    let addVarButton = ui.createButton
    ({
        text: getLoc('btnAdd'),
        row: 0,
        column: 1,
        heightRequest: SMALL_BUTTON_HEIGHT,
        onClicked: () =>
        {
            Sound.playClick();
            let i = tmpVars.length;

            tmpVars[i] = [];
            tmpVars[i][0] = '';
            tmpVars[i][1] = '';

            varEntries.push(ui.createEntry
            ({
                row: i,
                column: 0,
                text: tmpVars[i][0],
                clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
                onTextChanged: (ot, nt) =>
                {
                    tmpVars[i][0] = nt;
                }
            }));
            varEntries.push(ui.createLatexLabel
            ({
                text: '=',
                row: i,
                column: 1,
                horizontalTextAlignment: TextAlignment.CENTER,
                verticalTextAlignment: TextAlignment.CENTER
            }));
            varEntries.push(ui.createEntry
            ({
                row: i,
                column: 2,
                text: tmpVars[i][1],
                horizontalTextAlignment: TextAlignment.END,
                clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
                onTextChanged: (ot, nt) =>
                {
                    tmpVars[i][1] = nt;
                }
            }));
            varsLabel.text = Localization.format(getLoc('labelVars'),
            tmpVars.length);
            varStack.children = varEntries;
        }
    });
    let menu = ui.createPopup
    ({
        title: getLoc('menuVariables'),
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    columnDefinitions: ['70*', '30*'],
                    children:
                    [
                        varsLabel,
                        addVarButton
                    ]
                }),
                ui.createScrollView
                ({
                    content: varStack
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
                        // This will telepathically clear the variables outside
                        variables.length = 0;
                        for(let i = 0; i < tmpVars.length; ++i)
                            if(tmpVars[i][0] && tmpVars[i][1])
                                variables.push(tmpVars[i]);
                        menu.hide();
                    }
                }),
            ]
        })
    });
    return menu;
}

let createSystemMenu = () =>
{
    let values = renderer.system.object;
    let tmpAxiom = values.axiom;
    let axiomEntry = ui.createEntry
    ({
        text: tmpAxiom,
        row: 0,
        column: 1,
        clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
        onTextChanged: (ot, nt) =>
        {
            tmpAxiom = nt;
        }
    });
    let tmpVars = Object.entries(values.variables);
    let varButton = ui.createButton
    ({
        text: getLoc('btnVar'),
        row: 0,
        column: 2,
        heightRequest: SMALL_BUTTON_HEIGHT,
        onClicked: () =>
        {
            Sound.playClick();
            let varMenu = createVariableMenu(tmpVars);
            varMenu.show();
        }
    });
    let tmpRules = values.rules;
    let ruleEntries = [];
    let ruleMoveBtns = [];
    for(let i = 0; i < tmpRules.length; ++i)
    {
        ruleEntries.push(ui.createEntry
        ({
            row: i,
            column: 0,
            text: tmpRules[i],
            clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
            onTextChanged: (ot, nt) =>
            {
                tmpRules[i] = nt;
            }
        }));
        if(i)
        {
            ruleMoveBtns.push(ui.createButton
            ({
                row: i,
                column: 1,
                text: getLoc('btnUp'),
                heightRequest: SMALL_BUTTON_HEIGHT,
                onClicked: () =>
                {
                    Sound.playClick();
                    let tmpRule = ruleEntries[i].text;
                    ruleEntries[i].text = ruleEntries[i - 1].text;
                    ruleEntries[i - 1].text = tmpRule;
                }
            }));
        }
    }
    let rulesLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelRules'), ruleEntries.length),
        verticalTextAlignment: TextAlignment.CENTER,
        margin: new Thickness(0, 12)
    });
    let ruleStack = ui.createGrid
    ({
        columnDefinitions: ['7*', '1*'],
        children: [...ruleEntries, ...ruleMoveBtns]
    });
    let addRuleButton = ui.createButton
    ({
        text: getLoc('btnAdd'),
        row: 0,
        column: 1,
        heightRequest: SMALL_BUTTON_HEIGHT,
        onClicked: () =>
        {
            Sound.playClick();
            let i = ruleEntries.length;
            ruleEntries.push(ui.createEntry
            ({
                row: i,
                column: 0,
                text: '',
                clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
                onTextChanged: (ot, nt) =>
                {
                    tmpRules[i] = nt;
                }
            }));
            if(i)
            {
                ruleMoveBtns.push(ui.createButton
                ({
                    row: i,
                    column: 1,
                    text: getLoc('btnUp'),
                    heightRequest: SMALL_BUTTON_HEIGHT,
                    onClicked: () =>
                    {
                        Sound.playClick();
                        let tmpRule = ruleEntries[i].text;
                        ruleEntries[i].text = ruleEntries[i - 1].text;
                        ruleEntries[i - 1].text = tmpRule;
                    }
                }));
            }
            rulesLabel.text = Localization.format(getLoc('labelRules'),
            ruleEntries.length);
            ruleStack.children = [...ruleEntries, ...ruleMoveBtns];
        }
    });
    let tmpIgnore = values.ignoreList || '';
    let ignoreEntry = ui.createEntry
    ({
        text: tmpIgnore,
        row: 0,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpIgnore = nt;
        }
    });
    let tmpCI = values.ctxIgnoreList || '';
    let CIEntry = ui.createEntry
    ({
        text: tmpCI,
        row: 1,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpCI = nt;
        }
    });
    let tmpAngle = values.turnAngle || '0';
    let angleEntry = ui.createEntry
    ({
        text: tmpAngle.toString(),
        row: 2,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpAngle = nt;
        }
    });
    let tmpTropism = values.tropism || '0';
    let tropismEntry = ui.createEntry
    ({
        text: tmpTropism.toString(),
        row: 3,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpTropism = nt;
        }
    });
    let tmpSeed = values.seed || '0';
    let seedLabel = ui.createGrid
    ({
        row: 4,
        column: 0,
        columnDefinitions: ['40*', '30*'],
        children:
        [
            ui.createLatexLabel
            ({
                text: getLoc('labelSeed'),
                column: 0,
                verticalTextAlignment: TextAlignment.CENTER
            }),
            ui.createButton
            ({
                text: getLoc('btnReroll'),
                column: 1,
                heightRequest: SMALL_BUTTON_HEIGHT,
                onClicked: () =>
                {
                    Sound.playClick();
                    seedEntry.text = globalRNG.nextInt.toString();
                }
            })
        ]
    });
    let seedEntry = ui.createEntry
    ({
        text: tmpSeed.toString(),
        keyboard: Keyboard.NUMERIC,
        row: 4,
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
        isPeekable: true,
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
                                columnDefinitions: ['20*', '50*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelAxiom'),
                                        row: 0,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    axiomEntry,
                                    varButton
                                ]
                            }),
                            ui.createGrid
                            ({
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    rulesLabel,
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
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    ignoreEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelCtxIgnored'),
                                        row: 1,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    CIEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelAngle'),
                                        row: 2,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    angleEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelTropism'),
                                        row: 3,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    tropismEntry,
                                    seedLabel,
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
                ui.createGrid
                ({
                    minimumHeightRequest: BUTTON_HEIGHT,
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
                                renderer.constructSystem = new LSystem(tmpAxiom,
                                tmpRules, tmpAngle, tmpSeed, tmpIgnore, tmpCI,
                                tmpTropism, Object.fromEntries(tmpVars));
                                if(tmpSystem)
                                {
                                    tmpSystem = null;
                                    tmpSystemName = getLoc('defaultSystemName');
                                    tmpSystemDesc = getLoc('noDescription');
                                }
                                menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnClear'),
                            row: 0,
                            column: 1,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                let values = new LSystem().object;
                                axiomEntry.text = values.axiom;
                                angleEntry.text = values.turnAngle.toString();
                                tmpVars = Object.entries(values.variables);
                                tmpRules = values.rules;
                                ruleEntries = [];
                                rulesLabel.text = Localization.format(
                                getLoc('labelRules'), ruleEntries.length);
                                ruleStack.children = ruleEntries;
                                ignoreEntry.text = values.ignoreList;
                                CIEntry.text = values.ctxIgnoreList;
                                tropismEntry.text = values.tropism.toString();
                                seedEntry.text = values.seed.toString();
                            }
                        })
                    ]
                })
            ]
        })
    });
    return menu;
}

let createNamingMenu = () =>
{
    let tmpName = tmpSystemName;
    let nameEntry = ui.createEntry
    ({
        text: tmpName,
        row: 0,
        column: 1,
        clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
        onTextChanged: (ot, nt) =>
        {
            tmpName = nt;
        }
    });
    let tmpDesc = tmpSystemDesc;
    let descEntry = ui.createEntry
    ({
        text: tmpDesc,
        row: 0,
        column: 1,
        clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
        onTextChanged: (ot, nt) =>
        {
            tmpDesc = nt;
        }
    });

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
                verticalTextAlignment: TextAlignment.CENTER
            }));
            let btnO = createOverwriteButton(key);
            btnO.row = i;
            children.push(btnO);
            ++i;
        }
        return children;
    };
    let createOverwriteButton = (title) =>
    {
        let btn = ui.createButton
        ({
            text: getLoc('btnOverwrite'),
            row: 0,
            column: 1,
            heightRequest: SMALL_BUTTON_HEIGHT,
            onClicked: () =>
            {
                Sound.playClick();
                savedSystems.set(title, {
                    desc: savedSystems.get(title).desc,
                    system: renderer.system.object,
                    config: renderer.staticCamera
                });
                tmpSystemName = title;
                tmpSystemDesc = savedSystems.get(title).desc;
                menu.hide();
            }
        });
        return btn;
    };
    let systemGrid = ui.createGrid
    ({
        columnDefinitions: ['70*', '30*'],
        verticalOptions: LayoutOptions.START,
        children: getSystemGrid() 
    });
    let systemGridScroll = ui.createScrollView
    ({
        heightRequest: () => Math.max(SMALL_BUTTON_HEIGHT,
        Math.min(ui.screenHeight * 0.2, systemGrid.height)),
        content: systemGrid
    });

    let menu = ui.createPopup
    ({
        title: getLoc('menuNaming'),
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    columnDefinitions: ['30*', '70*'],
                    children:
                    [
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelName'),
                            row: 0,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        nameEntry
                    ]
                }),
                ui.createGrid
                ({
                    columnDefinitions: ['30*', '70*'],
                    children:
                    [
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelDesc'),
                            row: 0,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        descEntry
                    ]
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createLatexLabel
                ({
                    text: Localization.format(getLoc('labelSavedSystems'),
                    savedSystems.size),
                    // horizontalTextAlignment: TextAlignment.CENTER,
                    verticalTextAlignment: TextAlignment.CENTER,
                    margin: new Thickness(0, 12)
                }),
                systemGridScroll,
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createButton
                ({
                    text: getLoc('btnSave'),
                    row: 0,
                    column: 1,
                    onClicked: () =>
                    {
                        Sound.playClick();
                        while(savedSystems.has(tmpName))
                            tmpName += getLoc('duplicateSuffix');
                        savedSystems.set(tmpName, {
                            desc: tmpDesc,
                            system: renderer.system.object,
                            config: renderer.staticCamera
                        });
                        tmpSystemName = tmpName;
                        tmpSystemDesc = tmpDesc;
                        menu.hide();
                    }
                })
            ]
        })
    });
    return menu;
}

let createSystemClipboardMenu = (values) =>
{
    let totalLength = 0;
    let tmpSys = [];
    let sysEntries = [];
    for(let i = 0; i * ENTRY_CHAR_LIMIT < values.length; ++i)
    {
        tmpSys.push(values.slice(i * ENTRY_CHAR_LIMIT, (i + 1) *
        ENTRY_CHAR_LIMIT));
        sysEntries.push(ui.createEntry
        ({
            text: tmpSys[i],
            clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
            onTextChanged: (ot, nt) =>
            {
                tmpSys[i] = nt;
                totalLength += (nt ? nt.length : 0) - (ot ? ot.length : 0);
                lengthLabel.text = Localization.format(getLoc(
                'labelTotalLength'), totalLength);
            }
        }));
    }
    let lengthLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelTotalLength'), totalLength),
        verticalTextAlignment: TextAlignment.CENTER,
        margin: new Thickness(0, 12)
    });
    let entryStack = ui.createStackLayout
    ({
        children: sysEntries
    });
    let addEntryButton = ui.createButton
    ({
        text: getLoc('btnAdd'),
        row: 0,
        column: 1,
        heightRequest: SMALL_BUTTON_HEIGHT,
        onClicked: () =>
        {
            Sound.playClick();
            let i = sysEntries.length;
            tmpSys[i] = '';
            sysEntries.push(ui.createEntry
            ({
                text: tmpSys[i],
                clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
                onTextChanged: (ot, nt) =>
                {
                    tmpSys[i] = nt;
                    totalLength += (nt ? nt.length : 0) - (ot ? ot.length : 0);
                    lengthLabel.text = Localization.format(getLoc(
                    'labelTotalLength'), totalLength);
                }
            }));
            entryStack.children = sysEntries;
        }
    });

    let menu = ui.createPopup
    ({
        title: getLoc('menuClipboard'),
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    columnDefinitions: ['70*', '30*'],
                    children:
                    [
                        lengthLabel,
                        addEntryButton
                    ]
                }),
                entryStack,
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
                        let sv = JSON.parse(tmpSys.join(''));
                        tmpSystemName = sv.title;
                        tmpSystemDesc = sv.desc;
                        renderer.constructSystem = new LSystem(sv.system.axiom,
                        sv.system.rules, sv.system.turnAngle,
                        sv.system.seed, sv.system.ignoreList,
                        sv.system.ctxIgnoreList, sv.system.tropism,
                        sv.system.variables);
                        tmpSystem = null;
                        if('config' in sv)
                            renderer.configureStaticCamera(...sv.config);
                        menu.hide();
                    }
                })
            ]
        })
    });
    return menu;
}

let createViewMenu = (title, parentMenu) =>
{
    let systemObj = savedSystems.get(title);
    let values = systemObj.system;
    let tmpDesc = systemObj.desc;
    if(!tmpDesc)
        tmpDesc = getLoc('noDescription');
    let rendererValues = systemObj.config;
    let tmpZE = rendererValues[0];
    let tmpCX = rendererValues[1];
    let tmpCY = rendererValues[2];
    let tmpCZ = rendererValues[3];
    let tmpUpright = rendererValues[4];

    let zoomEntry = ui.createEntry
    ({
        text: tmpZE,
        row: 0,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpZE = nt;
        }
    });
    let camLabel = ui.createLatexLabel
    ({
        text: getLoc('labelCamCentre'),
        row: 1,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let camGrid = ui.createEntry
    ({
        text: tmpCX,
        row: 1,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpCX = nt;
        }
    });
    let camOffLabel = ui.createGrid
    ({
        row: 2,
        column: 0,
        columnDefinitions: ['40*', '30*'],
        children:
        [
            ui.createLatexLabel
            ({
                text: getLoc('labelCamOffset'),
                row: 0,
                column: 0,
                // horizontalTextAlignment: TextAlignment.END,
                verticalTextAlignment: TextAlignment.CENTER
            }),
            ui.createEntry
            ({
                text: tmpCY,
                row: 0,
                column: 1,
                horizontalTextAlignment: TextAlignment.END,
                onTextChanged: (ot, nt) =>
                {
                    tmpCY = nt;
                }
            })
        ]
    });
    let camOffGrid = ui.createEntry
    ({
        text: tmpCZ,
        row: 2,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpCZ = nt;
        }
    });
    let uprightSwitch = ui.createSwitch
    ({
        isToggled: tmpUpright,
        row: 3,
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

    let tmpAxiom = values.axiom;
    let axiomEntry = ui.createEntry
    ({
        text: tmpAxiom,
        row: 0,
        column: 1,
        clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
        onTextChanged: (ot, nt) =>
        {
            tmpAxiom = nt;
        }
    });
    let tmpVars = Object.entries(values.variables);
    let varButton = ui.createButton
    ({
        text: getLoc('btnVar'),
        row: 0,
        column: 2,
        heightRequest: SMALL_BUTTON_HEIGHT,
        onClicked: () =>
        {
            Sound.playClick();
            let varMenu = createVariableMenu(tmpVars);
            varMenu.show();
        }
    });
    let tmpRules = [];
    for(let i = 0; i < values.rules.length; ++i)
        tmpRules[i] = values.rules[i];
    let ruleEntries = [];
    let ruleMoveBtns = [];
    for(let i = 0; i < tmpRules.length; ++i)
    {
        ruleEntries.push(ui.createEntry
        ({
            row: i,
            column: 0,
            text: tmpRules[i],
            clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
            onTextChanged: (ot, nt) =>
            {
                tmpRules[i] = nt;
            }
        }));
        if(i)
        {
            ruleMoveBtns.push(ui.createButton
            ({
                row: i,
                column: 1,
                text: getLoc('btnUp'),
                heightRequest: SMALL_BUTTON_HEIGHT,
                onClicked: () =>
                {
                    Sound.playClick();
                    let tmpRule = ruleEntries[i].text;
                    ruleEntries[i].text = ruleEntries[i - 1].text;
                    ruleEntries[i - 1].text = tmpRule;
                }
            }));
        }
    }
    let rulesLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelRules'), ruleEntries.length),
        verticalTextAlignment: TextAlignment.CENTER,
        margin: new Thickness(0, 12)
    });
    let ruleStack = ui.createGrid
    ({
        columnDefinitions: ['7*', '1*'],
        children: [...ruleEntries, ...ruleMoveBtns]
    });
    let addRuleButton = ui.createButton
    ({
        text: getLoc('btnAdd'),
        row: 0,
        column: 1,
        heightRequest: SMALL_BUTTON_HEIGHT,
        onClicked: () =>
        {
            Sound.playClick();
            let i = ruleEntries.length;
            ruleEntries.push(ui.createEntry
            ({
                row: i,
                column: 0,
                text: '',
                clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
                onTextChanged: (ot, nt) =>
                {
                    tmpRules[i] = nt;
                }
            }));
            if(i)
            {
                ruleMoveBtns.push(ui.createButton
                ({
                    row: i,
                    column: 1,
                    text: getLoc('btnUp'),
                    heightRequest: SMALL_BUTTON_HEIGHT,
                    onClicked: () =>
                    {
                        Sound.playClick();
                        let tmpRule = ruleEntries[i].text;
                        ruleEntries[i].text = ruleEntries[i - 1].text;
                        ruleEntries[i - 1].text = tmpRule;
                    }
                }));
            }
            rulesLabel.text = Localization.format(getLoc('labelRules'),
            ruleEntries.length);
            ruleStack.children = [...ruleEntries, ...ruleMoveBtns];
        }
    });
    let tmpIgnore = values.ignoreList || '';
    let ignoreEntry = ui.createEntry
    ({
        text: tmpIgnore,
        row: 0,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpIgnore = nt;
        }
    });
    let tmpCI = values.ctxIgnoreList || '';
    let CIEntry = ui.createEntry
    ({
        text: tmpCI,
        row: 1,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpCI = nt;
        }
    });
    let tmpAngle = values.turnAngle || '0';
    let angleEntry = ui.createEntry
    ({
        text: tmpAngle.toString(),
        row: 2,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpAngle = nt;
        }
    });
    let tmpTropism = values.tropism || '0';
    let tropismEntry = ui.createEntry
    ({
        text: tmpTropism.toString(),
        row: 3,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpTropism = nt;
        }
    });
    let tmpSeed = values.seed || '0';
    let seedLabel = ui.createGrid
    ({
        row: 4,
        column: 0,
        columnDefinitions: ['40*', '30*'],
        children:
        [
            ui.createLatexLabel
            ({
                text: getLoc('labelSeed'),
                column: 0,
                verticalTextAlignment: TextAlignment.CENTER
            }),
            ui.createButton
            ({
                text: getLoc('btnReroll'),
                column: 1,
                heightRequest: SMALL_BUTTON_HEIGHT,
                onClicked: () =>
                {
                    Sound.playClick();
                    seedEntry.text = globalRNG.nextInt.toString();
                }
            })
        ]
    });
    let seedEntry = ui.createEntry
    ({
        text: tmpSeed.toString(),
        keyboard: Keyboard.NUMERIC,
        row: 4,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpSeed = Number(nt);
        }
    });

    let menu = ui.createPopup
    ({
        title: title,
        isPeekable: true,
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createScrollView
                ({
                    // heightRequest: ui.screenHeight * 0.32,
                    content: ui.createStackLayout
                    ({
                        children:
                        [
                            ui.createLatexLabel
                            ({
                                text: tmpDesc,
                                margin: new Thickness(0, 6),
                                horizontalTextAlignment: TextAlignment.CENTER,
                                verticalTextAlignment: TextAlignment.CENTER
                            }),
                            ui.createGrid
                            ({
                                columnDefinitions: ['20*', '50*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelAxiom'),
                                        row: 0,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    axiomEntry,
                                    varButton
                                ]
                            }),
                            ui.createGrid
                            ({
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    rulesLabel,
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
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    ignoreEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelCtxIgnored'),
                                        row: 1,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    CIEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelAngle'),
                                        row: 2,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    angleEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelTropism'),
                                        row: 3,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    tropismEntry,
                                    seedLabel,
                                    seedEntry
                                ]
                            }),
                            ui.createBox
                            ({
                                heightRequest: 1,
                                margin: new Thickness(0, 6)
                            }),
                            ui.createLatexLabel
                            ({
                                text: getLoc('labelApplyCamera'),
                                // horizontalTextAlignment:
                                // TextAlignment.CENTER,
                                verticalTextAlignment: TextAlignment.CENTER,
                                margin: new Thickness(0, 9)
                            }),
                            ui.createGrid
                            ({
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelFigScale'),
                                        row: 0,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    zoomEntry,
                                    camLabel,
                                    camGrid,
                                    camOffLabel,
                                    camOffGrid,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelUpright'),
                                        row: 3,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    uprightSwitch
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
                    minimumHeightRequest: BUTTON_HEIGHT,
                    columnDefinitions: ['30*', '30*', '30*'],
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
                                renderer.constructSystem = new LSystem(tmpAxiom,
                                tmpRules, tmpAngle, tmpSeed, tmpIgnore, tmpCI,
                                tmpTropism, Object.fromEntries(tmpVars));
                                tmpSystem = null;
                                renderer.configureStaticCamera(tmpZE, tmpCX,
                                tmpCY, tmpCZ, tmpUpright);
                                tmpSystemName = title;
                                tmpSystemDesc = tmpDesc;
                                parentMenu.hide();
                                menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnSave'),
                            row: 0,
                            column: 1,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                savedSystems.set(title,
                                {
                                    desc: tmpDesc,
                                    system: new LSystem(tmpAxiom, tmpRules,
                                    tmpAngle, tmpSeed, tmpIgnore, tmpCI,
                                    tmpTropism, Object.fromEntries(tmpVars)).
                                    object,
                                    config: [tmpZE, tmpCX, tmpCY, tmpCZ,
                                    tmpUpright]
                                });
                                // menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnDelete'),
                            row: 0,
                            column: 2,
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
    });
    return menu;
}

let createSaveMenu = () =>
{
    let savedSystemsLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelSavedSystems'),
        savedSystems.size),
        // horizontalTextAlignment: TextAlignment.CENTER,
        verticalTextAlignment: TextAlignment.CENTER,
        margin: new Thickness(0, 12)
    });
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
                verticalTextAlignment: TextAlignment.CENTER
            }));
            let btn = createViewButton(key);
            btn.row = i;
            btn.column = 1;
            children.push(btn);
            ++i;
        }
        savedSystemsLabel.text = Localization.format(
        getLoc('labelSavedSystems'), savedSystems.size);
        return children;
    };
    let createViewButton = (title) =>
    {
        let btn = ui.createButton
        ({
            text: getLoc('btnView'),
            row: 0,
            column: 1,
            heightRequest: SMALL_BUTTON_HEIGHT,
            onClicked: () =>
            {
                Sound.playClick();
                let viewMenu = createViewMenu(title, menu);
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
        verticalOptions: LayoutOptions.START,
        children: getSystemGrid()
    });
    let systemGridScroll = ui.createScrollView
    ({
        heightRequest: () => Math.max(SMALL_BUTTON_HEIGHT,
        Math.min(ui.screenHeight * 0.32, systemGrid.height)),
        content: systemGrid
    });
    let menu = ui.createPopup
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
                            text: getLoc('labelCurrentSystem'),
                            row: 0,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnClipboard'),
                            row: 0,
                            column: 1,
                            heightRequest: SMALL_BUTTON_HEIGHT,
                            onClicked: () =>
                            {
                                let clipMenu = createSystemClipboardMenu(
                                JSON.stringify(
                                {
                                    title: tmpSystemName,
                                    desc: tmpSystemDesc,
                                    system: renderer.system.object,
                                    config: renderer.staticCamera
                                }));
                                clipMenu.show();
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnSave'),
                            row: 0,
                            column: 2,
                            heightRequest: SMALL_BUTTON_HEIGHT,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                let namingMenu = createNamingMenu();
                                namingMenu.onDisappearing = () =>
                                {
                                    systemGrid.children = getSystemGrid();
                                };
                                namingMenu.show();
                            }
                        })
                    ]
                }),
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                savedSystemsLabel,
                systemGridScroll
            ]
        })
    });
    return menu;
}

let createManualMenu = () =>
{
    let manualPages = getLoc('manual');

    let pageTitle = ui.createLatexLabel
    ({
        text: manualPages[page].title,
        margin: new Thickness(0, 4),
        heightRequest: 20,
        horizontalTextAlignment: TextAlignment.CENTER,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let pageContents = ui.createLabel
    ({
        fontFamily: FontFamily.CMU_REGULAR,
        fontSize: 16,
        text: manualPages[page].contents
    });
    let sourceEntry = ui.createEntry
    ({
        row: 0,
        column: 1,
        text: 'source' in manualPages[page] ? manualPages[page].source : ''
    });
    let sourceGrid = ui.createGrid
    ({
        isVisible: 'source' in manualPages[page],
        columnDefinitions: ['20*', '80*'],
        children:
        [
            ui.createLatexLabel
            ({
                text: getLoc('labelSource'),
                row: 0,
                column: 0,
                horizontalOptions: LayoutOptions.END,
                verticalTextAlignment: TextAlignment.CENTER
            }),
            sourceEntry
        ]
    });
    let prevButton = ui.createButton
    ({
        text: getLoc('btnPrev'),
        row: 0,
        column: 0,
        isVisible: page > 0,
        onClicked: () =>
        {
            Sound.playClick();
            if(page > 0)
                setPage(page - 1);
        }
    });
    let constructButton = ui.createButton
    ({
        text: getLoc('btnConstruct'),
        row: 0,
        column: 1,
        isVisible: page in manualSystems,
        onClicked: () =>
        {
            Sound.playClick();
            let s = manualSystems[page];
            renderer.constructSystem = s.system;
            tmpSystem = null;
            if('config' in s)
                renderer.configureStaticCamera(...s.config);

            tmpSystemName = manualPages[page].title;
            tmpSystemDesc = Localization.format(
            getLoc('manualSystemDesc'), page + 1);
            menu.hide();
        }
    });
    let tocButton = ui.createButton
    ({
        text: getLoc('btnContents'),
        row: 0,
        column: 1,
        isVisible: !(page in manualSystems),
        onClicked: () =>
        {
            Sound.playClick();
            TOCMenu.show();
        }
    });
    let nextButton = ui.createButton
    ({
        text: getLoc('btnNext'),
        row: 0,
        column: 2,
        isVisible: page < manualPages.length - 1,
        onClicked: () =>
        {
            Sound.playClick();
            if(page < manualPages.length - 1)
                setPage(page + 1);
        }
    });
    let setPage = (p) =>
    {
        page = p;
        menu.title = Localization.format(
            getLoc('menuManual'), page + 1,
            getLoc('manual').length
        );
        pageTitle.text = manualPages[page].title;
        pageContents.text =
        manualPages[page].contents;
        
        sourceGrid.isVisible = 'source' in
        manualPages[page];
        sourceEntry.text = 'source' in
        manualPages[page] ?
        manualPages[page].source : '';

        prevButton.isVisible = page > 0;
        nextButton.isVisible = page < manualPages.length - 1;
        constructButton.isVisible = page in manualSystems;
        tocButton.isVisible = !(page in manualSystems);
    };
    let getContentsTable = () =>
    {
        let children = [];
        for(let i = 0; i < contentsTable.length; ++i)
        {
            children.push(ui.createLatexLabel
            ({
                text: manualPages[contentsTable[i]].title,
                row: i,
                column: 0,
                verticalTextAlignment: TextAlignment.CENTER
            }));
            children.push(ui.createButton
            ({
                text: Localization.format(getLoc('btnPage'),
                contentsTable[i] + 1),
                row: i,
                column: 1,
                heightRequest: SMALL_BUTTON_HEIGHT,
                onClicked: () =>
                {
                    Sound.playClick();
                    setPage(contentsTable[i]);
                    TOCMenu.hide();
                }
            }));
        }
        return children;
    };
    let TOCMenu = ui.createPopup
    ({
        title: getLoc('menuTOC'),
        content: ui.createScrollView
        ({
            heightRequest: ui.screenHeight * 0.36,
            content: ui.createGrid
            ({
                columnDefinitions: ['80*', '20*'],
                children: getContentsTable()
            })
        })
    });

    let menu = ui.createPopup
    ({
        title: Localization.format(getLoc('menuManual'), page + 1,
        getLoc('manual').length),
        isPeekable: true,
        content: ui.createStackLayout
        ({
            children:
            [
                pageTitle,
                ui.createFrame
                ({
                    padding: new Thickness(8, 6),
                    heightRequest: ui.screenHeight * 0.32,
                    content: ui.createScrollView
                    ({
                        content: ui.createStackLayout
                        ({
                            children:
                            [
                                pageContents,
                                sourceGrid
                            ]
                        })
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
                        prevButton,
                        constructButton,
                        tocButton,
                        nextButton
                    ]
                })
            ]
        })
    });
    return menu;
}

let createSeqViewMenu = (level) =>
{
    let reconstructionTask =
    {
        start: 0
    };
    let updateReconstruction = () =>
    {
        if(!('result' in reconstructionTask) ||
        ('result' in reconstructionTask && reconstructionTask.start))
        {
            reconstructionTask = renderer.system.reconstruct(
            renderer.levels[level], renderer.levelParams[level],
            reconstructionTask);
        }
        return reconstructionTask.result;
    }
    let pageTitle = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelLevelSeq'), level,
        renderer.levels[level].length),
        margin: new Thickness(0, 4),
        heightRequest: 20,
        horizontalTextAlignment: TextAlignment.CENTER,
        verticalTextAlignment: TextAlignment.CENTER
    });
    let pageContents = ui.createLabel
    ({
        fontFamily: FontFamily.CMU_REGULAR,
        fontSize: 16,
        text: () => updateReconstruction(),
        lineBreakMode: LineBreakMode.CHARACTER_WRAP
    });
    let prevButton = ui.createButton
    ({
        text: getLoc('btnPrev'),
        row: 0,
        column: 0,
        isVisible: level > 0,
        onClicked: () =>
        {
            Sound.playClick();
            if(level > 0)
                setPage(level - 1);
        }
    });
    let nextButton = ui.createButton
    ({
        text: getLoc('btnNext'),
        row: 0,
        column: 1,
        isVisible: level < renderer.levels.length - 1,
        onClicked: () =>
        {
            Sound.playClick();
            if(level < renderer.levels.length - 1)
                setPage(level + 1);
        }
    });
    let setPage = (p) =>
    {
        level = p;
        pageTitle.text = Localization.format(getLoc('labelLevelSeq'), level,
        renderer.levels[level].length);
        reconstructionTask =
        {
            start: 0
        };

        prevButton.isVisible = level > 0;
        nextButton.isVisible = level < renderer.levels.length - 1;
    };

    let menu = ui.createPopup
    ({
        title: tmpSystemName,
        isPeekable: true,
        content: ui.createStackLayout
        ({
            children:
            [
                pageTitle,
                ui.createFrame
                ({
                    padding: new Thickness(8, 6),
                    heightRequest: ui.screenHeight * 0.28,
                    content: ui.createScrollView
                    ({
                        content: ui.createStackLayout
                        ({
                            children:
                            [
                                pageContents
                            ]
                        })
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
                        prevButton,
                        nextButton
                    ]
                })
            ]
        })
    });
    return menu;
}

let createSequenceMenu = () =>
{
    let tmpLvls = [];
    for(let i = 0; i < renderer.levels.length; ++i)
    {
        tmpLvls.push(ui.createLatexLabel
        ({
            text: Localization.format(getLoc('labelLevelSeq'), i,
            renderer.levels[i].length),
            row: i,
            column: 0,
            verticalTextAlignment: TextAlignment.CENTER
        }));
        tmpLvls.push(ui.createButton
        ({
            text: getLoc('btnView'),
            row: i,
            column: 1,
            heightRequest: SMALL_BUTTON_HEIGHT,
            onClicked: () =>
            {
                Sound.playClick();
                let viewMenu = createSeqViewMenu(i);
                viewMenu.show();
            }
        }));
    }
    let seqGrid = ui.createGrid
    ({
        columnDefinitions: ['70*', '30*'],
        children: tmpLvls
    });

    let menu = ui.createPopup
    ({
        title: tmpSystemName,
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createScrollView
                ({
                    heightRequest: () => Math.max(SMALL_BUTTON_HEIGHT,
                    Math.min(ui.screenHeight * 0.36, seqGrid.height)),
                    content: seqGrid
                })
            ]
        })
    });
    return menu;
}

let createStateClipboardMenu = (values) =>
{
    let totalLength = 0;
    let tmpState = [];
    let stateEntries = [];
    for(let i = 0; i * ENTRY_CHAR_LIMIT < values.length; ++i)
    {
        tmpState.push(values.slice(i * ENTRY_CHAR_LIMIT, (i + 1) *
        ENTRY_CHAR_LIMIT));
        stateEntries.push(ui.createEntry
        ({
            text: tmpState[i],
            clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
            onTextChanged: (ot, nt) =>
            {
                tmpState[i] = nt;
                totalLength += (nt ? nt.length : 0) - (ot ? ot.length : 0);
                lengthLabel.text = Localization.format(getLoc(
                'labelTotalLength'), totalLength);
            }
        }));
    }
    let lengthLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelTotalLength'), totalLength),
        verticalTextAlignment: TextAlignment.CENTER,
        margin: new Thickness(0, 12)
    });
    let entryStack = ui.createStackLayout
    ({
        children: stateEntries
    });
    let addEntryButton = ui.createButton
    ({
        text: getLoc('btnAdd'),
        row: 0,
        column: 1,
        heightRequest: SMALL_BUTTON_HEIGHT,
        onClicked: () =>
        {
            Sound.playClick();
            let i = stateEntries.length;
            tmpState[i] = '';
            stateEntries.push(ui.createEntry
            ({
                text: tmpState[i],
                clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
                onTextChanged: (ot, nt) =>
                {
                    tmpState[i] = nt;
                    totalLength += (nt ? nt.length : 0) - (ot ? ot.length : 0);
                    lengthLabel.text = Localization.format(getLoc(
                    'labelTotalLength'), totalLength);
                }
            }));
            entryStack.children = stateEntries;
        }
    });

    let menu = ui.createPopup
    ({
        title: getLoc('menuClipboard'),
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    columnDefinitions: ['70*', '30*'],
                    children:
                    [
                        lengthLabel,
                        addEntryButton
                    ]
                }),
                entryStack,
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createButton
                ({
                    text: getLoc('btnImport'),
                    onClicked: () =>
                    {
                        Sound.playClick();
                        setInternalState(tmpState.join(''));
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
    let tmpOD = offlineReset;
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
    let tmpAC = altTerEq;
    let ACLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelTerEq'),
        getLoc('terEqModes')[Number(tmpAC)]),
        row: 2,
        column: 0,
        verticalTextAlignment: TextAlignment.CENTER
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
    let tmpMP = measurePerformance;
    let MPSwitch = ui.createSwitch
    ({
        isToggled: tmpMP,
        row: 3,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpMP = !tmpMP;
                MPSwitch.isToggled = tmpMP;
            }
        }
    });
    let tmpDCP = debugCamPath;
    let DCPSwitch = ui.createSwitch
    ({
        isToggled: tmpDCP,
        row: 4,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpDCP = !tmpDCP;
                DCPSwitch.isToggled = tmpDCP;
            }
        }
    });
    let tmpMCPT = maxCharsPerTick;
    let MCPTEntry = ui.createEntry
    ({
        text: tmpMCPT.toString(),
        keyboard: Keyboard.NUMERIC,
        row: 5,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpMCPT = Number(nt);
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
                    // rowDefinitions: [40, 40, 40, 40],
                    children:
                    [
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelOfflineReset'),
                            row: 0,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        ODSwitch,
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelResetLvl'),
                            row: 1,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        RLSwitch,
                        ACLabel,
                        ACSwitch,
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelMeasure'),
                            row: 3,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        MPSwitch,
                        ui.createLatexLabel
                        ({
                            text: getLoc('debugCamPath'),
                            row: 4,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        DCPSwitch,
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelMaxCharsPerTick'),
                            row: 5,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        MCPTEntry,
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelInternalState'),
                            row: 6,
                            column: 0,
                            verticalTextAlignment: TextAlignment.CENTER
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnClipboard'),
                            row: 6,
                            column: 1,
                            heightRequest: SMALL_BUTTON_HEIGHT,
                            onClicked: () =>
                            {
                                let clipMenu = createStateClipboardMenu(
                                getInternalState());
                                clipMenu.show();
                            }
                        }),
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
                        offlineReset = tmpOD;
                        resetLvlOnConstruct = tmpRL;
                        altTerEq = tmpAC;
                        if(tmpMP != measurePerformance && tmpMP)
                        {
                            drawMeasurer.reset();
                            camMeasurer.reset();
                        }
                        measurePerformance = tmpMP;
                        if(tmpDCP != debugCamPath)
                            renderer.reset();
                        debugCamPath = tmpDCP;
                        maxCharsPerTick = tmpMCPT;
                        menu.hide();
                    }
                })
            ]
        })
    });
    return menu;
}

var getInternalState = () => JSON.stringify
({
    version: version,
    time: time,
    page: page,
    offlineReset: offlineReset,
    altTerEq: altTerEq,
    tickDelayMode: tickDelayMode,
    resetLvlOnConstruct: resetLvlOnConstruct,
    measurePerformance: measurePerformance,
    debugCamPath: debugCamPath,
    maxCharsPerTick: maxCharsPerTick,
    renderer: renderer.object,
    system: tmpSystem ?
    {
        title: tmpSystemName,
        desc: tmpSystemDesc,
        ...tmpSystem.object
    } :
    {
        title: tmpSystemName,
        desc: tmpSystemDesc,
        ...renderer.system.object
    },
    savedSystems: Object.fromEntries(savedSystems)
});

var setInternalState = (stateStr) =>
{
    if(!stateStr)
        return;

    let values = stateStr.split('\n');

    let worldValues = values[0].split(' ');
    let stateVersion = 0;
    if(worldValues.length > 0)
        stateVersion = Number(worldValues[0]);

    if(isNaN(stateVersion))
    {
        let state = JSON.parse(stateStr);
        log(`Loading JSON state (version: ${state.version})`);
        if('time' in state)
            time = state.time;
        if('page' in state)
            page = state.page;
        if('offlineReset' in state)
            offlineReset = state.offlineReset;
        if('altTerEq' in state)
            altTerEq = state.altTerEq;
        if('tickDelayMode' in state)
            tickDelayMode = state.tickDelayMode;
        if('resetLvlOnConstruct' in state)
            resetLvlOnConstruct = state.resetLvlOnConstruct;
        if('measurePerformance' in state)
            measurePerformance = state.measurePerformance;
        if('debugCamPath' in state)
            debugCamPath = state.debugCamPath;
        if('maxCharsPerTick' in state)
            maxCharsPerTick = state.maxCharsPerTick;
        
        if('system' in state)
        {
            tmpSystemName = state.system.title;
            tmpSystemDesc = state.system.desc;
            tmpSystem = new LSystem(state.system.axiom, state.system.rules,
            state.system.turnAngle, state.system.seed, state.system.ignoreList,
            state.system.ctxIgnoreList, state.system.tropism,
            state.system.variables);
        }
        
        if('renderer' in state)
        {
            renderer = new Renderer(new LSystem(), state.renderer.figureScale,
            state.renderer.cameraMode, state.renderer.camX, state.renderer.camY,
            state.renderer.camZ, state.renderer.followFactor,
            state.renderer.loopMode, state.renderer.upright,
            state.renderer.quickDraw, state.renderer.quickBacktrack,
            state.renderer.loadModels, state.renderer.backtrackTail,
            state.renderer.hesitateApex, state.renderer.hesitateFork);
        }
        else
            renderer = new Renderer(system);

        if('savedSystems' in state)
            savedSystems = new Map(Object.entries(state.savedSystems));
    }
    // Doesn't even need checking the version number; if it appears at all then
    // it's definitely written before switching to JSON
    else
    {
        log(`Loading space-separated state (version: ${stateVersion})`);
        if(worldValues.length > 1)
            time = Number(worldValues[1]);
        if(worldValues.length > 2)
            page = Number(worldValues[2]);
        if(worldValues.length > 3)
            offlineReset = Boolean(Number(worldValues[3]));
        if(worldValues.length > 4)
            altTerEq = Boolean(Number(worldValues[4]));
        if(worldValues.length > 5)
            tickDelayMode = Boolean(Number(worldValues[5]));        
        if(worldValues.length > 6)
            resetLvlOnConstruct = Boolean(Number(worldValues[6]));
        let noofSystems = 0;
        if(worldValues.length > 7)
            noofSystems = Number(worldValues[7]);

        if(values.length > 1)
        {
            let rv = values[1].split(' ');
            if(rv.length > 2)
                rv[2] = Number(rv[2]);  // cameraMode
            if(rv.length > 6)
                rv[6] = Number(rv[6]);
            if(rv.length > 7)
                rv[7] = Number(rv[7]);
            if(rv.length > 8)
                rv[8] = Boolean(Number(rv[8]));
            if(rv.length > 9)
                rv[9] = Boolean(Number(rv[9]));
            if(rv.length > 10)
                rv[10] = Boolean(Number(rv[10]));
            if(rv.length > 12)  // camera offset
                rv[3] = `${rv[3]}*${rv[0]}*${rv[1]}^lv+${rv[12]}`;
            if(rv.length > 13)
                rv[4] = `${rv[4]}*${rv[0]}*${rv[1]}^lv+${rv[13]}`;
            if(rv.length > 14)
                rv[5] = `${rv[5]}*${rv[0]}*${rv[1]}^lv+${rv[14]}`;
                rv[1] = `${rv[0]}*${rv[1]}^lv`;
            if(rv.length > 15)
                rv[12] = Boolean(Number(rv[15]));
            
            for(let i = 13; i < rv.length; ++i)
                rv[i] = undefined;

            if(stateVersion < 0.2)
            {
                if(values.length > 2)
                {
                    let systemValues = values[2].split(' ');
                    let system = new LSystem(systemValues[0],
                    systemValues.slice(3), Number(systemValues[1]),
                    Number(systemValues[2]));
                    renderer = new Renderer(system, ...rv.slice(1));
                }
                else
                    renderer = new Renderer(new LSystem(), ...rv.slice(1));
            }
            else
            {
                if(values.length > 2)
                    tmpSystemName = values[2];
                if(values.length > 3)
                    tmpSystemDesc = values[3];
                if(values.length > 4)
                {
                    let systemValues = values[4].split(' ');
                    let system = new LSystem(systemValues[0],
                    systemValues.slice(3), Number(systemValues[1]),
                    Number(systemValues[2]));
                    renderer = new Renderer(system, ...rv.slice(1));
                }
                else
                    renderer = new Renderer(new LSystem(), ...rv.slice(1));
            }
        }
        
        if(stateVersion < 0.2)
        {
            // Load everything.
            for(let i = 0; 4 + i * 2 < values.length; ++i)
                savedSystems.set(values[3 + i * 2],
                {
                    desc: getLoc('noDescription'),
                    system: values[4 + i * 2],
                    config: ['1', '0', '0', '0', false]
                });
        }
        else
        {
            for(let i = 0; i < noofSystems; ++i)
            {
                let rv = values[9 + i * 5].split(' ');
                if(rv.length > 5)
                    rv[2] = `${rv[2]}*${rv[0]}*${rv[1]}^lv+${rv[5]}`;
                if(rv.length > 6)
                    rv[3] = `${rv[3]}*${rv[0]}*${rv[1]}^lv+${rv[6]}`;
                if(rv.length > 7)
                {
                    rv[4] = `${rv[4]}*${rv[0]}*${rv[1]}^lv+${rv[7]}`;
                    rv[1] = `${rv[0]}*${rv[1]}^lv`;
                }
                if(rv.length > 8)
                    rv[5] = Boolean(Number(rv[8]));
                
                for(let i = 6; i < rv.length; ++i)
                    rv[i] = undefined;

                savedSystems.set(values[6 + i * 5], {
                    desc: values[7 + i * 5],
                    system: values[8 + i * 5],
                    config: rv.slice(1)
                });
            }
        }
    }
}

var canResetStage = () => true;

var getResetStageMessage = () => getLoc('resetRenderer');

var resetStage = () => renderer.reset();

var getTertiaryEquation = () =>
{
    if(altTerEq)
        return renderer.oriString;

    return renderer.stateString;
}

var get3DGraphPoint = () =>
{
    if(debugCamPath)
        return -renderer.camera;
    
    return renderer.cursor;
}

var get3DGraphTranslation = () =>
{
    if(measurePerformance)
        camMeasurer.stamp();

    let result = renderer.camera;

    if(measurePerformance)
        camMeasurer.stamp();

    return result;
}

init();

let testDerive = () =>
{
    let a = new LSystem('[+(30)G]F/(180)A(2)', [
        'A(t):t<=5=[+(30)G]F/(180)A(t+2):0.5,[-(30)G]F\\(180)A(t+2):0.4,:0,C:0'
    ], 30, 1);
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

    let b0 = 'X';
    let b0p = [null];
    let bt0 = arrow.getAncestree(b0);
    tmpDeriv = arrow.derive(b0, b0p, bt0.ancestors, bt0.children, 0);
    let b1 = tmpDeriv.result;
    let b1p = tmpDeriv.params;
    log(arrow.reconstruct(b1, b1p));

    let bt1 = arrow.getAncestree(b1);
    tmpDeriv = arrow.derive(b1, b1p, bt1.ancestors, bt1.children, 0);
    let b2 = tmpDeriv.result;
    let b2p = tmpDeriv.params;
    log(arrow.reconstruct(b2, b2p));
}

let testQuaternion = () =>
{
    // Normalisation = off
    let a = new Quaternion().rotate(60, '+').rotate(60, '+');
    let b = new Quaternion().rotate(120, '+');
    // Round 1 results:
    // [10:56:40] 60 + 60:
    // 0.500 + 0.000i + 0.000j + -0.87k
    // (-0.5, 0.866025403784439, 0)
    // [10:56:40] 120:
    // -0.50 + 0.000i + 0.000j + 0.866k
    // (-0.5, 0.866025403784439, 0)
    a = a.rotate(60, '+').rotate(60, '+');
    b = b.rotate(120, '+');
    // Round 2 results:
    // [10:58:17] 60 + 60:
    // -0.50 + 0.000i + 0.000j + -0.87k
    // (-0.500000000000001, -0.866025403784438, 0)
    // [10:58:17] 120:
    // -0.50 + 0.000i + 0.000j + -0.87k
    // (-0.500000000000001, -0.866025403784438, 0)
    a = a.rotate(60, '+').rotate(60, '+');
    b = b.rotate(120, '+');
    // Round 3 results:
    // [10:59:03] 60 + 60:
    // -1.00 + 0.000i + 0.000j + 0.000k
    // (1, -1.11022302462516E-15, 0)
    // [10:59:03] 120:
    // 1.000 + 0.000i + 0.000j + 0.000k
    // (1, -7.7715611723761E-16, 0)
    a = a.rotate(60, '+').rotate(60, '+');
    b = b.rotate(120, '+');
    // Round 4 results:
    // [11:00:54] 60 + 60:
    // -0.50 + 0.000i + 0.000j + 0.866k
    // (-0.499999999999999, 0.866025403784439, 0)
    // [11:00:54] 120:
    // -0.50 + 0.000i + 0.000j + 0.866k
    // (-0.499999999999999, 0.866025403784439, 0)
    a = a.rotate(60, '+').rotate(60, '+');
    b = b.rotate(120, '+');
    // Round 5 results:
    // [11:01:45] 60 + 60:
    // 0.500 + 0.000i + 0.000j + 0.866k
    // (-0.500000000000002, -0.866025403784438, 0)
    // [11:01:45] 120:
    // -0.50 + 0.000i + 0.000j + -0.87k
    // (-0.500000000000001, -0.866025403784438, 0)
    a = a.rotate(60, '+').rotate(60, '+');
    b = b.rotate(120, '+');
    // Round 6 results:
    // [11:02:19] 60 + 60:
    // 1.000 + 0.000i + 0.000j + 0.000k
    // (1, -2.22044604925031E-15, 0)
    // [11:02:19] 120:
    // 1.000 + 0.000i + 0.000j + 0.000k
    // (1, -1.77635683940025E-15, 0)

    log(`60 + 60:\n${a.toString()}\n${a.headingVector.toString()}`);
    log(`120:\n${b.toString()}\n${b.headingVector.toString()}`);
}

let testQuaternion2 = () =>
{
    // Normalisation = off
    let a = new Quaternion().rotate(60, '+').rotate(60, '+').rotate(120, '-');
    // Round 1 results:
    // [11:05:41] 60 + 60 - 120:
    // -1.00 + 0.000i + 0.000j + 0.000k
    // (1, -1.11022302462516E-16, 0)
    a = a.rotate(60, '+').rotate(60, '+').rotate(120, '-');
    // Round 2 results:
    // [11:07:00] 60 + 60 - 120:
    // 1.000 + 0.000i + 0.000j + 0.000k
    // (1, -1.11022302462516E-16, 0)
    a = a.rotate(60, '+').rotate(60, '+').rotate(120, '-');
    // Round 3 results:
    // [11:07:31] 60 + 60 - 120:
    // -1.00 + 0.000i + 0.000j + 0.000k
    // (1, -1.11022302462516E-16, 0)
    log(`60 + 60 - 120:\n${a.toString()}\n${a.headingVector.toString()}`);
    // Results are exact same if replaced with BigNumber.from(120).toNumber().
}

let testQuaternion3 = () =>
{
    // Normalisation = off
    let a = new Quaternion().rotate(60, '+').rotate(120, '-').rotate(60, '+');
    for(let i = 0; i < 1000; ++i)
        a = a.rotate(60, '+').rotate(120, '-').rotate(60, '+');

    // [11:12:20] 60 - 120 + 60:
    // -1.00 + 0.000i + 0.000j + 0.000k
    // (1, -2.22044604925031E-16, 0)
    log(`60 - 120 + 60:\n${a.toString()}\n${a.headingVector.toString()}`);
}

let testVector = () =>
{
    // Normalisation = off
    let state = new Vector3(0, 0, 0);
    let ori = new Quaternion();
    for(let i = 0; i < 180; ++i)
    {
        state += ori.headingVector;
        ori = ori.rotate(120, '+');
        state += ori.headingVector;
        ori = ori.rotate(120, '-');
        state += ori.headingVector;
        ori = ori.rotate(120, '-');
        state += ori.headingVector;
        ori = ori.rotate(120, '+');
        state += ori.headingVector;
        ori = ori.rotate(120, '+');
        state += ori.headingVector;
        state += ori.headingVector;
        ori = ori.rotate(120, '+');
        state += ori.headingVector;
        state += ori.headingVector;
        ori = ori.rotate(120, '+');
        if(i % 10 == 9)
            log(`Error ${i}: ${state.x} ${state.y}`);
    }
    // [11:30:13] Error 9: -8.881784197001252e-16 6.8833827526759706e-15
    // [11:30:14] Error 19: -1.7763568394002505e-15 1.2656542480726785e-14
    // [11:30:14] Error 29: 1.7763568394002505e-15 1.887379141862766e-14
    // [11:30:14] Error 39: 3.9968028886505635e-15 2.55351295663786e-14
    // [11:30:14] Error 49: 4.884981308350689e-15 3.2862601528904634e-14
    // [11:30:14] Error 59: 7.327471962526033e-15 3.907985046680551e-14
    // [11:30:14] Error 69: 8.881784197001252e-15 4.707345624410664e-14
    // [11:30:14] Error 79: 1.199040866595169e-14 5.484501741648273e-14
    // [11:30:14] Error 89: 1.3322676295501878e-14 6.150635556423367e-14
    // [11:30:14] Error 99: 1.4654943925052066e-14 6.816769371198461e-14
    // [11:30:14] Error 109: 1.6431300764452317e-14 7.527312106958561e-14
    // [11:30:14] Error 119: 1.8207657603852567e-14 8.193445921733655e-14
    // [11:30:14] Error 129: 1.9539925233402755e-14 8.948397578478762e-14
    // [11:30:14] Error 139: 2.2648549702353193e-14 9.614531393253856e-14
    // [11:30:14] Error 149: 2.3092638912203256e-14 1.0347278589506459e-13
    // [11:30:14] Error 159: 2.531308496145357e-14 1.1013412404281553e-13
    // [11:30:14] Error 169: 2.708944180085382e-14 1.1723955140041653e-13
    // [11:30:14] Error 179: 2.9753977059954195e-14 1.2523315717771766e-13
}

let testVector2 = () =>
{
    let state = new Vector3(0, 0, 0);
    let ori = new Quaternion();

    state += ori.headingVector;
    log(`${state.x} ${state.y}`);
    ori = ori.rotate(120, '+');
    state += ori.headingVector;
    log(`${state.x} ${state.y}`);
    ori = ori.rotate(120, '-');
    state += ori.headingVector;
    log(`${state.x} ${state.y}`);
    ori = ori.rotate(120, '-');
    state += ori.headingVector;
    log(`${state.x} ${state.y}`);
    ori = ori.rotate(120, '+');
    state += ori.headingVector;
    log(`${state.x} ${state.y}`);
    ori = ori.rotate(120, '+');
    state += ori.headingVector;
    log(`${state.x} ${state.y}`);
    state += ori.headingVector;
    log(`${state.x} ${state.y}`);
    ori = ori.rotate(120, '+');
    state += ori.headingVector;
    log(`${state.x} ${state.y}`);
    state += ori.headingVector;
    log(`${state.x} ${state.y}`);

    // [11:39:17] 1 0
    // [11:39:17] 0.5000000000000002 0.8660254037844388
    // [11:39:17] 1.5000000000000002 0.8660254037844388
    // [11:39:17] 1.0000000000000004 0
    // [11:39:17] 2.0000000000000004 0
    // [11:39:17] 1.5000000000000007 0.8660254037844388
    // [11:39:17] 1.0000000000000009 1.7320508075688776
    // [11:39:17] 0.5000000000000003 0.8660254037844392
    // [11:39:17] -2.220446049250313e-16 6.661338147750939e-16

    // Renderer results:
    // [11:40:39] 1 0
    // [11:40:39] 0.4951538954001423 0.8632093666488738
    // [11:40:39] 1.4951538954001427 0.8632093666488738
    // [11:40:40] 0.9903077908002847 -3.3306690738754696e-16
    // [11:40:40] 1.9903077908002853 -4.440892098500626e-16
    // [11:40:40] 1.4854616862004275 0.8632093666488738
    // [11:40:40] 0.9806155816005697 1.726418733297748
    // [11:40:40] 0.4903547602598699 0.8548429608841593
    // [11:40:40] 0.00009393891917008901 -0.016732811529429403

    // Rotation half-angle: 120 -> 1.0471975511965976
    // System half-angle: 120 -> 1.05
}

let testAngle = () =>
{
    let straightNum = 120;
    let bigNumConvert = BigNumber.from('120').toNumber();
    let expressionResult = MathExpression.parse('120').evaluate().toNumber();
    log(`${straightNum} vs. ${bigNumConvert} vs. ${expressionResult}`);
}
