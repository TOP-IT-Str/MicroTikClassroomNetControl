from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from cmnc_contracts.routing_keys import (
    CLASSROOM_DEVICE_WAN_POLICY_CHANGED,
    MIKROTIK_DHCP_LEASES_OBSERVED,
)
from cmnc_classroom_service.device_statistics import router as statistics_router
from cmnc_classroom_service.main import app
from cmnc_classroom_service.statistics_handlers import (
    handle_dhcp_statistics,
    handle_wan_statistics,
)


STATISTICS_DHCP_QUEUE = "cmnc.classroom.statistics.dhcp"
STATISTICS_WAN_QUEUE = "cmnc.classroom.statistics.wan"

base_lifespan = app.router.lifespan_context


@asynccontextmanager
async def statistics_lifespan(application: FastAPI) -> AsyncIterator[None]:
    async with base_lifespan(application):
        rabbitmq_client = application.state.rabbitmq_client

        dhcp_queue = await rabbitmq_client.declare_queue(
            queue_name=STATISTICS_DHCP_QUEUE,
            routing_key=MIKROTIK_DHCP_LEASES_OBSERVED,
        )
        await dhcp_queue.consume(handle_dhcp_statistics)

        wan_queue = await rabbitmq_client.declare_queue(
            queue_name=STATISTICS_WAN_QUEUE,
            routing_key=CLASSROOM_DEVICE_WAN_POLICY_CHANGED,
        )
        await wan_queue.consume(handle_wan_statistics)

        yield


app.include_router(statistics_router)
app.router.lifespan_context = statistics_lifespan
