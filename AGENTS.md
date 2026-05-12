# Technical Specification: Autonomous Agents & Specialized Modules

This document provides exhaustive technical specifications for all autonomous agents and specialized subsystems within the Stickman Fighter Online system. Each agent/module operates with well-defined responsibilities, state management, input/output schemas, and integration patterns.

---

## 1. Game Engine Agent (`engine.ts`)

### 1.1 Role & Responsibility
The **Game Engine Agent** is the authoritative simulation engine responsible for all game state updates, physics calculations, combat resolution, and business logic. It operates as the single source of truth for gameplay progression and serves as the backend for both host and guest clients.

### 1.2 Core Functions & Heuristics

#### State Initialization
- **Function**: `createInitialState() → GameState`
- **Purpose**: Generates fresh game state for new matches
- **Logic**:
  - Creates two fighters at opposite ends of arena (x=250, x=774)
  - Sets initial health, energy, and super charge to maximum values
  - Initializes game phase to 'countdown'
  - All AAA system meters reset to baseline

#### Fighter Creation
- **Function**: `createFighter(x, facing, color, glowColor, name) → Fighter`
- **Parameters**:
  - `x`: Horizontal spawn position
  - `facing`: Direction (-1 for left, +1 for right)
  - `color`: Primary render color
  - `glowColor`: Secondary glow color
  - `name`: Player display name
- **Initializes**:
  - Movement vectors (vx, vy)
  - Combat state (health, energy, super charge)
  - AAA metrics (poise, style meter, combo counter)
  - Status flags (isGrounded, isBlocking, isCrouching, etc.)

### 1.3 Input Processing Pipeline

#### `applyInput(fighter, input, prevInput, opponent, state, owner)`
Processes player input and translates to action execution with hierarchical priority.

**Priority Order** (higher priority cancels lower):
1. **Lock States**: If `hit` or `poiseBreak` active → early return (player stunned)
2. **Super Active**: If super move ongoing → early return (locked in animation)
3. **Poise Broken**: If guard broken → early return (player immobilized)
4. **Blocking**: Toggle based on `input.block && isGrounded && !isInAction`
5. **Crouching**: Toggle based on `input.crouch && isGrounded && !blocking`
6. **Movement**: Apply velocity based on left/right input (-4 or +4, reduced by 50% if crouching)
7. **Jumping**: Jump only if grounded and not crouching
8. **Powers** (Edge Triggered - `jp()` detects press transition):
   - **Super**: Requires `superCharge >= 100`, starts 60-frame animation
   - **Teleport**: Requires 15 energy, teleports to opponent distance + 80px
   - **Fireball**: Requires 18 energy, allows free movement during cast
   - **Lightning**: Requires 25 energy, allows free movement during cast
9. **Basic Attacks**:
   - **Punch**: Requires 3 energy, 15 frame animation
   - **Kick**: Requires 5 energy, 20 frame animation
   - **Uppercut**: Requires 10 energy, 25 frame animation (edge triggered)

**Velocity Decay**: `vx *= 0.8` each frame for natural friction

### 1.4 Combat Resolution System

#### Melee Hit Detection
**Function**: `checkMelee(attacker, defender, state) → boolean`

**Detection Logic**:
1. Verify action active: `actionTimer > 0 && hitCooldown == 0`
2. Extract attack parameters (range, damage, hit frame):
   - Punch: 60 range, 5 damage, hits at frame 7
   - Kick: 75 range, 7 damage, hits at frame 10
   - Uppercut: 65 range, 10 damage, hits at frame 12
3. Validate timing: `(duration - actionTimer) === hitFrame`
4. Check distance: `abs(defender.x - attacker.x) <= range`
5. Check direction: `sign(defender.x - attacker.x) === attacker.facing`
6. Crouch bypass: Punches don't connect if defender crouching

**Damage Calculation** (see Section 1.5)

**On Hit Effects**:
- Defender enters `hit` state for 15 frames
- Knockback: `vx = attacker.facing * 5` (or `+-10` for uppercut)
- Uppercut launches: `vy = -8, isGrounded = false`
- Combo increment: `attacker.combo++, comboTimer = 50`
- Super charge gain: Attacker +12, Defender +15
- Screen shake: 8 intensity
- Poise damage calculation (see Section 1.6)
- Combo announcements at 3x, 5x, 8x, 12x+ hits

#### Projectile Hit Detection
**Function**: `projHit(projectile, defender, state, attacker) → boolean`

**Detection Logic**:
1. Distance check: `sqrt((dx²+dy²)) <= projectile.radius + 25`
2. One hit per projectile (flag prevents re-hits)
3. Applied to defender center: `(defender.y - 30)` for center of mass

**Super Beam Special** (projectile.type === 'super_beam'):
- Knockback: `vx = sign(vx) * 10` (stronger)
- Launch: `vy = -6`
- Stun: 25 frame hit state (vs 15 normal)
- Screen effects: 18 intensity shake, 15 flash, 10 slowmo frames
- Stat tracking: `attacker.stats.supersLanded++`

