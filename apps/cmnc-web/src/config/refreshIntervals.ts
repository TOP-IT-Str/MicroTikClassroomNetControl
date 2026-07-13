const MIN_REFRESH_INTERVAL_MS = 1_000;

function readRefreshInterval(rawValue: string | undefined, fallbackMs: number): number {
    if (rawValue === undefined || rawValue.trim() === "") {
        return fallbackMs;
    }

    const parsed = Number(rawValue);

    if (!Number.isSafeInteger(parsed) || parsed < MIN_REFRESH_INTERVAL_MS) {
        console.warn(
            `Некорректный интервал обновления "${rawValue}". Используется ${fallbackMs} мс.`,
        );
        return fallbackMs;
    }

    return parsed;
}

export const REFRESH_INTERVALS = Object.freeze({
    dashboard: readRefreshInterval(
        import.meta.env.VITE_DASHBOARD_REFRESH_INTERVAL_MS,
        5_000,
    ),
    adminPresence: readRefreshInterval(
        import.meta.env.VITE_ADMIN_PRESENCE_REFRESH_INTERVAL_MS,
        30_000,
    ),
    maintenance: readRefreshInterval(
        import.meta.env.VITE_MAINTENANCE_REFRESH_INTERVAL_MS,
        5_000,
    ),
    routers: readRefreshInterval(
        import.meta.env.VITE_ROUTERS_REFRESH_INTERVAL_MS,
        5_000,
    ),
    statistics: readRefreshInterval(
        import.meta.env.VITE_STATISTICS_REFRESH_INTERVAL_MS,
        30_000,
    ),
});
