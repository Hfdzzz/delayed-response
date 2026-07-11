const fs = require("fs");
const path = require("path");

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const LOG_DIR =
    path.join(__dirname, "../logs");

const FILE_NAME =
    process.argv[2];

if (!FILE_NAME) {

    console.log("");

    console.log("Usage:");

    console.log(
        "node reporter.js delayed.json"
    );

    console.log(
        "node reporter.js ratelimit.json"
    );

    process.exit(0);

}

const filePath =
    path.join(
        LOG_DIR,
        FILE_NAME
    );

if (!fs.existsSync(filePath)) {

    console.log("");

    console.log("Log file not found.");

    console.log(filePath);

    process.exit(0);

}

const experiment =
    JSON.parse(
        fs.readFileSync(
            filePath,
            "utf8"
        )
    );
    
const requests =
        experiment.requests;
const throughput =
    (
        requests.length /
        (experiment.summary.duration / 1000)
    ).toFixed(2);


const resources =
    experiment.resources || {};

/*
|--------------------------------------------------------------------------
| Statistics
|--------------------------------------------------------------------------
*/

let attackRequests = 0;
let legitimateRequests = 0;

let totalDelay = 0;
let attackDelay = 0;
let legitimateDelay = 0;

let attackDelayCount = 0;
let legitimateDelayCount = 0;

let totalScore = 0;
let peakScore = 0;
let peakRPM = 0;
let maxDelay = 0;

/*
|--------------------------------------------------------------------------
| Risk Distribution (Request)
|--------------------------------------------------------------------------
*/

const riskDistribution = {

    LOW: 0,

    MEDIUM: 0,

    HIGH: 0,

    CRITICAL: 0

};

/*
|--------------------------------------------------------------------------
| Mitigation Distribution
|--------------------------------------------------------------------------
*/

const mitigation = {

    NONE: 0,

    LIGHT: 0,

    MODERATE: 0,

    AGGRESSIVE: 0

};

const mitigationByTraffic = {

    legitimate: {

        NONE: 0,
        LIGHT: 0,
        MODERATE: 0,
        AGGRESSIVE: 0

    },

    attack: {

        NONE: 0,
        LIGHT: 0,
        MODERATE: 0,
        AGGRESSIVE: 0

    }

};

/*
|--------------------------------------------------------------------------
| Client Aggregation
|--------------------------------------------------------------------------
|
| Key :
| clientId
|
| Value :
| {
|   actual,
|   highestRisk,
|   maxDelay,
|   maxScore
| }
|
*/

const clients = new Map();

/*
|--------------------------------------------------------------------------
| Process Requests
|--------------------------------------------------------------------------
*/

for (const request of requests) {

    //------------------------------------------
    // Traffic
    //------------------------------------------

    if (request.actual === "attack")
        attackRequests++;
    else
        legitimateRequests++;

    //------------------------------------------
    // Delay
    //------------------------------------------

    totalDelay += request.delay;

    maxDelay =
        Math.max(
            maxDelay,
            request.delay
        );

    if (request.actual === "attack") {

        attackDelay += request.delay;

        attackDelayCount++;

    }

    else {

        legitimateDelay += request.delay;

        legitimateDelayCount++;

    }

    //------------------------------------------
    // Score
    //------------------------------------------

    totalScore += request.score;

    peakScore =
        Math.max(
            peakScore,
            request.score
        );

    peakRPM =
        Math.max(
            peakRPM,
            request.rpm
        );

    //------------------------------------------
    // Risk Distribution
    //------------------------------------------

    if (
        riskDistribution[
            request.riskLevel
        ] !== undefined
    ) {

        riskDistribution[
            request.riskLevel
        ]++;

    }

    //------------------------------------------
    // Mitigation Level
    //------------------------------------------

let level;

if (request.delay === 0)
    level = "NONE";

else if (request.delay < 300)
    level = "LIGHT";

else if (request.delay < 700)
    level = "MODERATE";

else
    level = "AGGRESSIVE";

/*
|--------------------------------------------------------------------------
| Global Mitigation
|--------------------------------------------------------------------------
*/

mitigation[level]++;

/*
|--------------------------------------------------------------------------
| Ground Truth Mitigation
|--------------------------------------------------------------------------
*/

if (request.actual === "attack")
    mitigationByTraffic.attack[level]++;

else
    mitigationByTraffic.legitimate[level]++;

    //------------------------------------------
    // Client Aggregation
    //------------------------------------------

    const current =
        clients.get(request.clientId);

    if (!current) {

        clients.set(
            request.clientId,
            {

                actual:
                    request.actual,

                highestRisk:
                    request.riskLevel,

                maxDelay:
                    request.delay,

                maxScore:
                    request.score

            }
        );

    }

    else {

        if (
            request.score >
            current.maxScore
        ) {

            current.maxScore =
                request.score;

            current.maxDelay =
                request.delay;

            current.highestRisk =
                request.riskLevel;

        }

    }

}

