# LSR: To-do List

- [LSR: To-do List](#lsr-to-do-list)
  - [Other considerations](#other-considerations)
  - [1.0, Mistletoe ed.](#10-mistletoe-ed)
  - [1.0: Completed](#10-completed)
  - [0.21: Completed](#021-completed)
  - [0.20: Completed](#020-completed)
  - [Impossible or Scrapped](#impossible-or-scrapped)

## Other considerations

- [ ] Arrange coding streams
  - Ask if people would be interested
- [ ] A more detailed README
  - Showcases the power of tickspeed and stroke options
  - Discusses limitations of the game
  - Like a blog post, sort of
- [ ] Localisation
- [ ] Folders for saved systems
- [ ] Compress internal state? LZW, LZP
- [ ] Ask Gilles about changing the spline used in 3D graph
- [ ] How about locking rotation? (for Navier Stokes)

## 1.0, Mistletoe ed.

- [ ] Split into two versions: Classic Renderer and Paramatric L-systems Rdr
- [ ] Add more comments in the code
- [ ] Update docstrings (done up to Quaternion)

- [x] Issue: Renderer.tick() cuts off 1 tick at the backtrack tail end

- [ ] Revamp sequence menu
  - Level 0: 10 chars (`View`)
  - [x] Classic LS: displays the entire string in a label
  - Parametric LS: displays symbols and parameters side by side, one symbol/row

- [ ] Turning angles
  - [ ] Formula expressions allow shenanigans such as `360/7`, mostly
  - [ ] Button to change mode between degrees and radians

- [x] Investigate tropism (capital T)
  - [x] Separate starting quaternions for upright and sideways
    - Stop swizzling!
    - Tropism is still the same direction, so we can simulate sideways vines
- [x] Investigate vertical heading (`$`) (NOT helio-tropism)
  - Houdini: $(x,y,z)
  Rotates the turtle so the up vector is (0,1,0). Points the turtle in the direction of the point (x,y,z). Default behavior is only to orient and not to change the direction.
  - Abop: The symbol $ rolls the turtle around its own axis so that vector L pointing to the left of the turtle is brought to a horizontal position. Consequently, the branch plane is “closest to a horizontal plane,” as required by Honda’s model. From a technical point of view, $ modifies the turtle orientation in space according to the formulae
  L = V × H / |V × H| and U = H × L,
  where vectors H, L and U are the heading (`\ /`), left (`& ^`) and up (`+ -`) vectors associated with the turtle, V is the direction opposite to gravity, and |A| denotes the length of vector A.
  - main: roll the turtle around the H axis so that H and U lie in a common vertical plane with U closest to up
- [x] Add T and $ to gude

- [ ] Investigate Houdini stochastic syntax for weighted derivations
`[left_ctx<] symbol [>right_ctx] [:condition] = replacement [:probability]`
  - Stochastic in PLSR: has to be on the same line

- [ ] Parametric systems
  - Different classes
    - Button in LS menu / save menu to switch modes?
    - Theory settings?
    - Lemma stages?
  - Make `f` move without returning like `F`
  - Top-down processing priority
    - Buttons in LS menu to move up down (swap rules)
      - How to update rule entries?
  - [ ] Regex magic to separate string into actual sequence of symbols
  - [ ] Issue: regex for nested brackets in parameters?
  - Equal comparison changed to `==` instead of `=` in abop to differentiate
  from the syntax
  - Store as an extra array of objects
  - Round brackets gonna make it hard for actual drawing - although maybe it
  would've been already stripped down by the time it gets to the turtle
  - `~`: Parameters of the following symbol can control model size in rule

- [ ] Context sensitivity
  - `b < a > c → aa`
  - Parametric: **context ignore** replaces regular ignore list in LS menu
  - [x] Skipping over brackets? hmm, difficult
    - Mapping vertex depth, can be checked by tracking brackets and stacks.
    - Actually it's pretty hard to make an algo for this, because it could be:
    `01[23[456][45][4]][234]2`, and you would have to find all the 2s if you
    want to find a right element of 1, and what if those 2s were on different
    branches and it wouldn't count as adjacent?
    - Simple DFS, store each symbol's ancestor, then reflect it back to another
    set containing children of each symbol.
    - Ancestor means the index of whomever the fuck is on top of the idx stack.
    - Does this work with the dynamic loading system with all the data passing?
  - If stored by maps: Keys can be any data type.
  - If stored by objects: written in `parametric_lsystem.js`

## 1.0: Completed

- [x] Issue: models are broken because of backtrack rework
- [x] Change how models work:
  - Stochastic models are no longer available
    - Instead define stochastic rules for the actual symbol instead, pre-model 
  - Models are no longer recursively derived
    - This will remove their permanence and increase performance
  - Instead, they will be processed by the renderer using a queue
    - The processing code will be positioned below (?) the main renderer loop
    - Almost the exact same code as main loop, but with `~` queue controls
  - Having a model also means that symbol should be ignored (no extra F)
    - Easy, just add the model map's keys to the set
    - Update the manual
  - Backtrack models?
- [x] Update guide about models
- Can multiple derivations on the same rule still be made? Ruins parity
  - [x] Allow both modes to exist (ONLY in Classic)
- [x] Implement new RNG (Xorshift) instead of th fucjuing Lcg
- [x] Screen adaptive button sizes (40, 44, 48) plus other stuff maybe
- [x] Rework quickdraw / BT logic (**good enough!**)
  - Progress: Regular, backtrack, quickdraw done
  - Test suites:
    - [x] Arrow (8/8)
    - [x] Cantor (8/8)
    - [ ] Snowflake (0/8) - still wasting time on ignored shits
  - [x] Add a cooldown system
  - [x] Hesitate on both ends if hesitation is on?
  - [x] When just pushing onto the stack normally (on an F point), don't push
  if the position hasn't changed, because the orientation doesn't matter if
  the stack point isn't a `[` bracket point
  - [x] Issue: quick BT still forces hesitation on the way forward
  - [x] If the `]]]]]` are stacked, hesitation time is massive
    - [x] If the stack hasn't detected any movement, just don't do anything
    - [x] Hesitate only when the turtle was moved compared to last time?
    - [ ] Does it work with ignored? No
  (because of the ignored stuff)
  - [ ] The pop in `]` might be a problem if the branch stack has nothing yet?
  - [x] Remove the backtrack list option
    - Also, backtrack on the way back and forward needs different lists?
- [x] Turtle controls summary page in guide

## 0.21: Completed

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
- [x] `%`: Cut off branch's remainder
  - Simple search
- [x] Configurable max chars per tick
- [x] Table of Contents in guide (replaces Construct on non-example pages)

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
- Strict model format for each symbol
  - Array of Vector3s den 0)` at start or end
    - Flow: the previous path ended at `(0, 0, 0)` of this path. We'll follow
    through the model's queue one by one until we reach the end. But we won't
    go back to `(0, 0, 0)`, weoting a path of vertices
    - Don't write `(0, 0, go forward to the next symbol. This would allow
    us to draw different lengthed lines if we defined the model to include only
    one point: `(L, 0, 0)`. But... that would delay processing by one turn?
  - Well, we can't include the tilde then. Hardcoded models can still be a thing
  but tildes need more investigation.
  - Still keeping the idea of two paths?
  - Can models' names contain spaces?
    - How are they referenced in systems? As a list of names? An ID that is the
    index of an array?
  - Model storage
    - How to load? How to edit?
- Counter argument to new model format:
  - Permanence can be solved by cutting with `%`, albeit with a 1 tick cost for
  renderer hesitation (or 2)
    - Solution: Renderer only pushes on `[` if the position / ori has changed
    - This makes more sense thematically, as cut wounds will leave scars
      - Lemma's Garden: this will slightly slow down growth
  - If models were to be processed by renderer, then they cannot evolve
    - On the other hand, they can 'evolve' in another sense where each parameter
    value can have a different model
  - [x] Having a model also means that symbol should be ignored (no extra F)
    - Easy, just add the model map's keys to the set
    - [x] Update the manual
  - Lemma's Garden: Complex models such as flowers will bog down the growth cost
