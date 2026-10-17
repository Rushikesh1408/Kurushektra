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


def test_probes_and_correlation_headers(client):
    # Liveness probe
    r_live = client.get("/api/v1/health/live")
    assert r_live.status_code == 200
    assert r_live.json() == {"status": "alive"}

    # Readiness probe
    r_ready = client.get("/api/v1/health/ready")
    assert r_ready.status_code == 200
    assert r_ready.json() == {"status": "ready", "database": "ok"}

    # Correlation ID and Server-Timing
    custom_req_id = "req-audit-12345"
    r_corr = client.get("/api/v1/health/live", headers={"X-Request-ID": custom_req_id})
    assert r_corr.headers["x-request-id"] == custom_req_id
    assert "total;dur=" in r_corr.headers["server-timing"]

