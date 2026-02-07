from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_cors_allowed_origin():
    """Verify that a request from an allowed origin gets the correct CORS headers"""
    origin = "https://rais-blush.vercel.app"
    response = client.get("/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == origin

def test_cors_disallowed_origin():
    """Verify that a request from a disallowed origin does not get CORS headers"""
    origin = "https://evil-site.com"
    response = client.get("/health", headers={"Origin": origin})
    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
