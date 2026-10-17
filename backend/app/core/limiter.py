from slowapi import Limiter

from app.core.client_ip import get_client_ip

# Proxy-aware key function. See app/core/client_ip.py for why get_remote_address alone is unsafe
# behind a reverse proxy or load balancer.
limiter = Limiter(key_func=get_client_ip)
