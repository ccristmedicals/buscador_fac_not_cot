const express = require('express');
const quotationController = require('../controllers/quotationController');

module.exports = (app) => {
    // Ruta para auditoría de cotizaciones
    app.get('/api/audit/quotation/:docNum', quotationController.getQuotationDetails);
    
    // Nueva ruta para auditoría por rango de fechas
    app.get('/api/audit/range', quotationController.getAuditByRange);

    // Ruta para exportar a CSV (Excel compatible)
    app.get('/api/audit/csv', quotationController.exportAuditToCSV);
};
