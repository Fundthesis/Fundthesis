"""Biography helper functions for calculating XP, archetype, and achievements."""
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.core.database import db

# XP values matching frontend/src/data/ranks.ts
XP_VALUES = {
    "module_complete": 100,
    "mission_complete_beginner": 150,
    "mission_complete_intermediate": 250,
    "mission_complete_advanced": 400,
    "mission_complete_expert": 600,
    "mission_grade_S": 100,  # bonus
    "mission_grade_A": 50,  # bonus
    "trade_profitable": 10,
    "streak_3day": 50,
    "streak_7day": 150,
    "streak_30day": 500,
}

# Difficulty to XP mapping
DIFFICULTY_XP_MAP = {
    "easy": "mission_complete_beginner",
    "medium": "mission_complete_intermediate",
    "hard": "mission_complete_advanced",
    "expert": "mission_complete_expert",
}


async def calculate_user_xp(user_id: str) -> int:
    """Calculate total XP for a user from all activities."""
    total_xp = 0

    # 1. XP from completed missions
    try:
        mission_results = await db.missionresult.find_many(
            where={"userId": user_id}
        )

        for result in mission_results:
            # Base XP from difficulty
            difficulty_key = DIFFICULTY_XP_MAP.get(result.difficulty, "mission_complete_intermediate")
            total_xp += XP_VALUES.get(difficulty_key, 0)

            # Bonus XP from grade
            if result.grade == "S":
                total_xp += XP_VALUES["mission_grade_S"]
            elif result.grade == "A":
                total_xp += XP_VALUES["mission_grade_A"]
    except Exception as e:
        print(f"Error calculating mission XP: {e}")
        import traceback
        traceback.print_exc()

    # 2. XP from completed learning modules
    try:
        completed_modules = await db.usermoduleprogress.find_many(
            where={
                "userId": user_id,
                "completedAt": {"not": None}
            }
        )
        total_xp += len(completed_modules) * XP_VALUES["module_complete"]
    except Exception as e:
        print(f"Error calculating module XP: {e}")
        import traceback
        traceback.print_exc()

    # 3. XP from profitable trades (from mission results - simplified)
    # Note: We'll count missions with positive returns as having profitable trades
    try:
        mission_results = await db.missionresult.find_many(
            where={"userId": user_id}
        )

        profitable_mission_trades = 0
        for result in mission_results:
            # If mission had positive return and trades, count some as profitable
            if result.returnPercent > 0 and result.totalTrades > 0:
                # Estimate profitable trades based on return
                profitable_mission_trades += max(1, int(result.totalTrades * 0.5))

        total_xp += profitable_mission_trades * XP_VALUES["trade_profitable"]
    except Exception as e:
        print(f"Error calculating trade XP: {e}")
        import traceback
        traceback.print_exc()

    # 4. XP from streaks (daily activity)
    try:
        interactions = await db.usercontentinteraction.find_many(
            where={"userId": user_id},
            order={"interactedAt": "desc"},
            take=30  # Check last 30 days
        )

        if interactions:
            # Group by date
            dates = set()
            for interaction in interactions:
                if interaction.interactedAt:
                    date_key = interaction.interactedAt.date()
                    dates.add(date_key)

            # Calculate consecutive days
            if dates:
                sorted_dates = sorted(dates, reverse=True)
                streak = 1
                for i in range(1, len(sorted_dates)):
                    if (sorted_dates[i-1] - sorted_dates[i]).days == 1:
                        streak += 1
                    else:
                        break

                # Award streak bonuses
                if streak >= 30:
                    total_xp += XP_VALUES["streak_30day"]
                elif streak >= 7:
                    total_xp += XP_VALUES["streak_7day"]
                elif streak >= 3:
                    total_xp += XP_VALUES["streak_3day"]
    except Exception as e:
        print(f"Error calculating streak XP: {e}")
        import traceback
        traceback.print_exc()

    return total_xp


