const express = require('express');
const path = require('path');

const app = express();

const antiddos =
    require('./middleware/ratelimiter');

app.use(antiddos);

app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, 'public')
  )
);

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

app.listen(3000, () => {
  console.log(
    'Server running on http://localhost:3000'
  );
});