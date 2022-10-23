import { FreeCost } from '../api/Costs';
import { theory } from '../api/Theory';
import { ui } from '../api/ui/UI';
import { Utils } from '../api/Utils';
import { Vector3 } from '../api/Vector3';
import { LayoutOptions } from '../api/ui/properties/LayoutOptions';
import { TextAlignment } from '../api/ui/properties/TextAlignment';
import { Thickness } from '../api/ui/properties/Thickness';

var id = 'L_systems_renderer';
var name = 'L-systems Renderer';
var description = 'An L-systems renderer.';
var authors = 'propfeds#5988';
var version = '0.12';

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
    constructor(system, initScale = 1, figureScale = 2, xCentre = 0, yCentre = 0, upright = false)
    {
        this.system = system;
        this.initScale = initScale;
        this.figureScale = figureScale;
        this.xCentre = xCentre;
        this.yCentre = yCentre;
        this.upright = upright;

        this.state = new Vector3(0, 0, 0);
        this.levels = [];
        this.stack = [];
        this.idStack = [];
        this.idx = 0;
    }

    update(level)
    {
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
    configure(initScale, figureScale, xCentre, yCentre, upright)
    {
        let requireReset = (initScale != this.initScale) || (figureScale != this.figureScale) || (upright != this.upright);
        this.initScale = initScale;
        this.figureScale = figureScale;
        this.xCentre = xCentre;
        this.yCentre = yCentre;
        this.upright = upright;
        if(requireReset)
            this.reset();
    }
    applySystem(system)
    {
        this.system = system;
        this.levels = [];
        l.level = 0;
        this.reset();
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
        if(this.upright)
            return new Vector3(
                -this.yCentre / this.initScale,
                this.xCentre / this.initScale,
                0
            );
        else
            return new Vector3(
                -this.xCentre / this.initScale,
                -this.yCentre / this.initScale,
                0
            );
    }

    draw(level)
    {
        this.update(level);
        if(this.idx >= this.levels[level].length)
            this.idx = 0;

        for(let i = this.idx; i < this.levels[level].length; ++i)
        {
            switch(this.levels[level][i])
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
                    }
                    return;
                default:
                    this.stack.push(this.state);
                    this.forward();
                    this.idx = i + 1;
                    return;
            }
        }
    }

    getAngle()
    {
        return this.state.z * this.system.turnAngle % 360;
    }
    getProgress(level)
    {
        return this.idx * 100 / (this.levels[level].length - 1);
    }

    getStateString()
    {
        return `\\begin{matrix}x=${getCoordString(this.state.x)},&y=${getCoordString(this.state.y)},&a=${this.state.z},&i=${this.idx}\\end{matrix}`;
    }

    getCursor(level)
    {
        let coords = this.state / (this.initScale * this.figureScale ** level);
        if(this.upright)
            return new Vector3(coords.y, -coords.x, 0);
        else
            return new Vector3(coords.x, coords.y, 0);
    }

    toString()
    {
        return`${this.initScale} ${this.figureScale} ${this.xCentre} ${this.yCentre} ${this.upright ? 1 : 0} ${this.system.toString()}`;
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
var gameOffline = false;

var manualPages =
[
    {
        title: 'A Primer on L-systems',
        contents: 'Developed in 1968 by biologist Aristid Lindenmayer, an L-system is a formal grammar that describes the growth of a sequence (string), and is used to draw fractal figures, which were originally intended to model plants).\n\nAxiom: the starting sequence\n\nRules: how each symbol in the sequence is derived after each level\n\nAny letter: moves cursor forward to create a line\n\n+, -: turns cursor left/right by an angle\n\n[, ]: allows for branches, by queueing cursor positions on a stack'
    },
    {
        title: 'Constructing an L-system',
        contents: 'The L-system menu provides the tools for constructon with 8 whole production rules!\n\nEach rule is written in the form of:\n\n(symbol)=(derivation)\n\nOriginally, F is used to forward, but any letter should work (lower-case letters don\'t draw a line, but that is impossible for this theory).\n\nBrackets work in a stack mechanism, so for each production rule, every [ has to be followed by a ].'
    },
    {
        title: 'Configuring your L-system',
        contents: 'Configure the visual representation of your L-system.\n\nTurning angle: changes the angle turned by +, -\n\nFigure scale: zooms the figure out by a multiplier each level\n\nCamera centre: sets camera position for level 0 (follows figure scale)\n\nUpright figure: rotates figure by 90 degrees\n\nNote: figure scale and camera centre needs to be experimented manually for each individual L-system.'
    },
    {
        title: 'Example: Cultivar FF',
        contents: 'Represents a common source of carbohydrates.\n\nAxiom: X\n\nF→FF\n\nX→F-[[X]+X]+F[-X]-X\n\nTurning angle: small\n\nFigure scale: 2\n\nCamera centre: (1, 0)\n\nUpright',
        system: cultivarFF,
        config: [1, 2, 1, 0, true]
    },
    {
        title: 'Cultivar FXF',
        contents: 'Commonly called the Cyclone, cultivar FXF resembles a coil of barbed wire. Legends have it, once a snake moult has weathered enough, a new life is born unto the tattered husk, and from there, it stretches.\n\nAxiom: X\n\nF→F[+F]XF\n\nX→F-[[X]+X]+F[-FX]-X',
        system: cultivarFXF
    },
    {
        title: 'Example: Cultivar XEXF',
        contents: 'Bearing the shape of a thistle, cultivar XEXF embodies the strength and resilience of nature against the harsh logarithm drop-off. It also smells really, really good.\n\nAxiom: X\n\nE→XEXF-\n\nF→FX+[E]X\n\nX→F-[X+[X[++E]F]]+F[X+FX]-X',
        system: cultivarXEXF
    },
    {
        title: 'Example: Dragon curve',
        contents: 'Also known as the Heighway dragon.\n\nAxiom: FX\n\nY→-FX-Y\n\nX→X+YF+\n\nTurning angle: 90°\n\nFigure scale: ?\n\nCamera centre: (0, 0)',
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
        let getDesc = (level) => `\\text{Level:}${level.toString()}`;
        let getInfo = (level) => `\\text{Lv. }${level.toString()}`;
        l = theory.createUpgrade(0, angle, new FreeCost);
        l.getDescription = (_) => Utils.getMath(getDesc(l.level));
        l.getInfo = (amount) => Utils.getMathTo(getInfo(l.level), getInfo(l.level + amount));
        l.boughtOrRefunded = (_) =>
        {
            renderer.update(l.level);
            renderer.reset();
        }
        l.canBeRefunded = (_) => true;
    }
    // ts (Tickspeed)
    // Starts with 0, then goes to 1 and beyond?
    {
        let getDesc = (level) => `\\text{Tickspeed:}${level.toString()}/sec`;
        let getInfo = (level) => `\\text{Ts=}${level.toString()}/s`;
        ts = theory.createUpgrade(1, angle, new FreeCost);
        ts.getDescription = (_) => Utils.getMath(getDesc(ts.level));
        ts.getInfo = (amount) => Utils.getMathTo(getInfo(ts.level), getInfo(ts.level + amount));
        ts.maxLevel = 10;
        ts.canBeRefunded = (_) => true;
    }
    // Config menu
    {
        cfg = theory.createUpgrade(2, angle, new FreeCost);
        cfg.description = 'Renderer menu';
        cfg.info = 'Configure the L-systems renderer';
        cfg.boughtOrRefunded = (_) =>
        {
            if(cfg.level > 0)
            {
                var configMenu = createConfigMenu();
                configMenu.show();
            }
        }
        cfg.canBeRefunded = (_) => false;
    }
    // System menu
    {
        sys = theory.createUpgrade(3, angle, new FreeCost);
        sys.description = 'L-system menu';
        sys.info = 'Configure the L-system being drawn';
        sys.boughtOrRefunded = (_) =>
        {
            if(sys.level > 0)
            {
                var systemMenu = createSystemMenu();
                systemMenu.show();
            }
        }
        sys.canBeRefunded = (_) => false;
    }
    // Manual
    {
        manual = theory.createUpgrade(4, angle, new FreeCost);
        manual.description = 'Manual';
        manual.info = 'How to use the L-system renderer';
        manual.boughtOrRefunded = (_) =>
        {
            if(manual.level > 0)
            {
                var manualMenu = createManualMenu();
                manualMenu.show();
            }
        }
        manual.canBeRefunded = (_) => false;
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
            renderer.reset();
            gameOffline = false;
        }

        if(!gameOffline)
        {
            renderer.draw(l.level);
            angle.value = renderer.getAngle();
            progress.value = renderer.getProgress(l.level);        
            theory.invalidateTertiaryEquation();
        }

        time = 0;
    }
}

