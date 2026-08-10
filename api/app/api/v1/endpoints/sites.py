from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession, require_roles
from app.models import Client, Site, User, UserRole
from app.schemas.site import ClientCreate, ClientRead, SiteCreate, SiteRead, SiteUpdate

router = APIRouter(tags=["clients", "sites"])

ManagerUser = Annotated[User, Depends(require_roles(UserRole.manager, UserRole.admin))]


@router.get("/clients", response_model=list[ClientRead])
def list_clients(db: DbSession, _: ManagerUser) -> list[Client]:
    return list(db.scalars(select(Client).order_by(Client.name)).all())


@router.post("/clients", response_model=ClientRead, status_code=status.HTTP_201_CREATED)
def create_client(payload: ClientCreate, db: DbSession, _: ManagerUser) -> Client:
    existing = db.scalar(select(Client).where(Client.name == payload.name))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Client already exists")
    client = Client(id=f"client-{payload.name.lower().replace(' ', '-')}", name=payload.name)
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("/sites", response_model=list[SiteRead])
def list_sites(db: DbSession, _: CurrentUser) -> list[Site]:
    return list(db.scalars(select(Site).order_by(Site.name)).all())


@router.post("/sites", response_model=SiteRead, status_code=status.HTTP_201_CREATED)
def create_site(payload: SiteCreate, db: DbSession, _: ManagerUser) -> Site:
    client = db.get(Client, payload.client_id)
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    site = Site(
        id=f"site-{payload.client_id}-{payload.name.lower().replace(' ', '-')}",
        client_id=payload.client_id,
        name=payload.name,
        areas=payload.areas,
    )
    db.add(site)
    db.commit()
    db.refresh(site)
    return site


@router.patch("/sites/{site_id}", response_model=SiteRead)
def update_site(site_id: str, payload: SiteUpdate, db: DbSession, _: ManagerUser) -> Site:
    site = db.get(Site, site_id)
    if site is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Site not found")
    if payload.name is not None:
        site.name = payload.name
    if payload.areas is not None:
        site.areas = payload.areas
    db.commit()
    db.refresh(site)
    return site
