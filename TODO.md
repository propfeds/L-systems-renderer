# L-systems Renderer

## 0.20

- [ ] Redesign manual
  - Add more systems to the manual (algae, or like, mistletoe)
  - Add tutorial-like flows that explain concepts
- [ ] Add more comments in the code
- [ ] Optimise using the API's profiler
- [ ] A more detailed README
  - Showcases the power of tickspeed and stroke options
  - Discusses limitations of the game
  - Like a blog post, sort of
- [ ] New main screen controls idea
  - Line 1: Player controls: `<< - P + >>`
  - https://en.wikipedia.org/wiki/Media_control_symbols
  - Line 2: Level, loop, tickspeed
  - This will do away with the fucking anchor
- [ ] Saved systems
  - [x] Choice to overwrite or create copy
    - Include list of saved systems in naming menu
  - [ ] Edit existing systems
  - [x] Store static camera configs and description
    - We have the power of version number
    - Don't change the current system's internal state format
      - Instead, store a temp system name in global to show up in naming menu
      - Systems adopted from the manual will bear the entry's title, like that
    - Internal state: store the number of systems (and then models...) in the
    first line
      - To prepare for LG (models)
    - Testing: keep the old version number in global, add version-dependent
    processing in internal state code, while testing newest implementation
- [x] Get rid of the brackets and the -2s
- [x] Get rid of i
- [x] Custom class that stores variable controls?
  - [x] Solves weird logic with anchor
  - [ ] Allows loop mode controls
  - [ ] Update updating method to make a more responsive UI?
- [x] Getters and setters in JavaScript
- [x] UI touch-ups
  - [x] Border colours
  - [x] Text colour changes when hitting buttons
  - [x] Shrink the buttons again to look better?
- [x] Redesign anchor logic
  - Only register anchor level before longpressing minus and level > 0

## Far Future: Preparation for Lemma's Garden

- [ ] Context sensitivity
  - `b < a > c → aa`
  - How to store? Maps?
- [ ] Parametric systems
- [ ] Custom models for each symbol
  - Petals, leaves and such
  - Array of Vector3s denoting vertices
  - Bool to determine whether the model is terminal (?)
    - If terminal, has only one path of going from (0, 0, 0) through the list
    then back to (0, 0, 0)
    - If not terminal, has two paths:
      - From (0, 0, 0) through the first path to (1, 0, 0)
      - From (1, 0, 0) through the second path back to (0, 0, 0)
  - [x] Renderer option to disable models
  - Can models' names contain spaces?
    - How are they referenced in systems? As a list of names? An ID that is the
    index of an array?

## Currently Impossible

- Remove the add button, every rule is bunched into one field
  - Entry.keyboard? (`Keyboard.TEXT`) doesn't work
  - https://andyp.dev/posts/xamarin-forms-essentials-keyboard-master-guide
  - Which means, adding extra processing in view menu and system menu
- Anchor to be internally processed by the ts var, not the level button
  - Can it work both ways or just downwards?
  - It does not work currently due to the fact that variable purchase callbacks
  are post-processing, and not pre-