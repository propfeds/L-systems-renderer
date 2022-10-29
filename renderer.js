import { FreeCost } from '../api/Costs';
import { theory } from '../api/Theory';
import { ui } from '../api/ui/UI';
import { Utils } from '../api/Utils';
import { Vector3 } from '../api/Vector3';
import { LayoutOptions } from '../api/ui/properties/LayoutOptions';
import { TextAlignment } from '../api/ui/properties/TextAlignment';
import { Thickness } from '../api/ui/properties/Thickness';
import { Color } from '../api/ui/properties/Color';

var id = 'L_systems_renderer';
var name = 'L-systems Renderer';
var description = 'A renderer of L-systems.\n\nFeatures:\n- Supports a whole array of (eight!) production rules\n- Two camera mode: fixed (scaled) and cursor-focused\n- Stroke options';
var authors = 'propfeds#5988';
var version = 'v0.15 WIP';

class LSystem
{
    constructor(axiom, rules, turnAngle = 30)
    {
        this.axiom = axiom;
        this.rules = new Map();
        for(let i = 0; i < rules.length; ++i)
        {
            if(rules[i] !== '')
            {
                let rs = rules[i].split('=');
                this.rules.set(rs[0], rs[1]);
            }
        }
        this.turnAngle = turnAngle;
    }

    derive(state)
    {
        let result = '';
        for(let i = 0; i < state.length; ++i)
        {
            if(this.rules.has(state[i]))
                result += this.rules.get(state[i]);
            else
                result += state[i];
        }
        return result;
    }

    toString()
    {
        let result = `${this.axiom} ${this.turnAngle}`;
        for(let [key, value] of this.rules)
        {
            result += ` ${key}=${value}`;
        }
        return result;
    }
}

class Renderer
{
    constructor(system, initScale = 1, figureScale = 2, cursorFocused = false, camX = 0, camY = 0, followFactor = 0.4, offlineDrawing = false, upright = false, quickDraw = false, quickBacktrack = false, extendedBacktrack = false)
    {
        this.system = system;
        this.initScale = initScale;
        this.figureScale = figureScale;
        this.cursorFocused = cursorFocused;
        this.camX = camX;
        this.camY = camY;
        this.followFactor = followFactor;
        this.offlineDrawing = offlineDrawing;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.extendedBacktrack = extendedBacktrack;

        this.state = new Vector3(0, 0, 0);
        this.levels = [];
        this.lvl = -1;
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        this.lastCamera = new Vector3(0, 0, 0);
        this.update(0);
    }

