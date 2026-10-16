def test_health_reports_ok(client):
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok", "database": "ok"}


def test_security_headers_present(client):
    r = client.get("/api/v1/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["x-frame-options"] == "DENY"


def test_openapi_is_generated(client):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    assert "/api/v1/health" in r.json()["paths"]