async def calculate_user_xp_breakdown(user_id: str) -> Dict:
    """Calculate XP with breakdown by source."""
    breakdown = {
        "modules": 0,
        "missions": 0,
        "mission_grades": 0,
        "trades": 0,
        "streaks": 0,
        "total": 0,
    }

    # 1. XP from completed missions
    try:
        mission_results = await db.missionresult.find_many(
            where={"userId": user_id}
        )

        for result in mission_results:
            # Base XP from difficulty
            difficulty_key = DIFFICULTY_XP_MAP.get(result.difficulty, "mission_complete_intermediate")
            mission_xp = XP_VALUES.get(difficulty_key, 0)
            breakdown["missions"] += mission_xp

            # Bonus XP from grade
            if result.grade == "S":
                breakdown["mission_grades"] += XP_VALUES["mission_grade_S"]
            elif result.grade == "A":
                breakdown["mission_grades"] += XP_VALUES["mission_grade_A"]
    except Exception as e:
        print(f"Error calculating mission XP breakdown: {e}")

    # 2. XP from completed learning modules
    try:
        completed_modules = await db.usermoduleprogress.find_many(
            where={
                "userId": user_id,
                "completedAt": {"not": None}
            }
        )
        breakdown["modules"] = len(completed_modules) * XP_VALUES["module_complete"]
    except Exception as e:
        print(f"Error calculating module XP breakdown: {e}")

    # 3. XP from profitable trades
    try:
        mission_results = await db.missionresult.find_many(
            where={"userId": user_id}
        )

        profitable_mission_trades = 0
        for result in mission_results:
            if result.returnPercent > 0 and result.totalTrades > 0:
                profitable_mission_trades += max(1, int(result.totalTrades * 0.5))

        breakdown["trades"] = profitable_mission_trades * XP_VALUES["trade_profitable"]
    except Exception as e:
        print(f"Error calculating trade XP breakdown: {e}")

    # 4. XP from streaks
    try:
        interactions = await db.usercontentinteraction.find_many(
            where={"userId": user_id},
            order={"interactedAt": "desc"},
            take=30
        )

        if interactions:
            dates = set()
            for interaction in interactions:
                if interaction.interactedAt:
                    date_key = interaction.interactedAt.date()
                    dates.add(date_key)

            if dates:
                sorted_dates = sorted(dates, reverse=True)
                streak = 1
                for i in range(1, len(sorted_dates)):
                    if (sorted_dates[i-1] - sorted_dates[i]).days == 1:
                        streak += 1
                    else:
                        break

                # Award streak bonuses (only highest)
                if streak >= 30:
                    breakdown["streaks"] = XP_VALUES["streak_30day"]
                elif streak >= 7:
                    breakdown["streaks"] = XP_VALUES["streak_7day"]
                elif streak >= 3:
                    breakdown["streaks"] = XP_VALUES["streak_3day"]
    except Exception as e:
        print(f"Error calculating streak XP breakdown: {e}")

    breakdown["total"] = (
        breakdown["modules"] +
        breakdown["missions"] +
        breakdown["mission_grades"] +
        breakdown["trades"] +
        breakdown["streaks"]
    )

    return breakdown


