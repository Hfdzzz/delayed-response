const express = require("express");
const path = require("path");

const app = express();

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

const delayedResponse =
    require("./middleware/delayedresponse");

const stats =
    require("./monitoring/stats");

setInterval(() => {

    stats.recordResourceUsage();

}, 1000);

/*
|--------------------------------------------------------------------------
| Configuration
|--------------------------------------------------------------------------
*/

const PORT =
    process.env.PORT || 3000;

const EXPERIMENT_NAME =
    process.env.EXPERIMENT || "delayed";

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(express.json());

app.use(delayedResponse);

app.use(

    express.static(

        path.join(
            __dirname,
            "public"
        )

    )

);

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {

    res.sendFile(

        path.join(

            __dirname,

            "public",

            "index.html"

        )

    );

});

app.get("/product", (req, res) => {

    res.sendFile(

        path.join(

            __dirname,

            "public",

            "deskripsiproduk.html"

        )

    );

});

app.get("/cart", (req, res) => {

    res.sendFile(

        path.join(

            __dirname,

            "public",

            "shoppingcart.html"

        )

    );

});

app.get("/checkout", (req, res) => {

    res.sendFile(

        path.join(

            __dirname,

            "public",

            "checkout.html"

        )

    );

});

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/health", (req, res) => {

    res.json({

        status: "OK",

        uptime:

            process.uptime(),

        requests:

            stats.totalRequests,

        delayed:

            stats.delayedRequests

    });

});

/*
|--------------------------------------------------------------------------
| Experiment Summary
|--------------------------------------------------------------------------
*/

app.get("/report", (req, res) => {

    res.json(

        stats.getSummary()

    );

});

/*
|--------------------------------------------------------------------------
| Save Experiment Before Exit
|--------------------------------------------------------------------------
*/

function shutdown() {

    console.log("");

    console.log(
        "Saving experiment logs..."
    );

    try {

        const file =

            stats.saveLogs(

                EXPERIMENT_NAME

            );

        console.log(
            "Experiment saved:"
        );

        console.log(file);

    }

    catch (err) {

        console.error(err);

    }

    process.exit(0);

}

process.on(
    "SIGINT",
    shutdown
);

process.on(
    "SIGTERM",
    shutdown
);

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {

    console.log("");

    console.log("==========================================");

    console.log(
        "Server started successfully"
    );

    console.log(
        `Port           : ${PORT}`
    );

    console.log(
        `Experiment     : ${EXPERIMENT_NAME}`
    );

    console.log(
        `Health Check   : http://localhost:${PORT}/health`
    );

    console.log(
        `Summary        : http://localhost:${PORT}/report`
    );

    console.log("==========================================");

    console.log("");

});