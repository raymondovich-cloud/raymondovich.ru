# Raymondovich Projects Phase 1 — PostgREST API integration test
# Version: 1.0.4
# Updated: 2026-11-16
#
# Runs against an ephemeral local PostgREST instance backed by PostgreSQL 17.11.
# No hosted Supabase project or production credentials are used.

import base64
import hashlib
import hmac
import json
import os
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = os.environ.get("POSTGREST_URL", "http://127.0.0.1:3000")
JWT_SECRET = os.environ["PGRST_JWT_SECRET"]
OWNER_ID = "30000000-0000-4000-8000-000000000011"
OUTSIDER_ID = "30000000-0000-4000-8000-000000000012"


def b64url(value):
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def make_jwt(user_id):
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "aud": "authenticated",
        "role": "authenticated",
        "sub": user_id,
        "iat": now,
        "exp": now + 300,
    }
    signing_input = (
        b64url(json.dumps(header, separators=(",", ":")).encode())
        + "."
        + b64url(json.dumps(payload, separators=(",", ":")).encode())
    )
    signature = hmac.new(
        JWT_SECRET.encode(), signing_input.encode(), hashlib.sha256
    ).digest()
    return signing_input + "." + b64url(signature)


def http_request(method, path, token=None, body=None, headers=None):
    request_headers = {"Accept": "application/json"}
    if token:
        request_headers["Authorization"] = "Bearer " + token
    if body is not None:
        request_headers["Content-Type"] = "application/json"
    if headers:
        request_headers.update(headers)
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(
        BASE_URL + path, data=data, headers=request_headers, method=method
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return response.status, response.read().decode()
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode()


def psql(sql):
    result = subprocess.run(
        ["psql", "-v", "ON_ERROR_STOP=1", "-At", "-c", sql],
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def wait_for_postgrest():
    deadline = time.time() + 60
    last_error = None
    while time.time() < deadline:
        try:
            status, _ = http_request("GET", "/")
            if status == 200:
                return
        except Exception as error:
            last_error = error
        time.sleep(1)
    raise RuntimeError(f"PostgREST did not become ready: {last_error}")


def main():
    wait_for_postgrest()
    psql(
        "insert into auth.users(id) values "
        f"('{OWNER_ID}'),('{OUTSIDER_ID}') on conflict do nothing"
    )

    owner_token = make_jwt(OWNER_ID)
    outsider_token = make_jwt(OUTSIDER_ID)

    status, raw = http_request(
        "POST",
        "/rpc/project_create",
        token=owner_token,
        body={
            "p_parent_project_id": None,
            "p_name": "PostgREST integration project",
            "p_description": "Ephemeral API integration test",
            "p_project_type": "online",
            "p_component_codes": ["website", "telegram_bot"],
        },
    )
    if status != 200:
        raise AssertionError(f"Authenticated project_create failed: HTTP {status}: {raw}")

    created = json.loads(raw)
    project_id = created.get("id")
    if not project_id or created.get("component_codes") != ["website", "telegram_bot"]:
        raise AssertionError(f"Unexpected project_create response: {created}")

    query = urllib.parse.urlencode(
        {"p_project_id": project_id, "p_permission_code": "project.update"}
    )
    status, raw = http_request(
        "GET", "/rpc/project_access_check?" + query, token=owner_token
    )
    if status != 200 or json.loads(raw) is not True:
        raise AssertionError(f"Owner access check failed: HTTP {status}: {raw}")

    status, raw = http_request(
        "POST",
        "/rpc/project_update",
        token=outsider_token,
        body={
            "p_project_id": project_id,
            "p_name": "Unauthorized overwrite",
            "p_description": None,
        },
    )
    if status not in (401, 403):
        raise AssertionError(f"Outsider update should be denied, got HTTP {status}: {raw}")

    status, raw = http_request(
        "POST",
        "/rpc/project_create",
        body={
            "p_parent_project_id": None,
            "p_name": "Anonymous project",
            "p_description": None,
            "p_project_type": "offline",
            "p_component_codes": [],
        },
    )
    if status not in (401, 403):
        raise AssertionError(f"Anonymous create should be denied, got HTTP {status}: {raw}")

    status, raw = http_request(
        "GET",
        "/projects?select=id",
        token=owner_token,
        headers={"Accept-Profile": "projects"},
    )
    if status != 406:
        raise AssertionError(f"Private schema unexpectedly exposed: HTTP {status}: {raw}")

    persisted = psql(
        "select count(*) from projects.project_components pc "
        "join projects.project_component_types ct on ct.id = pc.component_type_id "
        f"where pc.project_id = '{project_id}' "
        "and ct.code in ('website', 'telegram_bot')"
    )
    if persisted != "2":
        raise AssertionError(f"Expected two persisted components, found {persisted}")

    print(
        "PASS: PostgREST authenticated RPC, owner authorization, outsider denial, "
        "anonymous denial, private-schema isolation and persisted multi-components"
    )


if __name__ == "__main__":
    main()