async def determine_user_archetype(user_id: str) -> str:
    """Determine user's investor archetype based on trading behavior."""
    try:
        # Get all trades from simulation accounts
        accounts = await db.simulationaccount.find_many(
            where={"userId": user_id},
            include={"trades": True}
        )

        all_trades = []
        for account in accounts:
            if hasattr(account, "trades"):
                all_trades.extend(account.trades)

        # Get mission results for additional behavior data
        mission_results = await db.missionresult.find_many(
            where={"userId": user_id}
        )

        # Get positions for diversification (via accounts)
        account_ids = [acc.id for acc in accounts] if accounts else []
        positions = []
        if account_ids:
            positions = await db.position.find_many(
                where={"accountId": {"in": account_ids}}
            )

        # Get article interactions for news reactivity
        article_interactions = await db.usercontentinteraction.find_many(
            where={
                "userId": user_id,
                "contentType": "article"
            }
        )

        # Calculate metrics
        # 1. Average holding period (from trades)
        avg_holding_days = 0
        if len(all_trades) >= 2:
            buy_trades = [t for t in all_trades if t.side == "buy" and t.executedAt]
            sell_trades = [t for t in all_trades if t.side == "sell" and t.executedAt]
            
            if buy_trades and sell_trades:
                holding_periods = []
                for buy in buy_trades:
                    for sell in sell_trades:
                        if buy.ticker == sell.ticker and buy.executedAt and sell.executedAt:
                            days = (sell.executedAt - buy.executedAt).days
                            if days > 0:
                                holding_periods.append(days)
                                break  # Match one sell per buy
                if holding_periods:
                    avg_holding_days = sum(holding_periods) / len(holding_periods)

        # 2. Trade frequency (trades per week)
        trade_frequency = 0
        if all_trades and len(all_trades) > 0:
            trades_with_dates = [t for t in all_trades if t.executedAt]
            if trades_with_dates:
                first_trade = min(trades_with_dates, key=lambda t: t.executedAt)
                last_trade = max(trades_with_dates, key=lambda t: t.executedAt)
                if first_trade and last_trade and first_trade.executedAt and last_trade.executedAt:
                    weeks = max(1, (last_trade.executedAt - first_trade.executedAt).days / 7)
                    trade_frequency = min(100, (len(all_trades) / weeks) * 10)  # Scale to 0-100

        # 3. Volatility tolerance (from max drawdown in missions)
        volatility_tolerance = 50  # Default
        if mission_results:
            max_drawdowns = [r.maxDrawdown for r in mission_results if r.maxDrawdown]
            if max_drawdowns:
                avg_drawdown = sum(max_drawdowns) / len(max_drawdowns)
                # Higher drawdown = higher tolerance (inverted, scaled)
                volatility_tolerance = min(100, max(0, (avg_drawdown * 100) / 50))

        # 4. Diversification score (unique tickers)
        unique_tickers = len(set(p.ticker for p in positions))
        diversification_score = min(100, unique_tickers * 20)  # 5+ tickers = 100

        # 5. News reactivity (article interactions per week)
        news_reactivity = 0
        if article_interactions:
            first_interaction = min(
                (i for i in article_interactions if i.interactedAt),
                key=lambda i: i.interactedAt,
                default=None
            )
            last_interaction = max(
                (i for i in article_interactions if i.interactedAt),
                key=lambda i: i.interactedAt,
                default=None
            )
            if first_interaction and last_interaction:
                weeks = max(1, (last_interaction.interactedAt - first_interaction.interactedAt).days / 7)
                news_reactivity = min(100, (len(article_interactions) / weeks) * 5)

        # Use archetype determination logic (matching frontend/src/data/archetypes.ts)
        scores = [
            {
                "archetypeId": "value-veronica",
                "score": avg_holding_days * 2 + (100 - trade_frequency) + diversification_score,
            },
            {
                "archetypeId": "risky-randy",
                "score": volatility_tolerance * 2 + trade_frequency + (100 - diversification_score),
            },
            {
                "archetypeId": "saver-steve",
                "score": (100 - volatility_tolerance) * 2 + diversification_score + (100 - trade_frequency),
            },
            {
                "archetypeId": "trend-tina",
                "score": trade_frequency + volatility_tolerance + (100 - avg_holding_days),
            },
            {
                "archetypeId": "news-nina",
                "score": news_reactivity * 3 + trade_frequency,
            },
        ]

        scores.sort(key=lambda x: x["score"], reverse=True)
        return scores[0]["archetypeId"]

    except Exception as e:
        print(f"Error determining archetype: {e}")
        # Default to first archetype
        return "value-veronica"


