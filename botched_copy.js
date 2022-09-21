import { ExponentialCost, FirstFreeCost, LinearCost } from "../api/Costs";
import { Localization } from "../api/Localization";
import { BigNumber, parseBigNumber } from "../api/BigNumber";
import { QuaternaryEntry, theory } from "../api/Theory";
import { Utils } from "../api/Utils";

var id = "L_system_renderer";
var name = "L-system Renderer";
var description = "An L-system renderer.";
var authors = "propfeds#5988";
var version = 0.01;

var bigNumMat = (array) => array.map((row) => row.map(x => BigNumber.from(x)));

var bigNumList = (array) => array.map(x => BigNumber.from(x));

var idMat = (size) =>
{
    let result = [];
    for(let i = 0; i < size; i++)
    {
        result[i] = [];
        for(let j = 0; j < size; j++)
        {
            if(i == j)
                result[i][j] = BigNumber.ONE;
            else
                result[i][j] = BigNumber.ZERO;
        }
    }
    return result;
}

var matMul = (A, B) =>
    A.map((row, i) =>
        B[0].map((_, j) =>
            row.reduce((acc, _, n) =>
                acc + A[i][n] * B[n][j], BigNumber.ZERO
            )
        )
    )

// var bigNumMat = (array) => array.map((row) => row.map(x => BigNumber.from(x)));
var elemMatPow = (A, B) =>
    A.map((row, i) =>
        B[0].map((_, j) =>
            row.reduce((acc, _, n) =>
                acc + A[i][n].max(BigNumber.ONE).pow(B[n][j]), BigNumber.ZERO
            )
        )
    )

var matPow = (A, n, cache) =>
{
    // log(n);
    if(n < 1)
        return idMat(A.length);
    if(n == 1)
        return A;
    
    let exp = n;
    let p = 0;
    let result = idMat(A.length);
    while(exp)
    {
        if(cache[p] === undefined)
            cache[p] = matMul(cache[p-1], cache[p-1]);
        if(exp & 1)
        {
            result = matMul(result, cache[p]);
        }
        exp >>= 1;
        p++;
    }
    return result;
}

var bitCount = (n) =>
{
    let exp = n;
    let c = 0;
    while(exp)
    {
        if(exp & 1)
            c++;
        exp >>= 1;
    }
    return c;
}

var printMat = (A) =>
{
    let row = "";
    for(let i = 0; i < A.length; i++)
    {
        for(let j = 0; j < A[i].length; j++)
            row += A[i][j].toString() + " ";
        log(row);
        row = "";
    }
}


var stringTickspeed = "\\text{{" + Localization.get("TheoryPanelTickspeed", "}}q_1q_2\\text{{", "}}{0}\\text{{") + "}}";
var ruleStrings = [[
    null,
    "FF",
    "F-[[X]+X]+F[-X]-X",
    null,
    null
], [
    null,
    "F[+F]XF",
    "F-[[X]+X]+F[-FX]-X",
    null,
    null
], [
    "XEXF-",
    "FX+[E]X",
    "F-[X+[X[++E]F]]+F[+FX]-X",
    null,
    null
]];
// Symbols: EFX+-[] ([] are not calculated!)
var symbols = ["E", "F", "X", "+", "-"];
var symUnlockLevel = [2, 0, 0, 1, 1];
// Axiom X
var rho = bigNumMat([[0, 0, 1, 0, 0]]);
var rules = [bigNumMat([
    [1, 0, 0, 0, 0],
    [0, 2, 0, 0, 0],
    [0, 2, 4, 2, 3],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
]), bigNumMat([
    [1, 0, 0, 0, 0],
    [0, 3, 1, 1, 0],
    [0, 3, 4, 2, 3],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
]), bigNumMat([
    [1, 1, 2, 0, 1],
    [1, 1, 2, 1, 0],
    [1, 4, 4, 5, 2],
    [0, 0, 0, 1, 0],
    [0, 0, 0, 0, 1]
])];
// Stores rule^1, ^2, ^4, ^8, etc.
var rulePowers = [
    [rules[0]],
    [rules[1]],
    [rules[2]]
];
var weight = [bigNumMat([
    [0],
    [0.5],
    [1],
    [0],
    [0]
]), bigNumMat([
    [0],
    [1],
    [1.5],
    [1.5],
    [1.5]
]), bigNumMat([
    [1],
    [1.5],
    [2],
    [2],
    [2]
])];
var limitedTickspeed = bigNumList([1200, 160, 160]);
var ltsBitCount = [4, 1, 1];
var time = 0;
var bits = 0;
var tickPower = 0;
var origTickPower = 0;
var currency;
var q1, q2, c1, c2;
var tickLimiter, evolution, c1Exp;
var quaternaryEntries = [];
var bitCountMap = new Map();
var codexPoints = bigNumList([1e4, 1e8, 1e16, 1e24]);


