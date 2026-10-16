"""Tests for the Phase-2 security fix: the rate limiter must key on the real client address.

Background: ``slowapi.util.get_remote_address`` returns the socket peer, so behind a reverse proxy all
students share one bucket. ``get_client_ip`` honours ``X-Forwarded-For`` only from trusted proxies.
"""
from __future__ import annotations

import pytest
from starlette.requests import Request

from app.core.client_ip import get_client_ip
from app.core.config import get_settings


def _request(headers: dict[str, str], peer: str) -> Request:
    """Build a real Starlette Request with a chosen socket peer and headers."""
    raw = [(k.lower().encode("latin-1"), v.encode("latin-1")) for k, v in headers.items()]
    scope = {
        "type": "http",
        "http_version": "1.1",
        "method": "GET",
        "path": "/",
        "raw_path": b"/",
        "query_string": b"",
        "headers": raw,
        "client": (peer, 12345),
        "server": ("testserver", 80),
        "scheme": "http",
    }
    return Request(scope)


@pytest.fixture
def trusted(monkeypatch):
    get_settings().trusted_proxies = "10.0.0.0/8"
    yield
    get_settings().trusted_proxies = ""


def test_direct_client_ignores_forwarded_header():
    # Peer is NOT a trusted proxy: a forged XFF must be ignored, socket address wins.
    assert get_client_ip(_request({"x-forwarded-for": "1.2.3.4"}, "203.0.113.9")) == "203.0.113.9"


def test_trusted_proxy_honours_forwarded_header(trusted):
    # Peer is a trusted proxy: the real client is the rightmost untrusted hop.
    assert get_client_ip(_request({"x-forwarded-for": "1.2.3.4"}, "10.0.0.1")) == "1.2.3.4"


def test_trusted_proxy_skips_trusted_hops(trusted):
    # Chain: client 1.2.3.4 -> proxy 10.0.0.5 -> peer 10.0.0.1. Rightmost untrusted hop is 1.2.3.4.
    assert get_client_ip(_request({"x-forwarded-for": "1.2.3.4, 10.0.0.5"}, "10.0.0.1")) == "1.2.3.4"


def test_trusted_proxy_ignores_malformed_hops(trusted):
    # A malformed hop must not be trusted; fall through to a valid one.
    assert get_client_ip(_request({"x-forwarded-for": "not-an-ip, 1.2.3.4"}, "10.0.0.1")) == "1.2.3.4"


def test_trusted_proxy_falls_back_to_peer_when_no_valid_hop(trusted):
    assert get_client_ip(_request({"x-forwarded-for": "garbage"}, "10.0.0.1")) == "10.0.0.1"


def test_x_real_ip_used_when_no_xff(trusted):
    assert get_client_ip(_request({"x-real-ip": "5.6.7.8"}, "10.0.0.1")) == "5.6.7.8"


def test_empty_trusted_proxies_means_no_header_trusted():
    # Default config: nothing trusted, so forwarded headers are ignored even if present.
    assert get_client_ip(_request({"x-forwarded-for": "9.9.9.9"}, "10.0.0.1")) == "10.0.0.1"


def test_ipv6_and_port_forms_are_cleaned():
    assert get_client_ip(_request({}, "[2001:db8::1]:443")) == "2001:db8::1"
