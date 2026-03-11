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
import joblib
import pandas as pd
import numpy as np
from pathlib import Path

# Resolve model path robustly for local dev and Docker/App Runner
_HERE = Path(__file__).resolve()
_BACKEND_DIR = _HERE.parents[2]  # .../backend
_PROJECT_ROOT = _BACKEND_DIR.parent

_MODEL_CANDIDATES = [
    _BACKEND_DIR / "student_progress_model.pkl",
    _PROJECT_ROOT / "student_progress_model.pkl",
]

def _find_model_path() -> str | None:
    for candidate in _MODEL_CANDIDATES:
        if candidate.is_file():
            return str(candidate)
    print(f"⚠️ No ML model file found in candidates: {[str(p) for p in _MODEL_CANDIDATES]}")
    return None

MODEL_PATH = _find_model_path()

def _extract_predictor(candidate):
    """Return a usable model object that exposes .predict, else None."""
    if candidate is None:
        return None

    if hasattr(candidate, "predict"):
        return candidate

    if isinstance(candidate, dict):
        for key in ("model", "estimator", "classifier", "regressor"):
            nested = candidate.get(key)
            if hasattr(nested, "predict"):
                return nested

    return None

def _load_ml_model(path: str | None):
    if not path:
        return None
    def _pickle_loader(p: str):
        with open(p, "rb") as f:
            return pickle.load(f)

    loaders = [joblib.load, _pickle_loader]

    for loader in loaders:
        try:
            loaded = loader(path)
            model = _extract_predictor(loaded)
            if model is not None:
                print(f"✅ ML Model loaded from {path}")
                return model

            loaded_type = type(loaded).__name__
            print(f"⚠️ Loaded artifact is not a predictor (type={loaded_type}). Using fallback.")
        except Exception as e:
            print(f"⚠️ Model load attempt failed via {loader.__name__}: {e}")

    return None

_ml_model = _load_ml_model(MODEL_PATH)


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


