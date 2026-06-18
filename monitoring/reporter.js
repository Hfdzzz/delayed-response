const stats = require("./stats");

setInterval(() => {

    const rows = [];

    for (
        const [client, data]
        of Object.entries(stats.clients)
    ) {

        rows.push({

            Client: client,

            Requests:
                data.requests,

            Delayed:
                data.delayed,

            DelayRatio:
                data.requests
                    ? (
                        (
                            data.delayed /
                            data.requests
                        ) * 100
                      ).toFixed(2) + "%"
                    : "0%",

            AvgDelay:
                data.delayed
                    ? Math.round(
                        data.totalDelay /
                        data.delayed
                      ) + " ms"
                    : "0 ms",

            MaxScore:
                Math.round(
                    data.maxScore
                )

        });

    }

    console.clear();

    console.log(
        "\n=== Adaptive Delay Report ===\n"
    );

    console.log(
        "Total Requests:",
        stats.totalRequests
    );

    console.log(
        "Delayed Requests:",
        stats.delayedRequests
    );

    console.log(
        "Total Delay:",
        stats.totalDelay,
        "ms\n"
    );

    console.table(rows);

}, 10000);