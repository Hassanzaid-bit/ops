"""Seed pilot data from the existing Next.js prototype."""

from __future__ import annotations

import os
from datetime import date

os.environ.setdefault("JWT_SECRET", "dev-only-change-me-in-production")

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Client, Job, JobStatus, Site, User, UserRole, VisitType

DEFAULT_IPM_AREAS = [
    "Red Dot Update",
    "Counter Section",
    "Soda Fridges",
    "Crusher & Ice Cream Machines",
    "Cash Counter",
    "Air Curtains",
    "Ceiling Section",
    "Under Seats",
    "Dispensers",
    "Washrooms",
    "Tumbling Machine & Marinator Machine",
    "DB Board",
    "Rounder & Burger Section",
    "Office Drawers & Shelves",
    "Trunking & Industrial Sockets",
    "Three-Compartment Sink",
    "Gaskets (Chillers & Freezers)",
    "Dry Goods Store",
    "Grease Trap",
    "Chips Upright Freezer",
    "Castor Wheels (Equipment)",
    "Staff Lockers",
    "Fly Control Units (FCUs)",
    "Non-Toxic Monitoring Devices",
    "Toxic Bait Stations",
    "Manholes & Drainage Systems",
]

MANAGER_PASSWORD = "Password@123!"


def seed() -> None:
    db = SessionLocal()
    try:
        if db.scalar(select(User).where(User.email == "ops@qzone.co.ke")):
            print("Seed skipped — data already present.")
            return

        manager = User(
            id="user-manager-ops",
            email="ops@qzone.co.ke",
            name="Operations Manager",
            password_hash=hash_password(MANAGER_PASSWORD),
            role=UserRole.manager,
        )
        tech_boniface = User(
            id="user-tech-boniface",
            email="boniface@qzone.co.ke",
            name="Boniface Kithinga",
            password_hash=hash_password(MANAGER_PASSWORD),
            role=UserRole.technician,
        )
        tech_amina = User(
            id="user-tech-amina",
            email="amina@qzone.co.ke",
            name="Amina Wanjiru",
            password_hash=hash_password(MANAGER_PASSWORD),
            role=UserRole.technician,
        )
        db.add_all([manager, tech_boniface, tech_amina])

        client = Client(id="client-kfc", name="KFC")
        db.add(client)

        site_kakamega = Site(
            id="site-01",
            client_id=client.id,
            name="Kakamega",
            areas=DEFAULT_IPM_AREAS,
        )
        site_westside = Site(
            id="site-02",
            client_id=client.id,
            name="Westside Mall",
            areas=DEFAULT_IPM_AREAS,
        )
        db.add_all([site_kakamega, site_westside])

        today = date.today().isoformat()
        jobs = [
            Job(
                id="visit-001",
                site_id=site_kakamega.id,
                technician_id=tech_boniface.id,
                technician_name=tech_boniface.name,
                visit_type=VisitType.full_inspection,
                date=today,
                status=JobStatus.scheduled,
                time_window="08:00 – 11:30",
            ),
            Job(
                id="visit-002",
                site_id=site_kakamega.id,
                technician_id=tech_boniface.id,
                technician_name=tech_boniface.name,
                visit_type=VisitType.follow_up,
                date=today,
                status=JobStatus.scheduled,
                time_window="12:00 – 13:00",
                follow_up_areas=[
                    "Fly Control Units (FCUs)",
                    "Grease Trap",
                    "Manholes & Drainage Systems",
                ],
                parent_visit_id="visit-001",
            ),
            Job(
                id="visit-003",
                site_id=site_westside.id,
                technician_id=tech_amina.id,
                technician_name=tech_amina.name,
                visit_type=VisitType.full_inspection,
                date=today,
                status=JobStatus.scheduled,
                time_window="14:00 – 17:00",
            ),
        ]
        db.add_all(jobs)
        db.commit()
        print("Seed complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