#### Lightning Bolt Hit Detection
**Function**: `boltHit(bolt, defender, state, attacker) → void`

**Detection Logic**:
1. Once-per-cast check: `!bolt.hasHit`
2. Range: `sqrt((dx²+dy²)) <= 40` pixels around target endpoint
3. Auto-targets opponent at cast time

**Effects**:
- Stun: 20 frames
- Launch: `vy = -6`
- Screen effects: 12 shake, 10 flash
- Damage: 12 base

### 1.5 Damage Calculation Pipeline

**Function**: `calcDamage(baseDamage, attacker, defender, isBlocked) → number`

**Calculation Sequence** (multiplicative):
```
damage = baseDamage
damage *= getComboScaling(attacker.combo)        [85% decay per combo hit]
damage *= (1 + getStyleBonus(attacker))          [0-30% based on style rank]
if (attacker.isRaging) damage *= 1.3             [30% boost in rage]
if (defender.isRaging) damage *= 0.7             [30% reduction in rage]
if (isBlocked) damage *= 0.2                     [Block reduction 80%]
damage = round(damage, 1) minimum
```

**Chip Damage**: If blocked, 10% of base damage leaks through as guaranteed chip

**Block Chip**: Defender takes `ceil(baseDmg * 0.1)` even when blocking

**Damage Tracking**: 
- Attacker: `stats.damageDealt += finalDamage`
- Defender: `stats.damageTaken += finalDamage`

### 1.6 Advanced Combat Systems

#### Style System
**Function**: `updateStyle(fighter, attackType, hit) → void`

**Meter Mechanics**:
- Gain per hit: +8 base
- Variety bonus: +12 if different attack type than last hit
- Decay: -0.3 per frame after 2-second activity window
- Tracks last attack type to promote variety

**Rank Thresholds & Bonuses**:
| Rank | Threshold | Damage Bonus |
|------|-----------|--------------|
| D    | 0-19      | 0%          |
| C    | 20-39     | 5%          |
| B    | 40-64     | 12%         |
| A    | 65-84     | 20%         |
| S    | 85-100    | 30%         |

**Rank Calculation**: Recalculates each frame based on meter value and decay phase

**Variety Tracking**: Prevents style farming by requiring different attack types

#### Combo System
**Function**: `getComboScaling(comboCount) → multiplier`

**Scaling Formula**: `0.85 ^ (combo - 1)`
- Combo 1: 1.0x
- Combo 2: 0.85x
- Combo 3: 0.72x
- Combo 4: 0.61x
- Combo n: 0.85^(n-1)

**Combo Window**: 50 frames (~833ms), resets to 0 when expired

**Combo Announcements**:
- 3x: "3x COMBO!" (green)
- 5x: "5x BRUTAL!" (purple)
- 8x: "8x INSANE!" (orange)
- 12x+: "Nx GODLIKE!!" (red)

**Longest Combo Tracking**: `fighter.stats.longestCombo = max(current, new)`

#### Rage Mode System
**Function**: `updateRage(fighter, state) → void`

**Activation Trigger**:
- `health / maxHealth <= 0.25` AND `health > 0` AND not poise-broken
- One activation per round (prevents re-triggers)
- Sets `isRaging = true, rageTimer = 300` (5 seconds)

**Effects While Active**:
- Damage multiplier: 1.3x (30% boost)
- Defense multiplier: 0.7x (30% reduction)
- Energy regen: Double (0.25 → 0.5 per frame)
- Visual: Red glow, rage particles, aura intensity 2.0

**Deactivation**:
- Timer expires (rageTimer reaches 0)
- Health rises above 25% threshold
- Tracks activations: `stats.rageActivations++`

**Announcements**: "🔥 RAGE MODE!" + fighter name, screen flash 12

#### Poise (Guard Health) System
**Function**: `updatePoise(fighter) → void`

**Poise Damage**:
- Normal hit: -18 poise
- Blocked hit: -8 poise (guard strengthens block)
- Triggers regen reset: `poiseRegenTimer = 60` (1 second)

**Poise Regeneration**:
- Delay: 60 frames before recovery starts
- Rate: +0.8 per frame after delay
- Recovery threshold: Once >= 50% max poise, `isPoiseBroken = false`

**Guard Break**:
- Triggers when `poise <= 0 && !alreadyBroken`
- Sets `isPoiseBroken = true, poiseBreakTimer = 60`
- Forces `action = 'poiseBreak'` for 60-frame stun
- Blocks automatically disabled
- Prevents all actions during stun
- Announcements: "💀 GUARD BREAK!" + fighter name
- Screen shake: 12 intensity
- Particle burst: 15 poise-type particles

**Perfect Guard Recovery**: Poise regenerates to 50%+ to recover from break state

#### Health Regeneration System
**Function**: `updateRegen(fighter) → void`

**Regen Rules**:
- Only active if `regenTimer >= 120` (2 seconds without damage)
- Rate: +0.08 HP per frame (48 HP per second when active)
- Caps at max health
- Disabled when health <= 0

**Regen Reset**: Any damage taken sets `regenTimer = 0` (restart 2-second delay)

