from pydantic import BaseModel, ConfigDict, Field


class ClientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str


class ClientCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class SiteRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    client_id: str
    name: str
    areas: list[str]


class SiteCreate(BaseModel):
    client_id: str
    name: str = Field(min_length=1, max_length=255)
    areas: list[str] = Field(default_factory=list)


class SiteUpdate(BaseModel):
    name: str | None = None
    areas: list[str] | None = None
