# LSR: To-do List

- [LSR: To-do List](#lsr-to-do-list)
  - [0.21 - no version name](#021---no-version-name)
  - [1.00 - Mistletoe Edition](#100---mistletoe-edition)
  - [0.20: Completed](#020-completed)
  - [Impossible or Scrapped](#impossible-or-scrapped)

## 0.21 - no version name

- [x] Renderer menu:
  - [x] It is better to close the menu every time, than only when asterisk
  options are changed
  - [x] Reset to Defaults should not actually close the menu
- [x] Investigate quickdraw backtrack logic
  - Doesn't work with branching currently?
  - Doesn't work with angle-changing symbols?
- [x] backtrackList and ignoreList using js Set instead of array
  - [x] Change the configure functions to not change backtrack list when the new
  set is the same as the old one, instead of comparing strings
- [x] Stop trimming the user inputs! Store original strings within the systems
and show them in the menu. This way, if they're invalid you can show a syntax
error instead of stripping it!
- [x] Button to clear LS menu (equivalent to renderer reset)
- [x] Modelling
  - [x] `~`: Incorporate a predefined surface - used to store a model for each
  symbol
  - [x] `{}`: The polygon tool
    - `.`: Record a vertex - can be used for faster renderering
- [ ] % symbol: Cut off branch's remainder
  - Simple search

## 1.00 - Mistletoe Edition

- [ ] Add more comments in the code
- [ ] Turtle controls summary page in guide
- [ ] Table of Contents in guide (replaces Construct on non-example pages)
- [ ] A more detailed README
  - Showcases the power of tickspeed and stroke options
  - Discusses limitations of the game
  - Like a blog post, sort of
- [ ] Localisation

- [ ] Compress internal state? LZW, LZP
- [ ] Ask Gilles about changing the spline used in 3D graph
- [ ] How about locking rotation? (for Navier Stokes)

- [ ] Investigate Houdini stochastic syntax for weighted derivations
`[left_ctx<] symbol [>right_ctx] [:condition] = replacement [:probability]`

- [ ] Parametric systems
  - Regex magic to separate string to actual sequence of symbols?
  - Equal comparison changed to `==` instead of `=` in abop to differentiate
  from the syntax
  - Store as an extra array of objects
  - Round brackets gonna make it hard for actual drawing - although maybe it
  would've been already stripped down by the time it gets to the turtle

- [ ] Alternate modelling scheme: using symbols? (chapter 5 of abop)
- [ ] Another model format for each symbol
  - Array of Vector3s denoting a path of vertices
    - Don't write `(0, 0, 0)` at start or end
    - Flow: the previous path ended at `(0, 0, 0)` of this path. We'll follow
    through the model's queue one by one until we reach the end. But we won't
    go back to `(0, 0, 0)`, we go forward to the next symbol. This would allow
    us to draw different lengthed lines if we defined the model to include only
    one point: `(L, 0, 0)`. But... that would delay processing by one turn?
  - Well, we can't include the tilde then. Hardcoded models can still be a thing
  but tildes need more investigation.
  - Still keeping the idea of two paths?
  - Can models' names contain spaces?
    - How are they referenced in systems? As a list of names? An ID that is the
    index of an array?
  - [ ] Model storage
    - How to load? How to edit?
- [x] Renderer option to disable models

- [ ] Context sensitivity
  - `b < a > c → aa`
  - Skipping over brackets? hmm, difficult
    - Mapping 'branching levels' onto an array? Excluding reserved symbols!
    `0  0  1  1  1  2  2  1  1  2  1  0  0`
    - Then, run algo to check nearest left element's idx using last spotted idx
    `∞  1  ∞  1  1  ∞  1  3  1  3  2 10  1`
    - And right element?
    `1 10  1  1  3  1  3  1  2  ∞  ∞  1  ∞`
    - Might be able to check both at once? Also, `∞` could be replaced with `-1`
  - Compatibility with stochastic? Maybe don't need extra processing
  - If a system is of level `n`, these maps will be loaded for `n-1` levels
  - Renderer will not start drawing level `n` while loading, until the maps for
  level `n-1` have finished
  - How much of the right list can be inferred from the left list?
    - *All* of it!
    `0  0  1  1  1  2  2  1  1  2  1  0  0`
    `   1     1  1     1  3  1  3  2 10  1`
    `1 10  1  1  3  1  3  1  2        1   `
  - Wait. How do we define branch order again? Dang it. My maths might be wrong.
    - Actually it's less branch order but 'height', which can still be checked
    by tracking brackets and stacks.
    `0  0  1  1  1  2  2  1  1  2  1  0  0` smells like:
    `[X][X[Y][Y][Y[Z]Z]`
    - Actually it's pretty hard to make an algo for this, because it could be:
    `01[23[456][45][4]][234]2`, and you would have to find all the 2s if you
    want to find a right element of 1, and what if those 2s were on different
    branches and it wouldn't count as adjacent?
    - GRAPH ALGO?!? The power of dfs.
    - We can store each symbol's ancestor (there's only one), then reflect it
    back to another list containing children of each symbol.
    - Ancestor means the index of whomever the fuck is on top of the idx stack.
    - Does this work with the dynamic loading system with all the data passing?
  - If stored by maps: Keys can be any data type.
  - If stored by objects:
  ```js
  // v2
  let contextRulesLR =
  {
    'ABC': 'D', // Two ways: A<B>C = D
    'FBG': 'H'  // F<B>G = H
  };
  let contextRulesL =
  {
    'AB': 'E'   // One way: A<B = E
  };
  let contextRulesR =
  {
    'BA': 'E'   // One way: B>A = E
  };
  ```

## 0.20: Completed

- [x] Redesign manual
  - Add more systems to the manual (algae, or like, mistletoe)
  - Add tutorial-like flows that explain concepts
- [x] Optimise using the API's profiler?
  - The profiler is very limited in functionality.
  - [x] Instead, implemented a rough profiler using Date.now()
- [x] Renderer camera zoom using MathExpressions instead of a hundred parameters
- [x] Renderer camera centre using MathExpressions instead of a hundred
parameters
- [x] Internal state using JSON
- [x] Custom class that stores variable controls?
  - [x] Solves weird logic with anchor
  - [x] Update updating method to make a more responsive UI?
- [x] Change entries' keyboards into numeric format
- [x] Saved systems
  - [x] Choice to overwrite or create copy
    - Include list of saved systems in naming menu
  - [x] Edit existing systems
  - [x] Store static camera configs and description
    - We have the power of version number
    - Don't change the current system's internal state format
      - Instead, store a temp system name in global to show up in naming menu
      - Systems adopted from the manual will bear the entry's title, like that
    - Internal state: store the number of systems (and then models...) in the
    first line
      - To prepare for LG (models)
    - Testing: keep the new version number in global, add version-dependent
    processing in internal state code, while loading old backup file
- [x] Get rid of the brackets and the -2s
- [x] Get rid of i
- [x] Getters and setters in JavaScript
- [x] UI touch-ups
  - [x] Border colours
  - [x] Text colour changes when hitting buttons
  - [x] Shrink the buttons again to look better?
- [x] Redesign anchor logic
  - Only register anchor level before longpressing minus and level > 0

## Impossible or Scrapped

- Remove the add button, every rule is bunched into one field
  - Entry.keyboard? (`Keyboard.TEXT`) doesn't work
  - https://andyp.dev/posts/xamarin-forms-essentials-keyboard-master-guide
  - Which means, adding extra processing in view menu and system menu
- Anchor to be internally processed by the ts var, not the level button
  - Can it work both ways or just downwards?
  - It does not work currently due to the fact that variable purchase callbacks
  are post-processing, and not pre-
- Main screen controls idea
  - Line 1: Player controls: `<< - P + >>`
  - https://en.wikipedia.org/wiki/Media_control_symbols
  - Line 2: Level, loop, tickspeed
  - This will do away with the fucking anchor
  - Admittedly though, that'd be a bit cliche and not as quirky as the current
  layout, even though it's pretty much a solid idea
- Upright option: swap to the Y axis instead of rotating X?
  - Does not work! It breaks everything.
- For these two things: context sensitivity and parametricity, a system
needs to store two boolean properties `isContextSensitive` and `isParametric`.
  - Scrapped. Just make a new class.
- Houdini's stochastic syntax means getting rid of the old comma syntax?
  - Or, we could just make LG immediately... or a sequel named
  `Parametric L-systems Renderer`, with a better randomiser lol
  - Scrapped. Just make a new class.
