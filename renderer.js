import { ConstantCost, FreeCost } from '../api/Costs';
import { theory } from '../api/Theory';
import { ui } from '../api/ui/UI';
import { Utils } from '../api/Utils';
import { Vector3 } from '../api/Vector3';
import { LayoutOptions } from '../api/ui/properties/LayoutOptions';
import { TextAlignment } from '../api/ui/properties/TextAlignment';
import { Thickness } from '../api/ui/properties/Thickness';
import { Color } from '../api/ui/properties/Color';
import { StackOrientation } from '../api/ui/properties/StackOrientation';
import { TouchType } from '../api/ui/properties/TouchType';

var id = 'L_systems_renderer';
var name = 'L-systems Renderer';
var description = 'An educational tool that lets you draw various fractal figures and plants.\n\nFeatures:\n- Can store a whole army of systems!\n- Stochastic (randomised) systems\n- Two camera modes: fixed (scaled) and cursor-focused\n- Stroke options\n\nWarning: As of 0.18, renderer configuration will be messed up due to internal state format changes. Reset not required.\nAs of 0.15, a theory reset is required due to internal state format changes.';
var authors = 'propfeds#5988';
var version = 'v0.18 WIP';

class LCG
{
    constructor(seed = 0)
    {
        this.m = 0x80000000; // 2**31;
        this.a = 1103515245;
        this.c = 12345;
    
        this.state = seed % this.m;
    }

    nextInt()
    {
        this.state = (this.a * this.state + this.c) % this.m;
        return this.state;
    }
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
    nextRange(start, end)
    {
        // [start, end)
        let size = end - start;
        return start + Math.floor(this.nextFloat() * size);
    }
    choice(array)
    {
        return array[this.nextRange(0, array.length)];
    }
}

