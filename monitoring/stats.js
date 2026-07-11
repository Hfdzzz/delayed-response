const fs = require("fs");
const path = require("path");

/*
|--------------------------------------------------------------------------
| Log Directory
|--------------------------------------------------------------------------
*/

const LOG_DIR = path.join(__dirname, "../logs");

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

class Stats {

    constructor() {
        this.reset();
    }

    /*
    |--------------------------------------------------------------------------
    | Reset Experiment
    |--------------------------------------------------------------------------
    */

    reset() {

        this.startTime = Date.now();

        this.totalRequests = 0;

        this.delayedRequests = 0;

        this.totalDelay = 0;

        this.requests = [];

    }

    /*
    |--------------------------------------------------------------------------
    | Record One Request
    |--------------------------------------------------------------------------
    */

    recordRequest(data) {

        this.requests.push({

            algorithm:
                data.algorithm || "unknown",

            timestamp:
                data.timestamp || Date.now(),

            clientId:
                data.clientId || "unknown",

            actual:
                data.actual || "unknown",

            method:
                data.method || "GET",

            path:
                data.path || "/",

            rpm:
                data.rpm || 0,

            excess:
                data.excess || 0,

            burstRatio:
                data.burstRatio || 0,

            violationCount:
                data.violationCount || 0,

            endpointWeight:
                data.endpointWeight || 1,

            score:
                data.score ?? 0,

            riskLevel:
                data.riskLevel ?? "LOW",

            delay:
                data.delay ?? 0,

            mitigationApplied:
                data.mitigationApplied ?? false,

            blocked:
                data.blocked ?? false

        });

    }

    /*
    |--------------------------------------------------------------------------
    | Export Logs (Memory)
    |--------------------------------------------------------------------------
    */

    exportLogs() {

        return [...this.requests];

    }

    /*
    |--------------------------------------------------------------------------
    | Experiment Summary
    |--------------------------------------------------------------------------
    */

    getSummary() {

        const duration =
            Date.now() - this.startTime;

        const averageDelay =
            this.delayedRequests === 0
                ? 0
                : this.totalDelay /
                  this.delayedRequests;

        const uniqueClients =
            new Set(

                this.requests.map(

                    request => request.clientId

                )

            ).size;

        return {

            startTime:
                new Date(this.startTime)
                    .toISOString(),

            endTime:
                new Date()
                    .toISOString(),

            duration,

            totalRequests:
                this.totalRequests,

            delayedRequests:
                this.delayedRequests,

            totalDelay:
                this.totalDelay,

            averageDelay:
                Number(
                    averageDelay.toFixed(2)
                ),

            uniqueClients,

            totalLogs:
                this.requests.length

        };

    }

    /*
    |--------------------------------------------------------------------------
    | Save Experiment
    |--------------------------------------------------------------------------
    */

    saveLogs(algorithm = "experiment") {

        const timestamp =

            new Date()

                .toISOString()

                .replace(/:/g, "-")

                .replace(/\..+/, "");

        const fileName =

            `${algorithm}_${timestamp}.json`;

        const filePath =

            path.join(

                LOG_DIR,

                fileName

            );

        const output = {

            metadata: {

                algorithm,

                createdAt:
                    new Date().toISOString(),

                version: "1.0"

            },

            summary:

                this.getSummary(),

            requests:

                this.exportLogs()

        };

        fs.writeFileSync(

            filePath,

            JSON.stringify(

                output,

                null,

                4

            )

        );

        return filePath;

    }

}

module.exports = new Stats();