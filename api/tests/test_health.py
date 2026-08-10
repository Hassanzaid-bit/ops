import os

os.environ.setdefault("JWT_SECRET", "test-secret-for-pytest-only-not-for-production")

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["service"] == "qzone-api"
