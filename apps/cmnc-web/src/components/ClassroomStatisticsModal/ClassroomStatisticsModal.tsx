import { type MouseEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
    clearAccessToken,
    extractErrorDetail,
    getAccessToken,
} from "../../api";
import "./ClassroomStatisticsModal.css";


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const TICK_COUNT = 7;


type StatisticsSegment = {
    start_at: string;
    end_at: string;
    state: string;
};


type DeviceStatisticsItem = {
    device_id: number;
    name: string;
    ip_address: string | null;
    availability: StatisticsSegment[];
    wan: StatisticsSegment[];
};


type ClassroomStatisticsResponse = {
    classroom_id: number;
    start_at: string;
    end_at: string;
    devices: DeviceStatisticsItem[];
};


type ClassroomStatisticsButtonProps = {
    classroomId: number;
    classroomName: string;
};


export function ClassroomStatisticsButton(props: ClassroomStatisticsButtonProps) {
    const { classroomId, classroomName } = props;
    const [opened, setOpened] = useState(false);

    return (
        <>
            <button
                type="button"
                className="secondary-button classroom-statistics-button"
                onClick={() => setOpened(true)}
            >
                Статистика
            </button>

            {opened && (
                <ClassroomStatisticsModal
                    classroomId={classroomId}
                    classroomName={classroomName}
                    onClose={() => setOpened(false)}
                />
            )}
        </>
    );
}


type ClassroomStatisticsModalProps = ClassroomStatisticsButtonProps & {
    onClose: () => void;
};