/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/

function average(total, count) {

    if (count === 0)
        return 0;

    return Number(
        (total / count).toFixed(2)
    );

}

function toMB(bytes) {

    if (!bytes)
        return "0.00";

    return (
        bytes / 1024 / 1024
    ).toFixed(2);

}

function percent(value, total) {

    if (total === 0)
        return "0%";

    return (
        value * 100 / total
    ).toFixed(2) + "%";

}

function percentage(value, total) {

    if (total === 0)
        return 0;

    return Number(
        (
            value / total * 100
        ).toFixed(2)
    );

}

/*
|--------------------------------------------------------------------------
| Client Statistics
|--------------------------------------------------------------------------
*/

const clientSummary = {

    total: clients.size,

    attack: 0,

    legitimate: 0

};

const attackClientRisk = {

    LOW: 0,

    MEDIUM: 0,

    HIGH: 0,

    CRITICAL: 0

};

const legitimateClientRisk = {

    LOW: 0,

    MEDIUM: 0,

    HIGH: 0,

    CRITICAL: 0

};

/*
|--------------------------------------------------------------------------
| Process Client
|--------------------------------------------------------------------------
*/

for (const client of clients.values()) {

    //------------------------------------------
    // Client Type
    //------------------------------------------

    if (client.actual === "attack") {

        clientSummary.attack++;

        attackClientRisk[
            client.highestRisk
        ]++;

    }

    else {

        clientSummary.legitimate++;

        legitimateClientRisk[
            client.highestRisk
        ]++;

    }

}

/*
|--------------------------------------------------------------------------
| Delay Summary
|--------------------------------------------------------------------------
*/

const delaySummary = {

    overall: {

        average:

            average(
                totalDelay,
                requests.length
            ),

        maximum:

            maxDelay

    },

    attack: {

        average:

            average(
                attackDelay,
                attackDelayCount
            ),

        total:

            attackDelay,

        ratio:

            average(
                attackDelay,
                attackRequests
            )

    },

    legitimate: {

        average:

            average(
                legitimateDelay,
                legitimateDelayCount
            ),

        total:

            legitimateDelay,

        ratio:

            average(
                legitimateDelay,
                legitimateRequests
            )

    }

};

/*
|--------------------------------------------------------------------------
| Score Summary
|--------------------------------------------------------------------------
*/

const scoreSummary = {

    average:

        average(
            totalScore,
            requests.length
        ),

    peak:

        peakScore,

    peakRPM:

        peakRPM

};

/*
|--------------------------------------------------------------------------
| Mitigation Summary
|--------------------------------------------------------------------------
*/

const mitigationSummary = {

    none: mitigation.NONE,

    light: mitigation.LIGHT,

    moderate: mitigation.MODERATE,

    aggressive: mitigation.AGGRESSIVE,

    nonePercent:

        percentage(
            mitigation.NONE,
            requests.length
        ),

    lightPercent:

        percentage(
            mitigation.LIGHT,
            requests.length
        ),

    moderatePercent:

        percentage(
            mitigation.MODERATE,
            requests.length
        ),

    aggressivePercent:

        percentage(
            mitigation.AGGRESSIVE,
            requests.length
        )

};

/*
|--------------------------------------------------------------------------
| Report
|--------------------------------------------------------------------------
*/

console.log("");

console.log("======================================================");
console.log("           DDOS MITIGATION REPORT");
console.log("======================================================");

console.log(`Algorithm              : ${experiment.metadata.algorithm}`);
console.log(`Experiment Time        : ${experiment.metadata.createdAt}`);

console.log("------------------------------------------------------");

console.log("Traffic Summary");

console.log(`Total Requests         : ${requests.length}`);
console.log(`Attack Requests        : ${attackRequests}`);
console.log(`Legitimate Requests    : ${legitimateRequests}`);

console.log("------------------------------------------------------");

console.log("Client Summary");

console.log(`Total Clients          : ${clientSummary.total}`);
console.log(`Attack Clients         : ${clientSummary.attack}`);
console.log(`Legitimate Clients     : ${clientSummary.legitimate}`);

console.log("------------------------------------------------------");

console.log("Attack Client Distribution");

console.log(`LOW                    : ${attackClientRisk.LOW}`);
console.log(`MEDIUM                 : ${attackClientRisk.MEDIUM}`);
console.log(`HIGH                   : ${attackClientRisk.HIGH}`);
console.log(`CRITICAL               : ${attackClientRisk.CRITICAL}`);

