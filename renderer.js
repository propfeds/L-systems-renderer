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
var version = 0.04;

var axiom = 'X';
var rules = new Map();
rules.set('F', 'FF');
rules.set('X', 'F[+X][-X]FX');
var tmpRules = [];
var s = [];
var maxS = -1;

var turnAngle = 30;
var figureScale = 2;
var XCentre = 1;
var YCentre = 0;
var upright = false;

var state = new Vector3(0, 0, 0);
var stack = [];
var stackSize = 0;
var idStack = [];
var idStackSize = 0;
var idx = 0;
var time = 0;

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
var centre = (level) => new Vector3(XCentre * (figureScale ** level), YCentre * (figureScale ** level), 0);

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
                theory.pause();
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
                theory.pause();
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
                            placeholder: turnAngle.toString(),
                            onCompleted: () =>
                            {
                                cfgAngle = Number(angleEntry.text);
                                turnAngle = cfgAngle;
                                resetSystem();
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
                            placeholder: figureScale.toString(),
                            onCompleted: () =>
                            {
                                cfgScale = Number(scaleEntry.text);
                                if(cfgScale != 0)
                                    figureScale = cfgScale;
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
                            placeholder: XCentre.toString(),
                            onCompleted: () =>
                            {
                                cfgX = Number(xcEntry.text);
                                XCentre = cfgX;
                            }
                        }),
                        ycEntry = ui.createEntry
                        ({
                            placeholder: YCentre.toString(),
                            onCompleted: () =>
                            {
                                cfgY = Number(ycEntry.text);
                                YCentre = cfgY;
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
                            isToggled: () => upright,
                            onTouched: (e) =>
                            {
                                if(e.type == TouchType.PRESSED)
                                    upright = !upright;
                                resetSystem();
                            }
                        }),
                    ]
                })
            ]
        }),
        onDisappearing: () =>
        {
            cfg.level = 0;
            theory.resume();
        }
    })
    return menu;
}

var createSystemMenu = () =>
{
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
                            placeholder: axiom,
                            onCompleted: () =>
                            {
                                axiom = axiomEntry.text;
                            }
                        })
                    ]
                }),
                rulesLabel = ui.createLabel({text: 'Production rules: '}),
                rule0Entry = ui.createEntry
                ({
                    placeholder: tmpRules[0],
                    onCompleted: () =>
                    {
                        tmpRules[0] = rule0Entry.text;
                    }
                }),
                rule1Entry = ui.createEntry
                ({
                    placeholder: tmpRules[1],
                    onCompleted: () =>
                    {
                        tmpRules[1] = rule1Entry.text;
                    }
                }),
                rule2Entry = ui.createEntry
                ({
                    placeholder: tmpRules[2],
                    onCompleted: () =>
                    {
                        tmpRules[2] = rule2Entry.text;
                    }
                }),
                rule3Entry = ui.createEntry
                ({
                    placeholder: tmpRules[3],
                    onCompleted: () =>
                    {
                        tmpRules[3] = rule3Entry.text;
                    }
                }),
                rule4Entry = ui.createEntry
                ({
                    placeholder: tmpRules[4],
                    onCompleted: () =>
                    {
                        tmpRules[4] = rule4Entry.text;
                    }
                }),
                rule5Entry = ui.createEntry
                ({
                    placeholder: tmpRules[5],
                    onCompleted: () =>
                    {
                        tmpRules[5] = rule5Entry.text;
                    }
                }),
                rule6Entry = ui.createEntry
                ({
                    placeholder: tmpRules[6],
                    onCompleted: () =>
                    {
                        tmpRules[6] = rule6Entry.text;
                    }
                }),
                rule7Entry = ui.createEntry
                ({
                    placeholder: tmpRules[7],
                    onCompleted: () =>
                    {
                        tmpRules[7] = rule7Entry.text;
                    }
                }),
                constructButton = ui.createButton
                ({
                    text: 'Construct',
                    onClicked: () =>
                    {
                        rules.clear();
                        for(i = 0; i < tmpRules.length; ++i)
                        {
                            if(tmpRules[i] !== '')
                            {
                                let rs = tmpRules[i].split('=');
                                rules.set(rs[0], rs[1]);
                            }
                        }
                        s = [];
                        maxS = -1;
                        resetSystem();
                    }
                })
            ]
        }),
        onDisappearing: () =>
        {
            sys.level = 0;
            theory.resume();
        }
    })
    return menu;
}

var getInternalState = () => `${time}`;

var setInternalState = (stateStr) =>
{
    let values = stateStr.split(' ');
    if(values.length > 0) time = parseBigNumber(values[0]);
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