### 1.7 Physics Engine

#### Movement & Gravity
**Function**: `updatePhysics(fighter) → void`

**Gravity Application**:
- If not grounded: `vy += 0.6` (gravity constant)
- Simulates falling acceleration

**Position Update**:
- `x += vx` (horizontal movement)
- `y += vy` (vertical movement)

**Ground Collision**:
- If `y >= GROUND_Y (460px)`: Snap to ground, `vy = 0, isGrounded = true`

**Friction**:
- If `|vx| < 0.5`: Snap to 0 (prevents micro-oscillation)

**Arena Boundaries**:
- Clamp x: `50 <= x <= 974` (50px buffer from edges)

**Collision Separation**:
- When fighters overlap: `distance < 35px`
- Calculates separation push: `(35 - distance) / 2`
- Pushes apart symmetrically

**Action Timer Management**:
- Decrements each frame
- When reaches 0: Reverts to `action = 'idle'` and `superActive = false`

#### Energy Regeneration
```
eRegen = isRaging ? 0.75 : 0.25  [base 0.25 + 0.5 in rage]
energy = min(maxEnergy, energy + eRegen)
```

### 1.8 Power Move Spawning

#### Fireball Spawning
**Function**: `spawnFireball(fighter, state, owner) → void`

**Trigger**: Called when `action === 'fireball'` at frame 10 of 25-frame cast

**Projectile Properties**:
- Position: `fighter.x + facing * 35, fighter.y - 28`
- Velocity: `facing * 7` pixels/frame
- Lifetime: 90 frames
- Damage: 8
- Radius: 14px
- Color: Player's primary color

**Particle Burst**: 10 fire particles spawned at cast point

#### Lightning Spawning
**Function**: `spawnLightning(fighter, opponent, state, owner) → void`

**Trigger**: Called when `action === 'lightning'` at frame 15 of 35-frame cast

**Bolt Path Generation**:
- Generates 13 segment points from caster to opponent
- Each segment perturbed +/- 40px horizontally, +/- 30px vertically
- Endpoints fixed (no jitter)

**Bolt Properties**:
- Lifetime: 25 frames
- Damage: 12
- Auto-targets opponent center - 30px

**Effects**:
- Screen shake: 10 intensity
- Screen flash: 8 intensity
- 20 lightning particle bursts

#### Teleport Mechanics
**Function**: Called when `input.teleport` pressed

**Mechanics**:
- Energy cost: 15
- Creates trail particle at current position
- Teleports to opponent + `opponent.facing * 80px` horizontally
- Lands on ground, resets `vy = 0, isGrounded = true`
- Sets `action = 'teleport'` for 12-frame cooldown animation
- Creates particle trail at both departure and arrival

**Integration**: Uses `updateStyle(f, 'teleport', false)` to track usage

### 1.9 Game Phase & Round Management

#### Phase Transitions
**Function**: `updateGame(state, p1Input, p1Prev, p2Input, p2Prev) → GameState`

**State Machines**:

**Countdown Phase** (0 → -30):
```
countdownTimer--
if (countdownTimer <= -30) → gamePhase = 'fighting'
```

**Fighting Phase**:
- Processes all inputs and updates
- Executes combat resolution each frame (or every 2 frames if slowmo active)
- Updates all AAA systems (style, rage, poise, regen)
- Checks end conditions:
  - `player1.health <= 0` → determine winner, round end
  - `player2.health <= 0` → determine winner, round end
  - `roundTimer <= 0` → time out, determine winner by health

**Round End Detection**:
```
if (winner determined) {
  - Update winner wins counter
  - Track perfect round (winner at 100% HP, opponent damaged)
  - Update matchStats (total rounds, longest combos, accuracy, style ranks)
  - Determine if match over (best of 3: first to 2 wins)
  - If match over → gamePhase = 'gameOver'
  - Else → gamePhase = 'roundEnd'
}
```

**Perfect Round**: Bonus announcement "⭐ PERFECT!" when winner untouched

**Round End Phase**:
```
roundEndTimer--
if (roundEndTimer <= 0) {
  round++
  resetRound(state)
  gamePhase = 'countdown'
}
```

**Game Over Phase**:
- No further updates, waits for rematch or disconnect
- Final match winner: `fighter.wins > opponent.wins`

### 1.10 Screen Effects & Particle System

#### Screen Shake
- Intensity: 0-20 (frame units)
- Decay: `screenShake *= 0.85` per frame
- Applied as random offset: `±(random * intensity * 2)` pixels

#### Screen Flash
- Duration: Frames remaining
- Decrements per frame
- Rendered as white overlay with decreasing alpha

#### Slow Motion
- Duration: Frames remaining
- Effect: Skip physics updates on odd frames when active
- Allows for slow-motion impact moments

#### Particles
**Types**:
- `normal`: Standard emitted particle, gravity-affected
- `glow`: Floats upward, no gravity, fade out
- `ring`: Special circular emission
- `trail`: Teleport afterimage
- `lightning`: Lightning bolt effect
- `fire`: Fireball trail
- `rage`: Rage activation burst
- `style`: Style meter visual
- `poise`: Guard break effect

