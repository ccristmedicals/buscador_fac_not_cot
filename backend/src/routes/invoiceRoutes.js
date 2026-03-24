const express = require('express');
const invoiceController = require('../controllers/invoiceController');

module.exports = (app) => {
    // Asegúrate de que la ruta comience con /api/invoices
    // Ruta para exportar cotizaciones del día (descarga CSV compatible con Excel)
    app.get('/api/invoices/export/quotes', invoiceController.exportQuotesByDay);
    
    // Consulta individual
    app.get('/api/invoices/:type/:number', invoiceController.getInvoice);
};