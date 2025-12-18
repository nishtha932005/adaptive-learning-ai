import random
from datetime import datetime, timedelta


def generate_mock_student_status():
    """
    Returns a simple mock payload representing a student's engagement and risk.
    Frontend can use this immediately without any DB.
    """
    interactions = random.randint(0, 30)
    last_score = random.randint(0, 100)
    days_overdue = random.choice([0, 0, 1, 2, 3])  # skewed towards 0
    
    # New Dataset Fields
    studied_credits = random.choice([0, 15, 30, 45, 60, 90, 120])
    total_clicks = random.randint(0, 500)
    
    # Note: We'll calculate prediction in the main endpoint using the service, 
    # but for the mock payload, we can include the raw data.
    # The main endpoint will call predict_final_result.

    return {
        "student_id": "demo-student-123",
        "interactions": interactions,
        "last_score": last_score,
        "days_overdue": days_overdue,
        "last_active": (datetime.utcnow() - timedelta(days=days_overdue)).isoformat() + "Z",
        "studied_credits": studied_credits,
        "total_clicks": total_clicks,
         # Placeholder, will be overwritten by service logic if needed, 
         # or we can compute it here if we import the service. 
         # Let's let the main.py handle the connection to predictor to keep this pure data.
        "predicted_final_result": 0 
    }


