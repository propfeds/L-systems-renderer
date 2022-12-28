# L-systems-renderer

L-systems renderer in Exponential Idle.

## Features

- Can save a whole army of systems!
- Stochastic (randomised) and 3D systems
- Camera modes: fixed and turtle-following
- Drawing speed and advanced stroke options!

In 0.18, the renderer's configuration was slightly messed up due to format
changes to the internal state.

In 0.20, more care has been taken with regards to the internal state, as it's
been converted to JSON instead of pure text. However, it still might break.
Be sure to back it up to another save before updating, and in case it's
corrupted, please contact me. From now on, there's also an option to export the
internal state in the theory menu, so please back it up.

## Installation

Current version: 0.20.1

Navigate to [`renderer.js`](./renderer.js) and click on `Raw`. You will be
delivered to this theory's raw code. Copy the page's URL.

Then, access the custom theory panel within the game (unlocked after finishing
the Convergence Test) then enter the picking menu. Press the `+` symbol and
paste the URL in.

## Screenshots

![ss1](screenshots/23.jpg "Hilbert curve")

![ss2](screenshots/24.jpg "Fern")

![ss3](screenshots/29.jpg "Manual")

![ss3](screenshots/25.jpg "Lucky flower")

![ss3](screenshots/28.jpg "Storage")
