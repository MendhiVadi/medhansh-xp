# Prompt: learn how the games in Portfolio XP work

Copy everything below the line into a new Claude session that has this repository checked out.

---

You are studying the six games in **Portfolio XP**, a Windows XP-style portfolio site written in plain JavaScript with no framework and no build step. I want to understand the math and the code behind each game well enough to change it safely.

## Ground rules

- **Read the code. Don't trust a summary, including this one.** Every name below is a starting point. Open the function, read it line by line, and quote the real constants and expressions. If something here disagrees with the code, the code wins: say so and explain the difference.
- Don't guess at behaviour you haven't read. When something depends on another function, follow it.
- Cite `file:line` for every formula and constant.
- Where the code is subtle (an order of operations, a clamp, a guard against an old timer), explain why it's there, not only what it does.

## Where things are

- `games.js`: Solitaire, Spider, Snake, Brick Breaker and Pinball, plus shared helpers: `loop` (the per-frame driver; `dt` is capped at 50 ms), `burst`, `fitCanvas`, `dealFx`, `splash`, `levelPicker`, `worldBoard` and `sound`.
- `app.js`: the desktop shell, `renderMine` (Minesweeper), the `Career` object and `TROPHIES`, and the skippable delays `wait` / `skipWaits` (exposed to games as `ctx.wait` and `ctx.skipWait`).
- `sound.js`: the synthesized sounds (`XPS.play`, `XPS.blip`). Mention it only where a game's logic depends on it.
- `tests/games-e2e.mjs`: each game exposes a test hook at `document.querySelector('.win[data-key="<game>"]').__g`. The bots and checks there show how the state is meant to evolve.

## What to produce for each game

For **every** game below, write a section with these five parts:

1. **State model.** Every variable that defines the game state: its type, its range, and what changes it. Include the state machine (for example `ready`, `banner`, `run`, `paused`, `over`) and every transition with its trigger.
2. **Update loop.** What runs each frame or tick, in order. Show how real time becomes game time: fixed ticks with an accumulator, or substeps, and the cap on `dt`.
3. **Every formula, with its actual constants.** Scoring, speeds, curves, collision responses, level and difficulty scaling. Write each as an equation, then quote the line.
4. **A worked numeric example.** Pick realistic numbers and run the formulas by hand, step by step. For example, one ball step through a collision, or one move's score change.
5. **Edge cases.** What the code guards against, and anything it doesn't. Cover limits, wrap-around, empty piles, timers that outlive a new game, a window that's minimized or closed mid-delay, and floating-point issues.

## The games, the functions to start from, and the questions I must have answered

### 1. Klondike Solitaire (`solitaire` in `games.js`)
Functions: `deal`, `canDrop`, `move`, `autoMove`, `drawStock`, `checkWin`, `undo`, `findHint`, `autoFinish`, `startCascade`, `cascStep`, `computeLayout`, `render`.
- **Scoring:** standard and Vegas, for every move type. Cover turning a card over, the 2 points lost every 10 seconds, the recycle penalty in Draw One versus Draw Three (and which recycle is free), and the time bonus `700000 / secs` with its 30-second floor. Work through a full example game's score.
- How `history` and `snap` make undo work, and what `passes` does to the Vegas pass limit.
- `forfeit`: when an abandoned game counts as a loss in the career record.
- The win cascade's physics in `cascStep`: gravity, bounce, and how cards leave the screen.
- How `render` animates with FLIP (`pendingOff`, the stored positions) and how the fan of cards is squeezed to fit the table height.

### 2. Spider Solitaire (`spider` in `games.js`)
Functions: `deal`, `isRun`, `canDrop`, `complete`, `move`, `autoMove`, `dealStock`, `checkWin`, `undo`, `findHint`, `flyRun`.
- **Scoring:** the start value, the cost of a move, the cost of an undo, and the bonus for a completed run. Explain the `Math.max(0, …)` floors.
- How 104 cards are built for 1, 2 and 4 suits (`k % nS`), and the 54 / 50 split between table and stock.
- What `isRun` accepts. Why `joined` stops pointless moves. Why `dealStock` refuses when any column is empty.
- How `findHint` ranks the candidate moves.

### 3. Minesweeper (`renderMine` in `app.js`)
Functions: `reset`, `plant`, `open`, `chord`, `lose`, `check`, `nb`.
- **The safe first click:** exactly which cells `plant` keeps free of mines, and why a first click always opens an area. Describe the mine-placement loop and its retry behaviour.
- **The flood fill in `open`:** it uses an explicit stack, not recursion. Walk through a small board by hand, showing the stack contents.
- `chord`: when it fires and what happens if a flag is wrong.
- Win detection (`opened.size` compared with `W * H - M`), the best-time record per level, and how a Custom board's record key is built.
- The custom-field limits in `askCustom` (width, height, and mines up to `w * h - 10`), and why that `- 10` matters for the safe first click.

### 4. Snake (`snake` in `games.js`)
Functions: `loadLevel`, `newGame`, `beginLevel`, `turn`, `tick`, `die`, `levelClear`, `placeFood`, `spawn`, `draw`, `paintField`, plus `baseSpeed` and `target`.
- **The speed curve:** the tick length per level from `baseSpeed` (the `0.94 ** (lv - 1)` decay and its 0.45 floor), the per-apple speed-up in `tick` (campaign `0.985`, endless `0.965`, floor `0.4`), and `SPEEDS`. Tabulate the tick length in milliseconds for levels 1 to 10 at Normal speed.
- **Interpolation:** how `draw` slides each segment from its position at the last tick (`px` / `py`) to its current one with `a = acc / speed`. Explain the `pl - 1` index for a segment that has just grown, and why wrapping segments snap instead of sliding.
- **The turn queue:** why `turn` buffers up to 3 turns, and how it blocks reversing into yourself.
- **Collision in `tick`:** why the tail cell counts as free unless the snake grows this tick.
- **Score and level:** apples (`10 * lv`), the bonus star (`30 * lv`), the level-clear bonus (`50 * lv + lives * 25`), and `target()`.
- The `gen` counter that cancels stale banner timers, and why `newGame` calls `ctx.skipWait()`.

