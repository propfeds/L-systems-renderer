/*
L-systems Renderer implementation in Exponential Idle.

Disclaimer: Differences between LSR and other L-system implementations all
around the web.
- / and \ may be swapped.
- + turns anti-clockwise, - turns clockwise.
- \ and / are used instead of < and >.
- Y-up is used here instead of Z-up.
- Quaternions are used instead of actually intuitive concepts such as matrices.
- Quaternions maths are absolutely butchered.

(c) 2022 Temple of Pan (R) (TM) All rights reversed.
*/

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

var id = 'L_systems_renderer';
var getName = (language) =>
{
    let names =
    {
        en: 'L-systems Renderer',
    };

    return names[language] || names.en;
}
var getDescription = (language) =>
{
    let descs =
    {
        en:
`An educational tool that allows you to model plants and other fractal figures.

Supported L-system features:
- Stochastic (randomised) rules
- 3D turtle controls
- Polygon modelling

Other features:
- Can save a whole army of systems!
- Camera modes: static and turtle-following
- Drawing speed and advanced stroke options!

Warning: v0.20 might break your internal state. Be sure to back it up, and ` +
`in case it's corrupted, please contact me.`,
    };

    return descs[language] || descs.en;
}
var authors =   'propfeds#5988\n\nThanks to:\nSir Gilles-Philippe Paillé, ' +
                'for providing help with quaternions\nskyhigh173#3120, for ' +
                'suggesting clipboard and JSON internal state formatting';
var version = 1;