    update(level)
    {
        this.lvl = level;
        for(let i = this.levels.length; i <= level; ++i)
        {
            if(i == 0)
                this.levels[i] = `[${this.system.axiom}]`;
            else
                this.levels[i] = this.system.derive(this.levels[i - 1]);
        }
    }
    reset()
    {
        this.state = new Vector3(0, 0, 0);
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
        theory.clearGraph();
        theory.invalidateTertiaryEquation();
    }
    configure(initScale, figureScale, cursorFocused, camX, camY, followFactor, offlineDrawing, upright, quickDraw, quickBacktrack, extendedBacktrack)
    {
        let requireReset = (initScale != this.initScale) || (figureScale != this.figureScale) || (upright != this.upright) || (quickDraw != this.quickDraw) || (quickBacktrack != this.quickBacktrack) || (extendedBacktrack != this.extendedBacktrack);

        this.initScale = initScale;
        this.figureScale = figureScale;
        this.cursorFocused = cursorFocused;
        this.camX = camX;
        this.camY = camY;
        this.followFactor = followFactor;
        this.offlineDrawing = offlineDrawing;
        this.upright = upright;
        this.quickDraw = quickDraw;
        this.quickBacktrack = quickBacktrack;
        this.extendedBacktrack = extendedBacktrack;

        if(requireReset)
            this.reset();
    }
    configureStaticCamera(initScale, figureScale, camX, camY, upright)
    {
        let requireReset = (initScale != this.initScale) || (figureScale != this.figureScale) || (upright != this.upright);

        this.initScale = initScale;
        this.figureScale = figureScale;
        this.camX = camX;
        this.camY = camY;
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

    turnLeft()
    {
        this.state = new Vector3(this.state.x, this.state.y, this.state.z + 1);
    }
    turnRight()
    {
        this.state = new Vector3(this.state.x, this.state.y, this.state.z - 1);
    }
    forward()
    {
        this.state = new Vector3(
            this.state.x + Math.cos(this.system.turnAngle * this.state.z * Math.PI / 180),
            this.state.y + Math.sin(this.system.turnAngle * this.state.z * Math.PI / 180),
            this.state.z
        );
    }
    centre()
    {
        if(this.cursorFocused)
            return -this.getCursor(this.lvl);
        else
        {
            if(this.upright)
                return new Vector3(
                    this.camY / this.initScale,
                    this.camX / this.initScale,
                    0
                );
            else
                return new Vector3(
                    -this.camX / this.initScale,
                    this.camY / this.initScale,
                    0
                );
        }
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
                case '+': this.turnLeft(); break;
                case '-': this.turnRight(); break;
                case '[':
                    this.idStack.push(this.stack.length);
                    this.stack.push(this.state);
                    break;
                case ']':
                    this.state = this.stack.pop();
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
                        this.stack.push(this.state);
                    this.forward();
                    this.idx = i + 1;
                    if(this.quickDraw)
                        break;
                    else
                        return;
            }
        }
    }

    getAngle()
    {
        return this.state.z * this.system.turnAngle % 360;
    }
    getProgress()
    {
        return this.idx * 100 / (this.levels[this.lvl].length - 1);
    }
    getStateString()
    {
        return `\\begin{matrix}x=${getCoordString(this.state.x)},&y=${getCoordString(this.state.y)},&a=${this.state.z},&i=${this.idx}/${this.levels[this.lvl].length}\\end{matrix}`;
    }
    getCursor()
    {
        let coords = this.state / (this.initScale * this.figureScale ** this.lvl);
        if(this.upright)
            return new Vector3(coords.y, -coords.x, 0);
        else
            return new Vector3(coords.x, coords.y, 0);
    }
    getCamera()
    {
        if(this.cursorFocused)
        {
            let newCamera = this.centre() * this.followFactor + this.lastCamera * (1 - this.followFactor);
            this.lastCamera = newCamera;
            return newCamera;
        }
        else
            return this.centre();
    }
    toString()
    {
        return`${this.initScale} ${this.figureScale} ${this.cursorFocused ? 1 : 0} ${this.camX} ${this.camY} ${this.followFactor} ${this.offlineDrawing? 1 : 0} ${this.upright ? 1 : 0} ${this.quickDraw ? 1 : 0} ${this.quickBacktrack? 1 : 0} ${this.extendedBacktrack? 1 : 0}`;
    }
}

var getCoordString = (x) => x.toFixed(x >= 0 ? (x < 10 ? 3 : 2) : (x <= -10 ? 1 : 2));

var arrow = new LSystem('X', ['F=FF', 'X=F[+X][-X]FX'], 30);
var cultivarFF = new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[-X]-X'], 15);
var cultivarFXF = new LSystem('X', ['F=F[+F]XF', 'X=F-[[X]+X]+F[-FX]-X'], 27);
var cultivarXEXF = new LSystem('X', ['E=XEXF-', 'F=FX+[E]X', 'X=F-[X+[X[++E]F]]+F[X+FX]-X'], 22.5);
var dragon = new LSystem('FX', ['Y=-FX-Y', 'X=X+YF+'], 90);
var renderer = new Renderer(arrow, 1, 2, false, 1, 0, 0.4, false, false, false, false, false);

var maxRules = 8;

