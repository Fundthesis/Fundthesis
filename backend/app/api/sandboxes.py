"""Sandbox (SimulationAccount) API endpoints for trading simulation."""
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from decimal import Decimal
import traceback
from datetime import datetime

# Add backend to path
backend_path = Path(__file__).parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.api.dependencies import get_current_user
from app.core.auth import AuthenticatedUser
from app.core.database import db
from prisma import Json

router = APIRouter()


class SandboxCreate(BaseModel):
    name: str
    balance: float


class SandboxUpdate(BaseModel):
    name: Optional[str] = None
    balance: Optional[float] = None
    watchedStocks: Optional[List[str]] = None


class TradeRequest(BaseModel):
    ticker: str
    side: str  # 'buy' or 'sell'
    price: float
    quantity: float


class PositionResponse(BaseModel):
    id: str
    ticker: str
    quantity: float
    avgPrice: float
    createdAt: Optional[datetime] = None


class TradeResponse(BaseModel):
    id: str
    ticker: str
    side: str
    price: float
    quantity: float
    executedAt: Optional[datetime] = None


class SandboxResponse(BaseModel):
    id: str
    name: str
    balance: float
    settings: Optional[Dict[str, Any]] = None
    createdAt: datetime
    positions: List[PositionResponse] = []
    trades: List[TradeResponse] = []


@router.get("/sandboxes", response_model=List[SandboxResponse])
async def list_sandboxes(user: AuthenticatedUser = Depends(get_current_user)):
    """List all sandboxes for the current user."""
    try:
        accounts = await db.simulationaccount.find_many(
            where={"userId": user.id},
            include={
                "positions": True,
                "trades": True,
            },
            order={"createdAt": "desc"},
        )

        result = []
        for account in accounts:
            settings = account.settings if isinstance(account.settings, dict) else {}
            # Sort trades by executedAt descending and limit to 100 most recent
            sorted_trades = sorted(
                account.trades,
                key=lambda t: t.executedAt if t.executedAt else datetime.min,
                reverse=True
            )[:100]
            result.append(
                SandboxResponse(
                    id=account.id,
                    name=account.name,
                    balance=float(account.balance),
                    settings=settings,
                    createdAt=account.createdAt,
                    positions=[
                        PositionResponse(
                            id=p.id,
                            ticker=p.ticker,
                            quantity=float(p.quantity),
                            avgPrice=float(p.avgPrice),
                            createdAt=p.createdAt,
                        )
                        for p in account.positions
                    ],
                    trades=[
                        TradeResponse(
                            id=t.id,
                            ticker=t.ticker,
                            side=t.side,
                            price=float(t.price),
                            quantity=float(t.quantity),
                            executedAt=t.executedAt,
                        )
                        for t in sorted_trades
                    ],
                )
            )

        return result
    except Exception as e:
        print(f"❌ Error listing sandboxes: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sandboxes", response_model=SandboxResponse)
async def create_sandbox(
    data: SandboxCreate, user: AuthenticatedUser = Depends(get_current_user)
):
    """Create a new sandbox."""
    try:
        account = await db.simulationaccount.create(
            data={
                "userId": user.id,
                "name": data.name,
                "balance": Decimal(str(data.balance)),
                "settings": Json({}),
            }
        )

        return SandboxResponse(
            id=account.id,
            name=account.name,
            balance=float(account.balance),
            settings={},
            createdAt=account.createdAt,
            positions=[],
            trades=[],
        )
    except Exception as e:
        print(f"❌ Error creating sandbox: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sandboxes/{sandbox_id}", response_model=SandboxResponse)
