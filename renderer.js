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
var version = 0.03;

var rules = new Map();
rules.set('F', 'FF');
rules.set('X', 'F[+X][-X]FX');
// rules.set('Y', '-FX-Y');
var axiom = 'X';
var turnAngle = Math.PI/6;
var figureScale = 2;
var XCentre = 1;
var YCentre = 0;
var upright = false;

var s = [];
var maxS = -1;

var derive = (state, rules) =>
{
    let result = '';
    for(let i = 0; i < state.length; ++i)
    {
        if(rules.has(state[i]))
            result += rules.get(state[i]);
        else
            result += state[i];
    }
    return result;
}

var update = (level) =>
{
    if(s[0] === undefined)
        s[0] = `[${axiom}]`;
    for(let i = 1; i <= level; ++i)
        if(s[i] === undefined)
            s[i] = derive(s[i - 1], rules);
    maxS = level;
}

var turnLeft = (v) => new Vector3(v.x, v.y, v.z + 1);
var turnRight = (v) => new Vector3(v.x, v.y, v.z - 1);
var forward = (v) => new Vector3(v.x + Math.cos(turnAngle * v.z), v.y + Math.sin(turnAngle * v.z), v.z);
var swizzle = (v) => new Vector3(v.y, -v.x, 0);
var centre = (level) => new Vector3(XCentre * (figureScale ** level), YCentre * (figureScale ** level), 0);

var state = new Vector3(0, 0, 0);
var stack = [];
var stackSize = 0;
var idStack = [];
var idStackSize = 0;
var idx = 0;
var time = 0;


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
                update(l.level);
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

    resetSystem();
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
                update(lvl);
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
                idStackSize++;
                stackSize++;
            }
            else if(s[lvl][i] == ']')
            {
                stackSize--;
                state = stack[stackSize];
                if(stackSize == idStack[idStackSize - 1])
                {
                    idStackSize--;
                    idx = i + 1;
                }
                break;
            }
            else
            {
                stack[stackSize] = state;
                stackSize++;
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

        angle.value = state.z * turnAngle * 180 / Math.PI;
        index.value = idx;
        theory.invalidateTertiaryEquation();
    }
}

var createConfigMenu = () =>
{
    let menu = ui.createPopup
    ({
        title: 'Config',
        content: ui.createStackLayout
        ({
            children:
            [
                angleRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        angleLabel = ui.createLabel({text: 'Turning angle: '}),
                        angleEntry = ui.createEntry
                        ({
                            placeholder: '30',
                            onTextChanged: (oldText, newText) =>
                            {
                                a = Number(newText);
                                turnAngle = a * Math.PI / 180;
                            }
                        })
                    ]
                }),
                scaleRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        scaleLabel = ui.createLabel({text: 'Figure scale: '}),
                        scaleEntry = ui.createEntry
                        ({
                            placeholder: '2',
                            onTextChanged: (oldText, newText) =>
                            {
                                s = Number(newText);
                                figureScale = s;
                            }
                        })
                    ]
                }),
                xcRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        xcLabel = ui.createLabel({text: 'x centre: '}),
                        xcEntry = ui.createEntry
                        ({
                            placeholder: '1',
                            onTextChanged: (oldText, newText) =>
                            {
                                x = Number(newText);
                                XCentre = x;
                            }
                        })
                    ]
                }),
                ycRow = ui.createStackLayout
                ({
                    orientation: StackOrientation.HORIZONTAL,
                    children:
                    [
                        ycLabel = ui.createLabel({text: 'y centre: '}),
                        ycEntry = ui.createEntry
                        ({
                            placeholder: '0',
                            onTextChanged: (oldText, newText) =>
                            {
                                y = Number(newText);
                                YCentre = y;
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
                        uprightTick = ui.createCheckBox
                        ({
                            onCheckedChanged: () =>
                            {
                                upright = uprightTick.isChecked;
                            }
                        })
                    ]
                })
            ]
        })
    })
    return menu;
}

var getInternalState = () => `${time}`;

var setInternalState = (stateStr) =>
{
    let values = stateStr.split(' ');
    if(values.length > 0) time = parseBigNumber(values[0]);
}

var resume = () => resetSystem();

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

var canGoToPreviousStage = () => true;

var goToPreviousStage = () =>
{
    var configMenu = createConfigMenu();
    configMenu.show();
}

var canGoToNextStage = () => true;

// var goToNextStage = () =>
// {
//     var systemMenu = createSystemMenu();
//     SystemMenu.show();
// }

var canResetStage = () => true;

var resetStage = () =>
{
    l.level = 0;
    ts.level = 0;
    resetSystem();
}

var getTertiaryEquation = () => `\\begin{matrix}x=${getCoordString(state.x)},&y=${getCoordString(state.y)},&z=${getCoordString(state.z)}\\end{matrix}`;

var getCoordString = (x) => x.toFixed(x >= 0 ? (x < 10 ? 3 : 2) : (x <= -10 ? 1 : 2));

var get3DGraphPoint = () =>
{
    coords = (state - centre(l.level)) / (figureScale ** l.level);
    if(upright)
        return swizzle(coords);
    else
        return coords;
}

var getTau = () => BigNumber.ZERO;

init();
