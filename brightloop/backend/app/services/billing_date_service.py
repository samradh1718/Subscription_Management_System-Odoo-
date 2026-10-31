from datetime import datetime
from dateutil.relativedelta import relativedelta

def calculate_next_billing_date(anchor_date: datetime, interval_unit: str, interval_count: int) -> datetime:
    """Deterministically calculates the next billing date from an anchor."""
    if interval_unit == "daily":
        delta = relativedelta(days=interval_count)
    elif interval_unit == "weekly":
        delta = relativedelta(weeks=interval_count)
    elif interval_unit == "monthly":
        delta = relativedelta(months=interval_count)
    elif interval_unit == "yearly":
        delta = relativedelta(years=interval_count)
    else:
        raise ValueError(f"Unsupported interval unit: {interval_unit}")
    
    return anchor_date + delta