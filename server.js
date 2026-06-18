const express = require('express');
const path = require('path');

const app = express();

const antiddos =
    require('./middleware/delayedresponse');

const stats =
    require('./monitoring/stats');

require('./monitoring/reporter');

app.use(antiddos);

app.use(express.json());

app.use(
    express.static(
        path.join(
            __dirname,
            'public'
        )
    )
);

app.get('/', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'public',
            'index.html'
        )
    );

});

app.get('/product', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'public',
            'deskripsiproduk.html'
        )
    );

});

app.get('/cart', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'public',
            'shoppingcart.html'
        )
    );

});

app.get('/checkout', (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            'public',
            'checkout.html'
        )
    );

});

/*
 * Endpoint laporan penelitian
 */
app.get('/report', (req, res) => {

    const report = {
        totalRequests:
            stats.totalRequests,

        delayedRequests:
            stats.delayedRequests,

        totalDelay:
            stats.totalDelay,

        clients:
            stats.clients
    };

    res.json(report);

});

const port = 3000;

app.listen(port, () => {

    console.log(
        'Server running on port ' + port
    );

});