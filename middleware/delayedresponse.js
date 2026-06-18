const stats =
    require('../monitoring/stats');

const clients = new Map();

const WINDOW_MS = 60_000;

module.exports = async (
    req,
    res,
    next
) => {

    const clientId =
        req.get('User-Agent') || req.ip;

    const now = Date.now();

    stats.totalRequests++;

    if (!clients.has(clientId)) {

        clients.set(clientId, {
            timestamps: [],
            score: 0
        });

    }

    if (!stats.clients[clientId]) {

        stats.clients[clientId] = {
            requests: 0,
            delayed: 0,
            totalDelay: 0,
            maxScore: 0
        };

    }

    const client =
        clients.get(clientId);

    const clientStats =
        stats.clients[clientId];

    clientStats.requests++;

    // Sliding window 60 detik
    client.timestamps =
        client.timestamps.filter(
            time => now - time < WINDOW_MS
        );

    client.timestamps.push(now);

    const rpm =
        client.timestamps.length;

    /*
     * Risk scoring
     */

    if (rpm <= 100) {

        // Perilaku normal:
        // score cepat turun
        client.score *= 0.90;

    } else {

        // Perilaku agresif:
        // score naik perlahan
        client.score = Math.min(
            client.score + 0.5,
            200
        );

    }

    clientStats.maxScore =
        Math.max(
            clientStats.maxScore,
            client.score
        );

    /*
     * Adaptive delay
     */

    const delay =
        Math.min(
            Math.floor(
                client.score * 5
            ),
            2000
        );

    if (delay > 0) {

        stats.delayedRequests++;

        stats.totalDelay += delay;

        clientStats.delayed++;

        clientStats.totalDelay += delay;

        await new Promise(resolve =>
            setTimeout(resolve, delay)
        );

    }

    next();

};