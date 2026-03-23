const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const invoiceRoutes = require('./routes/invoiceRoutes');
const quotationRoutes = require('./routes/quotationRoutes');

dotenv.config();

const app = express();
const PORT = 8039;
const HOST = '192.168.4.69';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Registrar rutas
invoiceRoutes(app);
quotationRoutes(app);

app.listen(PORT, HOST, () => {
    console.log(`Backend server running at http://${HOST}:${PORT}`);
});