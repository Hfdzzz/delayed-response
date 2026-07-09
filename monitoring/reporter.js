const fs = require("fs");
const path = require("path");

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const LOG_DIR =
    path.join(__dirname, "../logs");

/*
|--------------------------------------------------------------------------
| Threshold
|--------------------------------------------------------------------------
|
| Default:
|
| node reporter.js delayed.json
|
| node reporter.js delayed.json 40
|
*/

const FILE_NAME =
    process.argv[2];

if (!FILE_NAME) {

    console.log("");

    console.log(
        "Usage:"
    );

    console.log(
        "node reporter.js delayed.json"
    );

    console.log(
        "node reporter.js delayed.json 40"
    );

    process.exit(0);

}

const THRESHOLD =

    Number(process.argv[3]) ||

    40;

/*
|--------------------------------------------------------------------------
| Read JSON
|--------------------------------------------------------------------------
*/

const filePath =

    path.join(

        LOG_DIR,

        FILE_NAME

    );

if (

    !fs.existsSync(filePath)

) {

    console.log("");

    console.log(

        "Log file not found."

    );

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
| Confusion Matrix
|--------------------------------------------------------------------------
*/

let TP = 0;

let FP = 0;

let TN = 0;

let FN = 0;

/*
|--------------------------------------------------------------------------
| Statistics
|--------------------------------------------------------------------------
*/

let totalScore = 0;

let totalDelay = 0;

let peakScore = 0;

let peakRPM = 0;

let attackRequests = 0;

let legitimateRequests = 0;

/*
|--------------------------------------------------------------------------
| Risk Distribution
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
| Process Every Request
|--------------------------------------------------------------------------
*/

for (const request of requests) {

    //--------------------------------------------------
    // Basic Statistics
    //--------------------------------------------------

    totalScore += request.score;

    totalDelay += request.delay;

    peakScore = Math.max(
        peakScore,
        request.score
    );

    peakRPM = Math.max(
        peakRPM,
        request.rpm
    );

    //--------------------------------------------------
    // Risk Distribution
    //--------------------------------------------------

    if (
        riskDistribution.hasOwnProperty(
            request.riskLevel
        )
    ) {

        riskDistribution[
            request.riskLevel
        ]++;

    }

    //--------------------------------------------------
    // Ground Truth
    //--------------------------------------------------

    const actualAttack =
        request.actual === "attack";

    if (actualAttack) {

        attackRequests++;

    } else {

        legitimateRequests++;

    }

    //--------------------------------------------------
    // Prediction
    //--------------------------------------------------

    let predictedAttack = false;

    /*
    |--------------------------------------------------------------------------
    | Delayed Response
    |
    | Menggunakan Risk Score
    |--------------------------------------------------------------------------
    */

    if (
        request.algorithm === "delayed"
    ) {

        predictedAttack =
            request.score >= THRESHOLD;

    }

    /*
    |--------------------------------------------------------------------------
    | Rate Limiting
    |
    | Menggunakan blocked
    |--------------------------------------------------------------------------
    */

    else if (
        request.algorithm === "ratelimit"
    ) {

        predictedAttack =
            request.blocked === true;

    }

    /*
    |--------------------------------------------------------------------------
    | Confusion Matrix
    |--------------------------------------------------------------------------
    */

    if (

        actualAttack &&
        predictedAttack

    ) {

        TP++;

    }

    else if (

        actualAttack &&
        !predictedAttack

    ) {

        FN++;

    }

    else if (

        !actualAttack &&
        predictedAttack

    ) {

        FP++;

    }

    else {

        TN++;

    }

}

/*
|--------------------------------------------------------------------------
| Average Statistics
|--------------------------------------------------------------------------
*/

const averageScore =

    requests.length === 0

        ? 0

        :

        Number(

            (

                totalScore /

                requests.length

            ).toFixed(2)

        );

const averageDelay =

    requests.length === 0

        ? 0

        :

        Number(

            (

                totalDelay /

                requests.length

            ).toFixed(2)

        );

/*
|--------------------------------------------------------------------------
| Evaluation Metrics
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Safe Division
|--------------------------------------------------------------------------
*/

function divide(a, b) {

    if (b === 0) {

        return 0;

    }

    return a / b;

}

/*
|--------------------------------------------------------------------------
| Confusion Matrix Metrics
|--------------------------------------------------------------------------
*/

const TPR =
    divide(
        TP,
        TP + FN
    );

const FPR =
    divide(
        FP,
        FP + TN
    );

const TNR =
    divide(
        TN,
        TN + FP
    );

const FNR =
    divide(
        FN,
        FN + TP
    );

const Precision =
    divide(
        TP,
        TP + FP
    );

const Recall =
    TPR;

const Accuracy =
    divide(
        TP + TN,
        TP + FP + TN + FN
    );

const Specificity =
    TNR;

const F1Score =

    (Precision + Recall) === 0

        ? 0

        :

        (

            2 *

            Precision *

            Recall

        )

        /

        (

            Precision +

            Recall

        );

/*
|--------------------------------------------------------------------------
| Percentage Helper
|--------------------------------------------------------------------------
*/

function percent(value) {

    return Number(

        (value * 100)

            .toFixed(2)

    );

}

/*
|--------------------------------------------------------------------------
| Convert to Percentage
|--------------------------------------------------------------------------
*/

const metrics = {

    TP,

    FP,

    TN,

    FN,

    TPR:
        percent(TPR),

    FPR:
        percent(FPR),

    TNR:
        percent(TNR),

    FNR:
        percent(FNR),

    Precision:
        percent(Precision),

    Recall:
        percent(Recall),

    Accuracy:
        percent(Accuracy),

    Specificity:
        percent(Specificity),

    F1Score:
        percent(F1Score)

};

/*
|--------------------------------------------------------------------------
| Report Header
|--------------------------------------------------------------------------
*/

console.log("\n");

console.log("======================================================");
console.log("          DDOS MITIGATION EXPERIMENT REPORT");
console.log("======================================================");

console.log(`Algorithm           : ${experiment.metadata.algorithm}`);

if (experiment.metadata.algorithm === "delayed") {

    console.log(`Threshold           : ${THRESHOLD}`);

}

console.log(`Experiment Time     : ${experiment.metadata.createdAt}`);

console.log("------------------------------------------------------");

/*
|--------------------------------------------------------------------------
| Traffic Summary
|--------------------------------------------------------------------------
*/

console.log("Traffic Summary");

console.log(`Total Requests      : ${requests.length}`);

console.log(`Attack Requests     : ${attackRequests}`);

console.log(`Legitimate Requests : ${legitimateRequests}`);

console.log(`Unique Clients      : ${experiment.summary.uniqueClients}`);

console.log("------------------------------------------------------");

/*
|--------------------------------------------------------------------------
| Confusion Matrix
|--------------------------------------------------------------------------
*/

console.log("Confusion Matrix");

console.log(`TP                  : ${TP}`);

console.log(`FP                  : ${FP}`);

console.log(`TN                  : ${TN}`);

console.log(`FN                  : ${FN}`);

console.log("------------------------------------------------------");

/*
|--------------------------------------------------------------------------
| Evaluation Metrics
|--------------------------------------------------------------------------
*/

console.log("Evaluation Metrics");

console.log(`TPR (Recall)        : ${metrics.TPR}%`);

console.log(`FPR                : ${metrics.FPR}%`);

console.log(`Precision          : ${metrics.Precision}%`);

console.log(`Accuracy           : ${metrics.Accuracy}%`);

console.log(`F1 Score           : ${metrics.F1Score}%`);

console.log(`Specificity        : ${metrics.Specificity}%`);

console.log(`False Neg. Rate    : ${metrics.FNR}%`);

console.log("------------------------------------------------------");

/*
|--------------------------------------------------------------------------
| Score Statistics
|--------------------------------------------------------------------------
*/

console.log("Score Statistics");

console.log(`Average Score      : ${averageScore}`);

console.log(`Peak Score         : ${peakScore}`);

console.log(`Peak RPM           : ${peakRPM}`);

console.log(`Average Delay      : ${averageDelay} ms`);

console.log("------------------------------------------------------");

/*
|--------------------------------------------------------------------------
| Risk Distribution
|--------------------------------------------------------------------------
*/

console.log("Risk Distribution");

console.log(`LOW                : ${riskDistribution.LOW}`);

console.log(`MEDIUM             : ${riskDistribution.MEDIUM}`);

console.log(`HIGH               : ${riskDistribution.HIGH}`);

console.log(`CRITICAL           : ${riskDistribution.CRITICAL}`);

console.log("------------------------------------------------------");

/*
|--------------------------------------------------------------------------
| Dataset Summary
|--------------------------------------------------------------------------
*/

console.log("Dataset");

console.log(`Stored Requests    : ${experiment.summary.totalLogs}`);

console.log(`Delayed Requests   : ${experiment.summary.delayedRequests}`);

console.log(`Total Delay        : ${experiment.summary.totalDelay} ms`);

console.log(`Average Delay      : ${experiment.summary.averageDelay} ms`);

console.log("======================================================");
console.log("");

/*
|--------------------------------------------------------------------------
| Threshold Optimizer
|--------------------------------------------------------------------------
*/

console.log("");
console.log("Threshold Optimization");
console.log("======================================================");

const thresholdResults = [];

for (

    let threshold = 10;

    threshold <= 100;

    threshold += 10

) {

    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (const request of requests) {

        const actualAttack =
            request.actual === "attack";

        let predictedAttack = false;

        if (request.algorithm === "delayed") {

            predictedAttack =
                request.score >= threshold;

        }

        else if (
            request.algorithm === "ratelimit"
        ) {

            predictedAttack =
                request.blocked === true;

        }

        if (
            actualAttack &&
            predictedAttack
        ) {

            tp++;

        }

        else if (
            actualAttack &&
            !predictedAttack
        ) {

            fn++;

        }

        else if (
            !actualAttack &&
            predictedAttack
        ) {

            fp++;

        }

        else {

            tn++;

        }

    }

    //--------------------------------------------------
    // Metrics
    //--------------------------------------------------

    const precision =
        divide(
            tp,
            tp + fp
        );

    const recall =
        divide(
            tp,
            tp + fn
        );

    const accuracy =
        divide(
            tp + tn,
            tp + fp + tn + fn
        );

    const fpr =
        divide(
            fp,
            fp + tn
        );

    const f1 =

        (precision + recall) === 0

            ? 0

            :

            (

                2 *

                precision *

                recall

            )

            /

            (

                precision +

                recall

            );

    thresholdResults.push({

        threshold,

        TPR:
            percent(recall),

        FPR:
            percent(fpr),

        Precision:
            percent(precision),

        Accuracy:
            percent(accuracy),

        F1:
            percent(f1)

    });

}

/*
|--------------------------------------------------------------------------
| Best Threshold
|--------------------------------------------------------------------------
*/

const bestThreshold =

    thresholdResults.reduce(

        (best, current) =>

            current.F1 > best.F1

                ? current

                : best

    );

console.table(thresholdResults);

console.log("");

console.log("======================================================");

console.log(
    `Recommended Threshold : ${bestThreshold.threshold}`
);

console.log(
    `Best F1 Score         : ${bestThreshold.F1}%`
);

console.log(
    `TPR                  : ${bestThreshold.TPR}%`
);

console.log(
    `FPR                  : ${bestThreshold.FPR}%`
);

console.log(
    `Precision            : ${bestThreshold.Precision}%`
);

console.log(
    `Accuracy             : ${bestThreshold.Accuracy}%`
);

console.log("======================================================");