class LSystem
{
    constructor(axiom, rules, turnAngle = 30, seed = 0)
    {
        this.axiom = axiom;
        this.rules = new Map();
        for(let i = 0; i < rules.length; ++i)
        {
            if(rules[i] !== '')
            {
                let rs = rules[i].split('=');
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
        let result = `${this.axiom} ${this.turnAngle} ${this.seed}`;
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
    constructor(system, initScale = 1, figureScale = 2, cursorFocused = false, camX = 0, camY = 0, camZ = 0, followFactor = 0.15, offlineDrawing = false, upright = false, quickDraw = false, quickBacktrack = false, extendedBacktrack = false)
    {
        this.system = system;
        this.initScale = initScale;
        this.figureScale = figureScale;
        this.cursorFocused = cursorFocused;
        this.camera = new Vector3(camX, camY, camZ);
        this.followFactor = followFactor;
        this.offlineDrawing = offlineDrawing;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.extendedBacktrack = extendedBacktrack;

        this.state = new Vector3(0, 0, 0);
        this.ori = new Vector3(0, 0, 0);
        this.levels = [];
        this.lvl = -1;
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        this.lastCamera = new Vector3(0, 0, 0);
        this.update(0);
    }

    update(level, seedChanged = false)
    {
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
    }
    reset()
    {
        this.state = new Vector3(0, 0, 0);
        this.ori = new Vector3(0, 0, 0);
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        theory.clearGraph();
        theory.invalidateTertiaryEquation();
    }
    configure(initScale, figureScale, cursorFocused, camX, camY, camZ, followFactor, offlineDrawing, upright, quickDraw, quickBacktrack, extendedBacktrack)
    {
        let requireReset = (initScale != this.initScale) || (figureScale != this.figureScale) || (upright != this.upright) || (quickDraw != this.quickDraw) || (quickBacktrack != this.quickBacktrack) || (extendedBacktrack != this.extendedBacktrack);

        this.initScale = initScale;
        this.figureScale = figureScale;
        this.cursorFocused = cursorFocused;
        this.camera = new Vector3(camX, camY, camZ);
        this.followFactor = followFactor;
        this.offlineDrawing = offlineDrawing;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.extendedBacktrack = extendedBacktrack;

        if(requireReset)
            this.reset();
    }
    configureStaticCamera(initScale, figureScale, camX, camY, camZ, upright)
    {
        let requireReset = (initScale != this.initScale) || (figureScale != this.figureScale) || (upright != this.upright);

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
        this.update(0);
        this.reset();
        l.level = 0;
    }
    rerollSeed(seed)
    {
        this.system.setSeed(seed);
        this.update(this.lvl, true);
        this.reset();
    }
    turn(dx = 0, dy = 0, dz = 0)
    {
        this.ori.x += dx;
        this.ori.y += dy;
        this.ori.z += dz;
    }
    forward()
    {
        // Alpha, Beta and Ygamma, representing yaw, pitch and roll
        let a = this.system.turnAngle * this.ori.z * Math.PI / 180;
        let b = this.system.turnAngle * this.ori.y * Math.PI / 180;
        // let y = this.system.turnAngle * this.ori.x * Math.PI / 180;
        // How cruel is this world that we don't actually need gamma, and I
        // wasted a fucking millenium trying to figure out why the equations
        // do not contain the roll (gamma). It is because the roll only spins
        // the vector head, and does not change the direction.

        let dx = Math.cos(a) * Math.cos(b);
        let dy = Math.sin(a) * Math.cos(b);
        let dz = -Math.sin(b);
        this.state += new Vector3(dx, dy, dz);
    }

    draw(level)
    {
        if(this.lvl != level)
            this.reset();
        this.update(level);

        let i;
        for(i = this.idx; i < this.levels[this.lvl].length; ++i)
        {
            switch(this.levels[this.lvl][i])
            {
                case '+':
                    this.turn(0, 0, 1);
                    break;
                case '-':
                    this.turn(0, 0, -1);
                    break;
                case '&':
                    this.turn(0, 1, 0);
                    break;
                case '^':
                    this.turn(0, -1, 0);
                    break;
                case '\\':
                    this.turn(1, 0, 0);
                    break;
                case '/':
                    this.turn(-1, 0, 0);
                    break;
                case '[':
                    this.idStack.push(this.stack.length);
                    this.stack.push([this.state, this.ori]);
                    break;
                case ']':
                    let t = this.stack.pop();
                    this.state = t[0];
                    this.ori = t[1];
                    if(this.stack.length == this.idStack[this.idStack.length - 1])
                    {
                        this.idStack.pop();
                        this.idx = i + 1;
                        if(this.idx >= this.levels[this.lvl].length)
                            this.idx = 0;
                    }
                    return;
                default:
                    if(!this.quickBacktrack || backtrackList[this.extendedBacktrack ? 1 : 0].includes(this.levels[this.lvl][i + 1]))
                        this.stack.push([this.state, this.ori]);
                    this.forward();
                    this.idx = i + 1;
                    if(this.quickDraw)
                        break;
                    else
                        return;
            }
        }
    }

    getAngles()
    {
        // Alpha, Beta and Ygamma, representing yawn, stretch and roll
        let result = this.ori * this.system.turnAngle;
        result.x %= 360;
        result.y %= 360;
        result.z %= 360;
        return result;
    }
    getProgress()
    {
        return this.idx * 100 / (this.levels[this.lvl].length - 1);
    }
    getStateString()
    {
        return `\\begin{matrix}x=${getCoordString(this.state.x)},&y=${getCoordString(this.state.y)},&z=${getCoordString(this.state.z)},&i=${this.idx - 1}/${this.levels[this.lvl].length - 2}\\end{matrix}`;
    }
    getCentre()
    {
        if(this.cursorFocused)
            return -this.getCursor(this.lvl);
        else
        {
            if(this.upright)
                return new Vector3(this.camera.y, this.camera.x, -this.camera.z) / this.initScale;
            else
                return new Vector3(-this.camera.x, this.camera.y, -this.camera.z) / this.initScale;
        }
    }
    getCursor()
    {
        let coords = this.state / (this.initScale * this.figureScale ** this.lvl);
        if(this.upright)
            return new Vector3(-coords.y, -coords.x, coords.z);
        else
            return new Vector3(coords.x, -coords.y, coords.z);
    }
    getCamera()
    {
        if(this.cursorFocused)
        {
            let newCamera = this.getCentre() * this.followFactor + this.lastCamera * (1 - this.followFactor);
            this.lastCamera = newCamera;
            return newCamera;
        }
        else
            return this.getCentre();
    }
    toString()
    {
        return`${this.initScale} ${this.figureScale} ${this.cursorFocused ? 1 : 0} ${this.camera.x} ${this.camera.y} ${this.camera.z} ${this.followFactor} ${this.offlineDrawing? 1 : 0} ${this.upright ? 1 : 0} ${this.quickDraw ? 1 : 0} ${this.quickBacktrack? 1 : 0} ${this.extendedBacktrack? 1 : 0}`;
    }
}

var getCoordString = (x) => x.toFixed(x >= 0 ? (x < 10 ? 3 : 2) : (x <= -10 ? 1 : 2));

var arrow = new LSystem('X', ['F=FF', 'X=F[+X][-X]FX'], 30);
var cultivarFF = new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[-X]-X'], 15);
var cultivarFXF = new LSystem('X', ['F=F[+F]XF', 'X=F-[[X]+X]+F[-FX]-X'], 27);
var cultivarXEXF = new LSystem('X', ['E=XEXF-', 'F=FX+[E]X', 'X=F-[X+[X[++E]F]]+F[X+FX]-X'], 22.5);
var dragon = new LSystem('FX', ['Y=-FX-Y', 'X=X+YF+'], 90);
var stocWeed = new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[+FX]-X,F+[[X]-X]-F[-FX]+X'], 22.5);
var renderer = new Renderer(arrow, 1, 2, false, 1);

var savedSystems = new Map();
var globalSeed = new LCG(Date.now());
var time = 0;
var gameOffline = false;
var backtrackList = ['+-', '+-[]'];
var page = 0;
var manualPages =
[
    {
        title: 'The Main Screen',
        contents: 'The main screen consists of the renderer and its controls.\n\nLevel: the system\'s level. Pressing + or - will derive/revert the system respectively. Pressing the Level button will reveal all levels of the system.\n\nTickspeed: controls the renderer\'s drawing speed (up to 10 lines/sec).\n\n(Tip: holding + or - will buy/refund a variable in bulk.)\n\nReroll: located on the top right. Pressing this button will reroll the system\'s seed (for stochastic systems).'
    },
    {
        title: 'A Primer on L-systems',
        contents: 'Developed in 1968 by biologist Aristid Lindenmayer, an L-system is a formal grammar that describes the growth of a sequence (string). It is often used to model plants and draw fractal figures.\n\n\n\nSyntax:\n\nAxiom: the starting sequence.\n\nRules: how each symbol in the sequence is derived per level.\n\nEach rule is written in the form of:\n\n(symbol)=(derivation(s))\n\nAny letter: moves cursor forward to draw.\n\n+ -: turns cursor left/right by an angle.\n\n[ ]: allows for branches, by queueing cursor positions on a stack.\n\n, : separates between derivations (for stochastic systems).'
    },
    {
        title: 'Tips on Constructing an L-system',
        contents: 'Each letter can be used to mean different things, such as drawing a flower, emulating growth stages, alternating between patterns, etc. Traditionally, F is used to mean forward, and X to create new branches; but beyond that, the sky is the limit!\n\nBrackets work in a stack mechanism, therefore every [ has to be properly followed by a ] in the same production rule.\n\nTo create a stochastic system, simply list several derivations in the same rule, separated by a , (comma). One of those derivations will be randomly selected per symbol whenever the system is derived.\n\nGenerally, to keep a degree of uniformity in the system, it is advised for the derivations to be similar in shape.'
    },
    {
        title: 'Configuring your L-system',
        contents: 'Configure the visual representation of your L-system with the renderer menu.\n\nTurning angle: changes the angle of +, -.\n\nFigure scale: zooms the figure out by a multiplier each level.\n\nCamera centre: sets camera position for level 0 (this follows figure scale, and is based on non-upright coordinates).\n\nUpright figure: rotates figure by 90 degrees (counter-clockwise) around the z-axis.\n\nNote: figure scale and camera centre needs to be experimented manually for each individual L-system.'
    },
    {
        title: 'Example: Arrow weed',
        contents: 'Meet the default system. It tastes like mint.\n\nAxiom: X\n\nF→FF\n\nX→F[+X][-X]FX\n\nTurning angle: 30°\n\n\n\nScale: 1, 2\n\nCamera centre: (1, 0, 0)',
        system: arrow,
        config: [1, 2, 1, 0, 0, false]
    },
    {
        title: 'Example: Cultivar FF',
        contents: 'Represents a common source of carbohydrates.\n\nAxiom: X\n\nF→FF\n\nX→F-[[X]+X]+F[-X]-X\n\nTurning angle: 15°\n\n\n\nScale: 1, 2\n\nCamera centre: (1, 0, 0)',
        system: cultivarFF,
        config: [1, 2, 1, 0, 0, true]
    },
    {
        title: 'Example: Cultivar FXF',
        contents: 'Commonly called the Cyclone, cultivar FXF resembles a coil of barbed wire. Legends have it, once a snake moult has weathered enough, a new life is born unto the tattered husk, and from there, it stretches.\n\nAxiom: X\n\nF→F[+F]XF\n\nX→F-[[X]+X]+F[-FX]-X\n\nTurning angle: 27°\n\n\n\nScale: ?, ?\n\nCamera centre: (?, ?, 0)',
        system: cultivarFXF,
        config: [1.5, 2, 0.25, 0.75, 0, false]
    },
    {
        title: 'Example: Cultivar XEXF',
        contents: 'Bearing the shape of a thistle, cultivar XEXF embodies the strength and resilience of nature against the harsh logarithm drop-off. It also smells really, really good.\n\nAxiom: X\n\nE→XEXF-\n\nF→FX+[E]X\n\nX→F-[X+[X[++E]F]]+F[X+FX]-X\n\nTurning angle: 22.5°\n\n\n\nScale: ?, ?\n\nCamera centre: (?, ?, 0)',
        system: cultivarXEXF,
        config: [1, 3, 0.75, -0.25, 0, true]
    },
    {
        title: 'Example: Dragon curve',
        contents: 'Also known as the Heighway dragon.\n\nAxiom: FX\n\nY→-FX-Y\n\nX→X+YF+\n\nTurning angle: 90°\n\n\n\nScale: 2, sqrt(2)\n\nCamera centre: (0, 0, 0)',
        system: dragon,
        config: [2, Math.sqrt(2), 0, 0, 0, false]
    },
    {
        title: 'Example: Stochastic weed',
        contents: 'A random shape every time it rolls!\n\nAxiom: F\n\nF→FF\n\nX→F-[[X]+X]+F[+FX]-X,\n\n →F+[[X]-X]-F[-FX]+X',
        system: stocWeed
    }
];

var init = () =>
{
    // yaw = theory.createCurrency('° (yaw)', '\\degree_z');
    // pitch = theory.createCurrency('° (pitch)', '\\degree_y');
    // roll = theory.createCurrency('° (roll)', '\\degree_x');
    yaw = theory.createCurrency('°', '\\degree_z');
    pitch = theory.createCurrency('°', '\\degree_y');
    roll = theory.createCurrency('°', '\\degree_x');
    progress = theory.createCurrency('%');
    // l (Level)
    {
        let getDesc = (level) => `\\text{Level: }${level.toString()}`;
        let getInfo = (level) => `\\text{Lv. }${level.toString()}`;
        l = theory.createUpgrade(0, progress, new FreeCost);
        l.getDescription = (_) => Utils.getMath(getDesc(l.level));
        l.getInfo = (amount) => Utils.getMathTo(getInfo(l.level), getInfo(l.level + amount));
        l.canBeRefunded = (_) => true;
    }
    // ts (Tickspeed)
    {
        let getDesc = (level) => `\\text{Tickspeed: }${level.toString()}/sec`;
        let getInfo = (level) => `\\text{Ts=}${level.toString()}/s`;
        ts = theory.createUpgrade(1, progress, new FreeCost);
        ts.getDescription = (_) => Utils.getMath(getDesc(ts.level));
        ts.getInfo = (amount) => Utils.getMathTo(getInfo(ts.level), getInfo(ts.level + amount));
        ts.maxLevel = 10;
        ts.canBeRefunded = (_) => true;
        ts.boughtOrRefunded = (_) => time = 0;
    }
}

var alwaysShowRefundButtons = () => true;

var tick = (elapsedTime, multiplier) =>
{
    if(ts.level == 0)
        return;
    
    let timeLimit = 1 / ts.level;
    time += elapsedTime;

    if(time >= timeLimit - 1e-8)
    {
        if(game.isCalculatingOfflineProgress)
            gameOffline = true;
        else if(gameOffline)
        {
            // Probably triggers only once when reloading
            if(!renderer.offlineDrawing)
                renderer.reset();
            gameOffline = false;
        }

        if(!gameOffline || renderer.offlineDrawing)
        {
            renderer.draw(l.level);
            let angles = renderer.getAngles();
            yaw.value = angles.z;
            pitch.value = angles.y;
            roll.value = angles.x;
            progress.value = renderer.getProgress();        
            theory.invalidateTertiaryEquation();
        }
        time -= timeLimit;
    }
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
    let bc = () => variable.level > 0 ? Color.MINIGAME_TILE_BORDER : Color.TRANSPARENT;
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
    let bc = () => variable.level < variable.maxLevel ? Color.MINIGAME_TILE_BORDER : Color.TRANSPARENT;
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
            textColor: () => variable.level < variable.maxLevel ? Color.TEXT : Color.TEXT_MEDIUM
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
            if(e.type == TouchType.SHORTPRESS_RELEASED || e.type == TouchType.LONGPRESS_RELEASED)
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
var createVariableButtonWithMenu = (variable, menuFunc, height) =>
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
            if(e.type == TouchType.SHORTPRESS_RELEASED || e.type == TouchType.LONGPRESS_RELEASED)
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

var getUpgradeListDelegate = () =>
{
    let height = ui.screenHeight * 0.055;

    let lvlButton = createVariableButtonWithMenu(l, createSequenceMenu, height);
    lvlButton.row = 0;
    lvlButton.column = 0;
    let tsButton = createVariableButton(ts, height);
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
    let CFCLabel = ui.createLatexLabel
    ({
        text: `Camera mode: ${tmpCFC ? 'Cursor-focused' : 'Static'}`,
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
            if(e.type == TouchType.SHORTPRESS_RELEASED || e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpCFC = !tmpCFC;
                CFCSwitch.isToggled = tmpCFC;
                camLabel.isVisible = !tmpCFC;
                camGrid.isVisible = !tmpCFC;
                FFLabel.isVisible = tmpCFC;
                FFEntry.isVisible = tmpCFC;
                CFCLabel.text = `Camera mode: ${tmpCFC ? 'Cursor-focused' : 'Static'}`;
            }
        }
    });
    let tmpCX = renderer.camera.x;
    let tmpCY = renderer.camera.y;
    let tmpCZ = renderer.camera.z;
    let camLabel = ui.createLatexLabel
    ({
        text: 'Camera centre (x, y, z): ',
        row: 3,
        column: 0,
        verticalOptions: LayoutOptions.CENTER,
        isVisible: !tmpCFC
    });
    let camGrid = ui.createGrid
    ({
        row: 3,
        column: 1,
        columnDefinitions: ['30*', '30*', '30*'],
        isVisible: !tmpCFC,
        children:
        [
            ui.createEntry
            ({
                text: tmpCX.toString(),
                row: 0,
                column: 0,
                horizontalTextAlignment: TextAlignment.END,
                onTextChanged: (ot, nt) =>
                {
                    tmpCX = Number(nt);
                }
            }),
            ui.createEntry
            ({
                text: tmpCY.toString(),
                row: 0,
                column: 1,
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
                column: 2,
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
        text: 'Camera follow factor (0-1): ',
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
    let tmpOD = renderer.offlineDrawing;
    let ODSwitch = ui.createSwitch
    ({
        isToggled: tmpOD,
        row: 0,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED || e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpOD = !tmpOD;
                ODSwitch.isToggled = tmpOD;
            }
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
            if(e.type == TouchType.SHORTPRESS_RELEASED || e.type == TouchType.LONGPRESS_RELEASED)
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
            if(e.type == TouchType.SHORTPRESS_RELEASED || e.type == TouchType.LONGPRESS_RELEASED)
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
            if(e.type == TouchType.SHORTPRESS_RELEASED || e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpQB = !tmpQB;
                QBSwitch.isToggled = tmpQB;
            }
        }
    });
    let tmpEXB = renderer.extendedBacktrack;
    let EXBLabel = ui.createLatexLabel
    ({
        text: `Backtrack list: ${backtrackList[tmpEXB ? 1 : 0]}`,
        row: 4,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });
    let EXBSwitch = ui.createSwitch
    ({
        isToggled: tmpEXB,
        row: 4,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.SHORTPRESS_RELEASED || e.type == TouchType.LONGPRESS_RELEASED)
            {
                Sound.playClick();
                tmpEXB = !tmpEXB;
                EXBSwitch.isToggled = tmpEXB;
                EXBLabel.text = `Backtrack list: ${backtrackList[tmpEXB ? 1 : 0]}`;
            }
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
                                rowDefinitions: [40, 40, 40, 40, 40],
                                columnDefinitions: ['70*', '30*'],
                                children:
                                [
                                    ui.createLatexLabel
                                    ({
                                        text: 'Offline drawing: ',
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    ODSwitch,
                                    ui.createLatexLabel
                                    ({
                                        text: 'Upright figure: ',
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
                                    EXBSwitch
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
                    text: 'Save',
                    onClicked: () =>
                    {
                        Sound.playClick();
                        renderer.configure(tmpIScale, tmpFScale, tmpCFC, tmpCX, tmpCY, tmpFF, tmpOD, tmpUpright, tmpQD, tmpQB, tmpEXB);
                        menu.hide();
                    }
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
    for(let [key, value] of renderer.system.rules)
    {
        if(typeof value === 'string')
            tmpRules.push(`${key}=${value}`);
        else
            tmpRules.push(`${key}=${value.join(',')}`);
    }
    let ruleEntries = [];
    for(let i = 0; i < tmpRules.length; ++i)
    {
        if(tmpRules[i] === undefined)
            tmpRules[i] = '';
        ruleEntries[i] = ui.createEntry
        ({
            text: tmpRules[i],
            onTextChanged: (ot, nt) =>
            {
                tmpRules[i] = nt;
            }
        });
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
                    tmpRules[i] = nt;
                }
            }));
            ruleStack.children = ruleEntries;
        }
    });
    let tmpSeed = renderer.system.seed;
    let seedEntry = ui.createEntry
    ({
        text: tmpSeed.toString(),
        row: 0,
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
                                        text: 'Seed (for stochastic systems): ',
                                        row: 0,
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
                        renderer.applySystem(new LSystem(tmpAxiom, tmpRules, tmpAngle, tmpSeed));
                        menu.hide();
                    }
                })
            ]
        })
    })
    return menu;
}