console.log("------------------------------------------------------");

console.log("Legitimate Client Distribution");

console.log(`LOW                    : ${legitimateClientRisk.LOW}`);
console.log(`MEDIUM                 : ${legitimateClientRisk.MEDIUM}`);
console.log(`HIGH                   : ${legitimateClientRisk.HIGH}`);
console.log(`CRITICAL               : ${legitimateClientRisk.CRITICAL}`);

console.log("------------------------------------------------------");

console.log("Delay Summary");

console.log("");

console.log("Overall");

console.log(
    `    Average Delay        : ${delaySummary.overall.average} ms`
);

console.log(
    `    Maximum Delay        : ${delaySummary.overall.maximum} ms`
);

console.log("");

console.log("Attack Traffic");

console.log(
    `    Average Delay        : ${delaySummary.attack.average} ms`
);

console.log(
    `    Total Delay          : ${delaySummary.attack.total.toLocaleString()} ms`
);

console.log(
    `    Delay Ratio          : ${delaySummary.attack.ratio} ms/request`
);

console.log("");

console.log("Legitimate Traffic");

console.log(
    `    Average Delay        : ${delaySummary.legitimate.average} ms`
);

console.log(
    `    Total Delay          : ${delaySummary.legitimate.total.toLocaleString()} ms`
);

console.log(
    `    Delay Ratio          : ${delaySummary.legitimate.ratio} ms/request`
);

console.log("------------------------------------------------------");

console.log("Resource Summary");

console.log("");

console.log("CPU");

console.log(
    `    Average CPU          : ${resources.cpuAverage}%`
);

console.log(
    `    Peak CPU             : ${resources.cpuPeak}%`
);

console.log("");

console.log("Memory");

console.log(
    `    RSS Average          : ${toMB(resources.rssAverage)} MB`
);

console.log(
    `    RSS Peak             : ${toMB(resources.rssPeak)} MB`
);

console.log("");

console.log(
    `    Heap Used Average    : ${toMB(resources.heapUsedAverage)} MB`
);

console.log(
    `    Heap Used Peak       : ${toMB(resources.heapUsedPeak)} MB`
);

console.log("");

console.log(
    `    Heap Total Average   : ${toMB(resources.heapTotalAverage)} MB`
);

console.log(
    `    Heap Total Peak      : ${toMB(resources.heapTotalPeak)} MB`
);

console.log("");

console.log("System");

console.log(
    `    Load Average         : ${resources.loadAverage?.toFixed(2) ?? "0.00"}`
);

console.log(
    `    Server Uptime        : ${resources.uptime?.toFixed(2) ?? "0.00"} sec`
);

console.log("------------------------------------------------------");

console.log("Performance Summary");

console.log("");

console.log(
    `Experiment Duration    : ${(experiment.summary.duration / 1000).toFixed(2)} sec`
);

console.log(
    `Throughput             : ${throughput} req/sec`
);

console.log("------------------------------------------------------");

console.log("Mitigation Summary");

console.log("");

console.log(`Ground Truth: Legitimate (${legitimateRequests} Requests)`);

console.log(
`No Mitigation         : ${mitigationByTraffic.legitimate.NONE} (${percent(mitigationByTraffic.legitimate.NONE, legitimateRequests)})`
);

console.log(
`Light Mitigation      : ${mitigationByTraffic.legitimate.LIGHT} (${percent(mitigationByTraffic.legitimate.LIGHT, legitimateRequests)})`
);

console.log(
`Moderate Mitigation   : ${mitigationByTraffic.legitimate.MODERATE} (${percent(mitigationByTraffic.legitimate.MODERATE, legitimateRequests)})`
);

console.log(
`Aggressive Mitigation : ${mitigationByTraffic.legitimate.AGGRESSIVE} (${percent(mitigationByTraffic.legitimate.AGGRESSIVE, legitimateRequests)})`
);

console.log("");

console.log(`Ground Truth: Attack (${attackRequests} Requests)`);

console.log(
`No Mitigation         : ${mitigationByTraffic.attack.NONE} (${percent(mitigationByTraffic.attack.NONE, attackRequests)})`
);

console.log(
`Light Mitigation      : ${mitigationByTraffic.attack.LIGHT} (${percent(mitigationByTraffic.attack.LIGHT, attackRequests)})`
);

console.log(
`Moderate Mitigation   : ${mitigationByTraffic.attack.MODERATE} (${percent(mitigationByTraffic.attack.MODERATE, attackRequests)})`
);

console.log(
`Aggressive Mitigation : ${mitigationByTraffic.attack.AGGRESSIVE} (${percent(mitigationByTraffic.attack.AGGRESSIVE, attackRequests)})`
);
