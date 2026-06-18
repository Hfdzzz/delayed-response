const stats =
    require('../monitoring/stats');

const clients = new Map();

const WINDOW_MS = 60_000;
const NORMAL_RPM = 100;

const ignoredExtensions = [
    '.css',
    '.js',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.map'
];

module.exports = async (
    req,
    res,
    next
) => {

    // Abaikan asset statis
    const isAsset =
        ignoredExtensions.some(
            ext =>
                req.path.endsWith(ext)
        );

    if (isAsset) {
        return next();
    }

    const clientId =
        req.get('User-Agent') ||
        req.ip;

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
            maxScore: 0,
            peakRpm: 0
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
            time =>
                now - time < WINDOW_MS
        );

    client.timestamps.push(now);

    const rpm =
        client.timestamps.length;

    clientStats.peakRpm =
        Math.max(
            clientStats.peakRpm,
            rpm
        );

    /*
     * Risk scoring
     */

    if (rpm <= NORMAL_RPM) {

        // Turunkan score jika kembali normal
        client.score *= 0.90;

    } else {

        const excess =
            rpm - NORMAL_RPM;

        // Naik perlahan
        client.score = Math.min(
            client.score +
            (excess * 0.02),
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

    let delay = 0;

    if (rpm > NORMAL_RPM) {

        delay = Math.min(
            Math.floor(
                client.score * 5
            ),
            1000
        );

    }

    if (delay > 0) {

        stats.delayedRequests++;

        stats.totalDelay += delay;

        clientStats.delayed++;

        clientStats.totalDelay +=
            delay;

        await new Promise(
            resolve =>
                setTimeout(
                    resolve,
                    delay
                )
        );

    }

    next();

};