var createNamingMenu = (title, values, systemGrid) =>
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
                        // let saveMenu = createSaveMenu();
                        // saveMenu.show();
                        menu.hide();
                    }
                })
            ]
        }),
        // onDisappearing: () =>
        // {
        //     let saveMenu = createSaveMenu();
        //     saveMenu.show();
        // }
    });
    return menu;
}

var createViewMenu = (title, systemGrid) =>
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
        if(tmpRules[i] === undefined)
            tmpRules[i] = '';
        ruleEntries[i] = ui.createEntry
        ({
            text: tmpRules[i]
        });
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
                                        horizontalTextAlignment: TextAlignment.END
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
                                        text: 'Seed (for stochastic systems): ',
                                        row: 0,
                                        column: 0,
                                        verticalOptions: LayoutOptions.CENTER
                                    }),
                                    ui.createEntry
                                    ({
                                        text: tmpSeed.toString(),
                                        row: 0,
                                        column: 1,
                                        horizontalTextAlignment: TextAlignment.END
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
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        ui.createButton
                        ({
                            text: 'Apply',
                            row: 0,
                            column: 0,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                renderer.applySystem(new LSystem(tmpAxiom, tmpRules, tmpAngle, tmpSeed));
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
        
        // onDisappearing: () =>
        // {
        //     let saveMenu = createSaveMenu();
        //     saveMenu.show();
        // }
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
                    columnDefinitions: ['70*', '30*'],
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
                            text: 'Save',
                            row: 0,
                            column: 1,
                            // heightRequest: 40,
                            onClicked: () =>
                            {
                                Sound.playClick();
                                let namingMenu = createNamingMenu('Untitled L-system', renderer.system.toString(), systemGrid);
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
                // ui.createBox
                // ({
                //     heightRequest: 1,
                //     margin: new Thickness(0, 6)
                // }),
                // ui.createButton
                // ({
                //     text: 'Close',
                //     onClicked: () =>
                //     {
                //         Sound.playClick();
                //         menu.hide();
                //     }
                // })
            ]
        })
    })
    return menu;
}

