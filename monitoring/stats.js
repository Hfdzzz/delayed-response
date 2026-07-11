const fs = require("fs");
const path = require("path");
const os = require("os");

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

        /*
        |--------------------------------------------------------------------------
        | Resource Monitoring
        |--------------------------------------------------------------------------
        */

        this.resourceSamples = [];

        this.previousCpu = null;

    }

    /*
    |--------------------------------------------------------------------------
    | Record One Request
    |--------------------------------------------------------------------------
    */

    recordRequest(data) {

        this.requests.push({

            algorithm:
                data.algorithm ?? "unknown",

            timestamp:
                data.timestamp ?? Date.now(),

            clientId:
                data.clientId ?? "unknown",

            actual:
                data.actual ?? "unknown",

            method:
                data.method ?? "GET",

            path:
                data.path ?? "/",

            rpm:
                data.rpm ?? 0,

            excess:
                data.excess ?? 0,

            burstRatio:
                data.burstRatio ?? 0,

            violationCount:
                data.violationCount ?? 0,

            endpointWeight:
                data.endpointWeight ?? 1,

            score:
                data.score ?? 0,

            riskLevel:
                data.riskLevel ?? "LOW",

            delay:
                data.delay ?? 0,

            mitigationApplied:
                data.mitigationApplied ?? false,

            responseAction:
                data.responseAction ?? "ALLOW",

            mitigationLevel:
                data.mitigationLevel ?? "NONE",

            experiment:
                data.experiment ?? "default",

            blocked:
                data.blocked ?? false

        });

    }

/*
|--------------------------------------------------------------------------
| Record Resource Usage
|--------------------------------------------------------------------------
*/

recordResourceUsage() {

    const memory =
        process.memoryUsage();

    const cpu =
        this.getCpuSnapshot();

    let cpuUsage = 0;

    if (this.previousCpu) {

        const idleDiff =
            cpu.idle -
            this.previousCpu.idle;

        const totalDiff =
            cpu.total -
            this.previousCpu.total;

        cpuUsage =
            (
                100 *
                (
                    1 -
                    idleDiff / totalDiff
                )
            );

    }

    this.previousCpu = cpu;

    this.resourceSamples.push({

        timestamp:
            Date.now(),

        cpuUsage,

        rss:
            memory.rss,

        heapUsed:
            memory.heapUsed,

        heapTotal:
            memory.heapTotal,

        uptime:
            process.uptime()

    });

}

getCpuSnapshot() {

    const cpus = os.cpus();

    let idle = 0;
    let total = 0;

    for (const cpu of cpus) {

        idle += cpu.times.idle;

        total +=
            cpu.times.user +
            cpu.times.nice +
            cpu.times.sys +
            cpu.times.idle +
            cpu.times.irq;

    }

    return {

        idle,

        total

    };

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
| Resource Summary
|--------------------------------------------------------------------------
*/

getResourceSummary() {

    if (this.resourceSamples.length === 0) {

        return {};

    }

    const rss =
        this.resourceSamples.map(
            r => r.rss
        );

    const heapUsed =
        this.resourceSamples.map(
            r => r.heapUsed
        );

    const heapTotal =
        this.resourceSamples.map(
            r => r.heapTotal
        );

    const cpu =

    this.resourceSamples.map(
        r => r.cpuUsage
    );

    const average = array =>
        array.reduce(
            (a, b) => a + b,
            0
        ) / array.length;

    return {
        
        cpuAverage:

    Number(
        average(cpu).toFixed(2)
    ),

cpuPeak:

    Number(
        Math.max(...cpu).toFixed(2)
    ),

        rssAverage:

            Math.round(
                average(rss)
            ),

        rssPeak:

            Math.max(...rss),

        heapUsedAverage:

            Math.round(
                average(heapUsed)
            ),

        heapUsedPeak:

            Math.max(...heapUsed),

        heapTotalAverage:

            Math.round(
                average(heapTotal)
            ),

        heapTotalPeak:

            Math.max(...heapTotal),

        uptime:

            process.uptime(),

        

        loadAverage:

            os.loadavg()[0]

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

    resources:

        this.getResourceSummary(),

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