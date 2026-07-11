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

    if (request.delay === 0)
        mitigation.NONE++;

    else if (request.delay < 300)
        mitigation.LIGHT++;

    else if (request.delay < 700)
        mitigation.MODERATE++;

    else
        mitigation.AGGRESSIVE++;

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

    average:

        average(
            totalDelay,
            requests.length
        ),

    attackAverage:

        average(
            attackDelay,
            attackDelayCount
        ),

    legitimateAverage:

        average(
            legitimateDelay,
            legitimateDelayCount
        ),

    maximum:

        maxDelay

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

console.log(`Average Delay          : ${delaySummary.average} ms`);
console.log(`Attack Delay Avg       : ${delaySummary.attackAverage} ms`);
console.log(`Legitimate Delay Avg   : ${delaySummary.legitimateAverage} ms`);
console.log(`Maximum Delay          : ${delaySummary.maximum} ms`);

console.log("------------------------------------------------------");

console.log("Mitigation Summary");

console.log(
    `No Mitigation         : ${mitigationSummary.none} (${mitigationSummary.nonePercent}%)`
);

console.log(
    `Light Mitigation      : ${mitigationSummary.light} (${mitigationSummary.lightPercent}%)`
);

console.log(
    `Moderate Mitigation   : ${mitigationSummary.moderate} (${mitigationSummary.moderatePercent}%)`
);

console.log(
    `Aggressive Mitigation : ${mitigationSummary.aggressive} (${mitigationSummary.aggressivePercent}%)`
);

console.log("------------------------------------------------------");

console.log("Risk Distribution (Request)");

console.log(`LOW                    : ${riskDistribution.LOW}`);
console.log(`MEDIUM                 : ${riskDistribution.MEDIUM}`);
console.log(`HIGH                   : ${riskDistribution.HIGH}`);
console.log(`CRITICAL               : ${riskDistribution.CRITICAL}`);

console.log("------------------------------------------------------");

console.log("Score Summary");

console.log(`Average Score          : ${scoreSummary.average}`);
console.log(`Peak Score             : ${scoreSummary.peak}`);
console.log(`Peak RPM               : ${scoreSummary.peakRPM}`);

console.log("------------------------------------------------------");

console.log("Dataset Summary");

console.log(`Stored Requests        : ${experiment.summary.totalLogs}`);
console.log(`Delayed Requests       : ${experiment.summary.delayedRequests}`);
console.log(`Total Delay            : ${experiment.summary.totalDelay} ms`);
console.log(`Average Delay          : ${experiment.summary.averageDelay} ms`);
console.log(`Unique Clients         : ${experiment.summary.uniqueClients}`);

console.log("======================================================");
console.log("");
