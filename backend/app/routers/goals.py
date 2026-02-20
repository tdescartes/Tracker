import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.goal import FinancialGoal
from app.schemas.receipt import GoalCreate, GoalOut
from app.routers.auth import get_current_user
from app.services.financial_calculator import calculate_goal

router = APIRouter()


@router.get("/", response_model=list[GoalOut])
async def list_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(FinancialGoal).where(FinancialGoal.household_id == current_user.household_id)
    )
    goals = result.scalars().all()
    out = []
    for g in goals:
        calc = calculate_goal(
            target_price=float(g.target_amount),
            down_payment=float(g.saved_amount),
            monthly_contribution=float(g.monthly_contribution),
            loan_interest_rate=float(g.interest_rate or 0),
            loan_term_months=g.loan_term_months or 0,
        )
        goal_out = GoalOut.model_validate(g)
        goal_out.months_to_goal = calc["cash_strategy"]["months_to_wait"]
        goal_out.estimated_completion = calc["cash_strategy"]["completion_date"]
        goal_out.monthly_loan_payment = calc["loan_strategy"]["monthly_payment"]
        goal_out.total_interest = calc["loan_strategy"]["total_interest"]
        goal_out.insight = calc["insight"]
        out.append(goal_out)
    return out


@router.post("/", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
async def create_goal(
    data: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = FinancialGoal(household_id=current_user.household_id, **data.model_dump())
    db.add(goal)
    await db.flush()

    calc = calculate_goal(
        target_price=float(data.target_amount),
        down_payment=float(data.saved_amount),
        monthly_contribution=float(data.monthly_contribution),
        loan_interest_rate=float(data.interest_rate or 0),
        loan_term_months=data.loan_term_months or 0,
    )
    out = GoalOut.model_validate(goal)
    out.months_to_goal = calc["cash_strategy"]["months_to_wait"]
    out.estimated_completion = calc["cash_strategy"]["completion_date"]
    out.monthly_loan_payment = calc["loan_strategy"]["monthly_payment"]
    out.total_interest = calc["loan_strategy"]["total_interest"]
    out.insight = calc["insight"]
    return out


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.id == goal_id))
    goal = result.scalar_one_or_none()
    if not goal or goal.household_id != current_user.household_id:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
