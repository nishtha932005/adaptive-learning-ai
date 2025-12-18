def predict_student_risk(interactions: int, last_score: int, days_overdue: int) -> int:
    """
    Simple rule-based fallback "model" so the frontend can work before a real ML model exists.

    Logic:
    - Low interactions + Low Score = Disengaged (High Risk)
    - High interactions + Low Score = Confused (Medium Risk)
    """
    risk_score = 0

    # Simple Heuristic Model
    if interactions < 10:
        risk_score += 40
    if last_score < 50:
        risk_score += 30
    if days_overdue > 0:
        risk_score += 20

    # Cap at 100%
    return min(risk_score, 100)


import os
import pickle
import pandas as pd
import numpy as np

# Load model relative to this file
MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "..", "student_progress_model.pkl")

try:
    with open(MODEL_PATH, "rb") as f:
        _ml_model = pickle.load(f)
    print(f"✅ ML Model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"⚠️ Failed to load ML model: {e}")
    _ml_model = None


def predict_final_result(
    credits: int, 
    clicks: int, 
    # Default additional features needed by the model
    code_module: str = "AAA",
    code_presentation: str = "2013J",
    gender: str = "M",
    region: str = "East Anglian Region",
    highest_education: str = "HE Qualification",
    imd_band: str = "90-100%",
    age_band: str = "0-35",
    num_of_prev_attempts: int = 0,
    disability: str = "N",
    total_vle_interactions: int = 0,
) -> int:
    """
    Predicts the final result (0-100) using the loaded ML model.
    Falls back to heuristic if model fails or is missing.
    """
    # Fallback heuristic
    fallback = max(0, min(100, int((credits * 2.5) + (clicks * 0.1))))

    if _ml_model is None:
        return fallback

    try:
        # Construct DataFrame matching training data
        # Note: We use the feature list derived from analysis
        input_data = pd.DataFrame([{
            "code_module": code_module,
            "code_presentation": code_presentation,
            "gender": gender,
            "region": region,
            "highest_education": highest_education,
            "imd_band": imd_band,
            "age_band": age_band,
            "num_of_prev_attempts": num_of_prev_attempts,
            "studied_credits": credits,
            "disability": disability,
            "total_clicks": clicks,   # Ensure this name matches what we saw in the notebook output if slightly different
            "total_vle_interactions": total_vle_interactions or clicks, # Use clicks as proxy if interaction breakdown is missing
        }])
        
        # Predict
        # Depending on model type (Regressor vs Classifier). 
        # If classifier, we might want predict_proba. If regressor, predict.
        # Assuming Classifier based on "final_result" typically being categorical (Distinction, Pass, Fail)
        # BUT the user wants a 0-100 score.
        # Let's try predict first, see what it returns.
        prediction = _ml_model.predict(input_data)[0]
        
        # If prediction is string (Distinction/Pass/Fail), map to score
        if isinstance(prediction, str):
            mapping = {"Distinction": 90, "Pass": 60, "Fail": 30, "Withdrawn": 0}
            return mapping.get(prediction, fallback)
        
        # If prediction is number, return it
        return int(prediction)

    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return fallback


