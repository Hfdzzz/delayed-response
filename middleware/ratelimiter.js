const clients = new Map();

module.exports = (req, res, next) => {

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

    if (requests.length > 100) {

        return res.status(429).json({
            success: false,
            message: "Too Many Requests"
        });

    }

    next();
};