### 5. Brick Breaker (`breakout` in `games.js`)
Functions: `build`, `release`, `launch`, `stepBall`, `fixVel`, `hitBrick`, `kill`, `explode`, `applyPU`, `update`, `nextLevel`, `loseLife`, `addScore`, plus `basePW` and `baseSp`.
- **Reflection:** the circle-against-rectangle test in `stepBall` (nearest point on the brick, normal `n = (dx, dy) / len`, reflection `v -= 2 (v · n) n` only when `v · n < 0`, then push-out). Work an example where the ball hits a brick's corner.
- **The paddle:** where it was hit maps to a launch angle (`hit * 1.05` radians), speed gains 1.2% per hit up to `baseSp() * 1.5`.
- **`fixVel`:** the minimum vertical (25%) and horizontal (14%) fractions of the speed. Show that the speed is preserved, and what happens when `vx` is exactly 0.
- **Substeps:** how `update` sizes them so a ball never moves more than 3 px per step. Compute the step count for a fast ball at `dt = 50`.
- **The level format** in `LEVELS` (`a`–`f`, `A`–`F`, `S`, `U`, `*`, `?`), the hit points of each brick, and how a second lap (`lap > 0`) makes every brick tougher.
- **Scoring:** the base value per brick type, the level multiplier `1 + (level - 1) * 0.25`, the combo multiplier, extra lives every 15,000 points after 10,000, and the bomb chain reaction in `explode`.
- The trapped-ball nudge (`noHit > 12000`).

### 6. 3D Pinball (`pinball` in `games.js`)
Functions: `colSeg`, `stepFlippers`, `stepBall`, `update`, `launch`, `nudge`, `drain`, `mission`, `add`, `serve`, `newGame`, plus `misNeed`.
- **Units and integration:** pixels and seconds. Gravity `G`, the speed cap `MAXV`, the fixed substep `SUB = 1/300` and its 20-step cap per frame. State the integration order (velocity, then position, then collisions).
- **Collision in `colSeg`:** the closest point on a segment, the tapered capsule radius `R = BR + rad + (rad2 - rad) * t`, the push-out, and the reflection `v -= (1 + e) * vn * n` against the surface's velocity.
- **The flipper's surface velocity:** for an angular speed `w` about the pivot `(sx, sy)`, the contact point moves at `(-w * ry, w * rx)`. Derive it, then work an example with a raised flipper (`FSPD`, `FL`) hitting a resting ball. What does `f.s` do for the right flipper?
- **Flipper motion in `stepFlippers`:** the `REST` and `UP` angles, and how `f.w` is set while the flipper is moving.
- **The table geometry:** the stride-7 wall array (`addW`), the 28-segment arch, the slingshot kick (`WL[i + 5]`, the `hitVn < -80` threshold, the cooldown), the bumpers (reflection plus a 260 kick), the drop targets, the spinner (`spV`, its decay, and the half-turn count), and the top lanes with the skill shot.
- **The black hole:** capture radius `HR`, the pull `900 * (1 - d / HPULL)` inside `HPULL`, the hold time, the throw-back velocity and its cooldown.
- **Nudge and tilt:** what each nudge adds to the velocity, how `tiltM` rises by 1 and drains at 0.5 per second, and the 3.2 threshold. How many nudges, how quickly, cause a tilt?
- **Missions and ranks:** the `MISSIONS` table, `misNeed` (the count grows by half each time round), extra balls in `EXTRA`, the end-of-ball bonus in `drain`, and the multiplier.
- **Rescues:** the stuck-ball rescue (`stuckT`), the ball rolling back into the plunger lane, and the ball saver (`saverT`).

## Across all games: the career level formula

In `app.js`, `Career.levelOf(pts)` is `Math.floor((Math.sqrt(1 + pts / 12.5) - 1) / 2) + 1`, and `Career.needFor(lv)` is `50 * (lv - 1) * lv`. Level `n + 1` starts at `50 * n * (n + 1)` points.

- Prove that `levelOf(50 * n * (n + 1)) = n + 1` exactly. Hint: `1 + 4n(n + 1) = (2n + 1)²`. Then say whether floating point can break this for large `n`.
- Tabulate the thresholds for levels 1 to 10 against `RANKS`.
- List the points each game awards per result through `Career.record` (look at each game's `career(...)` or `sys.career.record(...)` call). Note the 50 points per trophy, how `TROPHIES` are tested, and how streaks and best values are stored.

## Shared timing: delays the player can skip

Explain `wait(ms, scope)` and `skipWaits(scope)` in `app.js`:
- Why a delay resolves to `true` when skipped and `false` when its time runs out.
- Why the Space handler ignores keys typed into fields.
- How each game's `gen`, `dealRun` or `endRun` counter keeps a stale delay from acting on a new game.

## Finish with

A short list of anything in the code that looks wrong, fragile or inconsistent with its comments. Mark each item as confirmed (you traced it) or suspected.