var init = () =>
{
    currency = theory.createCurrency();

    // q1 (Tickspeed)
    // Starts with 0, then goes to 1 and beyond?
    {
        let getDesc = (level) => "q_1=" + (level > 0 ? "1.28^{" + (level - 1) + "}" : "\\text{off}");
        let getDescNum = (level) => "q_1=" + getQ1(level).toString();
        q1 = theory.createUpgrade(0, currency, new FirstFreeCost(new ExponentialCost(7, 4)));
        q1.getDescription = (_) => Utils.getMath(getDesc(q1.level));
        q1.getInfo = (amount) => Utils.getMathTo(getDescNum(q1.level), getDescNum(q1.level + amount));
        q1.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
        q1.canBeRefunded = (_) => true;
    }
    // q2 (Tickspeed)
    // Literally the same as q1, just more expensive
    {
        let getDesc = (level) => "q_2=2^{" + level + "}";
        let getInfo = (level) => "q_2=" + getQ2(level).toString(0);
        q2 = theory.createUpgrade(1, currency, new ExponentialCost(1e4, Math.log2(1e4)));
        q2.getDescription = (_) => Utils.getMath(getDesc(q2.level));
        q2.getInfo = (amount) => Utils.getMathTo(getInfo(q2.level), getInfo(q2.level + amount));
        q2.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
        q2.canBeRefunded = (_) => true;
    }
    // c1
    {
        let getDesc = (level) => "c_1=" + getC1(level).toString(0);
        c1 = theory.createUpgrade(2, currency, new ExponentialCost(1e5, Math.log2(1.6)));
        c1.getDescription = (_) => Utils.getMath(getDesc(c1.level));
        c1.getInfo = (amount) => Utils.getMathTo(getDesc(c1.level), getDesc(c1.level + amount));
        c1.canBeRefunded = (_) => false;
    }
    // c2
    {
        let getDesc = (level) => "c_2=2^{" + level + "}";
        let getInfo = (level) => "c_2=" + getC2(level).toString(0);
        c2 = theory.createUpgrade(3, currency, new ExponentialCost(3e9, 4));
        c2.getDescription = (_) => Utils.getMath(getDesc(c2.level));
        c2.getInfo = (amount) => Utils.getMathTo(getInfo(c2.level), getInfo(c2.level + amount));
        c2.canBeRefunded = (_) => false;
    }

    theory.createPublicationUpgrade(0, currency, 1e8);
    // theory.createBuyAllUpgrade(1, currency, 1e16);
    // theory.createAutoBuyerUpgrade(2, currency, 1e24);

    // First unlock is at the same stage as auto-buyer
    theory.setMilestoneCost(new LinearCost(8, 8));

    // Tick limiter: locks tickspeed to a certain value.
    // The first level will give a growth boost for a short while,
    // but the second level is better at lag prevention.
    // Lag is the main mechanic of this theory.
    {
        tickLimiter = theory.createMilestoneUpgrade(0, 2);
        tickLimiter.getDescription = (_) => Localization.format("Limits tickspeed to {0}", limitedTickspeed[tickLimiter.level].toString(0));
        tickLimiter.info = "Locks tickspeed regardless of variable levels";
        tickLimiter.boughtOrRefunded = (_) => theory.invalidateTertiaryEquation();
    }

    // Branch weight: gives a flat income multiplication and literally no growth.
    {
        evolution = theory.createMilestoneUpgrade(1, 2);
        evolution.getDescription = (amount) => "Evolve into cultivar " + (evolution.level + amount < 2 ? "FXF" : "XEXF");
        evolution.getInfo = (amount) => Localization.getUpgradeUnlockInfo((evolution.level + amount < 2 ? "(+)/(-)" : "\\text{E}")) + "; " + Localization.getUpgradeIncCustomExpInfo("\\text{every}", "0.5");
        evolution.boughtOrRefunded = (_) =>
        {
            theory.invalidatePrimaryEquation();
            theory.invalidateSecondaryEquation();
            theory.invalidateQuaternaryValues();
        }
    }

    // c1 exponent upgrade.
    {
        c1Exp = theory.createMilestoneUpgrade(2, 6);
        c1Exp.description = Localization.getUpgradeIncCustomExpDesc("c_1", "0.02");
        c1Exp.info = Localization.getUpgradeIncCustomExpInfo("c_1", "0.02");
        c1Exp.boughtOrRefunded = (_) => theory.invalidateSecondaryEquation();
    }

    // Achievements (Codex)
    let library = theory.createAchievementCategory(0, "Library");
    theory.createAchievement(0, library, "A Primer on L-systems", "Developed in 1968 by biologist Aristid Lindenmayer, an L-system is a formal grammar that describes the growth of a sequence (string), and was originally used to model the growth of a plant.\n\nThe syntax of L-systems:\nAxiom: the starting sequence\nRules: how the sequence expands each tick\nF: moves cursor forward to create a line\nX: acts like a seed for branches\n+, -: turns cursor by an angle\n(left/right differs between implementations)\n[, ]: allows for branches, by queueing\ncursor positions on a stack", () => theory.tau > codexPoints[0], () => tauAchievementProgress(codexPoints[0]));
    theory.createAchievement(1, library, "Cultivar FF", "Represents a common source of carbohydrates.\nAxiom: X\nF→FF\nX→F-[[X]+X]+F[-X]-X", () => theory.tau > codexPoints[1], () => tauAchievementProgress(codexPoints[1]));
    theory.createAchievement(2, library, "Cultivar FXF", "Commonly called the Cyclone, cultivar FXF resembles a coil of barbed wire. Legends have it, once a snake moult has weathered enough, a new life is born unto the tattered husk, and from there, it stretches.\nAxiom: X\nF→F[+F]XF\nX→F-[[X]+X]+F[-FX]-X", () => theory.tau > codexPoints[2], () => tauAchievementProgress(codexPoints[2]));
    theory.createAchievement(3, library, "Cultivar XEXF", "Bearing the shape of a thistle, cultivar XEXF embodies the strength and resilience of nature against the harsh logarithm drop-off. It also smells really, really good.\nAxiom: X\nE→XEXF-\nF→FX+[E]X\nX→F-[X+[X[++E]F]]+F[+FX]-X", () => theory.tau > codexPoints[3], () => tauAchievementProgress(codexPoints[3]));

    // Chapters
    chapter1 = theory.createStoryChapter(0, "The L-system", "'I am very sure.\nWheat this fractal plant, we will be able to attract...\nfunding, for our further research!'\n\n'...Now turn it on, watch it rice, and the magic will happen.'", () => true);
    chapter2 = theory.createStoryChapter(1, "Limiter", "Our generation algorithm is barley even working...\n\nAnd my colleague told me that, in case of emergency,\nI should turn this limiter on to slow down the computing.", () => tickLimiter.level > 0);
    // chapter3 = theory.createStoryChapter(2, "Fractal Exhibition", "Our manager is arranging an exhibition next week,\nto showcase the lab's research on fractal curves.\n\nIs this lady out of her mind?\nOur generation algorithm is barley working...", () => evolution.level > 0);
    chapter3 = theory.createStoryChapter(2, "Nitpicking Exponents", "Our database uses a log2 matrix power algorithm,\nwhich means that the more 1-bits that are on the exponent,\nthe more we have to process.\n\nAnd the fewer there are, the less likely we would face\na catastrophe.", () => tickLimiter.level > 1);
}