**Update Logic**:
- `x += vx, y += vy`
- If not glow/ring/rage: `vy += 0.1` (gravity)
- If glow or rage: `vy -= 0.02` (float upward)
- Rotation: `rotation += rotationSpeed` if defined
- Lifetime: Decrements, particle removed when `life <= 0`

#### Damage Text
- Floats upward: `vy = -2` (screen-relative)
- Decays: `life--` per frame
- Scales based on combo (1.2x scale if combo > 3)
- Color: Yellow if combo > 2, else red
- Removed when `life <= 0`

### 1.11 State Output & Serialization

#### GameState Interface
```typescript
{
  player1: Fighter
  player2: Fighter
  particles: Particle[]
  projectiles: Projectile[]
  lightningBolts: LightningBolt[]
  damageTexts: DamageText[]
  announcements: Announcement[]
  screenShake: number
  screenFlash: number
  slowMotion: number
  roundTimer: number
  round: number
  maxRounds: number
  gamePhase: 'menu' | 'countdown' | 'fighting' | 'roundEnd' | 'gameOver'
  countdownTimer: number
  roundEndTimer: number
  winner: string | null
  matchStats: MatchStats
}
```

**Serialization**: Full state sent from host to guest every 3 frames, with particle/text arrays stripped to reduce bandwidth

---

## 2. Network Manager Agent (`network.ts`)

### 2.1 Role & Responsibility
The **Network Manager Agent** abstracts WebRTC P2P networking, enabling real-time multiplayer gameplay with low-latency communication. It manages connection lifecycle, message routing, and latency monitoring.

### 2.2 Connection Model

#### Host-Guest Architecture
- **Host**: Creates room, listens for guest connection, acts as authority
- **Guest**: Joins existing room by code, becomes secondary player
- **Initiator**: Either player can be host; determined by who creates room
- **Symmetric**: Both players send inputs; host broadcasts authoritative state

### 2.3 Room Management

#### Room Code Generation
**Function**: `genRoomCode() → string`
- Alphanumeric set: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32 chars, excludes I/O/1/0 for clarity)
- Length: 5 characters
- Example codes: `X7KQ2`, `ABCDE`, `ZZZZZ`
- Collision handling: Auto-retry with new code if ID taken

#### Room Lifecycle

**Creation** (`createRoom() → Promise<string>`):
```
1. Set isHost = true
2. Generate 5-char code
3. Create Peer with ID: stickfight-{CODE}
4. On peer open → resolve with code
5. On peer connection → setup connection
6. On collision error → retry with new code
7. Timeout: 15 seconds (no resolve = reject)
```

**Joining** (`joinRoom(code) → Promise<void>`):
```
1. Set isHost = false
2. Normalize code to uppercase
3. Create Peer with unique guest ID
4. On peer open → connect to stickfight-{CODE}
5. On connection open → resolve
6. On timeout (15s) → reject with timeout error
```

### 2.4 Message Protocol

#### Message Types

**Input Message**:
```typescript
{ 
  type: 'input'
  input: PlayerInput  // All button states + seq number
}
Frequency: ~30Hz (every 2 frames throttled)
```

**State Message**:
```typescript
{
  type: 'state'
  state: GameState   // Full game state
  seq: number        // Frame sequence for ordering
}
Frequency: ~20Hz (every 3 frames from host only)
```

**Ping/Pong**:
```typescript
{ type: 'ping', t: timestamp }
{ type: 'pong', t: timestamp }
Frequency: Every 2 seconds
Round-trip calculation: (now - t) / 2
```

**Ready Signal**:
```typescript
{ type: 'ready' }
Sent: When peer ready to start game
```

**Rematch**:
```typescript
{ type: 'rematch' }
Triggered by: Enter key press when gameOver
```

**Name Exchange**:
```typescript
{ type: 'name', name: string }
Length: max 15 characters
Sent: On connection and when rematch
```

### 2.5 Connection States

**ConnectionStatus**: `'idle' | 'connecting' | 'waiting' | 'connected' | 'error'`

**State Transitions**:
```
idle → connecting (createRoom/joinRoom called)
  ↓
connecting → waiting (host: peer opened, listening)
  ↓
waiting → connected (guest: connection established)
  ↓
connected → error (connection error)
  ↓
error/closed → idle (disconnect called)
```

### 2.6 Latency Monitoring

#### Ping/Pong Cycle
- Initiator: Sends `{ type: 'ping', t: Date.now() }`
- Receiver: Responds immediately `{ type: 'pong', t: msg.t }`
- Calculation: `latency = round((Date.now() - t) / 2)`
- Interval: Every 2 seconds
- Callback: `onLatencyUpdate?.(ms)`

#### Latency Thresholds (Visual Feedback):
- `< 50ms`: Green indicator (excellent)
- `50-100ms`: Yellow indicator (acceptable)
- `> 100ms`: Red indicator (poor network)

### 2.7 Event Handlers

