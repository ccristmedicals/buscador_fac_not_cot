import React, { useState } from 'react';
import InvoiceQuery from './components/InvoiceQuery';
import QuotationAudit from './components/QuotationAudit';
import './App.css';

const App = () => {
    const [activeTab, setActiveTab] = useState('invoices');

    return (
        <div className="app-wrapper">
            <nav className="app-tabs">
                <button
                    className={`tab-btn ${activeTab === 'invoices' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('invoices')}
                >
                    📄 Consulta de Documentos
                </button>
                <button
                    className={`tab-btn ${activeTab === 'audit-quotation' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('audit-quotation')}
                >
                    🔍 Auditoría de Precios
                </button>
            </nav>

            <div className="tab-content">
                {activeTab === 'invoices' && <InvoiceQuery />}
                {activeTab === 'audit-quotation' && <QuotationAudit />}
            </div>
        </div>
    );
};

export default App;