// I copied this from Gilles' T1. Not copyrighted.
var tick = (elapsedTime, multiplier) =>
{
    let tickSpeed = getTickspeed(tickLimiter.level);

    if(tickSpeed.isZero)
        return;
    
    let timeLimit = 1 / tickSpeed.Min(BigNumber.TEN).toNumber();
    time += elapsedTime;

    if(time >= timeLimit - 1e-8)
    {
        tickPower = Math.min(Math.round(tickSpeed.toNumber() * time), 0x7FFFFFFF);
        if(tickLimiter.level > 0)
            origTickPower = Math.min(Math.round(getTickspeed(0).toNumber() * time), 0x7FFFFFFF);
        // log(tickPower);

        let bonus = theory.publicationMultiplier * multiplier;
        let vc1 = getC1(c1.level).pow(getC1Exponent(c1Exp.level));
        let vc2 = getC2(c2.level);

        growth = matPow(rules[evolution.level], tickPower, rulePowers[evolution.level])
        rho = matMul(rho, growth);
        currency.value += (elemMatPow(rho, weight[evolution.level])[0][0]).log2() * bonus * vc1 * vc2;

        if(tickSpeed > BigNumber.TEN)
            time = 0;
        else
            time -= timeLimit;

        theory.invalidateQuaternaryValues();
    }
}

