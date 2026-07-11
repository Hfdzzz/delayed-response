const stats = require("../monitoring/stats");

const clients = new Map();

/*
|--------------------------------------------------------------------------
| Rate Limiter Configuration
|--------------------------------------------------------------------------
*/

const WINDOW_MS = 60 * 1000;

const MAX_REQUESTS = 100;

module.exports = (req, res, next) => {

    /*
    |--------------------------------------------------------------------------
    | Ignore Static Assets
    |--------------------------------------------------------------------------
    */

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
        ".woff2",
        ".ttf",
        ".otf",
        ".webp",
        ".map"

    ];

    if (

        ignoredExtensions.some(

            ext => req.path.endsWith(ext)

        )

    ) {

        return next();

    }

    const now = Date.now();

    /*
    |--------------------------------------------------------------------------
    | Client Identifier
    |--------------------------------------------------------------------------
    */

    const clientId =

        req.get("X-Client-ID") ??

        (req.get("User-Agent") ?? "unknown");

    /*
    |--------------------------------------------------------------------------
    | Ground Truth (Eksperimen)
    |--------------------------------------------------------------------------
    */

    const actual =

        req.get("X-Test-Type") ??

        "unknown";

    /*
    |--------------------------------------------------------------------------
    | Global Statistics
    |--------------------------------------------------------------------------
    */

    stats.totalRequests++;

    /*
    |--------------------------------------------------------------------------
    | Sliding Window
    |--------------------------------------------------------------------------
    */

    if (!clients.has(clientId)) {

        clients.set(clientId, []);

    }

    let timestamps =

        clients.get(clientId);

    timestamps =

        timestamps.filter(

            time =>

                now - time < WINDOW_MS

        );

    timestamps.push(now);

    clients.set(

        clientId,

        timestamps

    );

    /*
    |--------------------------------------------------------------------------
    | Rate Calculation
    |--------------------------------------------------------------------------
    */

    const rpm =

        timestamps.length;

    const excess =

        Math.max(

            0,

            rpm - MAX_REQUESTS

        );

    const blocked =

        rpm > MAX_REQUESTS;

    /*
    |--------------------------------------------------------------------------
    | Mitigation Information
    |--------------------------------------------------------------------------
    */

    const mitigationApplied =

        blocked;

    const responseAction =

        blocked

            ? "BLOCK"

            : "ALLOW";

    const mitigationLevel =

        blocked

            ? "AGGRESSIVE"

            : "NONE";

    /*
    |--------------------------------------------------------------------------
    | Experiment Logging
    |--------------------------------------------------------------------------
    */

    stats.recordRequest({

        algorithm:

            "ratelimit",

        timestamp:

            now,

        clientId,

        actual,

        method:

            req.method,

        path:

            req.path,

        rpm,

        excess,

        burstRatio:

            0,

        violationCount:

            0,

        endpointWeight:

            1,

        score:

            0,

        riskLevel:

            blocked

                ? "CRITICAL"

                : "NONE",

        delay:

            0,

        blocked,

        mitigationApplied,

        mitigationLevel,

        responseAction,

        experiment:

            "ratelimit"

    });

    /*
    |--------------------------------------------------------------------------
    | Block Request
    |--------------------------------------------------------------------------
    */

    if (blocked) {

        return res.status(429).json({

            success: false,

            message:

                "Too Many Requests"

        });

    }

    next();

};