from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.models.subscription import Subscription, SubscriptionEvent

VALID_TRANSITIONS = {
    "Draft": ["Pending Confirmation"],
    "Pending Confirmation": ["Active", "Cancelled"],
    "Active": ["Paused", "Past Due", "Cancellation Scheduled"],
    "Paused": ["Active", "Cancelled"],
    "Past Due": ["Active", "Cancelled"],
    "Cancellation Scheduled": ["Cancelled", "Active"]
}

def transition_subscription(
    db: Session, 
    subscription: Subscription, 
    new_status: str, 
    actor_id: str, 
    reason: str = None
) -> Subscription:
    """Safely transitions a subscription and records the audit event."""
    current_status = subscription.status

    if new_status not in VALID_TRANSITIONS.get(current_status, []):
        raise ValueError(f"Invalid transition from {current_status} to {new_status}")

    # Append event trail
    event = SubscriptionEvent(
        subscription_id=subscription.id,
        previous_status=current_status,
        new_status=new_status,
        actor_id=actor_id,
        reason=reason,
        created_at=datetime.now(timezone.utc)
    )
    
    subscription.status = new_status
    db.add(event)
    db.add(subscription)
    db.commit()
    
    return subscription