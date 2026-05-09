# Flychess Robot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add server-side robot players for flychess when the game URL includes `robot=1`, `robot=2`, or `robot=3`.

**Architecture:** Keep the existing Socket.io protocol and room flow. Add a small pure helper module for robot URL parsing, legal move selection, and basic server-side chess state; wire it into `006/flychess_server/index.js` so robots occupy seats, auto-prepare, roll dice, move, and advance turns with 1-3 second delays.

**Tech Stack:** Node.js, Socket.io 2.x, built-in `node:test` and `assert`.

---

### Task 1: Robot Helper Module

**Files:**
- Create: `006/flychess_server/test/robot.test.js`
- Create: `006/flychess_server/robot.js`
- Modify: `006/flychess_server/package.json`

- [x] **Step 1: Write failing tests**

Run: `npm test` from `006/flychess_server`

Expected: FAIL because `./robot` does not exist.

- [x] **Step 2: Implement helper module**

Add URL parsing, robot count clamping, takeoff rules, movable chess lookup, move selection, and basic chess state advancement.

- [x] **Step 3: Verify helper tests pass**

Run: `npm test`

Expected: PASS.

### Task 2: Server Robot Flow

**Files:**
- Modify: `006/flychess_server/index.js`

- [x] **Step 1: Add room/player robot state**

Robots use positive generated UIDs, normal player fields, `isRobot: true`, null socket, and server-maintained `chess_status` / `chess_steps`.

- [x] **Step 2: Add robot fill on human login**

Parse `robot` from `LOGIN.lanuch_url`, fill empty seats up to `ready_count`, broadcast `SIT_CHANGE`, and mark robots prepared.

- [x] **Step 3: Add robot turn scheduler**

When `GAME_START` or `NEXT_PLAYER_DICE_SUCCESS` points at a robot, schedule dice and move actions with random 1-3 second delays.

- [x] **Step 4: Reuse existing broadcasts and finish logic**

Robot actions emit `MAKE_DICE_NUM_SUCCESS`, `PLAY_MOVE_STEP_SUCCESS`, `FINISH_CHESS_SUCCESS`, `GAME_OVER`, and `NEXT_PLAYER_DICE_SUCCESS` through the existing room broadcast path.

- [x] **Step 5: Clean timers**

Clear pending robot timers on room reset, game over, quit, and invalidation.

### Task 3: Verification

**Files:**
- No new production files.

- [x] **Step 1: Unit tests**

Run: `npm test`

Expected: PASS.

- [x] **Step 2: Syntax validation**

Run: `node --check index.js && node --check robot.js && node --check test/robot.test.js`

Expected: no output and exit code 0.

- [x] **Step 3: Runtime smoke test**

Run a local server and Socket.io client simulation with one human and `robot=1`, verify robots are added, prepared, roll dice, move, and turns advance without server errors.
