# Mission System

The Mission System is an interactive educational feature that allows users to practice investing in simulated historical market scenarios. Users read news, analyze market conditions, and make trading decisions to learn investing fundamentals through hands-on experience.

## Table of Contents

- [Overview](#overview)
- [Difficulty Levels](#difficulty-levels)
- [Mission Flow](#mission-flow)
- [Components Architecture](#components-architecture)
- [News System](#news-system)
- [Grading System](#grading-system)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)

---

## Overview

Missions simulate historical market events (e.g., 2008 Financial Crisis, COVID-19 Pandemic, Inflation periods) where users must:

1. **Build a portfolio** - Select stocks to invest in before the simulation starts
2. **Read news** - Analyze market news as events unfold day-by-day
3. **Make trades** - Buy/sell stocks based on their analysis
4. **Get graded** - Receive a performance grade and behavioral analysis

The key educational principle: **Users must read and interpret news themselves** - the system doesn't tell them what to do.

---

## Difficulty Levels

The difficulty system controls how much "help" users get in interpreting market conditions:

### Easy (Beginner)
- **Duration**: 90 days
- **News clarity**: Obvious hints
- **Visual aids**: 
  - 📈/📉 indicators on news articles
  - Color-coded news (green = positive, red = negative)
  - Market trend labels shown (bullish/bearish)
  - Phase colors on timeline
  - Affected sectors displayed
- **Grade bonus**: 0%

### Medium (Intermediate)  
- **Duration**: 60 days
- **News clarity**: Mixed signals
- **Visual aids**:
  - Color-coded news (but no 📈/📉 indicators)
  - Affected sectors displayed
  - No market trend labels
- **Conflicting news**: 20% chance
- **Grade bonus**: +5%

### Hard (Expert)
- **Duration**: 45 days
- **News clarity**: Conflicting/misleading
- **Visual aids**:
  - All news appears neutral (gray)
  - No affected sectors shown
  - No market trends visible
  - Must read article text to determine impact
- **Conflicting news**: 40% chance
- **Fake-out news**: 25% chance (news says positive but effect is negative)
- **Grade bonus**: +15%

---

## Mission Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Pre-Build     │────▶│   Simulation    │────▶│    Debrief      │
│                 │     │                 │     │                 │
│ • Select stocks │     │ • Time passes   │     │ • Grade shown   │
│ • Choose        │     │ • News appears  │     │ • Behavior      │
│   difficulty    │     │ • Make trades   │     │   analysis      │
│ • Set allocation│     │ • Watch prices  │     │ • Save results  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Phase 1: Pre-Build
- User starts with empty portfolio and $100,000 cash
- Must buy at least one stock before starting
- Can preview news events that will occur (without spoilers)
- Select difficulty level (Easy/Medium/Hard)

### Phase 2: Simulation
- Time advances automatically (controllable speed: 1x, 2x, 4x, 8x)
- News articles appear as events unfold
- User can buy/sell stocks at any time
- Portfolio value tracked in real-time
- Fail condition: Portfolio drops below threshold (usually -30%)

### Phase 3: Debrief
- Final grade calculated (S/A/B/C/F)
- Behavioral analysis:
  - Panic Selling detection
  - FOMO Trading detection
  - Overtrading detection
  - Concentration Risk analysis
- Results saved to database
- Option to replay or try next mission

---

## Components Architecture

```
src/
├── app/missions/
│   └── simulation/
│       └── page.tsx              # Main page orchestrating phases
│
├── components/missions/
│   ├── MissionPreBuild.tsx       # Portfolio building phase
│   ├── MissionSimulatorV2.tsx    # Main simulation component
│   ├── MissionDebrief.tsx        # Results and analysis
│   ├── MissionSimulationControls.tsx  # Play/pause controls
│   ├── MissionMarketChart.tsx    # Stock price charts
│   ├── MissionHoldingsEnhanced.tsx    # Portfolio display
│   ├── MissionNewsFeed.tsx       # News article display
│   └── MissionTimeline.tsx       # Day progression
│
├── lib/
│   ├── types/mission.ts          # TypeScript interfaces
│   ├── missionSimulation.ts      # Core simulation logic
│   └── missionNewsEvents.ts      # News event data
│
└── data/
    └── missions.ts               # Mission definitions
```

### Key Types (`lib/types/mission.ts`)

```typescript
type MissionDifficultyLevel = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  level: MissionDifficultyLevel;
  label: string;
  newsClarity: 'obvious' | 'mixed' | 'conflicting';
  conflictingNewsChance: number;
  fakeOutChance: number;
  timePressure: number; // Days to complete
  gradeBonus: number;
}

interface MissionTrade {
  id: string;
  day: number;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: Date;
}

type MissionGrade = 'S' | 'A' | 'B' | 'C' | 'F';
```

---

## News System

### How News Works

1. **Scenario-based events**: Each mission scenario has predefined news events
2. **Difficulty modification**: Events are modified based on difficulty:
   - Easy: Adds hints like "📈 This is good for tech stocks!"
   - Hard: Adds conflicting/misleading news
3. **Real-time appearance**: News appears as simulation days pass
4. **Impact on prices**: News affects stock prices based on affected sectors

### News Event Structure

```typescript
interface NewsEvent {
  id: string;
  day: number;
  headline: string;
  summary: string;
  source: string;
  impact: 'positive' | 'negative' | 'neutral';
  affectedSectors: string[];
  affectedSymbols?: string[];
  priceMultiplier: number;
  isBreaking?: boolean;
}
```

### Difficulty-Aware News Functions

```typescript
// Get all news for a scenario with difficulty modifications
getNewsEventsForDifficulty(scenario: string, difficulty: MissionDifficultyLevel)

// Get events triggered on a specific day
getEventsOnDayForDifficulty(scenario: string, day: number, difficulty: MissionDifficultyLevel)

// Get triggered events up to current day
getTriggeredEventsForDifficulty(scenario: string, day: number, difficulty: MissionDifficultyLevel)
```

---

## Grading System

### Grade Calculation

Grades are based on:
1. **Return percentage** - How much profit/loss
2. **Max drawdown** - Worst portfolio decline
3. **Diversification score** - How spread out investments were
4. **Win/fail conditions** - Scenario-specific targets

### Grade Thresholds

| Grade | Requirements |
|-------|-------------|
| S | Return ≥ 20% AND drawdown < 10% AND diversified |
| A | Return ≥ 10% AND drawdown < 15% |
| B | Return ≥ 5% AND drawdown < 20% |
| C | Return ≥ 0% (no loss) |
| F | Return < 0% OR exceeded fail threshold |

### Difficulty Bonus

Final grade gets bonus points based on difficulty:
- Easy: +0%
- Medium: +5%
- Hard: +15%

---

## Database Schema

### MissionResult Model (Prisma)

```prisma
model MissionResult {
  id              String   @id @default(cuid())
  userId          String
  missionId       String
  grade           String   // S, A, B, C, F
  difficulty      String   // easy, medium, hard
  returnPercent   Float
  maxDrawdown     Float
  initialBalance  Float
  finalBalance    Float
  durationDays    Int
  totalTrades     Int
  trades          Json     // Array of MissionTrade
  portfolioHistory Json    // Array of PortfolioSnapshot
  completedAt     DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id])
  
  @@index([userId])
  @@index([missionId])
}
```

---

## API Endpoints

### Save Mission Result

```
POST /api/mission/results
```

**Request Body:**
```json
{
  "missionId": "mission-1",
  "grade": "A",
  "difficulty": "medium",
  "returnPercent": 12.5,
  "maxDrawdown": 8.2,
  "initialBalance": 100000,
  "finalBalance": 112500,
  "durationDays": 60,
  "totalTrades": 15,
  "trades": [...],
  "portfolioHistory": [...]
}
```

### Get Mission History

```
GET /api/mission/results?missionId=optional&limit=50
```

**Response:**
```json
{
  "results": [...],
  "stats": {
    "totalCompleted": 5,
    "averageGrade": "B",
    "bestGrade": "S",
    "totalReturn": 45.2
  }
}
```

---

## Available Scenarios

| ID | Name | Description |
|----|------|-------------|
| `crash-2008` | 2008 Financial Crisis | Navigate the banking collapse |
| `pandemic` | COVID-19 Pandemic | Handle the 2020 market crash and recovery |
| `inflation` | Inflation Surge | Manage portfolio during high inflation |
| `tariff` | Trade War | React to tariff announcements |
| `neutral` | Bull Market | Standard market conditions |

---

## Development Notes

### Running Locally

1. Start the frontend: `npm run dev` (from Frontend/)
2. Start the backend: `uvicorn main:app --reload` (from backend/)
3. Navigate to `/missions` to see available missions
4. Click a mission card to start

### Adding New Scenarios

1. Add scenario config to `lib/missionSimulation.ts` in `SCENARIO_CONFIGS`
2. Add news events to `lib/missionNewsEvents.ts`
3. Add conflicting news for hard mode in `CONFLICTING_NEWS`
4. Add easy mode hints in `EASY_MODE_HINTS`
5. Create mission entry in `data/missions.ts`

### Testing Difficulty

- Set difficulty to "easy" → Should see 📈/📉 and color-coded news
- Set difficulty to "hard" → All news should appear gray, no hints
- Verify no "upcoming events" are ever shown (player shouldn't know the future)