var time = 0;
var gameOffline = false;
var backtrackList = ['+-', '+-[]'];
var page = 0;
var manualPages =
[
    {
        title: 'A Primer on L-systems',
        contents: 'Developed in 1968 by biologist Aristid Lindenmayer, an L-system is a formal grammar that describes the growth of a sequence (string). It is used to model plants and draw fractal figures.\n\nAxiom: the starting sequence\n\nRules: how each symbol in the sequence is derived after each level\n\nAny letter: moves cursor forward to draw\n\n+, -: turns cursor left/right by an angle\n\n[, ]: allows for branches, by queueing cursor positions on a stack'
    },
    {
        title: 'Constructing an L-system',
        contents: 'The L-system menu provides the tools for constructon with 8 whole production rules!\n\nEach rule is written in the form of:\n\n(symbol)=(derivation)\n\nOriginally, F is used to forward, but any letter should work (lower-case letters don\'t draw a line, but that is impossible for this theory).\n\nBrackets work in a stack mechanism, so for each production rule, every [ has to be followed by a ].'
    },
    {
        title: 'Configuring your L-system',
        contents: 'Configure the visual representation of your L-system.\n\nTurning angle: changes the angle of +, -\n\nFigure scale: zooms the figure out by a multiplier each level\n\nCamera centre: sets camera position for level 0 (follows figure scale, and is based on non-upright logic)\n\nUpright figure: rotates figure by 90 degrees\n\nNote: figure scale and camera centre needs to be experimented manually for each individual L-system.'
    },
    {
        title: 'Example: Arrow weed',
        contents: 'The default system. It tastes like mint.\n\nAxiom: X\n\nF→FF\n\nX→F[+X][-X]FX\n\nTurning angle: 30°\n\n\n\nScale: 1, 2\n\nCamera centre: (1, 0)',
        system: arrow,
        config: [1, 2, 1, 0, false]
    },
    {
        title: 'Example: Cultivar FF',
        contents: 'Represents a common source of carbohydrates.\n\nAxiom: X\n\nF→FF\n\nX→F-[[X]+X]+F[-X]-X\n\nTurning angle: 15°\n\n\n\nScale: 1, 2\n\nCamera centre: (1, 0)',
        system: cultivarFF,
        config: [1, 2, 1, 0, true]
    },
    {
        title: 'Example: Cultivar FXF',
        contents: 'Commonly called the Cyclone, cultivar FXF resembles a coil of barbed wire. Legends have it, once a snake moult has weathered enough, a new life is born unto the tattered husk, and from there, it stretches.\n\nAxiom: X\n\nF→F[+F]XF\n\nX→F-[[X]+X]+F[-FX]-X\n\nTurning angle: 27°\n\n\n\nScale: ?, ?\n\nCamera centre: (?, ?)',
        system: cultivarFXF,
        config: [1.5, 2, 0.25, 0.75, false]
    },
    {
        title: 'Example: Cultivar XEXF',
        contents: 'Bearing the shape of a thistle, cultivar XEXF embodies the strength and resilience of nature against the harsh logarithm drop-off. It also smells really, really good.\n\nAxiom: X\n\nE→XEXF-\n\nF→FX+[E]X\n\nX→F-[X+[X[++E]F]]+F[X+FX]-X\n\nTurning angle: 22.5°\n\n\n\nScale: ?, ?\n\nCamera centre: (?, ?)',
        system: cultivarXEXF,
        config: [1, 3, 0.75, -0.25, true]
    },
    {
        title: 'Example: Dragon curve',
        contents: 'Also known as the Heighway dragon.\n\nAxiom: FX\n\nY→-FX-Y\n\nX→X+YF+\n\nTurning angle: 90°\n\n\n\nScale: 2, sqrt(2)\n\nCamera centre: (0, 0)',
        system: dragon,
        config: [2, Math.sqrt(2), 0, 0, false]
    }
];

var init = () =>
{
    angle = theory.createCurrency('°', '\\degree');
    progress = theory.createCurrency('%');
    // l
    {
        let getDesc = (level) => `\\text{Level: }${level.toString()}`;
        let getInfo = (level) => `\\text{Lv. }${level.toString()}`;
        l = theory.createUpgrade(0, angle, new FreeCost);
        l.getDescription = (_) => Utils.getMath(getDesc(l.level));
        l.getInfo = (amount) => Utils.getMathTo(getInfo(l.level), getInfo(l.level + amount));
        l.canBeRefunded = (_) => true;
    }
    // ts (Tickspeed)
    // Starts with 0, then goes to 1 and beyond?
    {
        let getDesc = (level) => `\\text{Tickspeed: }${level.toString()}/sec`;
        let getInfo = (level) => `\\text{Ts=}${level.toString()}/s`;
        ts = theory.createUpgrade(1, angle, new FreeCost);
        ts.getDescription = (_) => Utils.getMath(getDesc(ts.level));
        ts.getInfo = (amount) => Utils.getMathTo(getInfo(ts.level), getInfo(ts.level + amount));
        ts.maxLevel = 10;
        ts.canBeRefunded = (_) => true;
    }
}

var alwaysShowRefundButtons = () => true;

var tick = (elapsedTime, multiplier) =>
{
    if(ts.level.isZero)
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
            angle.value = renderer.getAngle();
            progress.value = renderer.getProgress();        
            theory.invalidateTertiaryEquation();
        }

        time = 0;
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
        borderColor: Color.TEXT_DARK
    });
    return frame;
}

var createMinusButton = (variable, height) =>
{
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
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                variable.refund(1);
            }
        },
        borderColor: () => variable.level > 0 ? Color.TEXT_MEDIUM : Color.TEXT_DARK
    });
    return frame;
}

var createPlusButton = (variable, height) =>
{
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
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                variable.buy(1);
            }
        },
        borderColor: () => variable.level < variable.maxLevel ? Color.TEXT_MEDIUM : Color.TEXT_DARK
    });
    return frame;
}

var createMenuButton = (menuFunc, name, height) =>
{
    let menu = menuFunc();

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
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                menu.show();
            }
        },
        borderColor: Color.TEXT_MEDIUM
    });
    return frame;
}

