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
    constructor(system, initScale = 1, figureScale = 2, camX = 0, camY = 0, upright = false)
    {
        this.system = system;
        this.initScale = initScale;
        this.figureScale = figureScale;
        this.camX = camX;
        this.camY = camY;
        this.upright = upright;

        this.state = new Vector3(0, 0, 0);
        this.levels = [];
        this.lvl = -1;
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
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
    configure(initScale, figureScale, camX, camY, upright)
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
        if(cursorFocusedCamera)
        {
            return -this.getCursor(this.lvl);
        }
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
                    if(!quickBacktrack || backtrackList[useExtendedBacktrack ? 1 : 0].includes(this.levels[this.lvl][i + 1]))
                        this.stack.push(this.state);
                    this.forward();
                    this.idx = i + 1;
                    if(quickDraw)
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
        let l = this.levels.length > 0 ? this.levels[this.lvl].length : 0;
        return `\\begin{matrix}x=${getCoordString(this.state.x)},&y=${getCoordString(this.state.y)},&a=${this.state.z},&i=${this.idx}/${l}\\end{matrix}`;
    }

    getCursor()
    {
        let coords = this.state / (this.initScale * this.figureScale ** this.lvl);
        if(this.upright)
            return new Vector3(coords.y, -coords.x, 0);
        else
            return new Vector3(coords.x, coords.y, 0);
    }

    toString()
    {
        return`${this.initScale} ${this.figureScale} ${this.camX} ${this.camY} ${this.upright ? 1 : 0} ${this.system.toString()}`;
    }
}

var getCoordString = (x) => x.toFixed(x >= 0 ? (x < 10 ? 3 : 2) : (x <= -10 ? 1 : 2));

var arrow = new LSystem('X', ['F=FF', 'X=F[+X][-X]FX'], 30);
var cultivarFF = new LSystem('X', ['F=FF', 'X=F-[[X]+X]+F[-X]-X'], 15);
var cultivarFXF = new LSystem('X', ['F=F[+F]XF', 'X=F-[[X]+X]+F[-FX]-X'], 27);
var cultivarXEXF = new LSystem('X', ['E=XEXF-', 'F=FX+[E]X', 'X=F-[X+[X[++E]F]]+F[X+FX]-X'], 22.5);
var dragon = new LSystem('FX', ['Y=-FX-Y', 'X=X+YF+'], 90);

var renderer = new Renderer(arrow, 1, 2, 1, 0, false);
var time = 0;
var page = 0;
var gameOffline = false;