var createConfigMenu = () =>
{
    let tmpIScale = renderer.initScale;
    let tmpFScale = renderer.figureScale;
    let tmpXC = renderer.xCentre;
    let tmpYC = renderer.yCentre;
    let tmpUpright = renderer.upright;

    let menu = ui.createPopup
    ({
        title: 'Renderer Menu',
        content: ui.createStackLayout
        ({
            children:
            [
                cfgGrid = ui.createGrid
                ({
                    columnDefinitions: ['70*', '30*'],
                    children:
                    [
                        iScaleLabel = ui.createLatexLabel
                        ({
                            text: 'Initial scale: ',
                            row: 0,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        iScaleEntry = ui.createEntry
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
                        fScaleLabel = ui.createLatexLabel
                        ({
                            text: 'Figure scale per level: ',
                            row: 1,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        fScaleEntry = ui.createEntry
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
                        camLabel = ui.createLatexLabel
                        ({
                            text: 'Camera centre (x, y): ',
                            row: 2,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        camGrid = ui.createGrid
                        ({
                            row: 2,
                            column: 1,
                            columnDefinitions: ['50*', '50*'],
                            children:
                            [
                                ycEntry = ui.createEntry
                                ({
                                    text: tmpXC.toString(),
                                    row: 0,
                                    column: 0,
                                    horizontalTextAlignment: TextAlignment.END,
                                    onTextChanged: (ot, nt) =>
                                    {
                                        tmpXC = Number(nt);
                                    }
                                }),
                                ycEntry = ui.createEntry
                                ({
                                    text: tmpYC.toString(),
                                    row: 0,
                                    column: 1,
                                    horizontalTextAlignment: TextAlignment.END,
                                    onTextChanged: (ot, nt) =>
                                    {
                                        tmpYC = Number(nt);
                                    }
                                })
                            ]
                        }),
                        uprightLabel = ui.createLatexLabel
                        ({
                            text: 'Upright figure: ',
                            row: 3,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        uprightSwitch = ui.createSwitch
                        ({
                            isToggled: () => tmpUpright,
                            row: 3,
                            column: 1,
                            horizontalOptions: LayoutOptions.END,
                            onTouched: (e) =>
                            {
                                if(e.type == TouchType.PRESSED)
                                    tmpUpright = !tmpUpright;
                            }
                        }),
                    ]
                }),
                separator = ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                saveButton = ui.createButton
                ({
                    text: 'Save',
                    onClicked: () =>
                    {
                        renderer.configure(tmpIScale, tmpFScale, tmpXC, tmpYC, tmpUpright);
                        menu.hide();
                    }
                })
            ]
        }),
        onDisappearing: () =>
        {
            cfg.level = 0;
        }
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
                axiomRow = ui.createGrid
                ({
                    columnDefinitions: ['20*', '30*', '30*', '20*'],
                    children:
                    [
                        axiomLabel = ui.createLatexLabel
                        ({
                            text: 'Axiom: ',
                            row: 0,
                            column: 0,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        axiomEntry = ui.createEntry
                        ({
                            text: tmpAxiom,
                            row: 0,
                            column: 1,
                            onTextChanged: (ot, nt) =>
                            {
                                tmpAxiom = nt;
                            }
                        }),
                        angleLabel = ui.createLatexLabel
                        ({
                            text: 'Turning angle (°): ',
                            row: 0,
                            column: 2,
                            verticalOptions: LayoutOptions.CENTER
                        }),
                        angleEntry = ui.createEntry
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
                rulesLabel = ui.createLatexLabel
                ({
                    text: 'Production rules: ',
                    verticalOptions: LayoutOptions.CENTER,
                    margin: new Thickness(0, 6)
                }),
                rule0Entry = ui.createEntry
                ({
                    text: tmpRules[0],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[0] = nt;
                    }
                }),
                rule1Entry = ui.createEntry
                ({
                    text: tmpRules[1],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[1] = nt;
                    }
                }),
                rule2Entry = ui.createEntry
                ({
                    text: tmpRules[2],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[2] = nt;
                    }
                }),
                rule3Entry = ui.createEntry
                ({
                    text: tmpRules[3],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[3] = nt;
                    }
                }),
                rule4Entry = ui.createEntry
                ({
                    text: tmpRules[4],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[4] = nt;
                    }
                }),
                rule5Entry = ui.createEntry
                ({
                    text: tmpRules[5],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[5] = nt;
                    }
                }),
                rule6Entry = ui.createEntry
                ({
                    text: tmpRules[6],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[6] = nt;
                    }
                }),
                rule7Entry = ui.createEntry
                ({
                    text: tmpRules[7],
                    onTextChanged: (ot, nt) =>
                    {
                        tmpRules[7] = nt;
                    }
                }),
                separator = ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                constructButton = ui.createButton
                ({
                    text: 'Construct',
                    onClicked: () =>
                    {
                        renderer.applySystem(new LSystem(tmpAxiom, tmpRules, tmpAngle));
                        menu.hide();
                    }
                })
            ]
        }),
        onDisappearing: () =>
        {
            sys.level = 0;
        }
    })
    return menu;
}

var createManualMenu = () =>
{
    let page = 0;

    let menu = ui.createPopup
    ({
        title: () => `Manual (${page + 1}/${manualPages.length})`,
        content: ui.createStackLayout
        ({
            children:
            [
                pageTitle = ui.createLatexLabel
                ({
                    text: manualPages[page].title,
                    horizontalOptions: LayoutOptions.CENTER
                }),
                separator0 = ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                pageContents = ui.createLatexLabel
                ({
                    text: manualPages[page].contents
                }),
                separator1 = ui.createBox
                ({
                    heightRequest: 1,
                    margin: new Thickness(0, 6)
                }),
                btnGrid = ui.createGrid
                ({
                    columnDefinitions: ['50*', '50*'],
                    children:
                    [
                        prevButton = ui.createButton
                        ({
                            text: 'Previous',
                            row: 0,
                            column: 0,
                            isVisible: () => page > 0,
                            onClicked: () =>
                            {
                                if(page > 0)
                                {
                                    --page;
                                    pageTitle.text = manualPages[page].title;
                                    pageContents.text = manualPages[page].contents;
                                }
                            }
                        }),
                        nextButton = ui.createButton
                        ({
                            text: 'Next',
                            row: 0,
                            column: 1,
                            isVisible: () => page < manualPages.length - 1,
                            onClicked: () =>
                            {
                                if(page < manualPages.length - 1)
                                {
                                    ++page;
                                    pageTitle.text = manualPages[page].title;
                                    pageContents.text = manualPages[page].contents;
                                }
                            }
                        })
                    ]
                }),
                adoptBtn = ui.createButton
                ({
                    text: 'Apply L-system',
                    isVisible: () => 'system' in manualPages[page],
                    onClicked: () =>
                    {
                        renderer.applySystem(manualPages[page].system);
                        if('config' in manualPages[page])
                        {
                            let a = manualPages[page].config;
                            renderer.configure(a[0], a[1], a[2], a[3], a[4]);
                        }
                        menu.hide();
                    }
                })
            ]
        }),
        onDisappearing: () =>
        {
            manual.level = 0;
        }
    })
    return menu;
}

var getEquationOverlay = () =>
{
    let result = ui.createLatexLabel
    ({
        text: `v. ${version}`,
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

var get3DGraphPoint = () => renderer.getCursor(l.level);

var get3DGraphTranslation = () => renderer.centre();

init();