var getInternalState = () => `${currency.value} ${rho[0][0]} ${rho[0][1]} ${rho[0][2]} ${rho[0][3]} ${rho[0][4]} ${time}`

var setInternalState = (state) =>
{
    let values = state.split(" ");
    if(values.length > 0) currency.value = parseBigNumber(values[0])
    if(values.length > 1) rho[0][0] = parseBigNumber(values[1]);
    if(values.length > 2) rho[0][1] = parseBigNumber(values[2]);
    if(values.length > 3) rho[0][2] = parseBigNumber(values[3]);
    if(values.length > 4) rho[0][3] = parseBigNumber(values[4]);
    if(values.length > 5) rho[0][4] = parseBigNumber(values[5]);
    if(values.length > 6) time = parseBigNumber(values[6]);
}

var alwaysShowRefundButtons = () =>
{
    return true;
}

var getPrimaryEquation = () =>
{
    let result = "\\begin{matrix}";
    result += "Axiom\:\\text{X}\\\\";
    for(let i = 0; i < 3; i++)
    {
        if(ruleStrings[evolution.level][i])
        {
            result += "\\text{";
            result += symbols[i];
            result += "}\\rightarrow{}\\text{";
            result += ruleStrings[evolution.level][i];
            if(evolution.level == 2 && i == 0)
                result += ", }";
            else if(i < 2)
                result += "}\\\\";
            else
                result += "}";
        }
    }
    result += "\\end{matrix}";

    if(evolution.level > 1)
    {
        theory.primaryEquationScale = 0.85;
        theory.primaryEquationHeight = 50;
    }
    else
    {
        theory.primaryEquationScale = 0.95;
        theory.primaryEquationHeight = 55;
    }
    return result;
}

