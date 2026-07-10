const stats = require("../monitoring/stats");

const clients = new Map();

const WINDOW_MS = 60 * 1000;
const NORMAL_RPM = 100;

module.exports = (req, res, next) => {

    //--------------------------------------------------
    // Ignore Static Assets
    //--------------------------------------------------

    const ignoredExtensions = [
        ".css",
        ".js",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".ico",
        ".woff",
        ".webp",
        ".ttf",
        ".otf",
        ".woff2",
        ".map"
    ];

    if (
        ignoredExtensions.some(ext =>
            req.path.endsWith(ext)
        )
    ) {

        return next();

    }

    const now = Date.now();

    //--------------------------------------------------
    // Client Identifier
    //--------------------------------------------------

    const clientId =
        req.get("X-Client-ID") ||
        `${req.ip}:${req.get("User-Agent") || "unknown"}`;

    //--------------------------------------------------
    // Ground Truth (Eksperimen)
    //--------------------------------------------------

    const actualLabel =
        req.get("X-Test-Type") || "unknown";

    //--------------------------------------------------
    // Global Statistics
    //--------------------------------------------------

    stats.totalRequests++;

    //--------------------------------------------------
    // Client
    //--------------------------------------------------

    if (!clients.has(clientId)) {

        clients.set(clientId, []);

    }

    let timestamps =
        clients.get(clientId);

    timestamps = timestamps.filter(

        time =>

            now - time < WINDOW_MS

    );

    timestamps.push(now);

    clients.set(
        clientId,
        timestamps
    );

    //--------------------------------------------------
    // Rate
    //--------------------------------------------------

    const rpm =
        timestamps.length;

    const blocked =
        rpm > NORMAL_RPM;

    //--------------------------------------------------
    // Record Experiment
    //--------------------------------------------------

    stats.recordRequest({

        algorithm: "ratelimit",

        timestamp: now,

        clientId,

        actual: actualLabel,

        method: req.method,

        path: req.path,

        rpm,

        excess:

            Math.max(
                0,
                rpm - NORMAL_RPM
            ),

        burstRatio: 0,

        violationCount: 0,

        endpointWeight: 1,

        score: rpm,

        riskLevel:

            blocked

                ? "CRITICAL"

                : "LOW",

        delay: 0,

        blocked

    });

    //--------------------------------------------------
    // Block
    //--------------------------------------------------

    if (blocked) {

        return res.status(429).json({

            success: false,

            message:

                "Too Many Requests"

        });

    }

    next();

};