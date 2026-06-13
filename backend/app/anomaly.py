import math
from typing import List, Tuple

def calculate_meeting_cost(duration_hours: float, hourly_rates: List[float]) -> float:
    """
    Calculates the financial cost of a meeting.
    Cost = Meeting Duration (Hours) * Sum of Attendees' Hourly Rates.
    """
    return round(duration_hours * sum(hourly_rates), 2)

def detect_anomaly(current_cost: float, historical_costs: List[float]) -> Tuple[float, bool]:
    """
    Applies the Z-score anomaly detection algorithm:
    Z = (x - mean) / std_dev
    Flags as anomaly if absolute Z-score > 2.0.
    Returns: (z_score, is_anomaly)
    """
    # If there are not enough historical data points to establish a distribution, don't flag anomalies
    if not historical_costs or len(historical_costs) < 3:
        return 0.0, False

    mean = sum(historical_costs) / len(historical_costs)
    
    # Calculate standard deviation
    variance = sum((x - mean) ** 2 for x in historical_costs) / len(historical_costs)
    std_dev = math.sqrt(variance)
    
    if std_dev == 0.0:
        return 0.0, False

    z_score = (current_cost - mean) / std_dev
    is_anomaly = abs(z_score) > 2.0
    
    return round(z_score, 4), is_anomaly
