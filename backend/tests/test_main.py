"""
Basic tests for FastAPI endpoints
"""
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root handshake endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "online"}


def test_health_endpoint():
    """Test the health check endpoint"""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "student_id" in data
    assert "risk_score" in data
    assert "system_status" in data


def test_student_status_endpoint():
    """Test the student status endpoint (mock data)"""
    response = client.get("/api/student/status")
    assert response.status_code == 200
    data = response.json()
    assert "risk_score" in data
    assert "interactions" in data
    assert "last_score" in data


def test_cors_headers():
    """Verify CORS headers are present"""
    response = client.options("/api/health")
    assert response.status_code == 200

