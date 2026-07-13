import logging

from aio_pika import IncomingMessage
from sqlalchemy import select

from cmnc_contracts.events import DhcpLeasesObservedEvent, WanPolicyChangedEvent
from cmnc_classroom_service.db import async_session_maker
from cmnc_classroom_service.device_statistics import (
    normalize_mac_address,
    record_device_statistics_state,
)
from cmnc_classroom_service.models import Classroom, Device, DeviceStatisticsState


logger = logging.getLogger(__name__)


async def handle_dhcp_statistics(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        event = DhcpLeasesObservedEvent.model_validate_json(message.body)
        leases_by_mac = {
            normalize_mac_address(lease.mac): lease
            for lease in event.leases
            if lease.mac
        }

        async with async_session_maker() as session:
            result = await session.execute(
                select(Device)
                .join(Classroom, Classroom.id == Device.classroom_id)
                .where(Classroom.router_id == event.router_id)
                .where(Device.is_pinned.is_(True))
            )
            devices = list(result.scalars().all())
            changed_count = 0

            for device in devices:
                lease = leases_by_mac.get(normalize_mac_address(device.mac_address))
                online = bool(lease is not None and lease.active)
                changed = await record_device_statistics_state(
                    session,
                    device,
                    occurred_at=event.occurred_at,
                    online=online,
                )
                changed_count += int(changed)

            await session.commit()

        logger.info(
            "Device statistics updated from DHCP snapshot: router_id=%s devices=%s changed=%s",
            event.router_id,
            len(devices),
            changed_count,
        )


async def handle_wan_statistics(message: IncomingMessage) -> None:
    async with message.process(requeue=False):
        event = WanPolicyChangedEvent.model_validate_json(message.body)

        async with async_session_maker() as session:
            device = await session.get(Device, event.device_id)

            if device is None or not device.is_pinned:
                return

            current = await session.get(DeviceStatisticsState, device.id)
            online = current.online if current is not None else False

            await record_device_statistics_state(
                session,
                device,
                occurred_at=event.occurred_at,
                online=online,
            )
            await session.commit()

        logger.info(
            "Device statistics updated from WAN event: device_id=%s wan_allowed=%s",
            event.device_id,
            event.wan_allowed,
        )
