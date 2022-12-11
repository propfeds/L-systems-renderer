# L-systems Renderer

## 0.19.1

## 0.20: It Depends

- [ ] Context sensitivity
  - `b < a > c → aa`
  - How to store? Maps?
- [ ] Redesign manual
  - Add more systems to the manual (algae)
  - Add tutorial-like flows that explain concepts
- [ ] Add more comments in the code
- [ ] A more detailed README
  - Showcases the power of tickspeed and stroke options
  - Discusses limitations of the game
  - Like a blog post, sort of
- [ ] Optimise using the API's profiler

## Currently Impossible

- Remove the add button, every rule is bunched into one field
  - Entry.keyboard? (`Keyboard.TEXT`) doesn't work
  - https://andyp.dev/posts/xamarin-forms-essentials-keyboard-master-guide
  - Which means, adding extra processing in view menu and system menu
- Saved systems can also store static camera configs like manual pages?
  - Technically not possible currently
  - Storing descriptions is also probably not possible
  - Unless we have the power of version number
- Anchor to be internally processed by the ts var, not the level button
  - Can it work both ways or just downwards?
  - It does not work currently due to the fact that variable purchase callbacks
  are post-processing, and not pre-