async def get_sandbox(
    sandbox_id: str, user: AuthenticatedUser = Depends(get_current_user)
):
    """Get a specific sandbox with positions and trades."""
    try:
        account = await db.simulationaccount.find_first(
            where={"id": sandbox_id, "userId": user.id},
            include={
                "positions": True,
                "trades": True,
            },
        )

        if not account:
            raise HTTPException(status_code=404, detail="Sandbox not found")

        settings = account.settings if isinstance(account.settings, dict) else {}
        
        # Sort trades by executedAt descending
        sorted_trades = sorted(
            account.trades,
            key=lambda t: t.executedAt if t.executedAt else datetime.min,
            reverse=True
        )

        return SandboxResponse(
            id=account.id,
            name=account.name,
            balance=float(account.balance),
            settings=settings,
            createdAt=account.createdAt,
            positions=[
                PositionResponse(
                    id=p.id,
                    ticker=p.ticker,
                    quantity=float(p.quantity),
                    avgPrice=float(p.avgPrice),
                    createdAt=p.createdAt,
                )
                for p in account.positions
            ],
            trades=[
                TradeResponse(
                    id=t.id,
                    ticker=t.ticker,
                    side=t.side,
                    price=float(t.price),
                    quantity=float(t.quantity),
                    executedAt=t.executedAt,
                )
                for t in sorted_trades
            ],
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error fetching sandbox: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/sandboxes/{sandbox_id}", response_model=SandboxResponse)
async def update_sandbox(
    sandbox_id: str,
    data: SandboxUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Update a sandbox (name, balance, or watched stocks)."""
    try:
        # Verify ownership
        account = await db.simulationaccount.find_first(
            where={"id": sandbox_id, "userId": user.id}
        )

        if not account:
            raise HTTPException(status_code=404, detail="Sandbox not found")

        update_data: Dict[str, Any] = {}

        if data.name is not None:
            update_data["name"] = data.name

        if data.balance is not None:
            update_data["balance"] = Decimal(str(data.balance))

        if data.watchedStocks is not None:
            current_settings = (
                account.settings if isinstance(account.settings, dict) else {}
            )
            current_settings["watchedStocks"] = data.watchedStocks
            update_data["settings"] = Json(current_settings)

        if not update_data:
            # Return current account if no updates
            account = await db.simulationaccount.find_first(
                where={"id": sandbox_id},
                include={"positions": True, "trades": True},
            )
        else:
            account = await db.simulationaccount.update(
                where={"id": sandbox_id}, data=update_data
            )
            # Reload with relations
            account = await db.simulationaccount.find_first(
                where={"id": sandbox_id},
                include={"positions": True, "trades": True},
            )

        settings = account.settings if isinstance(account.settings, dict) else {}
        
        # Sort trades by executedAt descending
        sorted_trades = sorted(
            account.trades,
            key=lambda t: t.executedAt if t.executedAt else datetime.min,
            reverse=True
        )

        return SandboxResponse(
            id=account.id,
            name=account.name,
            balance=float(account.balance),
            settings=settings,
            createdAt=account.createdAt,
            positions=[
                PositionResponse(
                    id=p.id,
                    ticker=p.ticker,
                    quantity=float(p.quantity),
                    avgPrice=float(p.avgPrice),
                    createdAt=p.createdAt,
                )
                for p in account.positions
            ],
            trades=[
                TradeResponse(
                    id=t.id,
                    ticker=t.ticker,
                    side=t.side,
                    price=float(t.price),
                    quantity=float(t.quantity),
                    executedAt=t.executedAt,
                )
                for t in sorted_trades
            ],
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error updating sandbox: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/sandboxes/{sandbox_id}")
async def delete_sandbox(
    sandbox_id: str, user: AuthenticatedUser = Depends(get_current_user)
):
    """Delete a sandbox."""
    try:
        # Verify ownership
        account = await db.simulationaccount.find_first(
            where={"id": sandbox_id, "userId": user.id}
        )

        if not account:
            raise HTTPException(status_code=404, detail="Sandbox not found")

        await db.simulationaccount.delete(where={"id": sandbox_id})

        return {"message": "Sandbox deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting sandbox: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sandboxes/{sandbox_id}/trades", response_model=TradeResponse)
async def execute_trade(
    sandbox_id: str,
    trade: TradeRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Execute a trade (buy or sell) and update positions."""
    try:
        # Verify ownership
        account = await db.simulationaccount.find_first(
            where={"id": sandbox_id, "userId": user.id},
            include={"positions": True},
        )

        if not account:
            raise HTTPException(status_code=404, detail="Sandbox not found")

        total_cost = Decimal(str(trade.price * trade.quantity))

        if trade.side.lower() == "buy":
            # Check if user has enough cash
            if total_cost > account.balance:
                raise HTTPException(
                    status_code=400, detail="Insufficient funds for this trade"
                )

            # Update balance
            new_balance = account.balance - total_cost

            # Update or create position
            existing_position = next(
                (p for p in account.positions if p.ticker == trade.ticker), None
            )

            if existing_position:
                # Update existing position
                new_quantity = existing_position.quantity + Decimal(str(trade.quantity))
                new_avg_price = (
                    existing_position.quantity * existing_position.avgPrice
                    + total_cost
                ) / new_quantity

                await db.position.update(
                    where={"id": existing_position.id},
                    data={
                        "quantity": new_quantity,
                        "avgPrice": new_avg_price,
                    },
                )
            else:
                # Create new position
                await db.position.create(
                    data={
                        "accountId": sandbox_id,
                        "ticker": trade.ticker,
                        "quantity": Decimal(str(trade.quantity)),
                        "avgPrice": Decimal(str(trade.price)),
                    }
                )

            # Update account balance
            await db.simulationaccount.update(
                where={"id": sandbox_id}, data={"balance": new_balance}
            )

        elif trade.side.lower() == "sell":
            # Check if user has enough shares
            existing_position = next(
                (p for p in account.positions if p.ticker == trade.ticker), None
            )

            if not existing_position:
                raise HTTPException(
                    status_code=400, detail="No position found for this ticker"
                )

            if Decimal(str(trade.quantity)) > existing_position.quantity:
                raise HTTPException(
                    status_code=400, detail="Insufficient shares for this trade"
                )

            # Update balance
            new_balance = account.balance + total_cost

            # Update position
            new_quantity = existing_position.quantity - Decimal(str(trade.quantity))

            if new_quantity <= 0:
                # Delete position if quantity is zero
                await db.position.delete(where={"id": existing_position.id})
            else:
                # Update position (avgPrice stays the same)
                await db.position.update(
                    where={"id": existing_position.id},
                    data={"quantity": new_quantity},
                )

            # Update account balance
            await db.simulationaccount.update(
                where={"id": sandbox_id}, data={"balance": new_balance}
            )

        else:
            raise HTTPException(
                status_code=400, detail="Trade side must be 'buy' or 'sell'"
            )

        # Create trade record
        trade_record = await db.trade.create(
            data={
                "accountId": sandbox_id,
                "ticker": trade.ticker,
                "side": trade.side.lower(),
                "price": Decimal(str(trade.price)),
                "quantity": Decimal(str(trade.quantity)),
            }
        )

        return TradeResponse(
            id=trade_record.id,
            ticker=trade_record.ticker,
            side=trade_record.side,
            price=float(trade_record.price),
            quantity=float(trade_record.quantity),
            executedAt=trade_record.executedAt,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error executing trade: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