#### Handler Registration
**Function**: `setHandlers(onMsg, onStatus, onLatency)`
- `onMsg`: Receives messages (except ping/pong which auto-respond)
- `onStatus`: Receives status changes
- `onLatency`: Receives latency updates

#### Automatic Ping/Pong Handling
- Ping messages trigger automatic pong response (no app-level notification)
- Pongs update latency and trigger callback

#### Connection Lifecycle Callbacks
- `connection.on('open')`: Status = 'connected'
- `connection.on('close')`: Status = 'idle'
- `connection.on('error')`: Status = 'error'

### 2.8 Error Handling

#### Error Scenarios

**Room Creation Collision**:
- Error: PeerJS `unavailable-id` error
- Response: Destroy peer, generate new code, retry
- Max attempts: Implicit (no hard limit)

**Connection Timeout**:
- Scenario: Join attempt takes > 15 seconds
- Response: Reject promise, set status = 'error'

**Network Disconnection**:
- Detection: `connection.on('close')`
- Response: Status = 'idle', cleanup resources
- App handling: Triggers `onDisconnect` callback

**Concurrent Connection Attempts**:
- Host: `peer.on('connection')` stores first connection
- Guest: Only one active connection per peer

### 2.9 Message Sending

#### Send Implementation
**Function**: `send(msg: NetMessage) → void`

```typescript
if (this.conn?.open) {
  this.conn.send(msg)
} else {
  // Fail silently (no error thrown)
}
```

**Buffering**: PeerJS handles buffering if connection not immediately open

**Reliability**: DataConnection default uses reliable mode (TCP-like)

### 2.10 Cleanup & Disconnection

**Function**: `disconnect() → void`

**Cleanup Sequence**:
1. Stop ping interval
2. Close data connection (try/catch wrapped)
3. Destroy peer object (try/catch wrapped)
4. Nullify references
5. Set status = 'idle'

**Idempotency**: Safe to call multiple times (wrapped in try/catch)

### 2.11 STUN Server Configuration

```typescript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
```

- Enables NAT traversal for peer discovery
- Google STUN servers provide global coverage
- Fallback if primary fails

---

## 3. Renderer Agent (`renderer.ts`)

### 3.1 Role & Responsibility
The **Renderer Agent** transforms game state into 2D canvas visual output. It manages sprite drawing, particle effects, UI layouts, text rendering, and dynamic visual effects.

### 3.2 Canvas Architecture

**Canvas Dimensions**: 1024x576 pixels (16:9 aspect ratio)

**Rendering Pipeline**:
1. Clear canvas
2. Apply screen shake offset
3. Draw background (parallax, animated effects)
4. Draw shadows (drop shadow effect per fighter)
5. Draw auras (glow/energy effects)
6. Draw stickman fighters (main sprites)
7. Draw projectiles
8. Draw lightning bolts
9. Draw particles
10. Draw damage text
11. Draw combo/style/poise indicators
12. Restore canvas transform
13. Draw announcements (unshaken)
14. Draw UI bars (health, energy, super)
15. Draw timers and round info
16. Draw phase-specific overlays (countdown/roundEnd/gameOver)
17. Draw latency indicator

### 3.3 Background Rendering

**Function**: `drawBackground(ctx, frame) → void`

**Components**:

**Sky Gradient**:
- Linear gradient from top to ground line
- Colors: 5 stops from dark purple (#050520) to brown (#200a28)
- Simulates mystical atmosphere

**Twinkling Stars**:
- 22 fixed star positions
- Opacity modulated: `0.3 + sin(frame * 0.03 + i * 1.7) * 0.4`
- Each star on independent frequency for organic twinkle
- Size: `1 + sin(frame * 0.05 + i) * 0.5` pixels

**Moon**:
- Position: (850, 80)
- Radius: 32px
- Glow gradient: Radial from (850, 80, r=20) to (850, 80, r=80)
- Inner shadow at (840, 72) to create lunar crater appearance

**Mystical Fog**:
- Horizontal band from `GROUND_Y - 80` to `GROUND_Y`
- Opacity: `0.03 + sin(frame * 0.01) * 0.02` (slow breathe)
- Purple tint

**Ground Gradient**:
- Linear gradient from ground line to bottom edge
- Colors: Dark gray to very dark
- Represents arena floor

**Glowing Ground Line**:
- Vertical band ±3px around GROUND_Y
- Purple glow: `rgba(150, 100, 255, opacity)`
- Opacity: `0.3 + sin(frame * 0.02) * 0.1`

**Mystical Runes**:
- 5 positions on ground (150, 350, 512, 674, 874)
- Hexagon shape drawn per position
- Rotated: `frame * 0.01 + i * 1.2`
- Opacity: `0.08 + sin(frame * 0.015) * 0.04`

**Arena Boundaries**:
- Dashed lines at x=30 and x=994 from ground up 250px
- Color: Purple with opacity pulse
- Dash pattern: 8px on, 4px off

### 3.4 Stickman Rendering

**Function**: `drawStickman(ctx, fighter, frameCount) → void`

**Head**:
- Circle at (0, -bodyLen - radius)
- Radius: 12px
- Color: Fighter color (white if flashing from damage)

**Eye Rendering**:
- Normal: Two filled circles (eyes)
- Power Move (fireball/lightning/super): Glowing eyes matching power type
- Glow: 8px shadow blur

**Body**:
- Line from (0, -bodyLen) to (0, 0)
- Represents torso

**Breathing Animation**:
- Vertical offset: `sin(frameCount * 0.05) * 1.5`
- Applied to head and all upper body points

**Teleport Trail**:
- Rendered before fighter with decreasing alpha
- Trail points: `trail.life / 30 * 0.4` opacity
- Shows afterimages of teleport destinations

**Action Poses** (11 distinct poses):

**Idle**:
- Swaying arms: `sin(frame * 0.04) * 3`
- Casual stance

**Walk**:
- Animated limbs: `sin(frame * 0.15)` phase offset
- Arm/leg cycles opposite for natural gait

**Jump**:
- Arms raised high, legs pulled up
- Shows aerial state

**Punch**:
- Extended punch arm: `1.8 * extension` where extension = min(1, (15-timer)/5)
- Fist appears at max extension
- Recovery: `-0.5 * retraction` pulls back

**Kick**:
- Extended leg: `2.0 * extension`
- Opposite arm balances
- More range than punch

**Uppercut**:
- Arm goes upward
- Body rotates
- Shorter range, powerful hit frame

**Block**:
- Shield rendered as blue semi-circle: `arc(-π/2, π/2, radius=28)`
- Offset: +12px from center
- Glow: `rgba(100, 200, 255, 0.6)` with 10px shadow blur

**Hit**:
- Staggered pose showing knockback
- Arms drooping, body leaning

**Crouch**:
- Body shortened to 25px (vs 35px idle)
- Legs folded
- Head lower

**Fireball Pose**:
- Arms raised, body arched
- Hands glowing
- Builds energy visually

**Lightning Pose**:
- Arms spread, electrical appearance
- Body sparks with special effects
- Frame-based animation

**Super Pose**:
- Heavy stance, charged up appearance
- Maximum aura intensity
- Bulking effect with screen shake

### 3.5 Particle Rendering

**Function**: `drawParticles(ctx, particles) → void`

**Particle Types**:

| Type | Gravity | Behavior | Color |
|------|---------|----------|-------|
| normal | +0.1/f | Falls naturally | Specified |
| glow | -0.02/f | Floats up | Glow color |
| fire | +0.1/f | Emits from fireballs | Yellow/orange |
| lightning | +0.1/f | Electric sparks | Yellow/cyan |
| rage | -0.02/f | Floats up | Red rage color |
| trail | +0.1/f | Teleport afterimages | Glow color |

**Rendering**:
- Filled circle: `ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill()`
- Color: Particle.color with decreasing alpha: `alpha = life / maxLife`
- Rotation: If defined, applied via `ctx.rotate(rotation)`

### 3.6 Projectile Rendering

**Function**: `drawProjectiles(ctx, projectiles, frame) → void`

**Fireball**:
- Radius: 14px
- Gradient: Radial gradient from center to edge
- Color: Player's primary color
- Trail: Line from previous position to current
- Animation: Rotation frame-to-frame

**Super Beam**:
- Larger radius: 20px
- Intense color with white core
- Trail: Wider, brighter
- Glow: Additional outer circle

**Lightning Orb**:
- Smaller radius: 10px
- Jagged outline (not smooth circle)
- Sparking effect

### 3.7 Lightning Bolt Rendering

**Function**: `drawLightningBolts(ctx, bolts) → void`

**Segments**:
- Multi-point polyline from caster to target
- 13 intermediate segments with random jagging
- Segments regenerate every 3 frames for flickering effect

**Rendering**:
- Line width: 3px (variable based on frame)
- Color: Yellow/cyan lightning color
- Stroke: Glowing effect with blur

**Flicker**: Segment positions randomized for organic lightning appearance

### 3.8 UI Bar Rendering

**Health Bar**:
- Position: Top-left (player1) or top-right (player2)
- Background: Translucent dark gray box
- Foreground: Player color fill (left or right aligned)
- Label: Player name above/below
- Value: Current/max health display

**Energy Bar**:
- Position: Below health bar
- Color: Cyan/blue (electric energy)
- Similar layout

**Super Bar**:
- Position: Below energy bar
- Color: Golden/yellow when charged
- Effect: Pulsing glow when >= 80% charged
- Animation: Animated border when full (ready to use)

**Poise Bar**:
- Center position around fighter
- Small bar showing guard health
- Depletes on hits, regenerates when not hit
- Red when low/broken

### 3.9 Combat Information Display

**Combo Counter**:
- Position: Above player, centered
- Display: "Nx COMBO" when combo > 1
- Size scales with combo count
- Color: Yellow if combo > 2, else white

**Style Rank**:
- Position: Below combo counter
- Displays: Current rank letter (D/C/B/A/S) with color
- Color matches rank (gray/green/blue/purple/gold)

**Damage Text**:
- Floats upward from hit point
- Color: Red (normal), Yellow (combo), Gold (super)
- Scale: 1.2x for high combos
- Font: Bold, semi-transparent initially
- Lifetime: 50-70 frames

### 3.10 Announcements Display

**Function**: `drawAnnouncements(ctx, announcements) → void`

**Positioning**:
- Center of screen horizontally
- Upper-middle vertically (30-40% down)

**Format**:
- Large main text: Main event ("RAGE MODE!", "GUARD BREAK!")
- Smaller subtext: Related info (player name, etc.)
- Color: Announcement-specific (red, orange, gold, etc.)
- Font: Bold, large (40-60px for main)

**Lifetime**: Typically 60-120 frames

**Examples**:
- "🔥 RAGE MODE!" → Red, 90 frames
- "💀 GUARD BREAK!" → Orange, 80 frames
- "⭐ PERFECT!" → Gold, 120 frames

### 3.11 Phase-Specific Overlays

**Countdown**:
- Large countdown number (3, 2, 1, FIGHT!)
- Scales and fades as timer progresses

**Round End**:
- Winner announcement
- Match statistics display
- Round-by-round breakdown

**Game Over**:
- Final winner announcement
- Match summary
- Rematch prompt ("Press Enter for rematch")

### 3.12 Screen Effects

**Screen Flash**:
- White overlay covering full screen
- Opacity based on remaining flash frames: `alpha = screenFlash / 20`
- Blends via `globalAlpha`

**Screen Shake**:
- Applied before all game elements
- Canvas translation: `±(random * shake * 2)`
- Separate for X and Y

**Slowmo**: Applied during state update (skips physics on odd frames)

---

## 4. Input Manager Agent (`GameCanvas.tsx`)

### 4.1 Role & Responsibility
The **Input Manager Agent** aggregates player input from multiple sources (keyboard, touch, gamepad), normalizes it into the common `PlayerInput` interface, and delivers it to the game engine at consistent frame rate.

### 4.2 Input Sources

#### Keyboard Input
- Event listeners: `keydown` and `keyup`
- Stores boolean state in `keysRef.current`
- Supports both WASD and Arrow keys

#### Touch Input (Mobile)
- Joystick: Analog left stick for movement
- Buttons: Digital buttons for actions (punch, kick, block, etc.)
- Stored in `localInputRef.current`

#### Gamepad (Future)
- Not currently implemented
- Hook available for future expansion

### 4.3 Event Processing

**Keyboard Handler** (`handleKeyDown/Up`):
- Store key state in ref
- Special case: Enter key during gameOver triggers rematch

**Touch Handler** (`handleTouchInput`):
- Receives partial input from TouchControls component
- Merges into `localInputRef.current`
- Global function: `(window).__touchInput`

### 4.4 Input Building Pipeline

**Function**: `buildInput() → PlayerInput`

**Input Source Priority** (OR logic - any source triggers action):
```
left: keyboard[a/arrowleft] OR touch.left
right: keyboard[d/arrowright] OR touch.right
jump: keyboard[w/arrowup] OR touch.jump
crouch: keyboard[s/arrowdown] OR touch.crouch
punch: keyboard[j] OR touch.punch
kick: keyboard[k] OR touch.kick
uppercut: keyboard[u] OR touch.uppercut
block: keyboard[l] OR touch.block
fireball: keyboard[i] OR touch.fireball
lightning: keyboard[o] OR touch.lightning
teleport: keyboard[shift] OR touch.teleport
special: keyboard[space] OR touch.special
seq: seqRef.current++  [sequence number for ordering]
```

### 4.5 Input Transmission

**Frequency**: Throttled to ~30Hz (every 2 frames, ~33ms)

**Mechanism**:
- Accumulates input for ~33ms
- Sends complete input state to opponent
- Prevents network flooding
- Maintains playability with lower bandwidth

### 4.6 Sequence Numbering

**Purpose**: Detect packet loss and reordering in P2P communication

**Mechanism**:
- Each input includes `seq: seqRef.current++`
- Increments monotonically
- Receiver can detect gaps or duplicate handling

---

## 5. Touch Controls Agent (`TouchControls.tsx`)

### 5.1 Role & Responsibility
The **Touch Controls Agent** provides mobile-optimized input interface with glass-morphism styled analog joystick and digital action buttons, emitting normalized input events to the game engine.

### 5.2 Joystick Implementation

#### Joystick Layout
- Position: Bottom-left of screen
- Size: 140x140px (diameter)
- Background: Radial gradient with blur effect

#### Knob Tracking
- Inner knob dragged by touch
- Max radius: 56px (half-size minus knob)
- Normalized to [-1, 1] range per axis

#### Movement Mapping
```
dx > threshold (32px)  → right = true
dx < -threshold         → left = true
dy > threshold          → crouch = true
dy < -threshold         → jump = true
```

#### Touch Handling
- Single touch tracked per joystick instance
- Touch move updates position
- Touch end resets to center
- Isolated from other touches via `identifier` matching

### 5.3 Glass Button Design

**Visual Style**:
- Backdrop blur effect
- Semi-transparent background: `rgba(255,255,255,0.15)`
- Border: `rgba(255,255,255,0.25)`
- Active state: Brighter + scale 0.88
- Smooth transitions: 50ms duration

**Button States**:
- Released: Normal appearance
- Pressed: Brightened with inset shadow
- Visual feedback: Immediate scale change

### 5.4 Action Button Layout

**Right Side** (6 buttons):
- **Punch (J)**: Blue, top area
- **Kick (K)**: Orange, right area
- **Uppercut (U)**: Purple, left area
- **Block (L)**: Cyan, bottom-left
- **Special/Super (Space)**: Large center, gold
- **Powers**: Fireball (I), Lightning (O), Teleport (Shift) - top-right triangle

**Button Sizing**:
- Standard: 60px diameter
- Variable sizes based on importance

### 5.5 Touch Event Handling

**Prevention**:
- Touches prevented from page scroll
- `touchstart/touchmove/touchend` use `preventDefault()`
- `touchAction: 'none'` CSS property

**Isolation**:
- Each button independent
- Touch can trigger multiple buttons (multi-touch)
- Joystick separate from buttons (different touch ID)

### 5.6 Input Event Emission

**Mechanism**:
- Button press → `onInputChange({ buttonName: true })`
- Button release → `onInputChange({ buttonName: false })`
- Joystick movement → `onInputChange({ left/right/jump/crouch: boolean })`

**Integration**: Events merge with keyboard input via OR logic in `buildInput()`

---

## 6. Network Synchronization Protocol

### 6.1 Simulation Synchronization Strategy

#### Host Authority Model
- **Host**: Runs full simulation, authoritative game state
- **Guest**: Runs simulation locally, receives periodic state corrections

#### Input Exchange
- Both players send input to each other at ~30Hz
- Host integrates both inputs into simulation
- Guest also integrates both inputs, but can drift

#### State Reconciliation
- Host sends authoritative state every 3 frames (~50Hz)
- Guest receives state and replaces local copy
- Guest preserves particles/effects for visual smoothness
- Prevents cumulative drift from input prediction errors

### 6.2 Message Flow Diagram

```
Frame N:
  Player1 decides input → buildInput() → { type: 'input', input: {...} }
     ↓ (network)
  Player2 receives input
     ↓
  Player2 runs updateGame(state, input1, input2, ...)
     ↓
  Player2 updates local state
     ↓
  (Every 3 frames)
  Host sends authoritative state → { type: 'state', state: {...} }
     ↓ (network)
  Guest receives state
     ↓
  Guest replaces local state (keeps particles)
     ↓
Frame N+1: Repeat
```

### 6.3 Latency Hiding

**Input Prediction**: Guest predicts opponent's actions based on received input

**Frame Skipping**: When latency high, guest can skip physics on odd frames for smoother combat feel

**Extrapolation**: Simple linear extrapolation for projectiles if state updates lag

---

## 7. Game State Manager (Implicit in engine.ts)

### 7.1 State Lifecycle

**Creation**:
- `createInitialState()` generates fresh GameState
- Called at game start and on rematch

**Updates**:
- `updateGame()` produces new state every frame
- Immutable game state pattern: `stateRef.current = updateGame(...)`

**Persistence**: State preserved in `stateRef` across render cycles

**Reset**: `resetRound()` reinitializes fighter positions and resets AAA metrics

---

## 8. Audio System (Implicit/Hooks Available)

### 8.1 Audio Architecture
Currently not implemented, but hooks exist for:
- Sound effects for hits, blocks, power ups
- Music for different game phases
- Volume controls
- Platform-specific audio initialization

---

## 9. Integration Summary

### Data Flow

```
Player Input (Keyboard/Touch)
  ↓
Input Manager (buildInput)
  ↓
Network Manager (send input)
  ↓
Game Engine (updateGame)
  ↓
GameState
  ↓
Renderer (drawX)
  ↓
Canvas Output
```

### Module Dependencies

- **App** → Lobby, GameCanvas, TouchControls
- **GameCanvas** → Engine, Network, Renderer, TouchControls
- **Engine** ← Types, Constants
- **Network** ← Types
- **Renderer** ← Types, Constants

### Critical Paths

1. **Input → Engine**: ~0 ms (same frame)
2. **Engine → Render**: ~0 ms (same frame)
3. **Input → Network**: ~16 ms (next throttle cycle)
4. **Network → Remote Engine**: Network latency + ~16ms
5. **Remote Engine → Render**: ~0 ms (same frame)

---

## 10. Extensibility & Future Agents

### Proposed Agents

**Audio System**: Sound effect playback, music management, volume mixing

**Replay System**: Record/playback of input streams for match replay

**Ranking System**: ELO calculation, matchmaking, player statistics

**Analytics**: Game event tracking, heatmaps, performance metrics

**AI Opponent**: NPC fighter with input generation algorithm

---

**Document Version**: 1.0  
**Last Updated**: May 2026  
**Status**: Comprehensive Technical Reference
