const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "../logs");

const delayedFile = process.argv[2];
const ratelimitFile = process.argv[3];

if (!delayedFile || !ratelimitFile) {

    console.log("");
    console.log("Usage:");
    console.log(
        "node compare.js delayed.json ratelimit.json"
    );
    console.log("");

    process.exit(0);

}

const delayedPath =
    path.join(LOG_DIR, delayedFile);

const ratelimitPath =
    path.join(LOG_DIR, ratelimitFile);

if (!fs.existsSync(delayedPath)) {

    console.log("Delayed log not found.");
    process.exit(0);

}

if (!fs.existsSync(ratelimitPath)) {

    console.log("Rate Limit log not found.");
    process.exit(0);

}

const delayed =
    JSON.parse(
        fs.readFileSync(
            delayedPath,
            "utf8"
        )
    );

const ratelimit =
    JSON.parse(
        fs.readFileSync(
            ratelimitPath,
            "utf8"
        )
    );

/*
|--------------------------------------------------------------------------
| Helper
|--------------------------------------------------------------------------
*/

function divide(a, b) {

    if (b === 0) {

        return 0;

    }

    return a / b;

}

function percent(v) {

    return Number(
        (v * 100).toFixed(2)
    );

}

/*
|--------------------------------------------------------------------------
| Evaluate Experiment
|--------------------------------------------------------------------------
*/

function evaluate(experiment, threshold = 40) {

    let TP = 0;
    let FP = 0;
    let TN = 0;
    let FN = 0;

    let totalDelay = 0;
    let totalScore = 0;
    let peakScore = 0;

    for (const request of experiment.requests) {

        totalDelay += request.delay || 0;
        totalScore += request.score || 0;

        peakScore = Math.max(
            peakScore,
            request.score || 0
        );

        const actualAttack =
            request.actual === "attack";

        let predictedAttack = false;

        if (
            request.algorithm === "delayed"
        ) {

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

    const precision =
        divide(
            TP,
            TP + FP
        );

    const recall =
        divide(
            TP,
            TP + FN
        );

    const fpr =
        divide(
            FP,
            FP + TN
        );

    const accuracy =
        divide(
            TP + TN,
            TP + FP + TN + FN
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

    return {

        TP,
        FP,
        TN,
        FN,

        TPR:
            percent(recall),

        FPR:
            percent(fpr),

        Precision:
            percent(precision),

        Accuracy:
            percent(accuracy),

        F1:
            percent(f1),

        AverageDelay:

            Number(

                (

                    totalDelay /

                    experiment.requests.length

                ).toFixed(2)

            ),

        AverageScore:

            Number(

                (

                    totalScore /

                    experiment.requests.length

                ).toFixed(2)

            ),

        PeakScore:
            Number(
                peakScore.toFixed(2)
            )

    };

}

/*
|--------------------------------------------------------------------------
| Evaluation
|--------------------------------------------------------------------------
*/

const delayedResult =
    evaluate(delayed);

const ratelimitResult =
    evaluate(ratelimit);

/*
|--------------------------------------------------------------------------
| Comparison Report
|--------------------------------------------------------------------------
*/

console.log("");
console.log("==============================================================");
console.log("        RATE LIMITING vs DELAYED RESPONSE");
console.log("==============================================================");
console.log("");

const table = [

    {

        Metric: "TP",

        "Rate Limiting":
            ratelimitResult.TP,

        "Delayed Response":
            delayedResult.TP

    },

    {

        Metric: "FP",

        "Rate Limiting":
            ratelimitResult.FP,

        "Delayed Response":
            delayedResult.FP

    },

    {

        Metric: "TN",

        "Rate Limiting":
            ratelimitResult.TN,

        "Delayed Response":
            delayedResult.TN

    },

    {

        Metric: "FN",

        "Rate Limiting":
            ratelimitResult.FN,

        "Delayed Response":
            delayedResult.FN

    },

    {

        Metric: "TPR (%)",

        "Rate Limiting":
            ratelimitResult.TPR,

        "Delayed Response":
            delayedResult.TPR

    },

    {

        Metric: "FPR (%)",

        "Rate Limiting":
            ratelimitResult.FPR,

        "Delayed Response":
            delayedResult.FPR

    },

    {

        Metric: "Precision (%)",

        "Rate Limiting":
            ratelimitResult.Precision,

        "Delayed Response":
            delayedResult.Precision

    },

    {

        Metric: "Accuracy (%)",

        "Rate Limiting":
            ratelimitResult.Accuracy,

        "Delayed Response":
            delayedResult.Accuracy

    },

    {

        Metric: "F1 Score (%)",

        "Rate Limiting":
            ratelimitResult.F1,

        "Delayed Response":
            delayedResult.F1

    },

    {

        Metric: "Average Delay (ms)",

        "Rate Limiting":
            ratelimitResult.AverageDelay,

        "Delayed Response":
            delayedResult.AverageDelay

    },

    {

        Metric: "Average Score",

        "Rate Limiting":
            ratelimitResult.AverageScore,

        "Delayed Response":
            delayedResult.AverageScore

    }

];

console.table(table);

/*
|--------------------------------------------------------------------------
| Winner Summary
|--------------------------------------------------------------------------
*/

console.log("");

console.log("Recommendation");
console.log("--------------------------------------------------------------");

console.log(
    delayedResult.FPR < ratelimitResult.FPR
        ? "✓ Delayed Response menghasilkan False Positive Rate yang lebih rendah."
        : "✓ Rate Limiting menghasilkan False Positive Rate yang lebih rendah."
);

console.log(
    delayedResult.F1 > ratelimitResult.F1
        ? "✓ Delayed Response memiliki F1 Score lebih tinggi."
        : "✓ Rate Limiting memiliki F1 Score lebih tinggi."
);

console.log(
    delayedResult.Accuracy > ratelimitResult.Accuracy
        ? "✓ Delayed Response memiliki Accuracy lebih tinggi."
        : "✓ Rate Limiting memiliki Accuracy lebih tinggi."
);

console.log("");
console.log("==============================================================");