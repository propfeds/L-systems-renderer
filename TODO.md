# L-systems Renderer

## 0.20

- [ ] Context sensitivity
  - `b < a > c → aa`
  - How to store? Maps?
- [ ] Redesign manual
  - Add more systems to the manual (algae, or like, mistletoe)
  - Add tutorial-like flows that explain concepts
- [ ] Add more comments in the code
- [x] Getters and setters in JavaScript
- [ ] A more detailed README
  - Showcases the power of tickspeed and stroke options
  - Discusses limitations of the game
  - Like a blog post, sort of
- [ ] New main screen controls idea
  - Line 1: Player controls: `<< - P + >>`
  - https://en.wikipedia.org/wiki/Media_control_symbols
  - Line 2: Level, loop, tickspeed
  - This will do away with the fucking anchor
- [x] UI touch-ups
  - [x] Border colours
  - [x] Text colour changes when hitting buttons
  - [x] Shrink the buttons again to look better?
- [ ] Saved systems
  - [ ] Choice to overwrite or create copy
    - Include list of saved systems in naming menu
  - [ ] Store static camera configs and description
    - We have the power of version number
    - Store the current system in the same format
      - Sequence menu shows the system's title
      - Systems adopted from the manual will bear the entry's title
    - Testing: keep the old version number in global, but add version-dependent
    processing regardless
- [x] Custom class that stores variable controls?
  - [x] Solves weird logic with anchor
  - [ ] Allows loop mode controls
  - [ ] Update updating method to make a more responsive UI?
- [ ] resetLvlOnConstruct should actually be renderer's property since the only
logic exists there
- [ ] Optimise using the API's profiler

## Preparing for Lemma's Garden

- [ ] Implement parametric systems
- [ ] Custom models for each symbol
  - Petals, leaves and such
  - Array of Vector3s denoting edges
  - Separate way forward and way back?

## Currently Impossible

- Remove the add button, every rule is bunched into one field
  - Entry.keyboard? (`Keyboard.TEXT`) doesn't work
  - https://andyp.dev/posts/xamarin-forms-essentials-keyboard-master-guide
  - Which means, adding extra processing in view menu and system menu
- Anchor to be internally processed by the ts var, not the level button
  - Can it work both ways or just downwards?
  - It does not work currently due to the fact that variable purchase callbacks
  are post-processing, and not pre-