let time = 0;
let page = 0;
let offlineReset = true;
let gameIsOffline = false;
let altTerEq = false;
let tickDelayMode = false;
let resetLvlOnConstruct = true;
let measurePerformance = false;
let debugCamPath = false;
let maxCharsPerTick = 5000;
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
const BACKTRACK_LIST = new Set('+-&^\\/|[$T');
const locStrings =
{
    en:
    {
        versionName: 'v1.0, Work in Progress',
        welcomeSystemName: 'Arrow',
        welcomeSystemDesc: 'Welcome to L-systems Renderer!',
        equationOverlayLong: '{0} – {1}\n\n{2}\n\n{3}',
        equationOverlay: '{0}\n\n{1}',

        rendererLoading: `\\begin{{matrix}}Loading...&\\text{{Lv. {0}}}&({1}
\\text{{ chars}})\\end{{matrix}}`,

        currencyTime: ' (elapsed)',

        varLvDesc: '\\text{{Level: }}{0}{1}',
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

        menuSequence: '{0} (Level {1})',
        labelLevelSeq: 'Level {0}: {1} chars',
        labelChars: '({0} chars)',

        menuLSystem: 'L-system Menu',
        labelAxiom: 'Axiom: ',
        labelAngle: 'Turning angle (°): ',
        labelRules: 'Production rules: {0}',
        labelIgnored: 'Ignored symbols: ',
        labelTropism: 'Tropism (gravity): ',
        labelSeed: 'Seed (≠ 0): ',

        menuRenderer: 'Renderer Menu',
        labelInitScale: '* Initial scale: ',
        labelFigScale: '* Figure scale: ',
        labelCamMode: 'Camera mode: {0}',
        camModes: ['Fixed', 'Linear', 'Quadratic'],
        labelCamCentre: 'Fixed camera centre (x,): ',
        labelCamOffset: '... centre (y, z): ',
        labelFollowFactor: 'Follow factor (0-1): ',
        labelLoopMode: 'Looping mode: {0}',
        loopModes: ['Off', 'Level', 'Playlist'],
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
        labelResetLvl: 'Reset level on construction: ',
        labelTerEq: 'Tertiary equation: {0}',
        terEqModes: ['Coordinates', 'Orientation'],
        labelMeasure: 'Measure performance: ',
        debugCamPath: 'Debug camera path: ',
        labelMaxCharsPerTick: 'Maximum loaded chars/tick: ',
        labelInternalState: 'Internal state: ',

        menuManual: 'User Guide ({0}/{1})',
        menuTOC: 'Table of Contents',
        labelSource: 'Source: ',
        manualSystemDesc: 'User guide, page {0}.',
        manual:
        [
            {
                title: 'Introduction',
                contents:
`Welcome to the (Classic) L-systems Renderer! This guide aims to help you ` +
`understand the basics of L-systems, as well as instructions on how to ` +
`effectively use this theory to construct and render them.

Let's start discovering the wonders of L-systems (and the renderer).

Notice: A gallery for L-systems has opened! Visit page 28 for details.`
            },
            {
                title: 'Controls: Theory screen',
                contents:
`The theory screen consists of the renderer and its controls.

Level: the iteration/generation/stage of the system. Pressing + or - will ` +
`derive/revert the system.
- Pressing the Level button will reveal all levels of the system.
- Holding + or - will buy/refund levels in bulks of 10.

Tickspeed: controls the renderer's drawing speed (up to 10 lines/sec, which ` +
`produces less accurate lines).
- Pressing the Tickspeed button will toggle between Tickspeed and Tick ` +
`length modes.
- Holding - will create an 'anchor' on the current level before setting it ` +
`to 0, pausing the renderer. Holding + afterwards will return the renderer ` +
`to the previously anchored speed.

Reset: located on the top right. Pressing this button will reset the renderer.

Menu buttons: You pressed on one of them to get here, did you?
- L-system menu: allows you to edit the currently displayed system.
- Renderer menu: configures the camera along with other renderer behaviour.
- Save/load: store your favourite L-systems here.
- Settings: configure general options for the theory.`
            },
            {
                title: 'Configuring the L-system',
                contents:
`Design your L-system using the L-systems menu.

- Axiom: the system's starting sequence.
- Turning angle: the angle the turtle turns when turns the turtle (in degrees).
- Production rules: an unlimited number of rules can be added using the ` +
`'Add' button.
- Ignored symbols: the turtle will stand still when encountering these symbols.
- Tropism (gravity): determines the amount of gravity applied by the tropism ` +
`(T) command.
- Seed: determines the seed for a stochastic system. Can be manually set or ` +
`rerolled.

Note: Any blank rules will be trimmed afterwards.`
            },
            {
                title: 'Configuring the renderer',
                contents:
`Configure the visual representation of your L-system with the Renderer menu.

Camera options:
- Figure scale: determines the zoom level's inverse using a formula. For ` +
`instance, a figure scale of 2^lv will zoom the figure out by a factor of ` +
`2 every level.
- Camera mode: toggles between Fixed, Linear and Quadratic. The latter two ` +
`modes follow the turtle.
- Fixed camera centre: determines camera position in Fixed mode using a ` +
`written formula similar to figure scale.
- Follow factor: changes how quickly the camera follows the turtle.
- Upright figure: rotates the figure by 90 degrees counter-clockwise around ` +
`the z-axis so that it heads upwards.

Renderer logic:
- Looping mode: the Level mode repeats a single level, while the Playlist ` +
`mode draws levels consecutively.
- Draw tail end: whether to draw the last backtrack after finishing the ` +
`sequence.

Advanced stroke options:
- Quickdraw: skips over straight consecutive segments.
- Quick backtrack: works similarly, but on the way back.
- Stutter at apex: pause for one tick at the tips of lines.
- Stutter at fork: pause for one tick after backtracking through branches.`
            },
            {
                title: 'Saving and loading',
                contents:
`The Save/load menu allows you to save your favourite L-systems along with ` +
`their camera configurations.

- Clipboard: allows you to export the system as a string to share with your ` +
`fellow gardeners, or import one from them for personal consumption.
Warning: The entry can only hold up to 5000 characters.
- Save: set the title and description for a new system, or overwrite one of ` +
`the existing ones.
- View: allows you to edit, load and delete saved systems.`
            },
            {
                title: 'Theory settings',
                contents:
`The Settings menu contain several general options for the theory.

- Reset graph on tabbing in: when this option is turned off, the graph will ` +
`resume the current drawing after the game enters focus, assuming it does ` +
`not close itself by then. The theory will not draw when the game is not in ` +
`focus, regardless of this setting.
- Reset level on construction: this option is generally turned on for ` +
`safety, however, if you are trying to design and edit systems for a while, ` +
`it is recommended to turn it off for convenience.
- Tertiary equation: switches between the display of turtle coordinates and ` +
`orientation (quaternion).
- Measure performance: displays performance statistics at the top of the ` +
`screen.
- Maximum loaded chars/tick: adjusts how fast a system loads, in order to ` +
`prevent 'Maximum statements' errors from occuring.
- Internal state: allows you to export the entire save data.
Warning: The entry can only hold up to 5000 characters.`
            },
            {
                title: 'L-systems: A primer',
                contents:
`Developed in 1968 by biologist Aristid Lindenmayer, an L-system is a formal ` +
`grammar that describes the growth of a sequence (string). It is often used ` +
`to model plants and draw fractal figures.

Every L-system starts with a sequence, called the axiom. From the axiom, the ` +
`sequence grows according to a set of production rules that describe how ` +
`each symbol (character) in the sequence would be rewritten in the next level.
Each rule is represented in the form of:
{symbol} = {derivation(s)}

Considering a simple system with the axiom of b and the rules:
b = a
a = ab,
the sequence will grow as follows:
Level 0: b
Level 1: a
Level 2: ab
Level 3: aba
Level 4: abaab
Level 5: abaababa`
            },
            {
                title: 'L-system and turtle graphics',
                contents:
`Owing to its sequential nature, an L-system can be represented as a list of ` +
`instructions when read by a turtle. Not that the turtle can actually ` +
`comprehend this crap though.

Here are the basic symbols and their respective instructions:
F: moves turtle forward to draw a line of length 1.
+: rotates turtle counter-clockwise by an angle.
-: rotates turtle clockwise by an angle.

Note: In the original grammar, the lower-case f is used to move the turtle ` +
`forward without drawing anything, but that is simply impossible with this ` +
`game's 3D graph. So in this theory, any non-reserved symbol will draw a ` +
`line. This includes both upper- and lower-case letters (except T), and ` +
`potentially anything you can throw at it.`
            },
            {
                title: 'Example: The dragon curve',
                contents:
`Also known as the Heighway dragon, the curve was first discovered by John ` +
`Heighway in 1966, along with two fellow physicists in NASA, William Harter ` +
`and Bruce Banks.

Legends have it, that when you fold a thin piece of paper at the middle over ` +
`and over again, and then release it while making sure every fold is exactly ` +
`90°, a dragon would spawn. But be careful, as every time you fold, although ` +
`the dragon gets thicker, its 'length' would shrink by a factor of sqrt(2).

Press 'Construct' to see the dragon in action.

Axiom: FX
Y = -FX-Y
X = X+YF+
Turning angle: 90°

Applies static camera:
Scale: 4*sqrt(2)^lv
Centre: (0, 0, 0)`
            },
            {
                title: 'Example: Sierpiński triangle',
                contents:
`The Sierpiński triangle (or gasket/sieve) is a fractal of an equilateral ` +
`triangle containing equilateral triangles inside it, containing equilateral ` +
`triangles inside it, containing equilateral triangles.
Did you know that when you take Pascal's triangle then select only the even ` +
`numbers, the Sierpiński triangle will appear?

Axiom: X
X = +Y-X-Y+
Y = -X+Y+X-
Turning angle: 60°

Applies static camera:
Scale: 2^lv
Centre: (0.5*2^lv, sqrt(3)/4*2^lv, 0)`
            },
            {
                title: 'Branching mechanisms',
                contents:
`Although numerous fractals can be created using only the basic symbols, ` +
`when it comes to modelling branching structures such as trees, the turtle ` +
`wishes it could be split in two... Using a stack mechanism, we can ` +
`essentially allow the turtle to return to a point in the past to take on a ` +
`new path.

Stack operations are represented with square brackets:
[: records the turtle's position and facing onto a stack.
]: take the topmost element (position and facing) off the stack, and move ` +
`the turtle there.
%: cuts off the remainder of a branch, by deleting every symbol up until ` +
`the closing bracket ] in the branch.

Note: Due to the game's 3D graph only allowing one continuous path to be ` +
`drawn, the turtle will not actually divide itself, but instead backtrack ` +
`through the old path.`
            },
            {
                title: 'Example: Arrow weed',
                contents:
`Meet the default system, now standing upright like a real tree.
The symbol F here represents the stem and branches, which expand to twice ` +
`their size every level. Meanwhile X, sitting at the top of each branch, ` +
`represents what's known as a vegetative apex - the tip of an axis (stem or ` +
`branch) that grows into new branches and leaves.
Let's try cutting its branches off using %!

Axiom: X
F = FF
X = F[+X][-X]FX
Turning angle: 30°

Applies static camera:
Scale: 1.5*2^lv
Centre: (0, 1.2*2^lv, 0)
Upright`
            },
            {
                title: 'Stochastic L-systems',
                contents:
`When it comes to modelling vegetative structures, sometimes the mimicking ` +
`of environment variables in their growth process is needed. Stochastic ` +
`L-systems offer a simplified approach to this by introducing randomness to ` +
`a plant's shape.

To create a stochastic rule for an L-system, simply list several derivations ` +
`within the rule, separated by commas:
{symbol} = {derivation_0}, {derivation_1}, ...

When the system is grown, one of the possible derivations will be randomly ` +
`selected (with equal chance) for each symbol. The selection process is ` +
`controlled by the system's seed.

A system's seed can either be changed manually within the L-systems menu, or ` +
`randomly reassigned using the 'Reroll' button on the top right corner of ` +
`the theory screen.

Note: setting the seed to 0 will disable the random generation.`
            },
            {
                title: 'Example: Stochastic tree',
                contents:
`This tree generates a random shape every time it rolls.

Axiom: X
F = FF
X = F-[[X]+X]+F[+FX]-X, F+[[X]-X]-F[-FX]+X
Turning angle: 22.5°

Applies static camera:
Scale: 1.5*2^lv
Centre: (0, 1.2*2^lv, 0)
Upright`
            },
            {
                title: 'Example: Snowflake',
                contents:
`Honey I told you every snowflake is different can you stop licking them please

Axiom: [X]+[X]+[X]+[X]+[X]+[X]
X = F[+F][-F]X
F = F[+i][-i]F
i = Ii, IIi
Turning angle: 60°
Ignored: i

Applies static camera:
Scale: 2*2^lv
Centre: (0, 0, 0)`
            },
            {
                title: 'L-systems in 3D',
                contents:
`Using a yaw-pitch-roll orientation system, we can also generate figures in 3D.

Counter-clockwise and clockwise respectively,
+ -: rotate turtle on the z-axis (yaw).
& ^: rotate turtle on the y-axis (pitch).
\\ /: rotate turtle on the x-axis (roll).

|: reverses the turtle's direction.
T: applies a force of gravity (tropism) to the turtle's current heading, so ` +
`that it drops downward (with a positive tropism factor), or lifts upward ` +
`(with a negative tropism factor). The factor should be in the range from ` +
`-1 to 1.
$: rolls the turtle around its own axis, so that its up vector is closest to ` +
`absolute verticality i.e. the y-axis, and subsequently, its direction is ` +
`closest to lying on a horizontal plane.

Note: In other L-system implementations, < and > may be used instead of \\ ` +
`and / like in this theory.

Note 2: Other L-system implementations may also start the turtle facing the ` +
`y-axis or z-axis instead of the x-axis. To adopt those systems into LSR, ` +
`swap the axes around until the desired results are achieved.

Note 3: Other L-system implementations may swap counter-clockwise and ` +
`clockwise rotations.`
            },
            {
                title: 'Example: Blackboard tree',
                contents:
`Modelled after a blackboard tree (Alstonia scholaris) in its infant state.

Axiom: F
F = Y[++++++MF][-----NF][^^^^^OF][&&&&&PF]
M = Z-M
N = Z+N
O = Z&O
P = Z^P
Y = Z-ZY+
Z = ZZ
Turning angle: 8°

Applies static camera:
Scale: 2*2^lv
Centre: (0, 1.2*2^lv, 0)
Upright`,
                source: 'https://www.bioquest.org/products/files/13157_Real-time%203D%20Plant%20Structure%20Modeling%20by%20L-System.pdf'
            },
            {
                title: 'Example: Hilbert curve (3D)',
                contents:
`The Hilbert curve is a fractal figure that fills the space of a 2D plane ` +
`using only a single line. This is the 3D version.
It's recommended to draw at a low tickspeed (high tick length).

Axiom: X
X = ^/XF^/XFX-F^\\\\XFX&F+\\\\XFX-F\\X-\\
Turning angle: 90°
Ignore: X

Applies static camera:
Scale: 2^lv
Centre: (0.5*2^lv-0.5, 0.5*2^lv-0.5, 0.5*2^lv-0.5)`
            },
            {
                title: 'Example: Fern',
                contents:
`A 3D fern.

Axiom: FFFA
A = [++++++++++++++FC]B^+B[--------------FD]B+BA
C = [---------FF][+++++++++FF]B&&+C
D = [---------FF][+++++++++FF]B&&-D
Turning angle: 4°

Applies static camera: (mathematically unproven)
Scale: 3*1.3^lv
Centre: (0, 1.8*1.3^lv, 0)
Upright`,
                source: 'http://jobtalle.com/lindenmayer_systems.html'
            },
            {
                title: 'Modelling: Polygon tool',
                contents:
`To keep up with demands for higher levels of detail pertaining flowers, ` +
`leaves and other organs, the classic L-system syntax was extended to ` +
`accomplish this. Introducing the polygon tool, designed to hide away ` +
`unneeded points and draw contours by connecting the dots, literally.

{: initiates polygon drawing mode.
.: sets a polygon vertex.
}: ends the polygon drawing mode.

Normal commands inside a polygon block will not draw lines, making it great ` +
`for hiding away any scaffolding in the creation of models.

Note: Due to how Exponential Idle's 3D graph works, the polygon tool in LSR ` +
`works differently from that described in The Algorithmic Beauty of Plants. ` +
`Therefore, it is advised to make some adjustments when adopting schemes ` +
`from the book into LSR.`
            },
            {
                title: 'Example: Lily pad (hollow)',
                contents:
`This is a hollow lily pad. Can you make it draw some lines on the periphery?
Tip: Open the sequence menu to see which points are being dotted.

Axiom: {[A}]{[B}]
A = [+A]C.
B = [-B]C.
C = GC
Turning angle: 27°

Applies static camera:
Scale: lv
Centre: (0, lv/2-1, 0)
Upright`
            },
            {
                title: 'Dedicated models for symbols',
                contents:
`While the polygon mode is useful when it comes to building custom models, ` +
`the problem of separating between models and growth processing rules still ` +
`remains, as writing the model in a different rule will delay its drawing by ` +
`one level. With a special kind of rule, we can assign dedicated models to ` +
`each symbol to be drawn instantly.
To declare a model rule, attach a tilde in front of the symbol on the left side:
~{symbol} = {model}

To reference a model in another rule, attach a tilde in front of the symbol ` +
`in the same way it was declared.

Note: The symbol will not disappear from the rule after the model has been ` +
`drawn, but it will be ignored by the turtle.

Note 2: The model only lasts for one level, and needs to be refreshed ` + 
`(example follows in the next page).`
            },
            {
                title: 'Example: Lilac branch',
                contents:
`Ripped straight off of page 92 of The Algorithmic Beauty of Plants. But I ` +
`made the model myself.
K represents the flower, and its model is refreshed every level with the ` +
`rule K = ~K.

Axiom: A~K
A = [--//~K][++//~K]I///A
I = Fi
i = Fj
j = J[--FFA][++FFA]
K = ~K
~K = F[+++[--F+F]^^^[--F+F]^^^[--F+F]^^^[--F+F]]
Turning angle: 30°

Applies static camera:
Scale: 3*lv
Centre: (0, 1.5*lv, 0)
Upright`
            },
            {
                title: 'Appendix: Summary of symbols',
                contents:
`Any letter (except T): moves turtle forward to draw a line of length 1.
+ -: rotate turtle on the z-axis (yaw).
& ^: rotate turtle on the y-axis (pitch).
\\ /: rotate turtle on the x-axis (roll).

|: reverses turtle direction.
T: applies tropism (gravity) to branch.
$: aligns turtle's up vector to vertical.

[: pushes turtle state onto a stack.
]: pops the stack's topmost element onto the turtle.
%: cuts off the remainder of a branch.

{: initiates polygon drawing mode.
.: sets a polygon vertex.
}: ends the polygon drawing mode.

~: declares/references a symbol's model.
,: separates between stochastic derivations.`
            },
            {
                title: 'Appendix: Advanced artistry in LSR',
                contents:
`Welcome to the LSR Art Academy. Thanks for finishing the manual, by the way!
And today's class: Tick length.

For a background observation, Exponential Idle's 3D graph seems to be using ` +
`a Bézier-like spline with no locality. Therefore, it is not suitable for ` +
`drawing straight lines. However, this does not mean we cannot get anything ` +
`out of it, and today's class will demonstrate otherwise.

Now, while tickspeed might be more of a familiar concept to the idle ` +
`fellows, in LSR it posesses a flaw: it is not consistent. For instance, at ` +
`9 tickspeed, the renderer would skip one tick out of every 10, making the ` +
`line quality really inconsistent. And although there might be value in ` +
`mixing drawing styles this way, we will not be going into details about it ` +
`in this lecture. Instead, we will be discussing the various tick lengths ` +
`and their artistic applications.

- 0.1 sec: the quickest stroke in the West. This is the equivalent of 10 ` +
`tickspeed. Figures drawn at this speed are jumbled and chaotic, making it ` +
`suitable for large-scale figures, where errors become tiny and hard to notice.
- 0.2 sec: characterised by quick but elegant strokes, accompanied by motifs ` +
`of leaves and flowers, this speed feels at home with plant modelling. It ` +
`offers a good compromise between speed and precision, although even 0.1 ` +
`would be too slow for large scale figures.
- 0.3 sec: Tick length 0.3 holds the most powerful secret in this whole ` +
`universe: it can create the straightest lines out of this family. No ` +
`trickery needed! As the 3D graph seems to be running on a 3-tick cycle, ` +
`the sampled points line up precisely with the renderer's drawing.
- 0.4 sec: this one can really spice the figure up by tying up cute knots ` +
`between corners occasionally, mimicking leaf shapes on a tree.
- 0.5 sec: with slight occasional overshoots, tick length 0.5 proves itself ` +
`of use when it comes to bringing that rough sketch feeling to a figure.
- 0.6 sec and above: I don't care, class dismissed.`
            },
            {
                title: 'Advanced artistry in LSR (2)',
                contents:
`Welcome back, class! We're learning about something simple today, by the way:
Backtrack options, or why Hesitation is Not Defeat.

Now, open your renderer menu textbook to the last section. There are about 4 ` +
`options here as you can see - each of them with advantages and, non-advantages!

- Quickdraw: is generally a decent option when it comes to saving some time, ` +
`but when compared to quick backtrack, it poses a greater drawback when it ` +
`comes to both precision and aesthetics.
- Quick backtrack: this one's a reliable one, trading only a little beauty ` +
`for some extra speed.
- Stutter at apex/fork: now, this is what I mean when I say hesitation is ` +
`not defeat. Pausing for even just one tick can give your figure just enough ` +
`cohesion it really needs. To prove this, try loading the Arrow weed then ` +
`alternate between drawing with these option on and off, at 0.1 tick length, ` +
`or 10 tickspeed. There will be a noticeable difference, even from afar.

Class dismissed, and stay tuned for next week's lecture, on the Art of Looping!`
            },
            {
                title: 'Advanced artistry in LSR (3)',
                contents:
`Welcome back, class! Today is only an extension of last class, and so we'll ` +
`be going through the concept of looping. This relates to last week's class ` +
`about backtracking.

First, I want everybody to construct a Cantor set as follows:
Axiom: X++F
X = +Y-XFX-Y+
F = FFF
Y = YY
Turning angle: 90°

Then, apply the following static camera:
Scale: 0.5*3^lv
Centre: (0.5*3^lv, 2^(lv-1)-.5, 0)

Now, enter the Level looping mode, turn 'Draw tail end' on and draw the ` +
`Cantor set at level 2 or higher. You will see that the turtle goes back and ` +
`forth when it meets the bottom left corner. Can anybody confirm that? Good.
Now, turn 'Draw tail end' off. Can anyone tell me what would happen?
That's right. The turtle will keep going around in a loop of this delicious ` +
`Cantor bread. It really loves it.

Generally, in figures such as this or the Koch snowflake, it'd be better to ` +
`loop than to eat your own tail. Fortunately for you, there aren't many ` +
`figures like these. Do note though, that quick backtrack will not trigger, ` +
`due to the tail end being a backtrack itself, of course.`
            },
            {
                title: 'Gallery',
                contents:
`Welcome to a L-systems gallery. Enjoy!

Notice: The gallery is open for submission!
Mail me your own L-systems, so it can be included in the gallery.
Maybe over Discord. Reddit account. Arcane-mail logistics!`
            },
            {
                title: 'Lilac branch (Advanced)',
                contents:
`A more complex version of the previous lilac branch in the Models section, ` +
`complete with detailed models and copious utilisation of tropism.

Axiom: +S~A
S = FS
A = T[--//~K][++//~K]I///~A
~A = [+++~a~a~a~a]
~a = -{[^-F.][--FF.][&-F.].}+^^^
K = ~K
~K = [FT[F]+++~k~k~k~k]
~k = -{[^--F.][F-^-F.][^--F|++^--F|+F+F.][-F+F.][&--F|++&--F|+F+F.][F-&-F.][&--F.].}+^^^
I = Fi
i = Fj
j = J[--FF~A][++FF~A]
Turning angle: 30°
Tropism: 0.16

Applies static camera:
Scale: 2*lv+1
Centre: (2*lv+1, lv/2+3/4, 0)`
            },
            {
                title: 'Botched Cultivar FF',
                contents:
`Represents a common source of carbohydrates.

Axiom: X
F = FF
X = F-[[X]+X]+F[-X]-X
Turning angle: 15°

Applies static camera:
Scale: 2^lv
Centre: (0, 2^lv, 0)
Upright`
            },
            {
                title: 'Botched Cultivar FXF',
                contents:
`Commonly called the Cyclone, cultivar FXF resembles a coil of barbed wire. ` +
`Legends have it, once a snake moult has weathered enough, a new life is ` +
`born unto the tattered husk, and from there, it stretches.

Axiom: X
F = F[+F]XF
X = F-[[X]+X]+F[-FX]-X
Turning angle: 27°

Applies static camera: (mathematically unproven)
Scale: 1.5*2^lv
Centre: (0.225*2^lv, -0.75*2^lv, 0)`
            },
            {
                title: 'Botched Cultivar XEXF',
                contents:
`Bearing the shape of a thistle, cultivar XEXF embodies the strength and ` +
`resilience of nature against the harsh logarithm drop-off. It also smells ` +
`really, really good.

Axiom: X
E = XEXF-
F = FX+[E]X
X = F-[X+[X[++E]F]]+F[X+FX]-X
Turning angle: 22.5°

Applies static camera: (mathematically unproven)
Scale: 3^lv
Centre: (0.25*3^lv, 0.75*3^lv, 0)
Upright`
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
 * @returns {string}
 */
let getCoordString = (x) => x.toFixed(x >= -0.01 ?
    (x <= 9.999 ? 3 : (x <= 99.99 ? 2 : 1)) :
    (x < -9.99 ? (x < -99.9 ? 0 : 1) : 2)
);

/**
 * Compares equality for every member of two sets, disregarding order.
 * @param {Set} xs set 1.
 * @param {Set} ys set 2.
 * @returns {boolean}
 */
let eqSet = (xs, ys) => xs.size === ys.size && [...xs].every((x) => ys.has(x));

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
         */
        this.m = 0x80000000; // 2**31;
        /**
         * @type {number} some constant
         */
        this.a = 1103515245;
        /**
         * @type {number} some other constant.
         */
        this.c = 12345;
        /**
         * @type {number} the LCG's current state.
         */
        this.state = seed % this.m;
    }

    /**
     * Returns a random integer within [0, 2^31).
     * @returns {number}
     */
    get nextInt()
    {
        this.state = (this.a * this.state + this.c) % this.m;
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
        if(includeEnd)
        {
            // [0, 1]
            return this.nextInt / (this.m - 1);
        }
        else
        {
            // [0, 1)
            return this.nextInt / this.m;
        }
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
 * Represents an L-system.
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
     */
    constructor(axiom = '', rules = [], turnAngle = 0, seed = 0,
    ignoreList = '', tropism = 0)
    {
        /**
         * @type {{
         *  axiom: string,
         *  rules: string[],
         *  turnAngle: string,
         *  seed: number,
         *  ignoreList: string,
         *  tropism: string
         * }} the user input in its original form.
         */
        this.userInput =
        {
            axiom: axiom,
            rules: this.purgeEmpty(rules),
            turnAngle: turnAngle,
            seed: seed,
            ignoreList: ignoreList,
            tropism: tropism
        };
        /**
         * @type {string} the starting sequence.
         */
        this.axiom = axiom;
        /**
         * @type {Map<string, string>} the production rules.
         */
        this.rules = new Map();
        /**
         * @type {set} a set of symbols ignored by the turtle.
         */
        this.ignoreList = new Set(ignoreList);
        /**
         * @type {Map<string, string>} the models to be used by the renderer.
         */
        this.models = new Map();

        // Rules processing.
        for(let i = 0; i < rules.length; ++i)
        {
            if(rules[i] !== '')
            {
                let rs = rules[i].replace(TRIM_SP, '').split('=');
                /*
                Old rules format where rules without a derivation get added to
                the ignore list, due to the old internal state's limitations.
                */
                if(rs.length < 2)
                {
                    if(i == 0)
                        this.ignoreList = new Set
                        ([
                            ...rs[0],
                            ...this.ignoreList
                        ]);
                    continue;
                }

                let rder = rs[1].split(',');
                if(rder.length == 1)    // Regular rule
                {
                    if(rs[0].length == 1)
                    {
                        let existingDer = this.rules.get(rs[0]);
                        if(!existingDer)
                            this.rules.set(rs[0], rs[1]);
                        else if(typeof existingDer === 'string')
                            this.rules.set(rs[0], [existingDer, rs[1]]);
                        else
                            this.rules.set(rs[0], [...existingDer, rs[1]]);
                    }
                    else if(rs[0].length == 2 && rs[0][0] == '~')   // Model
                    {
                        let existingDer = this.models.get(rs[0][1]);
                        if(!existingDer)
                            this.models.set(rs[0][1], rs[1]);
                        else if(typeof existingDer === 'string')
                            this.models.set(rs[0][1], [existingDer, rs[1]]);
                        else
                            this.models.set(rs[0][1], [...existingDer, rs[1]]);
                    }
                }
                else    // Stochastic rule
                {
                    if(rs[0].length == 1)
                    {
                        let existingDer = this.rules.get(rs[0]);
                        if(!existingDer)
                            this.rules.set(rs[0], rder);
                        else if(typeof existingDer === 'string')
                            this.rules.set(rs[0], [existingDer, rder]);
                        else
                            this.rules.set(rs[0], [...existingDer, rder]);
                    }
                    else if(rs[0].length == 2 && rs[0][0] == '~')   // Model
                    {
                        let existingDer = this.models.get(rs[0][1]);
                        if(!existingDer)
                            this.models.set(rs[0][1], rder);
                        else if(typeof existingDer === 'string')
                            this.models.set(rs[0][1], [existingDer, rder]);
                        else
                            this.models.set(rs[0][1], [...existingDer, rder]);
                    }
                }
            }
        }
        /**
         * @type {Xorshift} the random number generator for this system.
         */
        this.RNG = new Xorshift(seed);
        /**
         * @type {number} half the turning angle (in radians) for use in quats.
         */
        this.halfAngle = MathExpression.parse(turnAngle.toString()).evaluate() *
        Math.PI / 360;
        /**
         * @type {Map<string, Quaternion>} a map of rotation quaternions for
         * quicker calculations.
         */
        this.rotations = new Map();
        let s = Math.sin(this.halfAngle);
        let c = Math.cos(this.halfAngle);
        this.rotations.set('+', new Quaternion(-c, 0, 0, s));
        this.rotations.set('-', new Quaternion(-c, 0, 0, -s));
        this.rotations.set('&', new Quaternion(-c, 0, s, 0));
        this.rotations.set('^', new Quaternion(-c, 0, -s, 0));
        this.rotations.set('\\', new Quaternion(-c, s, 0, 0));
        this.rotations.set('/', new Quaternion(-c, -s, 0, 0));
        /**
         * @type {number} the tropism factor.
         */
        this.tropism = MathExpression.parse(tropism.toString()).evaluate();
    }

    /**
     * Derive a sequence from the input string. `next` denotes the starting
     * position to be derived next tick. `result` contains the work completed
     * for the current tick.
     * @param {string} sequence the input string.
     * @returns {{next: number, result: string}}
     */
    derive(sequence, start = 0)
    {
        let result = '';
        for(let i = start; i < sequence.length; ++i)
        {
            if(result.length > maxCharsPerTick)
            {
                return {
                    next: i,
                    result: result
                };
            }
            let deriv;
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
                deriv = this.rules.get(sequence[i]);
            else
                deriv = sequence[i];

            if(typeof deriv === 'string')
                result += deriv;
            else
                result += deriv[this.RNG.nextRange(0, deriv.length)];
        }
        return {
            next: 0,
            result: result
        };
    }
    /**
     * (Deprecated) Sets the system's seed from the outside in.
     * @param {number} seed the seed.
     */
    set seed(seed)
    {
        this.userInput.seed = seed;
        this.RNG = new Xorshift(this.seed);
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
     *  tropism: string
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
            tropism: this.userInput.tropism
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
                charCount += ret.result.length;
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
        this.ori = this.upright ? uprightQuat : new Quaternion();
        this.stack = [];
        this.idxStack = [];
        this.i = 0;
        this.models = [];
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
    forward()
    {
        this.state += this.ori.headingVector;
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
                            this.ori = this.system.rotations.get('+').mul(
                            this.ori);
                            break;
                        case '-':
                            this.ori = this.system.rotations.get('-').mul(
                            this.ori);
                            break;
                        case '&':
                            this.ori = this.system.rotations.get('&').mul(
                            this.ori);
                            break;
                        case '^':
                            this.ori = this.system.rotations.get('^').mul(
                            this.ori);
                            break;
                        case '\\':
                            this.ori = this.system.rotations.get('\\').mul(
                            this.ori);
                            break;
                        case '/':
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
                            this.ori = this.ori.applyTropism(
                            this.system.tropism);
                            break;
                        case '~':
                            if(!this.system.models.has(
                            this.models[this.models.length - 1][
                            this.mdi[this.mdi.length - 1] + 1]))
                                break;

                            ++this.mdi[this.mdi.length - 1];
                            this.models.push(this.system.models.get(
                            this.models[this.models.length - 1][
                            this.mdi[this.mdi.length - 1]]));
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
                                this.forward();

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
            this.max = Math.max(this.max, this.records[i]);
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
let contentsTable = [0, 1, 2, 3, 4, 5, 6, 7, 10, 12, 15, 19, 21, 23, 24, 27];
let manualSystems =
{
    8:
    {
        system: new LSystem('FX', ['Y=-FX-Y', 'X=X+YF+'], 90),
        config: ['4*sqrt(2)^lv', 0, 0, 0, false]
    },
    9:
    {
        system: new LSystem('X', ['X=+Y-X-Y+', 'Y=-X+Y+X-'], 60),
        config: ['2^lv', '0.5*2^lv', 'sqrt(3)/4*2^lv', 0, false]
    },
    11:
    {
        system: arrow,
        config: ['1.5*2^lv', 0, '1.2*2^lv', 0, true]
    },
    13:
    {
        system: new LSystem('X', [
            'F=FF',
            'X=F-[[X]+X]+F[+FX]-X,F+[[X]-X]-F[-FX]+X'
        ], 22.5),
        config: ['1.5*2^lv', 0, '1.2*2^lv', 0, true]
    },
    luckyFlower:
    {
        system: new LSystem('A', [
            'A=I[L]B,I[L]A,I[L][R]B,IF',
            'B=I[R]A,I[R]B,I[L][R]A,IF',
            'L=---I,--I,----I',
            'R=+++I,++I,++++I',
            'F=[---[I+I]--I+I][+++[I-I]++I-I]II'
        ], 12),
        config: [6, 0, 6, 0, true]
    },
    14:
    {
        system: new LSystem('[X]+[X]+[X]+[X]+[X]+[X]', [
            'X=F[+F][-F]X',
            'F=F[+i][-i]F',
            'i=Ii,IIi'
        ], 60, 0, 'i'),
        config: ['2*2^lv', 0, 0, 0, false]
    },
    16:
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
        config: ['2*2^lv', 0, '1.2*2^lv', 0, true]
    },
    17:
    {
        system: new LSystem('X', [
            'X',
            'X=^/XF^/XFX-F^\\\\XFX&F+\\\\XFX-F\\X-\\'
        ], 90),
        config: ['2^lv', '0.5*2^lv-0.5', '0.5*2^lv-0.5', '0.5*2^lv-0.5', false]
    },
    18:
    {
        system: new LSystem('FFFA', [
            'A=[++++++++++++++FC]B^+B[--------------FD]B+BA',
            'C=[---------FF][+++++++++FF]B&&+C',
            'D=[---------FF][+++++++++FF]B&&-D'
        ], 4),
        config: ['3*1.3^lv', 0, '1.8*1.3^lv', 0, true]
    },
    20:
    {
        system: new LSystem('{[A}]{[B}]', [
            'A=[+A]C.',
            'B=[-B]C.',
            'C=GC'
        ], 27),
        config: ['lv', 0, 'lv/2-1', 0, true]
    },
    22:
    {
        system: new LSystem('A~K', [
            'A=[--//~K][++//~K]I///A',
            'I=Fi',
            'i=Fj',
            'j=J[--FFA][++FFA]',
            'K=~K',
            '~K=F[+++[--F+F]^^^[--F+F]^^^[--F+F]^^^[--F+F]]'
        ], 30),
        config: ['3*lv', 0, '1.5*lv', 0, true]
    },
    28:
    {
        system: new LSystem('+S~A', [
            'S=FS',
            'A=T[--//~K][++//~K]I///~A',
            '~A=[+++~a~a~a~a]',
            '~a=-{[^-F.][--FF.][&-F.].}+^^^',
            'K=~K',
            '~K=[FT[F]+++~k~k~k~k]',
            '~k=-{[^--F.][F-^-F.][^--F|++^--F|+F+F.][-F+F.][&--F|++&--F|+F+F.][F-&-F.][&--F.].}+^^^',
            'I=Fi',
            'i=Fj',
            'j=J[--FF~A][++FF~A]'
        ], 30, 0, '', 0.16),
        config: ['2*lv+1', '2*lv+1', 'lv/2+3/4', 0, false]
    },
    29:
    {
        system: new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[-X]-X'], 15),
        config: ['2^lv', 0, '2^lv', 0, true]
    },
    30:
    {
        system: new LSystem('X', ['F=F[+F]XF', 'X=F-[[X]+X]+F[-FX]-X'], 27),
        config: ['1.5*2^lv', '0.225*2^lv', '-0.75*2^lv', 0, false]
    },
    31:
    {
        system: new LSystem('X', [
            'E=XEXF-',
            'F=FX+[E]X',
            'X=F-[X+[X[++E]F]]+F[X+FX]-X'
        ], 22.5),
        config: ['3^lv', '0.25*3^lv', '0.75*3^lv', 0, true]
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
    // Resume last system (upgrade idea)
    // { 
    //     rs = theory.createSingularUpgrade(0, progress, new FreeCost);
    //     rs.getDescription = (_) => Localization.format(getLoc('btnResume'),
    //     tmpSystemName);
    //     rs.info = getLoc('upgResumeInfo');
    //     rs.boughtOrRefunded = (_) =>
    //     {
    //         renderer.applySystem = tmpSystem;
    //         tmpSystem = null;
    //         rs.level = 0;
    //         rs.isAvailable = false;
    //     };
    // }

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

// var getCurrencyBarDelegate = () =>
// {
//     let stack = ui.createGrid
//     ({
//         columnDefinitions: ['1*', '1*'],
//         children:
//         [
//             ui.createLatexLabel
//             ({
//                 column: 0,
//                 text: () =>
//                 {
//                     let msTime = renderer.elapsedTime;
//                     return `${msTime[0] < 10 ? '0' : ''}${msTime[0]}:` +
//                     `${msTime[1] < 10 ? '0' : ''}${msTime[1].toFixed(1)} ` +
//                     `elapsed`;
//                     min.value = 1e-8 + msTime[0] + msTime[1] / 100;
//                 },
//                 fontSize: 11,
//                 horizontalTextAlignment: TextAlignment.CENTER,
//                 verticalTextAlignment: TextAlignment.END
//             }),
//             ui.createLatexLabel
//             ({
//                 column: 1,
//                 text: () => `${renderer.progressPercent.toFixed(2)}\\%`,
//                 fontSize: 11,
//                 horizontalTextAlignment: TextAlignment.CENTER,
//                 verticalTextAlignment: TextAlignment.END
//             })
//         ]
//     });
//     return ui.createFrame
//     ({
//         padding: new Thickness(0, 6),
//         // margin: new Thickness(0, -1),
//         content: stack
//     });
// }

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
    let tmpAngle = values.turnAngle || '0';
    let angleEntry = ui.createEntry
    ({
        text: tmpAngle.toString(),
        row: 1,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpAngle = nt;
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
    let tmpIgnore = values.ignoreList;
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
    let tmpTropism = values.tropism || '0';
    let tropismEntry = ui.createEntry
    ({
        text: tmpTropism.toString(),
        row: 2,
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
        row: 3,
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
        row: 3,
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
                                columnDefinitions: ['20*', '80*'],
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
                                        text: getLoc('labelAngle'),
                                        row: 1,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    angleEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelTropism'),
                                        row: 2,
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
                                tmpRules, tmpAngle, tmpSeed, tmpIgnore,
                                tmpTropism);
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
                                angleEntry.text = values.turnAngle;
                                tmpRules = values.rules;
                                ruleEntries = [];
                                rulesLabel.text = Localization.format(
                                getLoc('labelRules'), ruleEntries.length);
                                ruleStack.children = ruleEntries;
                                ignoreEntry.text = values.ignoreList;
                                tropismEntry.text = values.tropism;
                                seedEntry.text = values.seed.toString();
                            }
                        })
                    ]
                })
            ]
        })
    })
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
    let tmpSys = values;
    let sysEntry = ui.createEntry
    ({
        text: tmpSys,
        clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
        onTextChanged: (ot, nt) =>
        {
            tmpSys = nt;
            warningEntry.isVisible = sysEntry.text.length >= ENTRY_CHAR_LIMIT;
        }
    });
    let warningEntry = ui.createLatexLabel
    ({
        isVisible: sysEntry.text.length >= ENTRY_CHAR_LIMIT,
        text: Localization.format(getLoc('labelEntryCharLimit'),
        ENTRY_CHAR_LIMIT),
        margin: new Thickness(0, 0, 0, 4),
        verticalTextAlignment: TextAlignment.CENTER
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
                warningEntry,
                ui.createButton
                ({
                    text: getLoc('btnConstruct'),
                    onClicked: () =>
                    {
                        Sound.playClick();
                        let sv = JSON.parse(tmpSys);
                        tmpSystemName = sv.title;
                        tmpSystemDesc = sv.desc;
                        renderer.constructSystem = new LSystem(sv.system.axiom,
                        sv.system.rules, sv.system.turnAngle,
                        sv.system.seed, sv.system.ignoreList,
                        sv.system.tropism);
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

let createStateClipboardMenu = (values) =>
{
    let tmpState = values;
    let sysEntry = ui.createEntry
    ({
        text: tmpState,
        // clearButtonVisibility: ClearButtonVisibility.WHILE_EDITING,
        onTextChanged: (ot, nt) =>
        {
            tmpState = nt;
            warningEntry.isVisible = sysEntry.text.length >= ENTRY_CHAR_LIMIT;
        }
    });
    let warningEntry = ui.createLatexLabel
    ({
        isVisible: sysEntry.text.length >= ENTRY_CHAR_LIMIT,
        text: Localization.format(getLoc('labelEntryCharLimit'),
        ENTRY_CHAR_LIMIT),
        margin: new Thickness(0, 0, 0, 4),
        verticalTextAlignment: TextAlignment.CENTER
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
                warningEntry,
                ui.createButton
                ({
                    text: getLoc('btnImport'),
                    onClicked: () =>
                    {
                        Sound.playClick();
                        setInternalState(tmpState);
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
    let tmpAngle = values.turnAngle || '0';
    let angleEntry = ui.createEntry
    ({
        text: tmpAngle.toString(),
        row: 1,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpAngle = nt;
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
    let tmpIgnore = values.ignoreList;
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
    let tmpTropism = values.tropism || '0';
    let tropismEntry = ui.createEntry
    ({
        text: tmpTropism.toString(),
        row: 2,
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
        row: 3,
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
        row: 3,
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
                                columnDefinitions: ['20*', '80*'],
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
                                        text: getLoc('labelAngle'),
                                        row: 1,
                                        column: 0,
                                        verticalTextAlignment:
                                        TextAlignment.CENTER
                                    }),
                                    angleEntry,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelTropism'),
                                        row: 2,
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
                                tmpRules, tmpAngle, tmpSeed, tmpIgnore,
                                tmpTropism);
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
                                    tmpAngle, tmpSeed, tmpIgnore, tmpTropism).
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
    let pageTitle = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelChars'),
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
        text: renderer.levels[level],
        lineBreakMode: LineBreakMode.CHARACTER_WRAP
    });

    let menu = ui.createPopup
    ({
        title: Localization.format(getLoc('menuSequence'), tmpSystemName,
        level),
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
            state.system.tropism);
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
