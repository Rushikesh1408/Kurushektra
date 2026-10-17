from functools import lru_cache
from typing import Any

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables. No secrets have defaults."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret: str = Field(min_length=32)
    access_token_minutes: int = 15
    refresh_token_days: int = 7
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    cookie_secure: bool = True  # set COOKIE_SECURE=false only for plain-http local development
    login_rate_limit: str = "10/minute"

    # Comma-separated CIDRs/IPs of reverse proxies (nginx, a load balancer, a PaaS edge) whose
    # X-Forwarded-For header we are willing to trust. Empty by default: when the app is reached
    # directly, the socket peer address is the real client and no header is honoured. Setting this
    # wrongly (trusting a proxy that a client can reach directly) would let anyone forge their
    # apparent IP, so it must list only infrastructure you actually control.
    trusted_proxies: str = ""

    judge0_url: str = ""
    judge0_auth_token: str = ""

    # Innovation Demo Simulation Mode (strictly separated from Judge0, disabled by default)
    demo_mode: bool = False

    @field_validator("demo_mode", mode="before")
    @classmethod
    def _parse_demo_mode(cls, v: Any) -> bool:
        if isinstance(v, str):
            v = v.strip().lower()
            return v in ("true", "1", "t", "yes", "y", "on")
        return bool(v)

    # jscpd (https://github.com/kucherenko/jscpd) — copy/paste detection CLI used by the
    # analysis service. Invoked as a subprocess against the published interface; its JSON
    # report is parsed. MIT licensed, see NOTICE. No jscpd source is vendored.
    jscpd_binary: str = "jscpd"          # path/name of the jscpd executable
    jscpd_min_tokens: int = 40           # tokens below this are ignored as trivial
    jscpd_min_lines: int = 5             # minimum duplicated lines reported
    jscpd_timeout_seconds: int = 60      # hard cap per invocation
    jscpd_similarity_ratio: float = 0.8  # Type-3 near-miss threshold passed to --similarity

    llm_provider: str = "none"
    llm_api_key: str = ""
    llm_model: str = ""
    llm_base_url: str = "https://api.openai.com/v1"  # any OpenAI-compatible endpoint (e.g. Ollama)
    llm_timeout_seconds: int = 20

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def trusted_proxy_list(self) -> list[str]:
        return [p.strip() for p in self.trusted_proxies.split(",") if p.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
