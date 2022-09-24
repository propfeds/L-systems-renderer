import { FreeCost } from '../api/Costs';
import { theory } from '../api/Theory';
import { ui } from '../api/ui/UI';
import { Utils } from '../api/Utils';
import { Vector3 } from '../api/Vector3';
import { StackOrientation } from '../api/ui/properties/StackOrientation';

var id = 'L_systems_renderer';
var name = 'L-systems Renderer';
var description = 'An L-systems renderer.';
var authors = 'propfeds#5988';
var version = 0.05;

var axiom = 'X';
var rules = new Map();
rules.set('F', 'FF');
rules.set('X', 'F[+X][-X]FX');
var s = [];
var maxS = -1;

var turnAngle = 30;
var figureScale = 2;
var xCentre = 1;
var yCentre = 0;
var upright = false;

var state = new Vector3(0, 0, 0);
var stack = [];
var stackSize = 0;
var idStack = [];
var idStackSize = 0;
var idx = 0;
var time = 0;

var rebuildSystem = (newAxiom, newRules) =>
{
    rules.clear();
    axiom = `${newAxiom}`;
    for(i = 0; i < newRules.length; ++i)
    {
        if(newRules[i] !== '')
        {
            let rs = newRules[i].split('=');
            rules.set(rs[0], rs[1]);
        }
    }
    s = [];
    maxS = -1;
}

var derive = (states, rules) =>
{
    let result = '';
    for(let i = 0; i < states.length; ++i)
    {
        if(rules.has(states[i]))
            result += rules.get(states[i]);
        else
            result += states[i];
    }
    return result;
}

var updateSystem = (level) =>
{
    if(s[0] === undefined)
        s[0] = `[${axiom}]`;
    for(let i = maxS + 1; i <= level; ++i)
        if(s[i] === undefined)
            s[i] = derive(s[i - 1], rules);
    maxS = level;
}

var resetSystem = () =>
{
    state = new Vector3(0, 0, 0);
    stack = [];
    stackSize = 0;
    idStack = [];
    idStackSize = 0;
    idx = 0;
    theory.clearGraph();
    theory.invalidateTertiaryEquation();
}

var turnLeft = (v) => new Vector3(v.x, v.y, v.z + 1);
var turnRight = (v) => new Vector3(v.x, v.y, v.z - 1);
var forward = (v) => new Vector3(v.x + Math.cos(turnAngle * v.z * Math.PI / 180), v.y + Math.sin(turnAngle * v.z * Math.PI / 180), v.z);
var swizzle = (v) => [new Vector3(v.x, v.y, 0), new Vector3(v.y, -v.x, 0)];
var centre = (level) => new Vector3(xCentre * (figureScale ** level), yCentre * (figureScale ** level), 0);

var init = () => {
    angle = theory.createCurrency('°', '\\circ');
    index = theory.createCurrency('i');
    // l
    {
        let getDesc = (level) => `lvl=${l.level.toString()}`;
        let getInfo = (level) => `lvl=${l.level.toString()}`;
        l = theory.createUpgrade(0, angle, new FreeCost);
        l.getDescription = (_) => Utils.getMath(getDesc(l.level));
        l.getInfo = (amount) => Utils.getMathTo(getInfo(l.level), getInfo(l.level + amount));
        l.boughtOrRefunded = (_) =>
        {
            if(l.level > maxS)
                updateSystem(l.level);
            resetSystem();
        }
        l.canBeRefunded = (_) => true;
    }
    // ts (Tickspeed)
    // Starts with 0, then goes to 1 and beyond?
    {
        let getDesc = (level) => `ts=${ts.level.toString()}`;
        let getInfo = (level) => `ts=${ts.level.toString()}`;
        ts = theory.createUpgrade(1, angle, new FreeCost);
        ts.getDescription = (_) => Utils.getMath(getDesc(ts.level));
        ts.getInfo = (amount) => Utils.getMathTo(getInfo(ts.level), getInfo(ts.level + amount));
        ts.maxLevel = 10;
        ts.canBeRefunded = (_) => true;
    }
    // Config menu
    {
        cfg = theory.createUpgrade(2, angle, new FreeCost);
        cfg.description = 'Config menu';
        cfg.info = 'Configure the shape and size of the system';
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
        let lvl = l.level;
            if(lvl > maxS)
                updateSystem(lvl);
        for(let i = idx; i < s[lvl].length; ++i)
        {
            if(s[lvl][i] == '+')
                state = turnLeft(state);
            else if(s[lvl][i] == '-')
                state = turnRight(state);
            else if(s[lvl][i] == '[')
            {
                stack[stackSize] = state;
                idStack[idStackSize] = stackSize;
                ++idStackSize;
                ++stackSize;
            }
            else if(s[lvl][i] == ']')
            {
                --stackSize;
                state = stack[stackSize];
                if(stackSize == idStack[idStackSize - 1])
                {
                    --idStackSize;
                    idx = i + 1;
                }
                break;
            }
            else
            {
                stack[stackSize] = state;
                ++stackSize;
                state = forward(state);
                idx = i + 1;
                break;
            }
        }
        if(idx >= s[lvl].length)
            idx = 0;

        if(ts.level > 9)
            time = 0;
        else
            time -= timeLimit;

        angle.value = state.z * turnAngle;
        index.value = idx;
        theory.invalidateTertiaryEquation();
    }
}

