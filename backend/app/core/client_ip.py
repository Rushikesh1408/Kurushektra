"""Resolve the real client IP for rate limiting and audit logging.

Why this exists
---------------
``slowapi.util.get_remote_address`` returns ``request.client.host`` — the *socket peer*. When the API
sits behind a reverse proxy or load balancer (the normal production topology), that peer is the proxy,
so every student collapses into a single rate-limit bucket keyed by the proxy's address. One student
hammering the login endpoint would then exhaust the limit for everyone (an accidental denial of
service), and per-student abuse controls would be meaningless.

``X-Forwarded-For`` is a client-controllable header. Trusting it unconditionally would be worse: any
caller could forge an address and evade every limit. So we only honour forwarded headers when the
immediate peer is a proxy we explicitly trust (``TRUSTED_PROXIES``); otherwise the socket address wins.

Correctness details that matter:

* We walk the ``X-Forwarded-For`` chain from right to left, skipping entries that are themselves
  trusted proxies. The first untrusted hop from the right is the closest address we can vouch for.
* ``X-Forwarded-For`` may contain ports or be malformed; anything we cannot parse as an IP is ignored
  rather than trusted.
* IPv6 and IPv4-in-CIDR matching is done with ``ipaddress`` so ``10.0.0.0/8`` behaves as operators expect.
"""
from __future__ import annotations

import ipaddress
import logging
from functools import lru_cache

from starlette.requests import Request

from app.core.config import get_settings

logger = logging.getLogger("codearena.client_ip")

# The literal address Starlette's TestClient reports; never treat it as a real client for logging.
_UNKNOWN = "unknown"


@lru_cache(maxsize=64)
def _parse_networks(spec: str) -> tuple[ipaddress.IPv4Network | ipaddress.IPv6Network, ...]:
    """Turn a comma-separated list of IPs/CIDRs into network objects. Invalid entries are dropped."""
    nets: list[ipaddress.IPv4Network | ipaddress.IPv6Network] = []
    for raw in spec.split(","):
        raw = raw.strip()
        if not raw:
            continue
        try:
            # A bare address (no slash) is treated as a /32 or /128 host route.
            nets.append(ipaddress.ip_network(raw, strict=False))
        except ValueError:
            logger.warning("ignoring malformed TRUSTED_PROXIES entry %r", raw)
    return tuple(nets)


def _is_trusted(addr: str, networks: tuple[ipaddress.IPv4Network | ipaddress.IPv6Network, ...]) -> bool:
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return False
    return any(ip in net for net in networks)


def _clean(addr: str | None) -> str | None:
    """Strip a ``host:port`` or ``[v6]:port`` form down to a bare IP, or return None if unparseable."""
    if not addr:
        return None
    addr = addr.strip()
    if addr.startswith("["):  # [::1]:1234
        addr = addr[1:addr.find("]")] if "]" in addr else addr.strip("[]")
    elif addr.count(":") == 1:  # 203.0.113.7:5678 (IPv4:port)
        addr = addr.split(":", 1)[0]
    try:
        ipaddress.ip_address(addr)
    except ValueError:
        return None
    return addr


def get_client_ip(request: Request) -> str:
    """Best-effort real client address.

    Order of precedence:
      1. ``X-Forwarded-For`` — only when the direct peer is a trusted proxy. Rightmost untrusted hop.
      2. ``X-Real-IP`` — same trust requirement, single value.
      3. The socket peer address.
    """
    peer = _clean(request.client.host) if request.client else None
    networks = _parse_networks(get_settings().trusted_proxies)
    if peer and networks and _is_trusted(peer, networks):
        xff = request.headers.get("x-forwarded-for", "")
        for hop in reversed([h.strip() for h in xff.split(",") if h.strip()]):
            candidate = _clean(hop)
            if candidate is None:
                continue  # malformed hop: ignore rather than trust
            if _is_trusted(candidate, networks):
                continue  # this hop is another proxy; keep walking left
            return candidate  # first address we can vouch for
        real_ip = _clean(request.headers.get("x-real-ip"))
        if real_ip and not _is_trusted(real_ip, networks):
            return real_ip
    return peer or _UNKNOWN
