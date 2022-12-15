# L-systems Renderer

## 0.20: It Depends

- [ ] Context sensitivity
  - `b < a > c → aa`
  - How to store? Maps?
- [ ] Redesign manual
  - Add more systems to the manual (algae)
  - Add tutorial-like flows that explain concepts
- [ ] Add more comments in the code
- [ ] Getters and setters in JavaScript
- [ ] A more detailed README
  - Showcases the power of tickspeed and stroke options
  - Discusses limitations of the game
  - Like a blog post, sort of
- [ ] New main screen controls idea
  - Line 1: Player controls: `<< - P + >>`
  - https://en.wikipedia.org/wiki/Media_control_symbols
  - Line 2: Level, loop, tickspeed
  - This will do away with the fucking anchor
- [ ] UI touch-ups
  - [ ] Border colours 
  - [ ] Text colour changes when hitting buttons
  - [ ] Shrink the buttons again to look better?
- [ ] Saved systems can also store static camera configs like manual pages?
  - Technically not possible currently
  - Storing descriptions is also probably not possible
  - Unless we have the power of version number
    - Keep the old version number in global, but add version-dependent
    processing regardless
- [ ] Optimise using the API's profiler

## Currently Impossible

- Remove the add button, every rule is bunched into one field
  - Entry.keyboard? (`Keyboard.TEXT`) doesn't work
  - https://andyp.dev/posts/xamarin-forms-essentials-keyboard-master-guide
  - Which means, adding extra processing in view menu and system menu
- Anchor to be internally processed by the ts var, not the level button
  - Can it work both ways or just downwards?
  - It does not work currently due to the fact that variable purchase callbacks
  are post-processing, and not pre-