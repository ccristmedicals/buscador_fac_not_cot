import React, { useState } from 'react';

const InvoiceQuery = () => {
    const [docType, setDocType] = useState('cotizacion');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceData, setInvoiceData] = useState([]);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        setInvoiceNumber(e.target.value);
    };

    const handleTypeChange = (e) => {
        setDocType(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setInvoiceData([]);

        try {
            const response = await fetch(`/api/invoices/${docType}/${invoiceNumber}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Documento no encontrado' }));
                throw new Error(errorData.message || 'Error en la consulta');
            }
            const data = await response.json();
            setInvoiceData(data);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="query-container">
            <h1 className="query-title">Consulta de Documentos</h1>
            <form onSubmit={handleSubmit} className="query-form">
                <select 
                    value={docType} 
                    onChange={handleTypeChange} 
                    required 
                    className="query-select"
                >
                    <option value="cotizacion">Cotización</option>
                    <option value="nota">Nota de Entrega</option>
                    <option value="factura">Factura</option>
                </select>
                <input
                    type="text"
                    value={invoiceNumber}
                    onChange={handleInputChange}
                    placeholder="Ingrese número de documento"
                    required
                    className="query-input"
                />
                <button type="submit" className="query-btn">
                    Consultar
                </button>
            </form>

            {error && <div className="error-message">{error}</div>}

            {invoiceData && invoiceData.length > 0 && (
                <div className="results-section">
                    <h2>Resultados Encontrados: <span className="badge">{invoiceData.length}</span></h2>
                    <table className="results-table">
                        <thead>
                            <tr>
                                <th>Factura</th>
                                <th>Nota</th>
                                <th>Cotización</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceData.map((doc, index) => (
                                <tr key={index}>
                                    <td>{doc.Factura || <span style={{ color: '#9ca3af' }}>N/A</span>}</td>
                                    <td>{doc.Nota || <span style={{ color: '#9ca3af' }}>N/A</span>}</td>
                                    <td>{doc.Cotizacion || <span style={{ color: '#9ca3af' }}>N/A</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default InvoiceQuery;