from typing import Any

import httpx
from fastapi import Header, HTTPException, Request

from cmnc_api_gateway.main import (
    app,
    classroom_client,
    ensure_classroom_access,
    get_current_principal,
)


@app.get("/api/classrooms/{classroom_id}/statistics")
async def get_classroom_statistics(
    classroom_id: int,
    request: Request,
    authorization: str | None = Header(default=None),
) -> Any:
    principal = await get_current_principal(request, authorization)
    await ensure_classroom_access(principal, classroom_id)

    try:
        return await classroom_client.get_json(
            f"/internal/classrooms/{classroom_id}/statistics"
        )
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=exc.response.text,
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Classroom service unavailable: {exc}",
        ) from exc