async def check_user_achievements(user_id: str) -> List[str]:
    """Check and return list of earned achievement IDs."""
    earned = []

    try:
        # Get user's trades
        accounts = await db.simulationaccount.find_many(
            where={"userId": user_id}
        )
        account_ids = [acc.id for acc in accounts]
        all_trades = []
        if account_ids:
            all_trades = await db.trade.find_many(
                where={"accountId": {"in": account_ids}}
            )

        # Get positions for diversification
        positions = []
        if account_ids:
            positions = await db.position.find_many(
                where={"accountId": {"in": account_ids}}
            )

        # Get mission results
        mission_results = await db.missionresult.find_many(
            where={"userId": user_id}
        )

        # Get completed modules
        completed_modules = await db.usermoduleprogress.find_many(
            where={
                "userId": user_id,
                "completedAt": {"not": None}
            }
        )

        # Get interactions for streaks and mentor chats
        interactions = await db.usercontentinteraction.find_many(
            where={"userId": user_id}
        )

        # Check each achievement
        # 1. First Trade
        if len(all_trades) > 0:
            earned.append("first-trade")

        # 2. Diversified Portfolio (5+ unique tickers)
        unique_tickers = len(set(p.ticker for p in positions))
        if unique_tickers >= 5:
            earned.append("diversified")

        # 3. Profit milestones
        total_profit = 0
        for result in mission_results:
            if hasattr(result, "finalBalance") and hasattr(result, "initialBalance"):
                profit = result.finalBalance - result.initialBalance
                total_profit += profit

        if total_profit >= 100:
            earned.append("profit-100")

        # 4. Module completion
        if len(completed_modules) >= 10:  # Assuming 10 modules total
            earned.append("module-master")

        # 5. Mission completion
        if len(mission_results) >= 1:
            earned.append("mission-1")
        if len(mission_results) >= 5:
            earned.append("mission-5")
        if len(mission_results) >= 10:  # Assuming 10 missions total
            earned.append("mission-all")

        # 6. Streaks
        if interactions:
            dates = set()
            for interaction in interactions:
                if interaction.interactedAt:
                    dates.add(interaction.interactedAt.date())

            if dates:
                sorted_dates = sorted(dates, reverse=True)
                streak = 1
                for i in range(1, len(sorted_dates)):
                    if (sorted_dates[i-1] - sorted_dates[i]).days == 1:
                        streak += 1
                    else:
                        break

                if streak >= 7:
                    earned.append("streak-7")
                if streak >= 30:
                    earned.append("streak-30")

        # 7. No loss mission
        for result in mission_results:
            if hasattr(result, "maxDrawdown") and result.maxDrawdown == 0:
                earned.append("no-loss")
                break

        # 8. Grade S
        for result in mission_results:
            if hasattr(result, "grade") and result.grade == "S":
                earned.append("grade-s")
                break

        # 9. Mentor chats (coach queries)
        coach_queries = [i for i in interactions if i.contentType == "coach_query"]
        if len(coach_queries) >= 10:
            earned.append("mentor-chat")

    except Exception as e:
        print(f"Error checking achievements: {e}")

    return earned


async def get_user_biography_data(user_id: str) -> Dict:
    """Get complete biography data for a user."""
    # Calculate XP with breakdown
    xp_breakdown = await calculate_user_xp_breakdown(user_id)
    total_xp = xp_breakdown["total"]

    # Determine archetype
    archetype_id = await determine_user_archetype(user_id)

    # Check achievements
    achievements = await check_user_achievements(user_id)

    # Calculate rank (matching frontend logic)
    ranks = [
        {"level": 1, "title": "Novice", "requiredXP": 0},
        {"level": 2, "title": "Apprentice", "requiredXP": 500},
        {"level": 3, "title": "Analyst", "requiredXP": 1500},
        {"level": 4, "title": "Strategist", "requiredXP": 3500},
        {"level": 5, "title": "Portfolio Manager", "requiredXP": 7000},
        {"level": 6, "title": "Market Master", "requiredXP": 15000},
    ]

    # Find current rank
    current_rank = ranks[0]
    for rank in sorted(ranks, key=lambda r: r["requiredXP"], reverse=True):
        if total_xp >= rank["requiredXP"]:
            current_rank = rank
            break

    # Find next rank
    next_rank = None
    for rank in ranks:
        if rank["level"] == current_rank["level"] + 1:
            next_rank = rank
            break

    # Calculate progress
    if next_rank:
        xp_in_current = total_xp - current_rank["requiredXP"]
        xp_needed = next_rank["requiredXP"] - current_rank["requiredXP"]
        progress = min(100, round((xp_in_current / xp_needed) * 100)) if xp_needed > 0 else 100
    else:
        progress = 100

    return {
        "xp": total_xp,
        "xpBreakdown": xp_breakdown,
        "archetype": archetype_id,
        "achievements": achievements,
        "rank": current_rank,
        "nextRank": next_rank,
        "progress": progress,
    }