var createConfigMenu = () =>
{
    let tmpAngle = turnAngle;
    let tmpScale = figureScale;
    let tmpXC = xCentre;
    let tmpYC = yCentre;
    let tmpUpright = upright;

    let menu = ui.createPopup
    ({
        title: 'Config Menu',
        content: ui.createStackLayout
        ({
            children:
            [
                angleRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        angleLabel = ui.createLabel({text: 'Turning angle (deg): '}),
                        angleEntry = ui.createEntry
                        ({
                            text: tmpAngle.toString(),
                            onTextChanged: (ot, nt) =>
                            {
                                tmpAngle = Number(nt);
                            }
                        })
                    ]
                }),
                scaleRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        scaleLabel = ui.createLabel({text: 'Figure scale per level: '}),
                        scaleEntry = ui.createEntry
                        ({
                            text: tmpScale.toString(),
                            onTextChanged: (ot, nt) =>
                            {
                                tmpScale = Number(nt);
                                if(tmpScale == 0)
                                    tmpScale = 1;
                            }
                        })
                    ]
                }),
                cameraRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        camLabel = ui.createLabel({text: 'Camera centre: '}),
                        xcEntry = ui.createEntry
                        ({
                            text: tmpXC.toString(),
                            onTextChanged: (ot, nt) =>
                            {
                                tmpXC = Number(nt);
                            }
                        }),
                        ycEntry = ui.createEntry
                        ({
                            text: tmpYC.toString(),
                            onTextChanged: (ot, nt) =>
                            {
                                tmpYC = Number(nt);
                            }
                        })
                    ]
                }),
                uprightRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        uprightLabel = ui.createLabel({text: 'Upright? '}),
                        uprightSwitch = ui.createSwitch
                        ({
                            isToggled: () => tmpUpright,
                            onTouched: (e) =>
                            {
                                if(e.type == TouchType.PRESSED)
                                    tmpUpright = !tmpUpright;
                            }
                        }),
                    ]
                }),
                saveButton = ui.createButton
                ({
                    text: 'Save',
                    onClicked: () =>
                    {
                        turnAngle = tmpAngle;
                        figureScale = tmpScale;
                        xCentre = tmpXC;
                        yCentre = tmpYC;
                        upright = tmpUpright;
                        resetSystem();
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
    let tmpAxiom = axiom;
    let tmpRules = [];
    let rsIdx = 0;
    for(let [key, value] of rules)
    {
        tmpRules[rsIdx] = `${key}=${value}`;
        ++rsIdx;
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
                axiomRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        axiomLabel = ui.createLabel({text: 'Axiom: '}),
                        axiomEntry = ui.createEntry
                        ({
                            text: tmpAxiom,
                            onTextChanged: (ot, nt) =>
                            {
                                tmpAxiom = nt;
                            }
                        })
                    ]
                }),
                rulesLabel = ui.createLabel({text: 'Production rules: '}),
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
                constructButton = ui.createButton
                ({
                    text: 'Construct',
                    onClicked: () =>
                    {
                        rebuildSystem(tmpAxiom, tmpRules);
                        resetSystem();
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

var getInternalState = () =>
{
    let result = `${time} ${turnAngle} ${figureScale} ${xCentre} ${yCentre} ${upright} ${axiom}`;
    for(let [key, value] of rules)
    {
        result += ` ${key}=${value}`;
    }
    return result;
}

var setInternalState = (stateStr) =>
{
    let values = stateStr.split(' ');
    time = parseBigNumber(values[0]);
    turnAngle = Number(values[1]);
    figureScale = Number(values[2]);
    xCentre = Number(values[3]);
    yCentre = Number(values[4]);
    upright = Boolean(values[5]);
    // axiom = values[6];
    let tmpRules = [];
    for(let i = 0; i < 8; ++i)
    {
        if(values[7 + i] !== undefined)
            tmpRules[i] = values[7 + i];
        else
            tmpRules[i] = '';
    }
    rebuildSystem(values[6], tmpRules);
}

var canResetStage = () => true;

var resetStage = () => resetSystem();

var getTertiaryEquation = () => `\\begin{matrix}x=${getCoordString(state.x)},&y=${getCoordString(state.y)},&a=${getCoordString(state.z)}\\end{matrix}`;

var getCoordString = (x) => x.toFixed(x >= 0 ? (x < 10 ? 3 : 2) : (x <= -10 ? 1 : 2));

var get3DGraphPoint = () =>
{
    coords = (state - centre(l.level)) / (figureScale ** l.level);
    return swizzle(coords)[upright ? 1 : 0];
}

var getTau = () => BigNumber.ZERO;

init();