var getUpgradeListDelegate = () =>
{
    let height = ui.screenHeight * 0.055;

    let lvlButton = createVariableButton(l, height);
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
    let manualButton = createMenuButton(createManualMenu, 'Manual', height);
    manualButton.row = 1;
    manualButton.column = 0;
    let expButton = createMenuButton(createSequenceMenu, 'View sequence', height);
    expButton.row = 1;
    expButton.column = 1;

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
                        manualButton,
                        expButton
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
        isToggled: () => tmpCFC,
        row: 2,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                tmpCFC = !tmpCFC;
                camLabel.isVisible = !tmpCFC;
                camGrid.isVisible = !tmpCFC;
                FFLabel.isVisible = tmpCFC;
                FFEntry.isVisible = tmpCFC;
                CFCLabel.text = `Camera mode: ${tmpCFC ? 'Cursor-focused' : 'Static'}`;
            }
        }
    });
    let tmpCX = renderer.camX;
    let tmpCY = renderer.camY;
    let camLabel = ui.createLatexLabel
    ({
        text: 'Camera centre (x, y): ',
        row: 3,
        column: 0,
        verticalOptions: LayoutOptions.CENTER,
        isVisible: !tmpCFC
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
        isToggled: () => tmpOD,
        row: 0,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                tmpOD = !tmpOD;
            }
        }
    });
    let tmpUpright = renderer.upright;
    let uprightSwitch = ui.createSwitch
    ({
        isToggled: () => tmpUpright,
        row: 1,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                tmpUpright = !tmpUpright;
            }
        }
    });
    let tmpQD = renderer.quickDraw;
    let QDSwitch = ui.createSwitch
    ({
        isToggled: () => tmpQD,
        row: 2,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                tmpQD = !tmpQD;
            }
        }
    });
    let tmpQB = renderer.quickBacktrack;
    let QBSwitch = ui.createSwitch
    ({
        isToggled: () => tmpQB,
        row: 3,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                tmpQB = !tmpQB;
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
        isToggled: () => tmpEXB,
        row: 4,
        column: 1,
        horizontalOptions: LayoutOptions.END,
        onTouched: (e) =>
        {
            if(e.type == TouchType.PRESSED)
            {
                Sound.playClick();
                tmpEXB = !tmpEXB;
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
        tmpRules.push(`${key}=${value}`);
    }
    let ruleEntries = [];
    for(let i = 0; i < maxRules; ++i)
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
        

    let menu = ui.createPopup
    ({
        title: 'L-system Menu',
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
                ui.createLatexLabel
                ({
                    text: 'Production rules: ',
                    verticalOptions: LayoutOptions.CENTER,
                    margin: new Thickness(0, 6)
                }),
                ruleEntries[0],
                ruleEntries[1],
                ruleEntries[2],
                ruleEntries[3],
                ruleEntries[4],
                ruleEntries[5],
                ruleEntries[6],
                ruleEntries[7],
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
                        renderer.applySystem(new LSystem(tmpAxiom, tmpRules, tmpAngle));
                        menu.hide();
                    }
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
        text: manualPages[page].title,
        horizontalOptions: LayoutOptions.CENTER
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
                    columnDefinitions: ['35*', '30*', '35*'],
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
                                    renderer.configureStaticCamera(a[0], a[1], a[2], a[3], a[4]);
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
    let tmpSeq = renderer.levels[renderer.lvl];

    let menu = ui.createPopup
    ({
        title: 'View Sequence',
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createScrollView
                ({
                    content: ui.createLatexLabel
                    ({
                        text: tmpSeq
                    })
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

var getInternalState = () => `${time} ${renderer.toString()} ${renderer.system.toString()}`;

var setInternalState = (stateStr) =>
{
    let values = stateStr.split(' ');
    time = parseBigNumber(values[0]);
    // axiom = values[12];
    // turnAngle = values[13];
    let tmpRules = [];
    for(let i = 0; i < maxRules; ++i)
    {
        if(values[14 + i] !== undefined)
            tmpRules[i] = values[14 + i];
        else
            tmpRules[i] = '';
    }
    let system = new LSystem(values[12], tmpRules, values[13]);
    renderer = new Renderer(system,
        Number(values[1]),
        Number(values[2]),
        Boolean(Number(values[3])),
        Number(values[4]),
        Number(values[5]),
        Number(values[6]),
        Boolean(Number(values[7])),
        Boolean(Number(values[8])),
        Boolean(Number(values[9])),
        Boolean(Number(values[10])),
        Boolean(Number(values[11]))
    );
}

var canResetStage = () => true;

var resetStage = () => renderer.reset();

var getTertiaryEquation = () => renderer.getStateString();

var get3DGraphPoint = () => renderer.getCursor();

var get3DGraphTranslation = () => renderer.getCamera();

init();
