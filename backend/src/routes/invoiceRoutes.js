const express = require('express');
const invoiceController = require('../controllers/invoiceController');

module.exports = (app) => {
    // Asegúrate de que la ruta comience con /api/invoices
    app.get('/api/invoices/:type/:number', invoiceController.getInvoice);
};