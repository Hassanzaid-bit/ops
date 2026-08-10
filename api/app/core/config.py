from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_debug: bool = True
    api_v1_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000"

    jwt_secret: str = ""
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7

    database_url: str = "postgresql+psycopg://qzone:qzone@localhost:5432/qzone"

    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "qzone"
    s3_secret_key: str = "qzoneqzone"
    s3_bucket: str = "qzone-photos"
    s3_region: str = "us-east-1"
    s3_use_ssl: bool = False

    @field_validator("jwt_secret")
    @classmethod
    def jwt_secret_required(cls, value: str) -> str:
        if not value.strip():
            msg = "JWT_SECRET must be set in environment or .env"
            raise ValueError(msg)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
