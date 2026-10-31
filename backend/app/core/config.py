from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"  # development | test | production
    database_url: str = "postgresql+psycopg://brightloop:brightloop@localhost:5432/brightloop"

    default_tenant_slug: str = "brightloop"

    # Sessions
    session_cookie_name: str = "bl_session"
    csrf_cookie_name: str = "bl_csrf"
    session_absolute_hours: int = 24 * 7
    session_idle_hours: int = 24
    cookie_secure: bool = False  # must be True behind HTTPS in production

    password_reset_minutes: int = 30
    public_app_url: str = "http://localhost:5173"

    # Comma-separated extra origins; same-origin requests through the proxy need none
    cors_origins: str = ""

    # Mail (Mailpit locally)
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    mail_from: str = "Brightloop <no-reply@brightloop.local>"

    # Rate limits: attempts per window
    auth_rate_limit: int = 10
    auth_rate_window_seconds: int = 60

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
