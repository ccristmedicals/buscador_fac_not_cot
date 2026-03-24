import React, { useState } from 'react';

const InvoiceQuery = () => {
    const [docType, setDocType] = useState('cotizacion');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceData, setInvoiceData] = useState([]);
    const [error, setError] = useState('');

    // Estado para la exportación de cotizaciones por día
    const [exportDate, setExportDate] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState('');

    const handleInputChange = (e) => {
        setInvoiceNumber(e.target.value);
    };

    const handleTypeChange = (e) => {
        setDocType(e.target.value);
    };

    const handleExportDateChange = (e) => {
        setExportDate(e.target.value);
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

    const handleExportQuotes = async (e) => {
        e.preventDefault();
        if (!exportDate) return;

        setIsExporting(true);
        setExportError('');

        try {
            const response = await fetch(`/api/invoices/export/quotes?date=${exportDate}`);
            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: 'Error al generar CSV' }));
                throw new Error(errData.error || 'Error al generar CSV');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cotizaciones_${exportDate}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setExportError('Error al descargar reporte: ' + err.message);
        } finally {
            setIsExporting(false);
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

            <div className="search-divider" style={{ margin: '20px 0', textAlign: 'center', color: '#0e0f0fff' }}>O</div>

            <div className="export-panel" style={{ backgroundColor: '#bdbfc2ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #c0c2c5ff', marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', color: '#121212ff' }}>Exportar Cotizaciones por Día</h3>
                <form onSubmit={handleExportQuotes} className="query-form" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="date"
                        value={exportDate}
                        onChange={handleExportDateChange}
                        required
                        className="query-input"
                        style={{ flex: 1 }}
                    />
                    <button
                        type="submit"
                        className="query-btn secondary"
                        disabled={isExporting}
                        style={{ backgroundColor: '#4f46e5' }}
                    >
                        {isExporting ? 'Generando...' : '📊 Exportar a Excel (CSV)'}
                    </button>
                </form>
                {exportError && <div className="error-message" style={{ marginTop: '1rem' }}>{exportError}</div>}
            </div>

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