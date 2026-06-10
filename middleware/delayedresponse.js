const clients = new Map();

module.exports = async (
    req,
    res,
    next
) => {

    const ip = req.ip;
    const now = Date.now();

    if (!clients.has(ip)) {
        clients.set(ip, []);
    }

    let requests = clients.get(ip);

    requests = requests.filter(
        time => now - time < 60000
    );

    requests.push(now);

    clients.set(ip, requests);

    const limit = 100;

    if (requests.length > limit) {

        const excess =
            requests.length - limit;

        const delay =
            Math.min(
                excess * 100,
                5000
            );

        await new Promise(resolve =>
            setTimeout(resolve, delay)
        );
    }

    next();
};