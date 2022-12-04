# L-systems Renderer

## 0.19: Winter Sweep

- Add more comments in the code
- Add more systems to the manual (algae)
- Move all strings to global scope for translations!
- A more detailed README
  - Showcases the power of tickspeed and stroke options
  - Discusses limitations of the game
  - Like a blog post, sort of
  - Post to reddit `r/proceduralgeneration`, crosspost `r/lsystem`

- Saved systems can also store static camera configs like manual pages?
  - Technically not possible currently
  - Storing descriptions is also probably not possible
  - Unless we have the power of version number

- Playlist queueing system, which will help with future endeavours
  - Mode 0 doesn't do anything, mode 1 queues the same thing, mode 2 queues next
  - Not really a queue, just a 'next' number
  - Or just collect the variable level when it ends

- Version number: helps migrating settings
- Theory pause button?

## 0.20: Spring Cleaning

- Context sensitivity
  - `b < a > c → aa`
  - How to store? Maps?

## Currently Impossible

- Remove the add button, every rule is bunched into one field
  - Entry.keyboard? (`Keyboard.TEXT`) doesn't work
  - https://andyp.dev/posts/xamarin-forms-essentials-keyboard-master-guide
  - Which means, adding extra processing in view menu and system menu
