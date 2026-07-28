#!/usr/bin/env python3
"""
Verify that the dev container is wired up correctly.

Run it after the container comes up (or any time things feel off):

    python3 scripts/verify.py

It checks tooling, installed dependencies, the generated Prisma client, and
that PostgreSQL is reachable, has the expected schema, and has been seeded.
Exit code is 0 when everything passes, 1 otherwise.
"""

from __future__ import annotations

import os
import re
import shutil
import socket
import subprocess
import sys
import time
from urllib.parse import urlparse

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Tables the schema/seed dump is expected to create.
EXPECTED_TABLES = [
    "companies",
    "jobs",
    "candidates",
    "applications",
    "ats_jobs",
    "ats_candidates",
    "ats_applications",
]

GREEN, RED, YELLOW, DIM, RESET = (
    ("\033[32m", "\033[31m", "\033[33m", "\033[2m", "\033[0m")
    if sys.stdout.isatty()
    else ("", "", "", "", "")
)

failures = 0
warnings = 0


def ok(msg: str, detail: str = "") -> None:
    print(f"  {GREEN}PASS{RESET} {msg}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


def warn(msg: str, detail: str = "") -> None:
    global warnings
    warnings += 1
    print(f"  {YELLOW}WARN{RESET} {msg}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


def fail(msg: str, detail: str = "") -> None:
    global failures
    failures += 1
    print(f"  {RED}FAIL{RESET} {msg}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(
        cmd, capture_output=True, text=True, cwd=REPO_ROOT, **kw
    )


def pg_ready(db_url: str) -> bool:
    return run(["pg_isready", "-d", db_url]).returncode == 0


def start_postgres() -> subprocess.CompletedProcess:
    """Best-effort start of the local PostgreSQL 16 cluster."""
    res = run(["sudo", "pg_ctlcluster", "16", "main", "start"])
    if res.returncode != 0:
        res = run(["sudo", "service", "postgresql", "start"])
    return res


def load_database_url() -> str | None:
    env_path = os.path.join(REPO_ROOT, ".env")
    if not os.path.isfile(env_path):
        return None
    with open(env_path) as fh:
        for line in fh:
            line = line.strip()
            if line.startswith("DATABASE_URL"):
                value = line.split("=", 1)[1].strip()
                return value.strip('"').strip("'")
    return None


# ---------------------------------------------------------------------------

print("\nDev container verification\n" + "=" * 40)

# 1. Tooling ---------------------------------------------------------------
print("\nTooling")
for tool, args in (("node", ["node", "--version"]),
                   ("pnpm", ["pnpm", "--version"]),
                   ("psql", ["psql", "--version"])):
    if shutil.which(tool) is None:
        fail(f"{tool} is not on PATH")
        continue
    res = run(args)
    version = (res.stdout or res.stderr).strip()
    ok(f"{tool} found", version)

# 2. Dependencies / generated client --------------------------------------
print("\nDependencies")
if os.path.isdir(os.path.join(REPO_ROOT, "node_modules")):
    ok("node_modules present")
else:
    fail("node_modules missing", "run: pnpm install")

# Ask Node whether the client is actually generated and usable. This works
# regardless of the package manager (npm puts it in node_modules/.prisma,
# pnpm hides it inside the virtual store), because it just constructs the
# client — which throws if `prisma generate` hasn't been run. Constructing
# does not open a database connection.
prisma_probe = (
    "try{const {PrismaClient}=require('@prisma/client');"
    "new PrismaClient({datasources:{db:{url:'postgresql://u:p@localhost:5432/d'}}});"
    "console.log('GENERATED');}"
    "catch(e){console.error(e.message);process.exit(1);}"
)
res = run(["node", "-e", prisma_probe])
if res.returncode == 0 and "GENERATED" in res.stdout:
    ok("Prisma client generated")
else:
    fail("Prisma client not generated", "run: pnpm prisma generate")

# 3. Database --------------------------------------------------------------
print("\nDatabase")
db_url = load_database_url()
if not db_url:
    fail("DATABASE_URL not found in .env")
else:
    ok("DATABASE_URL loaded from .env", db_url)
    parsed = urlparse(db_url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 5432

    # The compose-era host name "postgres" should resolve (to loopback here).
    try:
        socket.gethostbyname(host)
        ok(f'host "{host}" resolves')
    except OSError:
        fail(f'host "{host}" does not resolve',
             "post-start.sh adds a 127.0.0.1 alias")

    # Is Postgres accepting connections? If not, try to start the local cluster.
    if pg_ready(db_url):
        ok("PostgreSQL is accepting connections", f"{host}:{port}")
        reachable = True
    else:
        print(f"  {DIM}PostgreSQL not responding — starting the local cluster...{RESET}")
        started = start_postgres()
        for _ in range(15):
            if pg_ready(db_url):
                break
            time.sleep(1)
        reachable = pg_ready(db_url)
        if reachable:
            ok("Started PostgreSQL", f"{host}:{port}")
        else:
            fail("Could not start PostgreSQL",
                 (started.stdout + started.stderr).strip()
                 or "tried: sudo pg_ctlcluster 16 main start")

    # Can we actually authenticate and query?
    if reachable:
        sel = run(["psql", db_url, "-tAqc", "SELECT 1"])
        if sel.returncode == 0 and sel.stdout.strip() == "1":
            ok("Connected and ran a query")

            # Schema present?
            listing = run([
                "psql", db_url, "-tAqc",
                "SELECT tablename FROM pg_tables WHERE schemaname='public'",
            ])
            tables = {t.strip() for t in listing.stdout.splitlines() if t.strip()}
            missing = [t for t in EXPECTED_TABLES if t not in tables]
            if not missing:
                ok("All expected tables exist", f"{len(EXPECTED_TABLES)} tables")
            else:
                fail("Missing tables: " + ", ".join(missing),
                     "run: pnpm pg:seed")

            # Seeded with data?
            total = 0
            per_table = []
            for table in EXPECTED_TABLES:
                if table not in tables:
                    continue
                count = run(["psql", db_url, "-tAqc",
                             f'SELECT count(*) FROM "{table}"'])
                n = int(count.stdout.strip()) if count.stdout.strip().isdigit() else 0
                total += n
                per_table.append(f"{table}={n}")
            if total > 0:
                ok("Database is seeded", ", ".join(per_table))
            else:
                warn("Database has no rows", "run: pnpm pg:seed")
        else:
            fail("Could not query the database",
                 (sel.stdout + sel.stderr).strip())

# ---------------------------------------------------------------------------
print("\n" + "=" * 40)
if failures:
    print(f"{RED}{failures} check(s) failed{RESET}"
          + (f", {warnings} warning(s)" if warnings else ""))
    print("Fix the items above, then re-run:  python3 scripts/verify.py\n")
    sys.exit(1)

if warnings:
    print(f"{YELLOW}All critical checks passed, {warnings} warning(s).{RESET}\n")
else:
    print(f"{GREEN}All checks passed. Start the app with: pnpm start{RESET}\n")
sys.exit(0)
