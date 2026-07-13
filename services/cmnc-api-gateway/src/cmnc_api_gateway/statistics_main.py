from typing import Any

import httpx
from fastapi import Header, HTTPException, Query, Request

from cmnc_api_gateway.main import (
    app,
    classroom_client,
    ensure_classroom_access,
    get_current_principal,
)


DEFAULT_STATISTICS_RANGE_MINUTES = 24 * 60
ALLOWED_STATISTICS_RANGE_MINUTES = frozenset(
    {
        40,
        4 * 60,
        24 * 60,
        7 * 24 * 60,
    }
)


@app.get("/api/classrooms/{classroom_id}/statistics")
async def get_classroom_statistics(
    classroom_id: int,
    request: Request,
    range_minutes: int = Query(default=DEFAULT_STATISTICS_RANGE_MINUTES),
    authorization: str | None = Header(default=None),
) -> Any:
    if range_minutes not in ALLOWED_STATISTICS_RANGE_MINUTES:
        allowed = ", ".join(str(value) for value in sorted(ALLOWED_STATISTICS_RANGE_MINUTES))
        raise HTTPException(
            status_code=422,
            detail=f"range_minutes must be one of: {allowed}",
        )

    principal = await get_current_principal(request, authorization)
    await ensure_classroom_access(principal, classroom_id)

    try:
        return await classroom_client.get_json(
            f"/internal/classrooms/{classroom_id}/statistics?range_minutes={range_minutes}"
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
