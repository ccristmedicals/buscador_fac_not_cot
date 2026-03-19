const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const invoiceRoutes = require('./routes/invoiceRoutes');

dotenv.config();

const app = express();
const PORT = 8039;
const HOST = '192.168.4.23';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Si invoiceRoutes devuelve un Router de Express:
// app.use('/api', invoiceRoutes);

// Como lo tienes actualmente, pasando la app a la función:
invoiceRoutes(app);

app.listen(PORT, HOST, () => {
    console.log(`Backend server running at http://${HOST}:${PORT}`);
});