// Experimental options
var enableOfflineDrawing = true;
var cursorFocusedCamera = false;
var lastCamera = new Vector3(0, 0, 0);
var followFactor = 0.4;
var quickDraw = false;
var quickBacktrack = false;
var useExtendedBacktrack = false;
var backtrackList = ['+-', '+-[]'];

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
            if(!enableOfflineDrawing)
                renderer.reset();
            gameOffline = false;
        }

        if(!gameOffline || enableOfflineDrawing)
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
    let expButton = createMenuButton(createExpMenu, 'Experimental options', height);
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
    let tmpFScale = renderer.figureScale;
    let tmpCX = renderer.camX;
    let tmpCY = renderer.camY;
    let tmpUpright = renderer.upright;

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
                        ui.createEntry
                        ({
                            text: tmpIScale.toString(),
                            row: 0,
                            column: 1,
                            horizontalTextAlignment: TextAlignment.END,
                            onTextChanged: (ot, nt) =>
                            {
                                tmpIScale = Number(nt);
                            }
                        }),
                        ui.createLatexLabel
                        ({
                            text: 'Figure scale per level: ',
                            row: 1,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createEntry
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
                        }),
                        ui.createLatexLabel
                        ({
                            text: 'Camera centre (x, y): ',
                            row: 2,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createGrid
                        ({
                            row: 2,
                            column: 1,
                            columnDefinitions: ['50*', '50*'],
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
                        }),
                        ui.createLatexLabel
                        ({
                            text: 'Upright figure: ',
                            row: 3,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createSwitch
                        ({
                            isToggled: () => tmpUpright,
                            row: 3,
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
                    text: 'Save',
                    onClicked: () =>
                    {
                        Sound.playClick();
                        renderer.configure(tmpIScale, tmpFScale, tmpCX, tmpCY, tmpUpright);
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
    let tmpAngle = renderer.system.turnAngle;
    let tmpRules = [];
    for(let [key, value] of renderer.system.rules)
    {
        tmpRules.push(`${key}=${value}`);
    }
    for(let i = 0; i < 8; ++i)
        if(tmpRules[i] === undefined)
            tmpRules[i] = '';

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
                        ui.createEntry
                        ({
                            text: tmpAxiom,
                            row: 0,
                            column: 1,
                            onTextChanged: (ot, nt) =>
                            {
                                tmpAxiom = nt;
                            }
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
                            horizontalTextAlignment: TextAlignment.END,
                            onTextChanged: (ot, nt) =>
                            {
                                tmpAngle = Number(nt);
                            }
                        }),
                    ]
                }),
                ui.createLatexLabel
                ({
                    text: 'Production rules: ',
                    verticalOptions: LayoutOptions.CENTER,
                    margin: new Thickness(0, 6)
                }),
                ui.createEntry
                ({
                    text: tmpRules[0],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[0] = nt;
                    }
                }),
                ui.createEntry
                ({
                    text: tmpRules[1],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[1] = nt;
                    }
                }),
                ui.createEntry
                ({
                    text: tmpRules[2],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[2] = nt;
                    }
                }),
                ui.createEntry
                ({
                    text: tmpRules[3],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[3] = nt;
                    }
                }),
                ui.createEntry
                ({
                    text: tmpRules[4],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[4] = nt;
                    }
                }),
                ui.createEntry
                ({
                    text: tmpRules[5],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[5] = nt;
                    }
                }),
                ui.createEntry
                ({
                    text: tmpRules[6],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[6] = nt;
                    }
                }),
                ui.createEntry
                ({
                    text: tmpRules[7],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[7] = nt;
                    }
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
                                    renderer.configure(a[0], a[1], a[2], a[3], a[4]);
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

var createExpMenu = () =>
{
    let tmpEOD = enableOfflineDrawing;
    let tmpCFC = cursorFocusedCamera;
    let tmpFF = followFactor;
    let tmpQD = quickDraw;
    let tmpQB = quickBacktrack;
    let tmpUEB = useExtendedBacktrack;

    let UEBLabel = ui.createLatexLabel
    ({
        text: `Backtrack list: ${backtrackList[tmpUEB ? 1 : 0]}`,
        row: 5,
        column: 0,
        verticalOptions: LayoutOptions.CENTER
    });

    let menu = ui.createPopup
    ({
        title: 'Experimental Options',
        content: ui.createStackLayout
        ({
            children:
            [
                ui.createGrid
                ({
                    columnDefinitions: ['75*', '25*'],
                    children:
                    [
                        ui.createLatexLabel
                        ({
                            text: 'Offline drawing: ',
                            row: 0,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createSwitch
                        ({
                            isToggled: () => tmpEOD,
                            row: 0,
                            column: 1,
                            horizontalOptions: LayoutOptions.END,
                            onTouched: (e) =>
                            {
                                if(e.type == TouchType.PRESSED)
                                {
                                    Sound.playClick();
                                    tmpEOD = !tmpEOD;
                                }
                            }
                        }),
                        ui.createLatexLabel
                        ({
                            text: 'Cursor-focused camera: ',
                            row: 1,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createSwitch
                        ({
                            isToggled: () => tmpCFC,
                            row: 1,
                            column: 1,
                            horizontalOptions: LayoutOptions.END,
                            onTouched: (e) =>
                            {
                                if(e.type == TouchType.PRESSED)
                                {
                                    Sound.playClick();
                                    tmpCFC = !tmpCFC;
                                }
                            }
                        }),
                        ui.createLatexLabel
                        ({
                            text: 'Camera follow factor (0-1): ',
                            row: 2,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createEntry
                        ({
                            text: tmpFF.toString(),
                            row: 2,
                            column: 1,
                            horizontalTextAlignment: TextAlignment.END,
                            onTextChanged: (ot, nt) =>
                            {
                                tmpFF = Number(nt);
                                tmpFF = Math.min(Math.max(tmpFF, 0), 1);
                            }
                        }),
                        ui.createLatexLabel
                        ({
                            text: 'Quickdraw straight lines: ',
                            row: 3,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createSwitch
                        ({
                            isToggled: () => tmpQD,
                            row: 3,
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
                        }),
                        ui.createLatexLabel
                        ({
                            text: 'Quick backtrack: ',
                            row: 4,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        ui.createSwitch
                        ({
                            isToggled: () => tmpQB,
                            row: 4,
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
                        }),
                        UEBLabel,
                        ui.createSwitch
                        ({
                            isToggled: () => tmpUEB,
                            row: 5,
                            column: 1,
                            horizontalOptions: LayoutOptions.END,
                            onTouched: (e) =>
                            {
                                if(e.type == TouchType.PRESSED)
                                {
                                    Sound.playClick();
                                    tmpUEB = !tmpUEB;
                                    UEBLabel.text = `Backtrack list: ${backtrackList[tmpUEB ? 1 : 0]}`;
                                }
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
                    text: 'Save (only this session)',
                    onClicked: () =>
                    {
                        Sound.playClick();
                        let requireReset = (quickDraw != tmpQD) || (quickBacktrack != tmpQB) || (useExtendedBacktrack != tmpUEB);

                        enableOfflineDrawing = tmpEOD;
                        cursorFocusedCamera = tmpCFC;
                        followFactor = tmpFF;
                        quickDraw = tmpQD;
                        quickBacktrack = tmpQB;
                        useExtendedBacktrack = tmpUEB;

                        if(requireReset)
                            renderer.reset();
                        menu.hide();
                    }
                })
            ]
        })
    })
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

var getInternalState = () => `${time} ${renderer.toString()}`;

var setInternalState = (stateStr) =>
{
    let values = stateStr.split(' ');
    time = parseBigNumber(values[0]);
    // axiom = values[6];
    // turnAngle = values[7];
    let tmpRules = [];
    for(let i = 0; i < 8; ++i)
    {
        if(values[8 + i] !== undefined)
            tmpRules[i] = values[8 + i];
        else
            tmpRules[i] = '';
    }
    let system = new LSystem(values[6], tmpRules, values[7]);
    renderer = new Renderer(system, Number(values[1]), Number(values[2]), Number(values[3]), Number(values[4]), Boolean(Number(values[5])));
}

var canResetStage = () => true;

var resetStage = () => renderer.reset();

var getTertiaryEquation = () => renderer.getStateString();

var get3DGraphPoint = () => renderer.getCursor();

var get3DGraphTranslation = () =>
{
    let newCamera = renderer.centre() * followFactor + lastCamera * (1 - followFactor);
    lastCamera = newCamera;
    return newCamera;
}

init();