function ClassroomStatisticsModal(props: ClassroomStatisticsModalProps) {
    const { classroomId, classroomName, onClose } = props;
    const [statistics, setStatistics] = useState<ClassroomStatisticsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadStatistics = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            setStatistics(await requestStatistics(classroomId));
        } catch (err) {
            setError(extractErrorDetail(err));
        } finally {
            setLoading(false);
        }
    }, [classroomId]);

    useEffect(() => {
        void loadStatistics();
    }, [loadStatistics]);

    useEffect(() => {
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                onClose();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const ticks = useMemo(() => {
        if (!statistics) {
            return [];
        }

        const start = Date.parse(statistics.start_at);
        const end = Date.parse(statistics.end_at);
        const duration = end - start;

        return Array.from({ length: TICK_COUNT }, (_, index) => {
            const timestamp = start + duration * (index / (TICK_COUNT - 1));
            return {
                position: index / (TICK_COUNT - 1) * 100,
                label: formatTick(timestamp),
            };
        });
    }, [statistics]);

    return (
        <div className="statistics-backdrop" onMouseDown={onClose}>
            <div
                className="statistics-modal"
                role="dialog"
                aria-modal="true"
                aria-label={`Статистика аудитории ${classroomName}`}
                onMouseDown={(event: MouseEvent<HTMLDivElement>) => event.stopPropagation()}
            >
                <div className="statistics-header">
                    <div>
                        <h3>Статистика — {classroomName}</h3>
                        <div className="muted">Доступность устройств и состояние WAN за последние 24 часа</div>
                    </div>

                    <div className="statistics-header-actions">
                        <button
                            className="secondary-button"
                            disabled={loading}
                            onClick={() => void loadStatistics()}
                        >
                            Обновить
                        </button>
                        <button
                            className="statistics-close-button"
                            type="button"
                            onClick={onClose}
                            aria-label="Закрыть"
                        >
                            ×
                        </button>
                    </div>
                </div>

                <StatisticsLegend />

                {error && <pre className="error-box">{error}</pre>}
                {loading && <div className="loading">Загрузка статистики...</div>}

                {!loading && statistics && statistics.devices.length === 0 && (
                    <div className="muted statistics-empty">В аудитории нет закреплённых устройств.</div>
                )}

                {!loading && statistics && statistics.devices.length > 0 && (
                    <div className="statistics-scroll">
                        <div className="statistics-chart">
                            <div className="statistics-time-row">
                                <div className="statistics-device-heading">Устройство</div>
                                <div className="statistics-time-axis">
                                    {ticks.map((tick) => (
                                        <div
                                            key={`${tick.position}-${tick.label}`}
                                            className="statistics-tick"
                                            style={{ left: `${tick.position}%` }}
                                        >
                                            <span>{tick.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {statistics.devices.map((device) => (
                                <StatisticsDeviceRow
                                    key={device.device_id}
                                    device={device}
                                    startAt={statistics.start_at}
                                    endAt={statistics.end_at}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


function StatisticsLegend() {
    return (
        <div className="statistics-legend">
            <LegendItem className="statistics-legend-online" label="В сети" />
            <LegendItem className="statistics-legend-wan-blocked" label="WAN отключён" />
            <LegendItem className="statistics-legend-wan-allowed" label="WAN разрешён" />
            <LegendItem className="statistics-legend-wan-protected" label="WAN защищён администратором" />
        </div>
    );
}


function LegendItem(props: { className: string; label: string }) {
    return (
        <div className="statistics-legend-item">
            <span className={props.className} />
            {props.label}
        </div>
    );
}


function StatisticsDeviceRow(props: {
    device: DeviceStatisticsItem;
    startAt: string;
    endAt: string;
}) {
    const { device, startAt, endAt } = props;

    return (
        <div className="statistics-device-row">
            <div className="statistics-device-info">
                <strong>{device.name}</strong>
                <span>{device.ip_address ?? "IP не задан"}</span>
            </div>

            <div className="statistics-lanes">
                <StatisticsLane
                    className="statistics-availability-lane"
                    segments={device.availability.filter((segment) => segment.state === "online")}
                    startAt={startAt}
                    endAt={endAt}
                />
                <StatisticsLane
                    className="statistics-wan-lane"
                    segments={device.wan}
                    startAt={startAt}
                    endAt={endAt}
                />
            </div>
        </div>
    );
}


function StatisticsLane(props: {
    className: string;
    segments: StatisticsSegment[];
    startAt: string;
    endAt: string;
}) {
    const { className, segments, startAt, endAt } = props;

    return (
        <div className={`statistics-lane ${className}`}>
            {segments.map((segment, index) => {
                const position = getSegmentPosition(segment, startAt, endAt);

                if (position.width <= 0) {
                    return null;
                }

                return (
                    <div
                        key={`${segment.start_at}-${segment.end_at}-${segment.state}-${index}`}
                        className={`statistics-segment statistics-segment-${segment.state}`}
                        style={{
                            left: `${position.left}%`,
                            width: `${position.width}%`,
                        }}
                        title={formatSegmentTitle(segment)}
                    />
                );
            })}
        </div>
    );
}


function getSegmentPosition(
    segment: StatisticsSegment,
    startAt: string,
    endAt: string,
): { left: number; width: number } {
    const rangeStart = Date.parse(startAt);
    const rangeEnd = Date.parse(endAt);
    const duration = Math.max(rangeEnd - rangeStart, 1);
    const segmentStart = Math.min(Math.max(Date.parse(segment.start_at), rangeStart), rangeEnd);
    const segmentEnd = Math.min(Math.max(Date.parse(segment.end_at), rangeStart), rangeEnd);

    return {
        left: (segmentStart - rangeStart) / duration * 100,
        width: Math.max(segmentEnd - segmentStart, 0) / duration * 100,
    };
}


function formatSegmentTitle(segment: StatisticsSegment): string {
    return `${formatState(segment.state)}: ${formatDateTime(segment.start_at)} — ${formatDateTime(segment.end_at)}`;
}


function formatState(state: string): string {
    const labels: Record<string, string> = {
        online: "В сети",
        offline: "Не в сети",
        allowed: "WAN разрешён",
        blocked: "WAN отключён",
        protected: "WAN защищён администратором",
    };

    return labels[state] ?? state;
}


function formatTick(timestamp: number): string {
    return new Date(timestamp).toLocaleString([], {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}


function formatDateTime(value: string): string {
    return new Date(value).toLocaleString().replace(",", "");
}


async function requestStatistics(classroomId: number): Promise<ClassroomStatisticsResponse> {
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/classrooms/${classroomId}/statistics`, {
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (response.status === 401) {
        clearAccessToken();
    }

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }

    return await response.json() as ClassroomStatisticsResponse;
}
