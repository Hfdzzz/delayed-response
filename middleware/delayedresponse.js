const stats = require("../monitoring/stats");

const clients = new Map();

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const WINDOW_MS = 60 * 1000;
const BURST_WINDOW_MS = 5 * 1000;

const CLEANUP_INTERVAL = 60 * 1000;
const CLIENT_TIMEOUT = 10 * 60 * 1000;

const NORMAL_RPM = 100;
const MAX_SCORE = 200;
const MAX_DELAY = 1000;

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
    ".webp",
    ".ttf",
    ".otf",
    ".map"
];

/*
|--------------------------------------------------------------------------
| Endpoint Weight
|--------------------------------------------------------------------------
*/

const endpointWeights = {

    "/": 1,
    "/product": 1,
    "/cart": 1,
    "/checkout": 1,

    "/login": 6,

    "/register": 5,

    "/search": 2,

    "/payment": 8

};

/*
|--------------------------------------------------------------------------
| Cleanup inactive clients
|--------------------------------------------------------------------------
*/

setInterval(() => {

    const now = Date.now();

    for (const [id, client] of clients) {

        if (now - client.lastSeen > CLIENT_TIMEOUT) {

            clients.delete(id);

        }

    }

}, CLEANUP_INTERVAL);

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

module.exports = async (req, res, next) => {

    //--------------------------------------------------
    // Ignore Static Assets
    //--------------------------------------------------

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
        `${req.ip}:${req.get("User-Agent") || "unknown"}`;

    //--------------------------------------------------
    // Ground Truth
    // Hanya digunakan selama eksperimen
    //--------------------------------------------------

    const actualLabel =
        req.get("X-Test-Type") || "unknown";

    //--------------------------------------------------
    // Global Statistics
    //--------------------------------------------------

    stats.totalRequests++;

    //--------------------------------------------------
    // New Client
    //--------------------------------------------------

    if (!clients.has(clientId)) {

        clients.set(clientId, {

            timestamps: [],

            score: 0,

            lastSeen: now,

            violationCount: 0,

            riskLevel: "LOW"

        });

    }

    //--------------------------------------------------
    // Client Statistics
    //--------------------------------------------------

    // if (!stats.clients[clientId]) {

    //     stats.clients[clientId] = {

    //         requests: 0,

    //         delayed: 0,

    //         totalDelay: 0,

    //         maxScore: 0,

    //         peakRpm: 0,

    //         highestRisk: "LOW"

    //     };

    // }

    const client =
        clients.get(clientId);

    // const clientStats =
    //     stats.clients[clientId];

    // clientStats.requests++;

    //--------------------------------------------------
    // Time Decay
    //--------------------------------------------------

    const elapsed =
        now - client.lastSeen;

client.score = Math.max(

    0,

    client.score - (elapsed / 100)

);

    client.lastSeen = now;

    //--------------------------------------------------
    // Sliding Window
    //--------------------------------------------------

    while (

        client.timestamps.length &&

        client.timestamps[0] <= now - WINDOW_MS

    ) {

        client.timestamps.shift();

    }

    client.timestamps.push(now);

    //--------------------------------------------------
    // Request Per Minute
    //--------------------------------------------------

    const rpm =
        client.timestamps.length;

    // clientStats.peakRpm = Math.max(

    //     clientStats.peakRpm,

    //     rpm

    // );

    //--------------------------------------------------
    // Burst Detection
    //--------------------------------------------------

    let burstCount = 0;

    for (

        let i = client.timestamps.length - 1;

        i >= 0;

        i--

    ) {

        if (

            now - client.timestamps[i] <= BURST_WINDOW_MS

        ) {

            burstCount++;

        } else {

            break;

        }

    }

    const burstRatio =
        burstCount /
        (BURST_WINDOW_MS / 1000);

    //--------------------------------------------------
    // Consecutive Violation
    //--------------------------------------------------

    if (

        rpm > NORMAL_RPM

    ) {

        client.violationCount++;

    } else {

        client.violationCount = 0;

    }

    //--------------------------------------------------
    // Endpoint Weight
    //--------------------------------------------------

    const endpointWeight =
        endpointWeights[req.path] || 1;
        //--------------------------------------------------
    // Risk Score Calculation
    //--------------------------------------------------

    const excess =
        Math.max(
            0,
            rpm - NORMAL_RPM
        );

    /*
    |--------------------------------------------------------------------------
    | Adaptive Risk Score
    |
    | Score berasal dari kombinasi:
    | - RPM
    | - Burstiness
    | - Consecutive Violations
    | - Endpoint Weight
    |--------------------------------------------------------------------------
    */

   if (rpm > NORMAL_RPM) {

    client.score += (

        (excess * 0.03) +

        (burstRatio * 0.80) +

        (client.violationCount * 0.50)

    ) * endpointWeight;

}

if (rpm <= NORMAL_RPM) {

    client.score *= 0.90;

}

    client.score =
        Math.min(
            client.score,
            MAX_SCORE
        );

    // clientStats.maxScore =
    //     Math.max(
    //         clientStats.maxScore,
    //         client.score
    //     );

    //--------------------------------------------------
    // Risk Level Classification
    //--------------------------------------------------

    let riskLevel = "LOW";

    if (client.score >= 180) {

        riskLevel = "CRITICAL";

    }

    else if (client.score >= 120) {

        riskLevel = "HIGH";

    }

    else if (client.score >= 60) {

        riskLevel = "MEDIUM";

    }

    client.riskLevel = riskLevel;

    /*
    |--------------------------------------------------------------------------
    | Highest Risk
    |--------------------------------------------------------------------------
    */

    const priority = {

        LOW: 1,

        MEDIUM: 2,

        HIGH: 3,

        CRITICAL: 4

    };

    // if (

    //     priority[riskLevel] >

    //     priority[clientStats.highestRisk]

    // ) {

    //     clientStats.highestRisk =
    //         riskLevel;

    // }

    //--------------------------------------------------
    // Adaptive Delay
    //--------------------------------------------------

    let delay = 0;

    switch (riskLevel) {

        case "LOW":

            delay = 0;

            break;

        case "MEDIUM":

            delay = Math.min(

                Math.floor(

                    Math.pow(
                        client.score,
                        1.15
                    )

                ),

                250

            );

            break;

        case "HIGH":

            delay = Math.min(

                Math.floor(

                    Math.pow(
                        client.score,
                        1.30
                    )

                ),

                600

            );

            break;

        case "CRITICAL":

            delay = Math.min(

                Math.floor(

                    Math.pow(
                        client.score,
                        1.45
                    )

                ),

                MAX_DELAY

            );

            break;

    }

    //--------------------------------------------------
    // Delay Statistics
    //--------------------------------------------------

    if (delay > 0) {

        stats.delayedRequests++;

        stats.totalDelay += delay;

        // clientStats.delayed++;

        // clientStats.totalDelay += delay;

    }

    //--------------------------------------------------
    // Save Request
    //--------------------------------------------------

    stats.recordRequest({

        algorithm: "delayed",

        timestamp: now,

        clientId,

        actual: actualLabel,

        method: req.method,

        path: req.path,

        rpm,

        excess,

        burstRatio,

        violationCount:
            client.violationCount,

        endpointWeight,

        score:
            Number(
                client.score.toFixed(2)
            ),

        riskLevel,

        delay,

        blocked: false

    });

    //--------------------------------------------------
    // Execute Delay
    //--------------------------------------------------

    if (delay > 0) {

        await new Promise(resolve =>

            setTimeout(

                resolve,

                delay

            )

        );

    }
        //--------------------------------------------------
    // Expose Information (Optional)
    // Berguna untuk debugging / penelitian
    //--------------------------------------------------

    req.riskAssessment = {

        clientId,

        rpm,

        burstRatio,

        score: Number(
            client.score.toFixed(2)
        ),

        riskLevel,

        delay,

        actual: actualLabel

    };

    //--------------------------------------------------
    // Response Header (Opsional)
    // Dapat dihapus pada production
    //--------------------------------------------------

    if (process.env.NODE_ENV !== "production") {

        res.setHeader(
            "X-Risk-Score",
            client.score.toFixed(2)
        );

        res.setHeader(
            "X-Risk-Level",
            riskLevel
        );

        res.setHeader(
            "X-Delay",
            delay
        );

    }

    //--------------------------------------------------
    // Continue Request
    //--------------------------------------------------

    next();

};