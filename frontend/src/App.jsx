import React, { useState } from 'react';
import InvoiceQuery from './components/InvoiceQuery';
import './App.css';

const App = () => {
    const [invoiceData, setInvoiceData] = useState(null);

    const handleInvoiceData = (data) => {
        setInvoiceData(data);
    };

    return (
        <div className="container">
            <h1>Consulta de Facturas</h1>
            <InvoiceQuery onInvoiceData={handleInvoiceData} />
            {invoiceData && (
                <div className="invoice-details">
                    <h2>Detalles de Factura</h2>
                    <p><strong>Factura:</strong> {invoiceData.Factura}</p>
                    <p><strong>Nota:</strong> {invoiceData.Nota}</p>
                    <p><strong>Cotización:</strong> {invoiceData.Cotizacion}</p>
                </div>
            )}
        </div>
    );
};

export default App;