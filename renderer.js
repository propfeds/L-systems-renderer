/*
L-systems Renderer implementation in Exponential Idle.

Disclaimer: The literature around (OL) L-system's symbols is generally not much
consistent. Therefore, the symbols used here may mean different things in other
implementations. One such example is that \ and / may be swapped; or that +
would turn the cursor clockwise instead of counter (as implemented here).
Another example would be that < and > are used instead of \ and /.

The maths used in this theory do not resemble a paragon of correctness either,
particularly referencing the horrible butchery of quaternions, and all the
camera rotation slander in the world. In this theory, the vector is initially
heading in the X-axis, instead of the Y/Z-axis, which is more common in other
implementations of L-systems. I'm just a unit circle kind of person.

If the X is the eyes of a laughing face, then the Y represents my waifu Ms. Y,
and the Z stands for Zombies.

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

    if(language in descs)
        return descs[language];

    return descs.en;
}
var authors =   'propfeds#5988\n\nThanks to:\nSir Gilles-Philippe Paill??, ' +
                'for providing help with quaternions\nskyhigh173#3120, for ' +
                'suggesting clipboard and JSON internal state formatting';
var version = 0.21;

let time = 0;
let page = 0;
let offlineReset = true;
let gameIsOffline = false;
let altTerEq = false;
let tickDelayMode = false;
let resetLvlOnConstruct = true;
let measurePerformance = false;
let maxCharsPerTick = 5000;

let savedSystems = new Map();
let savedModels = new Map();

const DEFAULT_BUTTON_HEIGHT = ui.screenHeight * 0.055;
const ENTRY_CHAR_LIMIT = 5000;
const locStrings =
{
    en:
    {
        versionName: 'v0.21',
        welcomeSystemName: 'Arrow',
        welcomeSystemDesc: 'Welcome to L-systems Renderer!',
        equationOverlayLong: '{0} ??? {1}\n\n{2}\n\n{3}',
        equationOverlay: '{0}\n\n{1}',

        rendererLoading: '\\begin{{matrix}}Loading...&\\text{{Lv. {0}}}&({1}\\text{{ chars}})\\end{{matrix}}',

        currencyTime: ' (elapsed)',

        varLvDesc: '\\text{{Level: }}{0}{1}',
        varTdDesc: '\\text{{Tick length: }}{0}\\text{{ sec}}',
        varTdDescInf: '\\text{{Tick length: }}\\infty',
        varTsDesc: '\\text{{Tickspeed: }}{0}/\\text{{sec}}',
        upgResumeInfo: 'Resumes the last rendered system',

        saPatienceTitle: 'Watching Grass Grow',
        saPatienceDesc: 'Let the renderer draw a 10-minute long figure or ' +
        'playlist.',
        saPatienceHint: 'Be patient.',

        btnSave: 'Save',
        btnClear: 'Clear',
        btnDefault: '* Reset to Defaults',
        btnAdd: 'Add',
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
        btnResume: 'Resume ??? {0}',
        btnStartMeasure: 'Measure performance',
        btnEndMeasure: 'Stop measuring',

        measurement: '{0}: max {1}ms, avg {2}ms over {3} ticks',

        rerollSeed: 'You are about to reroll the system\'s seed.',

        menuSequence: 'Sequence Menu',
        labelLevelSeq: 'Level {0}: ',
        labelChars: '({0} chars)',

        menuLSystem: 'L-system Menu',
        labelAxiom: 'Axiom: ',
        labelAngle: 'Turning angle (??): ',
        labelRules: 'Production rules: {0}',
        labelIgnored: 'Ignored symbols: ',
        labelSeed: 'Seed (for stochastic systems): ',

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
        labelUpright: '* Upright x-axis: ',
        labelBTTail: 'Draw tail end: ',
        labelLoadModels: '* (Teaser) Load models: ',
        labelQuickdraw: '* Quickdraw (unstable): ',
        labelQuickBT: '* Quick backtrack: ',
        labelHesitate: '* Stutter on backtrack: ',
        labelBTList: '* Backtrack list: ',
        labelRequireReset: '* Modifying this setting will require a reset.',

        menuSave: 'Save/Load Menu',
        labelCurrentSystem: 'Current system: ',
        labelSavedSystems: 'Saved systems: {0}',
        labelApplyCamera: 'Applies static camera: ',

        menuClipboard: 'Clipboard Menu',
        labelEntryCharLimit: 'Warning: This entry has been capped at {0} characters. Proceed with caution.',

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
`Welcome to the L-systems Renderer! This guide aims to help you understand ` +
`the basics of L-systems, as well as instructions on how to effectively use ` +
`this theory to construct and render them.

Let's start discovering the wonders of L-systems.`
            },
            {
                title: 'Controls: Theory screen',
                contents:
`The theory screen consists of the renderer and its controls.

Level: the system's iteration. Pressing + or - will grow/revert the system ` +
`respectively.
- Pressing the Level button will reveal all levels of the system.
- Holding + or - will buy/refund levels in bulks of 10.

Tickspeed: controls the renderer's drawing speed (up to 10 lines/sec, which ` +
`produces less accurate lines).
- Pressing the Tickspeed button will toggle between the Tickspeed and Tick ` +
`length modes.
- Holding - will create an 'anchor' on the current level then set it to 0, ` +
`pausing the renderer. Holding + afterwards will return the renderer to the ` +
`previously anchored speed.

Reroll: located on the top right. Pressing this button will reroll the ` +
`system's seed (only applicable for stochastic systems).

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
- Turning angle: the angle the turtle turns when the turtle turns (in degrees).
- Production rules: an unlimited number of rules can be added using the ` +
`'Add' button.
- Ignored symbols: the turtle will stand still when encountering these symbols.
- Seed: sets the seed of a stochastic system.

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
`formula, similar to figure scale.
- Follow factor: changes how quickly the camera follows the turtle.
- Upright x-axis: rotates figure by 90 degrees counter-clockwise around the ` +
`z-axis.

Renderer logic:
- Looping mode: the Level mode repeats a single level, while the Playlist ` +
`mode draws levels consecutively.
- Draw tail end: whether to draw the last backtrack after finishing the ` +
`sequence.

Advanced stroke options:
- Quickdraw (unstable): skips over straight consecutive segments.
- Quick backtrack: works similarly, but on the way back.
- Stutter on backtrack: pause for one tick after backtracking for more ` +
`accurate figures.
- Backtrack list: sets stopping symbols for backtracking.`
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
F: moves turtle forward to draw a line of length 1 (usually).
+: rotates turtle counter-clockwise by an angle.
-: rotates turtle clockwise by an angle.

Note: In the original grammar, the lower-case f is used to move the turtle ` +
`forward without drawing anything, but that is simply impossible with this ` +
`game's 3D graph. So in this theory, any non-reserved symbol will draw a ` +
`line. This includes both upper- and lower-case letters, and potentially ` +
`anything you can throw at it.`
            },
            {
                title: 'Example: The dragon curve',
                contents:
`Also known as the Heighway dragon, the curve was first discovered by John ` +
`Heighway in 1966, along with two fellow physicists in NASA, William Harter ` +
`and Bruce Banks.

Legends have it, that when you fold a thin piece of paper at the middle over ` +
`and over again, and then release it while making sure every fold is exactly ` +
`90??, a dragon would spawn. But be careful, as every time you fold, although ` +
`the dragon gets thicker, its 'length' would shrink by a factor of sqrt(2).

Press 'Construct' to see the dragon in action.

Axiom: FX
Y = -FX-Y
X = X+YF+
Turning angle: 90??

Applies static camera:
Scale: 4*sqrt(2)^lv
Centre: (0, 0, 0)`
            },
            {
                title: 'Example: Sierpi??ski triangle',
                contents:
`The Sierpi??ski triangle (or gasket/sieve) is a fractal of an equilateral ` +
`triangle containing equilateral triangles inside it, containing equilateral ` +
`triangles inside it, containing equilateral triangles.
Did you know that when you take Pascal's triangle then select only the even ` +
`numbers, the Sierpi??ski triangle will appear?

Axiom: X
X = +Y-X-Y+
Y = -X+Y+X-
Turning angle: 60??

Applies static camera:
Scale: 2^lv
Centre: (0.5*2^lv, sqrt(3)/4*2^lv, 0)`
            },
            {
                title: 'Stacking mechanism',
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
%: cuts off the remainder of its branch by searching for the closing bracket ` +
`] in the branch.

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
Turning angle: 30??

Applies static camera:
Scale: 1.5*2^lv
Centre: (1.2*2^lv, 0, 0)
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
`the theory screen.`
            },
            {
                title: 'Example: Stochastic tree',
                contents:
`This tree generates a random shape every time it rolls.

Axiom: X
F = FF
X = F-[[X]+X]+F[+FX]-X, F+[[X]-X]-F[-FX]+X
Turning angle: 22.5??

Applies static camera:
Scale: 1.5*2^lv
Centre: (1.2*2^lv, 0, 0)
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
Turning angle: 60??
Ignored: i

Applies static camera:
Scale: 2*2^lv
Centre: (0, 0, 0)`
            },
            {
                title: 'L-systems in 3D',
                contents:
`Using a yaw-pitch-roll orientation system, we can also generate figures in 3D.

+ -: rotate turtle on the z-axis (yaw).
& ^: rotate turtle on the y-axis (pitch).
\\ /: rotate turtle on the x-axis (roll).
|: reverses turtle direction.

Note: In other L-system implementations, < and > may be used instead of \\ ` +
`and / like in this theory.

Note 2: Other L-system implementations may also start the turtle facing the ` +
`y-axis or z-axis instead of the x-axis. To adopt those systems into LSR, ` +
`swap the axes around until the desired results are achieved.`
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
Turning angle: 8??

Applies static camera:
Scale: 2*2^lv
Centre: (1.2*2^lv, 0, 0)
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
Turning angle: 90??
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
Turning angle: 4??

Applies static camera: (mathematically unproven)
Scale: 3*1.3^lv
Centre: (1.8*1.3^lv, 0, 0)
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
Note: Due to how the rendering engine works, the polygon tool in LSR works ` +
`a bit differently from that described in The Algorithmic Beauty of Plants. ` +
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
Turning angle: 27??

Applies static camera:
Scale: lv
Centre: (lv/2-1, 0, 0)
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
`drawn.`
            },
            {
                title: 'Example: Lilac branch',
                contents:
`Ripped straight off of page 92 of The Algorithmic Beauty of Plants. But I ` +
`made the model myself.

Axiom: A~K
A = [--//~K][++//~K]I///A
I = Fi
i = Fj
j = J[--FFA][++FFA]
~K = F[+++[--F+F]^^^[--F+F]^^^[--F+F]^^^[--F+F]]
Turning angle: 30??

Applies static camera:
Scale: 3*lv
Centre: (1.5*lv, 0, 0)
Upright`
            },
            {
                title: 'Appendix: Advanced artistry in LSR',
                contents:
`Welcome to the LSR Art Academy. Thanks for finishing the manual, by the way!
And today's class: Tick length.

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
- 0.3 sec: with loose slanted lines, tick length 0.3 is generally is a solid ` +
`option for any figure requiring some playfulness. However, it is fairly ` +
`unknown that tick length 0.3 holds the most powerful secret in this whole ` +
`universe: it can truly create the straightest lines out of this family. As ` +
`always, some tricks are needed here:
    + First, create an anchor at this speed by holding -.
    + Switch back and forth between levels to reset the turtle.
    + Activate the anchor by holding +, and marvel at the beauty of it all.
Note: This trick is not guaranteed to work every time, so it is advised to ` +
`try again multiple times.
- 0.4 sec: this one can really spice the figure up by tying up cute knots ` +
`between corners occasionally, mimicking leaf shapes on a tree.
- 0.5 sec: with slight occasional overshoots, tick length 0.5 proves itself ` +
`of use when it comes to bringing that rough sketch feeling to a figure.
- 0.6 sec and above: don't care, class dismissed.`
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
- Stutter on backtrack: now, this is what I mean when I say hesitation is ` +
`not defeat. Pausing for even just one tick can give your figure just enough ` +
`cohesion it really needs. To prove this, try loading the Arrow weed then ` +
`alternate between drawing with this option on and off, while on tick length ` +
`0.1, or 10 tickspeed. There will be a noticeable difference, even from afar.
- Backtrack list: usually, I would say that if you are here to draw ` +
`L-systems, I recommend not to edit this option, but for the brave and ` +
`worthy, you could create truly mesmerising results with this.

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
Turning angle: 90??

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
                title: 'Appendix: Botched L-systems',
                contents:
`Here are the systems created for another theory of mine, Botched L-system.`
            },
            {
                title: 'Botched Cultivar FF',
                contents:
`Represents a common source of carbohydrates.

Axiom: X
F = FF
X = F-[[X]+X]+F[-X]-X
Turning angle: 15??

Applies static camera:
Scale: 2^lv
Centre: (2^lv, 0, 0)
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
Turning angle: 27??

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
Turning angle: 22.5??

Applies static camera: (mathematically unproven)
Scale: 3^lv
Centre: (0.75*3^lv, -0.25*3^lv, 0)
Upright`
            },
            {
                title: 'Appendix: LG',
                contents:
`Here's to LG.`
            }
        ]
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
 * Compares for every member of two sets.
 * @param {Set} xs set 1.
 * @param {Set} ys set 2.
 * @returns {boolean} whether two sets are the exact same (disregarding order).
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
    get nextInt()
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
    get neg()
    {
        return new Quaternion(this.r, -this.i, -this.j, -this.k);
    }
    /**
     * Returns a rotation vector from the quaternion.
     * @returns {Vector3} the rotation vector.
     */
    get rotVector()
    {
        let r = this.neg.mul(XAxisQuat).mul(this);
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
    constructor(axiom = '', rules = [], turnAngle = 0, seed = 0,
    ignoreList = '', models = {})
    {
        this.userInput =
        {
            axiom: axiom,
            rules: this.getPurged(rules),
            turnAngle: turnAngle,
            seed: seed,
            ignoreList: ignoreList,
            models: models
        };
        /**
         * @type {string[]} the production rules.
         * @public
         */
        this.rules = new Map();
        this.contextRules = new Map();
        /**
         * @type {string} a list of symbols ignored by the renderer.
         * @public
         */
        this.ignoreList = new Set(ignoreList);
        this.models = new Map();
        for(let key in models)
            this.models.set(key, models[key]);

        for(let i = 0; i < rules.length; ++i)
        {
            if(rules[i] !== '')
            {
                let rs = rules[i].split('=');
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
                for(let i = 0; i < 2; ++i)
                    rs[i] = rs[i].trim();

                let rder = rs[1].split(',');
                if(rder.length == 1)
                {
                    if(rs[0].length == 1)
                        this.rules.set(rs[0], rs[1]);
                    else if(rs[0].length == 2 && rs[0][0] == '~')
                        this.models.set(rs[0][1], rs[1]);
                }
                else
                {
                    // Models can't have stochastic rules sadly, due to how
                    // derivations work.
                    for(let i = 0; i < rder.length; ++i)
                        rder[i] = rder[i].trim();
                    if(rs[0].length == 1)
                        this.rules.set(rs[0], rder);
                    else if(rs[0].length == 2 && rs[0][0] == '~')
                        this.models.set(rs[0][1], rder);
                }
            }
        }
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
        /**
         * @type {string} the starting sequence.
         * @public
         */
        this.axiom = this.getRecursiveModels(axiom).result;
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
    }
    rerollAxiom()
    {
        this.axiom = this.getRecursiveModels(this.userInput.axiom).result;
    }
    getRecursiveModels(sequence)
    {
        let result;
        let count = 0;
        if(typeof sequence === 'string')
        {
            result = '';
            for(let i = 0; i < sequence.length; ++i)
            {
                let deriv;
                if(sequence[i] == '~' && this.models.has(sequence[i + 1]))
                {
                    let r = this.getRecursiveModels(
                    this.models.get(sequence[i + 1]));
                    deriv = r.result;
                    count += r.count;
                }
                else
                    deriv = sequence[i];

                if(typeof deriv === 'string')
                    result += deriv;
                else
                    result += deriv[this.random.nextRange(0, deriv.length)];
                
                count += deriv.length;
            }
        }
        else
        {
            result = [];
            for(let i = 0; i < sequence.length; ++i)
            {
                let r = this.getRecursiveModels(sequence[i]);
                result.push(r.result);
                count += r.count;
            }
        }
        return {
            count: count,
            result: result
        };
    }
    /**
     * Derive a sequence from the input string.
     * @param {string} state the input string.
     * @returns {string} the derivation.
     */
    derive(sequence, start = 0)
    {
        let result = '';
        let count = 0;
        for(let i = start; i < sequence.length; ++i)
        {
            if(result.length + count > maxCharsPerTick)
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
            else if(sequence[i] == '~' && this.models.has(sequence[i + 1]))
            {
                let r = this.getRecursiveModels(
                this.models.get(sequence[i + 1]));
                deriv = r.result;
                count += r.count - r.result.length;
            }
            else if(this.rules.has(sequence[i]))
            {
                let r = this.getRecursiveModels(this.rules.get(sequence[i]));
                deriv = r.result;
                count += r.count - r.result.length;
            }
            else
                deriv = sequence[i];

            if(typeof deriv === 'string')
                result += deriv;
            else
                result += deriv[this.random.nextRange(0, deriv.length)];
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
    set rerollSeed(seed)
    {
        this.seed = seed;
        this.userInput.seed = seed;
        this.random = new LCG(this.seed);
    }
    getPurged(rules)
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
    get object()
    {
        return {
            axiom: this.userInput.axiom,
            rules: this.getPurged(this.userInput.rules),
            turnAngle: this.userInput.turnAngle,
            seed: this.userInput.seed,
            ignoreList: this.userInput.ignoreList,
            models: this.userInput.models
        };
    }
    /**
     * Returns the system's string representation.
     * @returns {string} the string.
     */
    toString()
    {
        let result = `${this.axiom} ${this.turnAngle} ${this.seed} ${[...this.ignoreList].join('')}`;
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
     * @param {string} figureScale (default: 1) the zoom level expression.
     * @param {boolean} cameraMode (default: 0) the camera mode.
     * @param {number} camX (default: 0) the camera's x-axis centre.
     * @param {number} camY (default: 0) the camera's y-axis centre.
     * @param {number} camZ (default: 0) the camera's z-axis centre.
     * @param {number} followFactor (default: 0.1; between 0 and 1) the
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
    constructor(system, figureScale = 1, cameraMode = 0, camX = 0, camY = 0,
    camZ = 0, followFactor = 0.15, loopMode = 0, upright = false,
    quickDraw = false, quickBacktrack = false, backtrackList = '+-&^\\/|[]',
    loadModels = true, backtrackTail = false, hesitate = true)
    {
        /**
         * @type {LSystem} the L-system being handled.
         * @public
         */
        this.system = system;
        this.figScaleStr = figureScale.toString();
        this.figScaleExpr = MathExpression.parse(this.figScaleStr);
        this.figureScale = 1;
        /**
         * @type {boolean} the camera mode.
         * @public
         */
        this.cameraMode = Math.round(Math.min(Math.max(cameraMode, 0), 2));
        this.camXStr = camX.toString();
        this.camYStr = camY.toString();
        this.camZStr = camZ.toString();
        this.camXExpr = MathExpression.parse(this.camXStr);
        this.camYExpr = MathExpression.parse(this.camYStr);
        this.camZExpr = MathExpression.parse(this.camZStr);
        /**
         * @type {Vector3} the static camera's coordinates.
         * @public
         */
        this.camCentre = new Vector3(0, 0, 0);
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
        this.backtrackList = new Set(backtrackList);
        this.loadModels = loadModels;
        this.backtrackTail = backtrackTail;
        this.hesitate = hesitate;
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
         * @type {string[]} stores the system's every level.
         * @public don't touch me.
         */
        this.levels = [];
        /**
         * @type {number} the current level (updates after buying the variable).
         * @public don't modify this please.
         */
        this.lv = -1;
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
         * @type {number[]} stores the indices of the other stack.
         * @public don't touch this.
         */
        this.idxStack = [];
        /**
         * @type {number} the current index of the sequence.
         * @public don't know.
         */
        this.i = 0;
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
        this.lastCamVel = new Vector3(0, 0, 0);
        /**
         * @type {number} the next index to update for the current level.
         * @public I told you so many times that you shouldn't access these.
         */
        this.nextDeriveIdx = 0;
        this.polygonMode = 0;
    }

    /**
     * Updates the renderer's level.
     * @param {number} level the target level.
     * @param {boolean} seedChanged (default: false) whether the seed has
     * changed.
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
        this.ori = new Quaternion();
        this.stack = [];
        this.idxStack = [];
        this.i = 0;
        this.polygonMode = 0;
        if(clearGraph)
        {
            this.elapsed = 0;
            theory.clearGraph();
        }
        theory.invalidateTertiaryEquation();
    }
    /**
     * Configures every parameter of the renderer, except the system.
     * @param {string} figureScale the zoom level expression.
     * @param {boolean} cameraMode the camera mode.
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
    configure(figureScale, cameraMode, camX, camY, camZ, followFactor,
    loopMode, upright, quickDraw, quickBacktrack, backtrackList, loadModels,
    backtrackTail, hesitate)
    {
        let requireReset = (figureScale !== this.figScaleStr) ||
        (upright != this.upright) || (quickDraw != this.quickDraw) ||
        (quickBacktrack != this.quickBacktrack) ||
        (loadModels != this.loadModels) || (hesitate != this.hesitate);

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
        let btl = new Set(backtrackList);
        if(!eqSet(btl, this.backtrackList))
            requireReset = true;
        this.backtrackList = btl;
        this.loadModels = loadModels;
        this.backtrackTail = backtrackTail;
        this.hesitate = hesitate;

        if(requireReset)
            this.reset();
        
        return requireReset;
    }
    /**
     * Configures only the parameters related to the static camera mode.
     * @param {string} figureScale the zoom level expression.
     * @param {number} camX the camera's x-axis centre.
     * @param {number} camY the camera's y-axis centre.
     * @param {number} camZ the camera's z-axis centre.
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
    set applySystem(system)
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
        this.system.rerollSeed = seed;
        this.system.rerollAxiom();
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
        this.state += this.ori.rotVector;
    }
    /**
     * Ticks the clock.
     */
    tick(dt)
    {
        if(this.lv > this.loaded + 1 ||
        typeof this.levels[this.lv] == 'undefined')
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
        I can guarantee that because the game runs on one thread, the renderer
        would always load faster than it draws.
        */
        if(level > this.loaded)
            this.update(level);

        // You can't believe how many times I have to type this typeof clause.
        if(level > this.loaded + 1 ||
        typeof this.levels[this.lv] == 'undefined')
            return;

        if(onlyUpdate)
            return;
        
        // This is to prevent the renderer from skipping the first point.
        if(this.elapsed == 0)
            return;

        /*
        Don't worry, it'll not run forever. This is just to prevent the renderer
        from hesitating for 1 tick every loop.
        */
        let j, t;
        for(j = 0; j < 2; ++j)
        {
            for(; this.i < this.levels[this.lv].length; ++this.i)
            {
                switch(this.levels[this.lv][this.i])
                {
                    case ' ':
                        log('blank space')
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
                        this.ori = ZAxisQuat.mul(this.ori);
                        break;
                    case '[':
                        this.idxStack.push(this.stack.length);
                        this.stack.push([this.state, this.ori]);
                        break;
                    case ']':
                        if(this.stack.length == 0)
                        {
                            log('You\'ve clearly made a bracket error.');
                            break;
                        }

                        t = this.stack.pop();
                        this.state = t[0];
                        this.ori = t[1];
                        if(this.stack.length ==
                        this.idxStack[this.idxStack.length - 1])
                        {
                            this.idxStack.pop();
                            if(this.hesitate && this.polygonMode <= 0)
                            {
                                ++this.i;
                                return;
                            }
                            else
                                break;
                        }
                        if(this.polygonMode <= 0)
                            return;
                        else
                        {
                            --this.i;
                            break;
                        }
                    case '{':        
                        ++this.polygonMode;
                        break;
                    case '}':
                        --this.polygonMode;
                        break;
                    case '.':
                        if(this.polygonMode <= 0)
                            log('You\'re making a polygon outside of one?');
                        else
                            ++this.i;

                        return;
                    default:
                        let ignored = this.system.ignoreList.has(
                        this.levels[this.lv][this.i]);

                        if(ignored)
                        {
                            if(this.quickDraw && this.stack.length > 0 &&
                            this.ori === this.stack[this.stack.length - 1][1])
                                this.stack.push([this.state, this.ori]);
                            break;
                        }

                        if(!this.quickBacktrack)
                            this.stack.push([this.state, this.ori]);

                        this.forward();

                        let breakAhead = this.backtrackList.has(
                        this.levels[this.lv][this.i + 1]);
                        if(this.quickBacktrack && breakAhead)
                            this.stack.push([this.state, this.ori]);

                        if(this.quickDraw && !breakAhead &&
                        (this.quickBacktrack || this.stack.length > 0 &&
                        this.ori === this.stack[this.stack.length - 1][1]) &&
                        this.i < this.levels[this.lv].length - 1)
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
            if(!this.backtrackTail || this.stack.length == 0)
            {
                // log(this.stateString)
                switch(this.loopMode)
                {
                    case 2:
                        l.buy(1);
                        if(this.backtrackTail)
                            return;
                        break;
                    case 1:
                        this.reset(false);
                        if(this.backtrackTail)
                            return;
                        break;
                    case 0:
                        if(this.backtrackTail)
                            this.state = new Vector3(0, 0, 0);
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
    swizzle(coords)
    {
        // The game uses left-handed Y-up, I mean Y-down coordinates.
        if(this.upright)
            return new Vector3(-coords.y, -coords.x, coords.z);

        return new Vector3(coords.x, -coords.y, coords.z);
    }
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
     * @returns {Vector3} the coordinates.
     */
    get centre()
    {
        if(this.cameraMode)
            return -this.cursor;

        return this.swizzle(-this.camCentre / this.figureScale);
    }
    /**
     * Returns the cursor's coordinates.
     * @returns {Vector3} the coordinates.
     */
    get cursor()
    {
        let coords = this.state / this.figureScale;
        return this.swizzle(coords);
    }
    /**
     * Returns the camera's coordinates.
     * @returns {Vector3} the coordinates.
     */
    get camera()
    {
        let newCamera;
        switch(this.cameraMode)
        {
            case 2:
                // I accidentally discovered B??zier curves unknowingly.
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
     * Returns the cursor's orientation.
     * @returns {Quaternion} the orientation.
     */
    get angles()
    {
        return this.ori;
    }
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
     */
    get elapsedTime()
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
    get progressFrac()
    {
        return [this.i, this.levels[this.lv].length];
    }
    /**
     * Returns the current progress on this level.
     * @returns {number} (between 0 and 100) the current progress.
     */
    get progressPercent()
    {
        if(typeof this.levels[this.lv] == 'undefined')
            return 0;

        let pf = this.progressFrac;
        let result = pf[0] * 100 / pf[1];
        if(isNaN(result))
            result = 0;

        return result;
    }
    /**
     * Returns the current progress as a string.
     * @returns {string} the string.
     */
    get progressString()
    {
        let pf = this.progressFrac;
        return `i=${pf[0]}/${pf[1]}`;
    }
    /**
     * Returns a loading message.
     * @returns {string} the string.
     */
    get loadingString()
    {
        let len = typeof this.levels[this.loaded + 1] == 'undefined' ? 0 :
        this.levels[this.loaded + 1].length;
        return Localization.format(getLoc('rendererLoading'), this.loaded + 1,
        len);
    }
    /**
     * Returns the cursor's position as a string.
     * @returns {string} the string.
     */
    get stateString()
    {
        if(typeof this.levels[this.lv] == 'undefined')
            return this.loadingString;

        return `\\begin{matrix}x=${getCoordString(this.state.x)},&y=${getCoordString(this.state.y)},&z=${getCoordString(this.state.z)},&${this.progressString}\\end{matrix}`;
    }
    /**
     * Returns the cursor's orientation as a string.
     * @returns {string} the string.
     */
    get oriString()
    {
        if(typeof this.levels[this.lv] == 'undefined')
            return this.loadingString;

        return `\\begin{matrix}q=${this.ori.toString()},&${this.progressString}\\end{matrix}`;
    }
    /**
     * Returns the renderer's string representation.
     * @returns {string} the string.
     */
    toString()
    {
        return`${this.figScaleStr} ${this.cameraMode} ${this.camXStr} ${this.camYStr} ${this.camZStr} ${this.followFactor} ${this.loopMode} ${this.upright ? 1 : 0} ${this.quickDraw ? 1 : 0} ${this.quickBacktrack ? 1 : 0} ${[...this.backtrackList].join('')} ${this.loadModels ? 1 : 0} ${this.backtrackTail ? 1 : 0} ${this.hesitate}`;
    }
}

class VariableControls
{
    constructor(variable, useAnchor = false, quickbuyAmount = 10)
    {
        this.variable = variable;
        this.varBtn = null;
        this.refundBtn = null;
        this.buyBtn = null;

        this.useAnchor = useAnchor;
        this.anchor = this.variable.level;
        this.anchorActive = false;
        this.quickbuyAmount = quickbuyAmount;
    }

    updateAllButtons()
    {
        this.updateDescription();
        this.updateRefundButton();
        this.updateBuyButton();
    }
    updateDescription()
    {
        this.varBtn.content.text = this.variable.getDescription();
    }
    createVariableButton(callback = null, height = DEFAULT_BUTTON_HEIGHT)
    {
        if(this.varBtn !== null)
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
                verticalOptions: LayoutOptions.CENTER,
                textColor: Color.TEXT_MEDIUM
            }),
            borderColor: Color.TRANSPARENT
        });
        if(callback !== null)
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
    updateRefundButton()
    {
        this.refundBtn.borderColor = this.variable.level > 0 ? Color.BORDER :
        Color.TRANSPARENT;
        this.refundBtn.content.textColor = this.variable.level > 0 ?
        Color.TEXT : Color.TEXT_MEDIUM;
    }
    createRefundButton(symbol = '-', height = DEFAULT_BUTTON_HEIGHT)
    {
        if(this.refundBtn !== null)
            return this.refundBtn;

        // let bc = () => this.variable.level > 0 ? Color.BORDER :
        // Color.TRANSPARENT;
        // let tc = () => this.variable.level > 0 ? Color.TEXT :
        // Color.TEXT_MEDIUM;
        // let tcPressed = () => this.variable.level > 0 ? Color.TEXT_MEDIUM :
        // Color.TEXT_DARK;

        this.refundBtn = ui.createFrame
        ({
            heightRequest: height,
            cornerRadius: 1,
            padding: new Thickness(10, 2),
            verticalOptions: LayoutOptions.CENTER,
            content: ui.createLatexLabel
            ({
                text: symbol,
                horizontalOptions: LayoutOptions.CENTER,
                verticalOptions: LayoutOptions.CENTER,
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
    updateBuyButton()
    {
        this.buyBtn.borderColor = this.variable.level < this.variable.maxLevel ?
        Color.BORDER : Color.TRANSPARENT;
        this.buyBtn.content.textColor = this.variable.level <
        this.variable.maxLevel ? Color.TEXT : Color.TEXT_MEDIUM;
    }
    createBuyButton(symbol = '+', height = DEFAULT_BUTTON_HEIGHT)
    {
        if(this.buyBtn !== null)
            return this.buyBtn;

        // let bc = () => this.variable.level < this.variable.maxLevel ?
        // Color.BORDER : Color.TRANSPARENT;
        // let tc = () => this.variable.level < this.variable.maxLevel ?
        // Color.TEXT : Color.TEXT_MEDIUM;
        // let tcPressed = () => this.variable.level < this.variable.maxLevel ?
        // Color.TEXT_MEDIUM : Color.TEXT_DARK;

        this.buyBtn = ui.createFrame
        ({
            heightRequest: height,
            cornerRadius: 1,
            padding: new Thickness(10, 2),
            verticalOptions: LayoutOptions.CENTER,
            content: ui.createLatexLabel
            ({
                text: symbol,
                horizontalOptions: LayoutOptions.CENTER,
                verticalOptions: LayoutOptions.CENTER,
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

class Measurer
{
    constructor(title, window = 10)
    {
        this.title = title;
        this.window = window;
        this.sum = 0;
        this.windowSum = 0;
        this.max = 0;
        this.records = [];
        for(let i = 0; i < this.window; ++i)
            this.records[i] = 0;
        this.ticksPassed = 0;
        this.lastStamp = null;
    }
    
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
    stamp()
    {
        if(this.lastStamp === null)
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
    get windowAvg()
    {
        return this.windowSum / Math.min(this.window, this.ticksPassed);
    }
    get allTimeAvg()
    {
        return this.sum / this.ticksPassed;
    }
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

const XAxisQuat = new Quaternion(0, 1, 0, 0);
const ZAxisQuat = new Quaternion(0, 0, 0, 1);

let arrow = new LSystem('X', ['F=FF', 'X=F[+X][-X]FX'], 30);
let renderer = new Renderer(arrow, '2^lv', 0, '2^lv');
let globalSeed = new LCG(Date.now());
let contentsTable = [1, 2, 3, 4, 5, 6, 7, 10, 12, 15, 19, 21, 23, 26];
let manualSystems =
{
    11:
    {
        system: arrow,
        config: ['1.5*2^lv', '1.2*2^lv', 0, 0, true]
    },
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
    13:
    {
        system: new LSystem('X', [
            'F=FF',
            'X=F-[[X]+X]+F[+FX]-X,F+[[X]-X]-F[-FX]+X'
        ], 22.5),
        config: ['1.5*2^lv', '1.2*2^lv', 0, 0, true]
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
        config: [6, 6, 0, 0, true]
    },
    14:
    {
        system: new LSystem('[X]+[X]+[X]+[X]+[X]+[X]', [
            'X=F[+F][-F]X',
            'F=F[+i][-i]F',
            'i=Ii,IIi'
        ], 60, 0, 'i'),
        config: ["2*2^lv", 0, 0, 0, false]
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
        config: ['2*2^lv', '1.2*2^lv', 0, 0, true]
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
        config: ['3*1.3^lv', '1.8*1.3^lv', 0, 0, true]
    },
    20:
    {
        system: new LSystem('{[A}]{[B}]', [
            'A=[+A]C.',
            'B=[-B]C.',
            'C=GC'
        ], 27),
        config: ['lv', 'lv/2-1', 0, 0, true]
    },
    22:
    {
        system: new LSystem('A~K', [
            'A=[--//~K][++//~K]I///A',
            'I=Fi',
            'i=Fj',
            'j=J[--FFA][++FFA]',
            '~K=F[+++[--F+F]^^^[--F+F]^^^[--F+F]^^^[--F+F]]'
        ], 30),
        config: ['3*lv', '1.5*lv', 0, 0, true]
    },
    27:
    {
        system: new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[-X]-X'], 15),
        config: ['2^lv', '2^lv', 0, 0, true]
    },
    28:
    {
        system: new LSystem('X', ['F=F[+F]XF', 'X=F-[[X]+X]+F[-FX]-X'], 27),
        config: ['1.5*2^lv', '0.225*2^lv', '-0.75*2^lv', 0, false]
    },
    29:
    {
        system: new LSystem('X', [
            'E=XEXF-',
            'F=FX+[E]X',
            'X=F-[X+[X[++E]F]]+F[X+FX]-X'
        ], 22.5),
        config: ['3^lv', '0.75*3^lv', '-0.25*3^lv', 0, true]
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
        renderer.draw(l.level, !timeCheck(elapsedTime));
        renderer.tick(elapsedTime);
    }

    if(measurePerformance)
        drawMeasurer.stamp();

    let msTime = renderer.elapsedTime;
    min.value = msTime[0] + msTime[1] / 100;
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

let createButton = (label, callback, height = DEFAULT_BUTTON_HEIGHT) =>
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
            verticalOptions: LayoutOptions.CENTER,
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
    let lvlRefund = lvlControls.createRefundButton('???');
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
    let tsRefund = tsControls.createRefundButton('???');
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
        renderer.applySystem = tmpSystem;
        tmpSystem = null;
    }, ui.screenHeight * 0.05);
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
                        DEFAULT_BUTTON_HEIGHT,
                        DEFAULT_BUTTON_HEIGHT
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
                        DEFAULT_BUTTON_HEIGHT,
                        DEFAULT_BUTTON_HEIGHT,
                        DEFAULT_BUTTON_HEIGHT
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
        verticalOptions: LayoutOptions.CENTER
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
        verticalOptions: LayoutOptions.CENTER
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
                // horizontalOptions: LayoutOptions.END,
                verticalOptions: LayoutOptions.CENTER
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
        verticalOptions: LayoutOptions.CENTER,
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
        verticalOptions: LayoutOptions.CENTER
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
        verticalOptions: LayoutOptions.CENTER
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
    let tmpHes = renderer.hesitate;
    let hesLabel = ui.createLatexLabel
    ({
        text: getLoc('labelHesitate'),
        row: 2,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });
    let hesSwitch = ui.createSwitch
    ({
        isToggled: tmpHes,
        row: 2,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED ||
                e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpHes = !tmpHes;
                hesSwitch.isToggled = tmpHes;
            }
        }
    });
    let tmpEXB = [...renderer.backtrackList].join('');
    let EXBLabel = ui.createLatexLabel
    ({
        text: getLoc('labelBTList'),
        row: 3,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });
    let EXBEntry = ui.createEntry
    ({
        text: tmpEXB,
        row: 3,
        column: 1,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpEXB = nt;
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
                                        verticalOptions: LayoutOptions.CENTER
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
                                        verticalOptions: LayoutOptions.CENTER
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
                                rowDefinitions: [40, 40],
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
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    tailSwitch
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
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelQuickdraw'),
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    QDSwitch,
                                    ui.createLatexLabel
                                    ({
                                        text: getLoc('labelQuickBT'),
                                        row: 1,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    QBSwitch,
                                    hesLabel,
                                    hesSwitch,
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
                ui.createLatexLabel
                ({
                    text: getLoc('labelRequireReset'),
                    margin: new Thickness(0, 0, 0, 4),
                    verticalOptions: LayoutOptions.CENTER
                }),
                ui.createGrid
                ({
                    minimumHeightRequest: 64,
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
                                let requireReset = renderer.configure(tmpZE,
                                tmpCM, tmpCX, tmpCY, tmpCZ, tmpFF, tmpLM,
                                tmpUpright, tmpQD, tmpQB, tmpEXB, tmpModel,
                                tmpTail, tmpHes);
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
                                EXBEntry.text = [...rx.backtrackList].join('');
                                tmpModel = rx.loadModels;
                                modelSwitch.isToggled = rx.loadModels;
                                tmpTail = rx.backtrackTail;
                                tailSwitch.isToggled = rx.backtrackTail;
                                tmpHes = rx.hesitate;
                                hesSwitch.isToggled = rx.hesitate;
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
        onTextChanged: (ot, nt) =>
        {
            tmpAxiom = nt;
        }
    });
    let tmpAngle = values.turnAngle;
    let angleEntry = ui.createEntry
    ({
        text: tmpAngle.toString(),
        keyboard: Keyboard.NUMERIC,
        row: 0,
        column: 3,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpAngle = Number(nt);
        }
    });
    let tmpRules = values.rules;
    let ruleEntries = [];
    for(let i = 0; i < tmpRules.length; ++i)
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
    let rulesLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelRules'), ruleEntries.length),
        verticalOptions: LayoutOptions.CENTER,
        margin: new Thickness(0, 12)
    });
    let ruleStack = ui.createStackLayout
    ({
        children: ruleEntries
    });
    let addRuleButton = ui.createButton
    ({
        text: getLoc('btnAdd'),
        row: 0,
        column: 1,
        heightRequest: 40,
        onClicked: () =>
        {
            Sound.playClick();
            let i = ruleEntries.length;
            ruleEntries.push(ui.createEntry
            ({
                text: '',
                onTextChanged: (ot, nt) =>
                {
                    tmpRules[i] = nt;
                }
            }));
            rulesLabel.text = Localization.format(getLoc('labelRules'),
            ruleEntries.length);
            ruleStack.children = ruleEntries;
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
    let tmpSeed = values.seed;
    let seedEntry = ui.createEntry
    ({
        text: tmpSeed.toString(),
        keyboard: Keyboard.NUMERIC,
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
                                columnDefinitions: ['20*', '40*', '25*', '15*'],
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
                                renderer.applySystem = new LSystem(tmpAxiom,
                                tmpRules, tmpAngle, tmpSeed, tmpIgnore);
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
                                tmpRules = values.rules;
                                ruleEntries = [];
                                rulesLabel.text = Localization.format(
                                getLoc('labelRules'), ruleEntries.length);
                                ruleStack.children = ruleEntries;
                                ignoreEntry.text = values.ignoreList;
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
                verticalOptions: LayoutOptions.CENTER
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
            heightRequest: 40,
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
        heightRequest: () => Math.max(40, Math.min(ui.screenHeight * 0.2,
        systemGrid.height)),
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
                            verticalOptions: LayoutOptions.CENTER
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
                            verticalOptions: LayoutOptions.CENTER
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
                    // horizontalOptions: LayoutOptions.CENTER,
                    verticalOptions: LayoutOptions.CENTER,
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
        verticalOptions: LayoutOptions.CENTER
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
                        renderer.applySystem = new LSystem(sv.system.axiom,
                        sv.system.rules, sv.system.turnAngle,
                        sv.system.seed, sv.system.ignoreList);
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
        verticalOptions: LayoutOptions.CENTER
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

let createViewMenu = (title) =>
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
        verticalOptions: LayoutOptions.CENTER
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
                // horizontalOptions: LayoutOptions.END,
                verticalOptions: LayoutOptions.CENTER
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
        onTextChanged: (ot, nt) =>
        {
            tmpAxiom = nt;
        }
    });
    let tmpAngle = values.turnAngle;
    let angleEntry = ui.createEntry
    ({
        text: tmpAngle.toString(),
        keyboard: Keyboard.NUMERIC,
        row: 0,
        column: 3,
        horizontalTextAlignment: TextAlignment.END,
        onTextChanged: (ot, nt) =>
        {
            tmpAngle = Number(nt);
        }
    });
    let tmpRules = [];
    for(let i = 0; i < values.rules.length; ++i)
        tmpRules[i] = values.rules[i];
    let ruleEntries = [];
    for(let i = 0; i < tmpRules.length; ++i)
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
    let rulesLabel = ui.createLatexLabel
    ({
        text: Localization.format(getLoc('labelRules'), ruleEntries.length),
        verticalOptions: LayoutOptions.CENTER,
        margin: new Thickness(0, 12)
    });
    let ruleStack = ui.createStackLayout
    ({
        children: ruleEntries
    });
    let addRuleButton = ui.createButton
    ({
        text: getLoc('btnAdd'),
        row: 0,
        column: 1,
        heightRequest: 40,
        onClicked: () =>
        {
            Sound.playClick();
            let i = ruleEntries.length;
            ruleEntries.push(ui.createEntry
            ({
                text: '',
                onTextChanged: (ot, nt) =>
                {
                    tmpRules[i] = nt;
                }
            }));
            rulesLabel.text = Localization.format(getLoc('labelRules'),
            ruleEntries.length);
            ruleStack.children = ruleEntries;
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
    let tmpSeed = values.seed;
    let seedEntry = ui.createEntry
    ({
        text: tmpSeed.toString(),
        keyboard: Keyboard.NUMERIC,
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
                                horizontalOptions: LayoutOptions.CENTER,
                                verticalOptions: LayoutOptions.CENTER
                            }),
                            ui.createGrid
                            ({
                                columnDefinitions: ['20*', '40*', '25*', '15*'],
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
                                    angleEntry
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
                            }),
                            ui.createBox
                            ({
                                heightRequest: 1,
                                margin: new Thickness(0, 6)
                            }),
                            ui.createLatexLabel
                            ({
                                text: getLoc('labelApplyCamera'),
                                // horizontalOptions: LayoutOptions.CENTER,
                                verticalOptions: LayoutOptions.CENTER,
                                margin: new Thickness(0, 12)
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
                                        verticalOptions: LayoutOptions.CENTER
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
                                        verticalOptions: LayoutOptions.CENTER
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
                    minimumHeightRequest: 64,
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
                                renderer.applySystem = new LSystem(tmpAxiom,
                                tmpRules, tmpAngle, tmpSeed, tmpIgnore);
                                tmpSystem = null;
                                renderer.configureStaticCamera(tmpZE, tmpCX,
                                tmpCY, tmpCZ, tmpUpright);
                                tmpSystemName = title;
                                tmpSystemDesc = tmpDesc;
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
                                    tmpAngle, tmpSeed, tmpIgnore).object,
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
        // horizontalOptions: LayoutOptions.CENTER,
        verticalOptions: LayoutOptions.CENTER,
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
                verticalOptions: LayoutOptions.CENTER
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
            heightRequest: 40,
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
        verticalOptions: LayoutOptions.START,
        children: getSystemGrid()
    });
    let systemGridScroll = ui.createScrollView
    ({
        heightRequest: () => Math.max(40, Math.min(ui.screenHeight * 0.32,
        systemGrid.height)),
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
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnClipboard'),
                            row: 0,
                            column: 1,
                            heightRequest: 40,
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
                            heightRequest: 40,
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
        horizontalOptions: LayoutOptions.CENTER,
        verticalOptions: LayoutOptions.CENTER
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
                horizontalOptions: LayoutOptions.END_AND_EXPAND,
                verticalOptions: LayoutOptions.CENTER
            }),
            sourceEntry
        ]
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
                verticalOptions: LayoutOptions.CENTER
            }));
            children.push(ui.createButton
            ({
                text: Localization.format(getLoc('btnPage'),
                contentsTable[i] + 1),
                row: i,
                column: 1,
                heightRequest: 40,
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
                        ui.createButton
                        ({
                            text: getLoc('btnPrev'),
                            row: 0,
                            column: 0,
                            isVisible: () => page > 0,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                if(page > 0)
                                    setPage(page - 1);
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnConstruct'),
                            row: 0,
                            column: 1,
                            isVisible: () => page in manualSystems,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                let s = manualSystems[page];
                                renderer.applySystem = s.system;
                                tmpSystem = null;
                                if('config' in s)
                                    renderer.configureStaticCamera(...s.config);

                                tmpSystemName = manualPages[page].title;
                                tmpSystemDesc = Localization.format(
                                getLoc('manualSystemDesc'), page + 1);
                                menu.hide();
                            }
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnContents'),
                            row: 0,
                            column: 1,
                            isVisible: () => !(page in manualSystems),
                            onClicked: () =>
                            {
                                Sound.playClick();
                                TOCMenu.show();
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
                                    setPage(page + 1);
                            }
                        })
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
            text: Localization.format(getLoc('labelLevelSeq'), i),
            row: i,
            column: 0,
            verticalOptions: LayoutOptions.CENTER
        }));
        tmpLvls.push(ui.createGrid
        ({
            columnDefinitions: ['80*', 'auto'],
            row: i,
            column: 1,
            children:
            [
                ui.createEntry
                ({
                    text: renderer.levels[i],
                    row: 0,
                    column: 0
                }),
                ui.createLatexLabel
                ({
                    text: Localization.format(getLoc('labelChars'),
                    renderer.levels[i].length),
                    row: 0,
                    column: 1,
                    horizontalOptions: LayoutOptions.END_AND_EXPAND,
                    verticalOptions: LayoutOptions.CENTER
                })
            ]
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
    let tmpMCPT = maxCharsPerTick;
    let MCPTEntry = ui.createEntry
    ({
        text: tmpMCPT.toString(),
        keyboard: Keyboard.NUMERIC,
        row: 4,
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
                        ACSwitch,
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelMeasure'),
                            row: 3,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        MPSwitch,
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelMaxCharsPerTick'),
                            row: 4,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        MCPTEntry,
                        ui.createLatexLabel
                        ({
                            text: getLoc('labelInternalState'),
                            row: 5,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createButton
                        ({
                            text: getLoc('btnClipboard'),
                            row: 5,
                            column: 1,
                            heightRequest: 40,
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
    maxCharsPerTick: maxCharsPerTick,
    renderer:
    {
        figureScale: renderer.figScaleStr,
        cameraMode: renderer.cameraMode,
        camX: renderer.camXStr,
        camY: renderer.camYStr,
        camZ: renderer.camZStr,
        followFactor: renderer.followFactor,
        loopMode: renderer.loopMode,
        upright: renderer.upright,
        loadModels: renderer.loadModels,
        quickDraw: renderer.quickDraw,
        quickBacktrack: renderer.quickBacktrack,
        backtrackList: [...renderer.backtrackList].join(''),
        backtrackTail: renderer.backtrackTail,
        hesitate: renderer.hesitate
    },
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
        if('maxCharsPerTick' in state)
            maxCharsPerTick = state.maxCharsPerTick;
        
        if('system' in state)
        {
            tmpSystemName = state.system.title;
            tmpSystemDesc = state.system.desc;
            tmpSystem = new LSystem(state.system.axiom, state.system.rules,
            state.system.turnAngle, state.system.seed, state.system.ignoreList);
        }
        
        if('renderer' in state)
        {
            renderer = new Renderer(new LSystem(), state.renderer.figureScale,
            state.renderer.cameraMode, state.renderer.camX, state.renderer.camY,
            state.renderer.camZ, state.renderer.followFactor,
            state.renderer.loopMode, state.renderer.upright,
            state.renderer.quickDraw, state.renderer.quickBacktrack,
            state.renderer.backtrackList, state.renderer.loadModels,
            state.renderer.backtrackTail, state.renderer.hesitate);
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

var getResetStageMessage = () => getLoc('rerollSeed');

var resetStage = () => renderer.seed = globalSeed.nextInt;

var getTertiaryEquation = () =>
{
    if(altTerEq)
        return renderer.oriString;

    return renderer.stateString;
}

var get3DGraphPoint = () => renderer.cursor;

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