var getSecondaryEquation = () =>
{
    let result = "\\begin{matrix}";
    result += "\\dot{\\rho}=c_1";
    if(c1Exp.level > 0)
    {
        result += "^{";
        result += getC1Exponent(c1Exp.level);
        result += "}";
    }
    result += "c_2\\log_{2}\\text{";
//     [0],
//     [0.5],
//     [1],
//     [0],
//     [0]
// ]), bigNumMat([
//     [0],
//     [1],
//     [1.5],
//     [1.5],
//     [1.5]
// ]), bigNumMat([
//     [1],
//     [1.5],
//     [2],
//     [2],
//     [2]
    switch(evolution.level)
    {
        case 0: result += "({F}^{0.5}+X)";
        break;
        case 1: result += "(F+{X}^{1.5}+{(+)}^{1.5}+{(-)}^{1.5})";
        break;
        case 2: result += "(E+{F}^{1.5}+{X}^{2}+{(+)}^{2}+{(-)}^{2})";
        break;
    }
    result += "}\\\\";
    result += theory.latexSymbol;
    result += "=\\max{\\rho}^{0.5}";
    result += "\\end{matrix}";

    if(evolution.level > 0)
        theory.secondaryEquationScale = 0.95;
    else
        theory.secondaryEquationScale = 1;
    theory.secondaryEquationHeight = 34;
    return result;
}

var getTertiaryEquation = () =>
{
    if(tickLimiter.level > 0)
    {
        if(!bitCountMap.has(origTickPower))
            bitCountMap.set(origTickPower, bitCount(origTickPower));
        bits = bitCountMap.get(origTickPower);
    }
    else
    {
        if(!bitCountMap.has(tickPower))
            bitCountMap.set(tickPower, bitCount(tickPower));
        bits = bitCountMap.get(tickPower);
    }
    let result = "\\begin{matrix}";
    result += Localization.format(stringTickspeed, getTickspeed(tickLimiter.level).toString((tickLimiter.level > 0 ? 0 : 2)));
    result += "\\text{, bits: }";
    if(tickLimiter.level > 0)
    {
        result += ltsBitCount[tickLimiter.level - 1].toString() + "\\text{ (}" + bits.toString() + "\\text{)}";
    }
    else
        result += bits.toString();
    result += "\\end{matrix}";

    return result;
}

var getQuaternaryEntries = () =>
{
    if(quaternaryEntries.length == 0)
        for(let i = 0; i < 5; i++)
            quaternaryEntries.push(new QuaternaryEntry(symbols[i], null));

    for(let i = 0; i < 5; i++)
    {
        if(evolution.level >= symUnlockLevel[i])
            quaternaryEntries[i].value = rho[0][i].toString(0);
        else
            quaternaryEntries[i].value = null;
    }

    return quaternaryEntries;
}

var getPublicationMultiplier = (tau) => tau.pow(0.384) / BigNumber.FOUR;
var getPublicationMultiplierFormula = (symbol) => "\\frac{" + "{" + symbol + "}^{0.384}" + "}{4}";
var getTau = () => currency.value.pow(BigNumber.from(0.5));
var getCurrencyFromTau = (tau) => [tau.max(BigNumber.ONE).pow(BigNumber.TWO), currency.symbol];
var get2DGraphValue = () => (tickLimiter.level > 0 ? ltsBitCount[tickLimiter.level - 1] : bits);

var postPublish = () =>
{
    time = 0;
    bits = 0;
    tickPower = 0;
    origTickPower = 0;
    bitCountMap.clear();
    rho = bigNumMat([[0, 0, 1, 0, 0]]);
    theory.invalidateTertiaryEquation();
    theory.invalidateQuaternaryValues();
}

var tauAchievementProgress = (goal) => (theory.tau.max(BigNumber.ONE).log2() / goal.log2()).toNumber();
var getQ1 = (level) => (level > 0 ? BigNumber.from(1.28).pow(level - 1) : 0);
var getQ2 = (level) => BigNumber.TWO.pow(level);
var getTickspeed = (level) => (level > 0 ? limitedTickspeed[level - 1] : getQ1(q1.level) * getQ2(q2.level));
var getC1 = (level) => Utils.getStepwisePowerSum(level, 3, 6, 1);
var getC1Exponent = (level) => BigNumber.from(1 + 0.02 * level);
var getC2 = (level) => BigNumber.TWO.pow(level);

init();