var createManualMenu = () =>
{
    let pageTitle = ui.createLatexLabel
    ({
        text: manualPages[page].title,
        horizontalOptions: LayoutOptions.CENTER,
        verticalOptions: LayoutOptions.CENTER
    });
    let pageContents = ui.createLatexLabel
    ({
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
                ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                ui.createScrollView
                ({
                    heightRequest: ui.screenHeight * 0.3,
                    content: pageContents
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
                                    menu.title = `Manual (${page + 1}/${manualPages.length})`;
                                    pageTitle.text = manualPages[page].title;
                                    pageContents.text = manualPages[page].contents;
                                }
                            }
                        }),
                        ui.createButton
                        ({
                            text: 'Apply',
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
                                    renderer.configureStaticCamera(a[0], a[1], a[2], a[3], a[4], a[5]);
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
                                    menu.title = `Manual (${page + 1}/${manualPages.length})`;
                                    pageTitle.text = manualPages[page].title;
                                    pageContents.text = manualPages[page].contents;
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

var getEquationOverlay = () =>
{
    let result = ui.createLatexLabel
    ({
        text: version,
        displacementX: 6,
        displacementY: 4,
        fontSize: 9,
        textColor: Color.TEXT_MEDIUM
    });
    return result;
}

var getInternalState = () =>
{
    let result = `${time}\n${renderer.toString()}\n${renderer.system.toString()}`;
    for(let [key, value] of savedSystems)
    {
        result += `\n${key}\n${value}`;
    }
    return result;
}

var setInternalState = (stateStr) =>
{
    let values = stateStr.split('\n');
    time = parseBigNumber(values[0]);

    let systemValues = values[2].split(' ');
    let system = new LSystem(systemValues[0], systemValues.slice(3), Number(systemValues[1]), Number(systemValues[2]));

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
        rendererValues[7] = Boolean(Number(rendererValues[7]));
    if(rendererValues.length > 8)
        rendererValues[8] = Boolean(Number(rendererValues[8]));
    if(rendererValues.length > 9)
        rendererValues[9] = Boolean(Number(rendererValues[9]));
    if(rendererValues.length > 10)
        rendererValues[10] = Boolean(Number(rendererValues[10]));
    if(rendererValues.length > 11)
        rendererValues[11] = Boolean(Number(rendererValues[11]));

    renderer = new Renderer(system, ...rendererValues);
    
    for(let i = 3; i + 1 < values.length; i += 2)
        savedSystems.set(values[i], values[i + 1]);
}

var canResetStage = () => true;

var getResetStageMessage = () => 'You are about to reroll the system\'s seed.';

var resetStage = () => renderer.rerollSeed(globalSeed.nextInt());

var getTertiaryEquation = () => renderer.getStateString();

var get3DGraphPoint = () => renderer.getCursor();

var get3DGraphTranslation = () => renderer.getCamera();

init();
