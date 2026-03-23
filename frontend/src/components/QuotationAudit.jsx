import React, { useState, useEffect } from 'react';

const QuotationAudit = () => {
    const [docNum, setDocNum] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Estados de Datos
    const [rangeResults, setRangeResults] = useState([]); 
    const [detailData, setDetailData] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, total: 0, hasMore: false });
    
    // Estados de Control
    const [nextBatch, setNextBatch] = useState(null);
    const [isLoadingNext, setIsLoadingNext] = useState(false);
    const [viewMode, setViewMode] = useState('search');
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [currency, setCurrency] = useState('Bs');

    // --- BÚSQUEDA ---
    const searchByDoc = async (targetDoc) => {
        if (!targetDoc) return;
        setError('');
        setLoading(true);
        try {
            const response = await fetch(`/api/audit/quotation/${targetDoc}`);
            if (!response.ok) throw new Error('Cotización no encontrada');
            const result = await response.json();
            setDetailData(result);
            setViewMode('detail');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const searchByRange = async (e) => {
        if (e) e.preventDefault();
        setError('');
        setLoading(true);
        setRangeResults([]);
        setNextBatch(null);
        try {
            const data = await fetchPageData(1);
            setRangeResults(data.results);
            setPagination(data.pagination);
            setViewMode('list');
            
            if (data.pagination.hasMore) prefetchNext(2);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchPageData = async (pageToFetch) => {
        const response = await fetch(`/api/audit/range?start=${startDate}&end=${endDate}&page=${pageToFetch}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Error al consultar rango');
        return data;
    };

    const prefetchNext = async (pageToPrefetch) => {
        if (isLoadingNext) return;
        setIsLoadingNext(true);
        try {
            const data = await fetchPageData(pageToPrefetch);
            setNextBatch(data);
        } catch (err) {
            console.warn("[PREFETCH] Error:", err);
        } finally {
            setIsLoadingNext(false);
        }
    };

    const loadMore = async () => {
        if (loadingMore || !pagination.hasMore) return;

        if (nextBatch && nextBatch.pagination.page === pagination.page + 1) {
            const data = nextBatch;
            setRangeResults(prev => [...prev, ...data.results]);
            setPagination(data.pagination);
            setNextBatch(null);
            if (data.pagination.hasMore) prefetchNext(data.pagination.page + 1);
            return;
        }

        setLoadingMore(true);
        try {
            const data = await fetchPageData(pagination.page + 1);
            setRangeResults(prev => [...prev, ...data.results]);
            setPagination(data.pagination);
            if (data.pagination.hasMore) prefetchNext(data.pagination.page + 1);
        } catch (err) {
            setError('Error al cargar más resultados');
        } finally {
            setLoadingMore(false);
        }
    };

    // --- FORMATEO ---
    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('es-VE');
    };

    const formatNumber = (num, tasa, isDealPrice = false) => {
        if (num == null || isNaN(num) || num === 0) return '—';
        let value = isDealPrice ? (currency === 'Bs' ? num * tasa : num) : (currency === 'USD' ? num / tasa : num);
        return Number(value).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // --- LOGICA DETALLE ---
    const getComparisonRows = () => {
        if (!detailData) return [];
        const { quotation, deliveryNote, invoice } = detailData;
        const allArts = new Set([
            ...quotation.items.map(i => i.co_art),
            ...(deliveryNote.items || []).map(i => i.co_art),
            ...(invoice.items || []).map(i => i.co_art)
        ]);
        return Array.from(allArts).map(artCode => {
            const qI = quotation.items.find(i => i.co_art === artCode);
            const nI = (deliveryNote.items || []).find(i => i.co_art === artCode);
            const iI = (invoice.items || []).find(i => i.co_art === artCode);
            const dealP = qI?.deal_price_usd || nI?.deal_price_usd || iI?.deal_price_usd || 0;
            const dealPBs = dealP * quotation.header.tasa;
            const hasMismatch = [qI?.prec_vta, nI?.prec_vta, iI?.prec_vta].filter(p => p != null && p > 0).some(p => Math.abs(p - dealPBs) > 0.05);
            return { code: artCode, description: qI?.des_art || nI?.des_art || '?', dealP, qI, nI, iI, hasMismatch, dealPBs };
        });
    };

    if (viewMode === 'detail' && detailData) {
        const rows = getComparisonRows();
        const { quotation, deliveryNote, invoice, clientLevel } = detailData;
        return (
            <div className="query-container audit-container full-width animate-fade-in">
                <div className="detail-nav">
                    <button className="back-btn" onClick={() => setViewMode(rangeResults.length > 0 ? 'list' : 'search')}>
                        ← {rangeResults.length > 0 ? 'Volver al Listado' : 'Nueva Búsqueda'}
                    </button>
                    <div className="client-level-badge">Nivel Cliente: <strong>{clientLevel}</strong></div>
                </div>
                <div className="audit-controls-row">
                    <h2 className="detail-title">Auditoría: Cotización #{quotation.header.fact_num}</h2>
                    <button className="currency-toggle" onClick={() => setCurrency(currency === 'Bs' ? 'USD' : 'Bs')}>Ver en {currency === 'Bs' ? 'USD' : 'Bs'}</button>
                </div>
                <div className="audit-headers-row triple-view">
                    <div className="audit-header-card quote-card">
                        <div className="audit-card-top"><h3>Cotización</h3><span>Tasa: {quotation.header.tasa}</span></div>
                        <div className="audit-header-grid"><div className="audit-field"><span className="audit-label">Fecha</span><span className="audit-value">{formatDate(quotation.header.fec_emis)}</span></div><div className="audit-field"><span className="audit-label">Total</span><span className="audit-value">{formatNumber(quotation.header.tot_neto, quotation.header.tasa)}</span></div></div>
                    </div>
                    <div className={`audit-header-card note-card ${!deliveryNote.header ? 'empty-card' : ''}`}>
                        <div className="audit-card-top"><h3>Nota Entrega</h3><span>{deliveryNote.header ? `Tasa: ${deliveryNote.header.tasa}` : ''}</span></div>
                        <div className="audit-header-grid"><div className="audit-field"><span className="audit-label">Doc</span><span className="audit-value">{deliveryNote.header?.fact_num || 'N/A'}</span></div><div className="audit-field"><span className="audit-label">Total</span><span className="audit-value">{deliveryNote.header ? formatNumber(deliveryNote.header.tot_neto, deliveryNote.header.tasa) : '—'}</span></div></div>
                    </div>
                    <div className={`audit-header-card inv-card ${!invoice.header ? 'empty-card' : ''}`}>
                        <div className="audit-card-top"><h3>Factura</h3><span>{invoice.header ? `Tasa: ${invoice.header.tasa}` : ''}</span></div>
                        <div className="audit-header-grid"><div className="audit-field"><span className="audit-label">Doc</span><span className="audit-value">{invoice.header?.fact_num || 'N/A'}</span></div><div className="audit-field"><span className="audit-label">Total</span><span className="audit-value">{invoice.header ? formatNumber(invoice.header.tot_neto, invoice.header.tasa) : '—'}</span></div></div>
                    </div>
                </div>
                <div className="audit-table-wrapper">
                    <table className="results-table audit-table master-table complex-table">
                        <thead>
                            <tr className="header-group"><th rowSpan="2" className="sticky-col">Artículo</th><th rowSpan="2" className="border-deal">Precio Maestro ({currency})</th><th colSpan="3" className="border-q">Cotización</th><th colSpan="3" className="border-n">Nota</th><th colSpan="3" className="border-i">Factura</th><th rowSpan="2">Alert</th></tr>
                            <tr className="header-sub"><th className="border-q">Cant</th><th className="border-q">P. Real</th><th className="border-q">Neto</th><th className="border-n">Cant</th><th className="border-n">P. Real</th><th className="border-n">Neto</th><th className="border-i">Cant</th><th className="border-i">P. Real</th><th className="border-i">Neto</th></tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i} className={r.hasMismatch ? 'row-mismatch' : ''}>
                                    <td className="sticky-col"><div className="art-code">{r.code}</div><div className="art-desc">{r.description}</div></td>
                                    <td className="text-right deal-col">{formatNumber(r.dealP, quotation.header.tasa, true)}</td>
                                    <td className="text-right border-left-q">{r.qI?.total_art || '—'}</td><td className={`text-right ${r.qI && Math.abs(r.qI.prec_vta - r.dealPBs) > 0.05 ? 'val-error' : ''}`}>{r.qI ? formatNumber(r.qI.prec_vta, quotation.header.tasa) : '—'}</td><td className="text-right">{r.qI ? formatNumber(r.qI.reng_neto, quotation.header.tasa) : '—'}</td>
                                    <td className="text-right border-left-n">{r.nI?.total_art || '—'}</td><td className={`text-right ${r.nI && Math.abs(r.nI.prec_vta - r.dealPBs) > 0.05 ? 'val-error' : ''}`}>{r.nI ? formatNumber(r.nI.prec_vta, deliveryNote.header?.tasa || quotation.header.tasa) : '—'}</td><td className="text-right">{r.nI ? formatNumber(r.nI.reng_neto, deliveryNote.header?.tasa || quotation.header.tasa) : '—'}</td>
                                    <td className="text-right border-left-i">{r.iI?.total_art || '—'}</td><td className={`text-right ${r.iI && Math.abs(r.iI.prec_vta - r.dealPBs) > 0.05 ? 'val-error' : ''}`}>{r.iI ? formatNumber(r.iI.prec_vta, invoice.header?.tasa || quotation.header.tasa) : '—'}</td><td className="text-right">{r.iI ? formatNumber(r.iI.reng_neto, invoice.header?.tasa || quotation.header.tasa) : '—'}</td>
                                    <td className="text-center">{r.hasMismatch ? '❌' : '✅'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="query-container audit-container full-width">
            <h1 className="query-title">🔍 Módulo de Auditoría de Precios</h1>
            <div className="audit-search-panels">
                <div className="search-panel"><h3>Búsqueda Individual</h3><div className="query-form"><input type="text" value={docNum} onChange={(e) => setDocNum(e.target.value)} placeholder="N° Cotización" className="query-input" /><button onClick={() => searchByDoc(docNum)} className="query-btn" disabled={loading}>Auditar</button></div></div>
                <div className="search-divider">O</div>
                <div className="search-panel"><h3>Auditoría por Rango de Fechas</h3><form onSubmit={searchByRange} className="query-form"><div className="date-group"><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="query-input" /><span>➔</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="query-input" /></div><button type="submit" className="query-btn secondary" disabled={loading}>Buscar Rango</button></form></div>
            </div>
            {error && <div className="error-message">{error}</div>}
            {loading && <div className="loading-spinner">Accediendo a Profit 2k8...</div>}
            {viewMode === 'list' && (
                <div className="results-section animate-fade-in">
                    <div className="results-header-row">
                        <h2>Resultados <small>({rangeResults.length} de {pagination.total})</small></h2>
                        <button className="clear-btn" onClick={() => setViewMode('search')}>Limpiar</button>
                    </div>
                    <div className="summary-table-wrapper">
                        <table className="results-table summary-table">
                            <thead><tr><th>Cotización</th><th>Fecha</th><th>Cliente</th><th className="text-right">Total (Bs)</th><th className="text-center">Nota</th><th className="text-center">Factura</th><th className="text-center">Acción</th></tr></thead>
                            <tbody>
                                {Array.isArray(rangeResults) && rangeResults.map((res, i) => (
                                    <tr key={res.fact_num + i} className={`clickable-row ${res.errQ === 1 ? 'row-alert' : ''}`}>
                                        <td>
                                            <div className="doc-num-cell">
                                                <strong>{res.fact_num}</strong>
                                                {res.errQ === 1 && <span className="mismatch-badge pulse">⚠️ ALERTA</span>}
                                            </div>
                                        </td>
                                        <td>{formatDate(res.fec_emis)}</td>
                                        <td><div className="cli-code">{res.co_cli}</div><div className="cli-name">{res.cli_des}</div></td>
                                        <td className="text-right">{formatNumber(res.tot_neto, 1)}</td>
                                        <td className="text-center">{res.note_num ? <span className="status-badge success">✓ {res.note_num}</span> : <span className="status-badge gray">N/A</span>}</td>
                                        <td className="text-center">{res.inv_num ? <span className="status-badge warning">✓ {res.inv_num}</span> : <span className="status-badge gray">N/A</span>}</td>
                                        <td className="text-center"><button className="view-detail-btn" onClick={() => searchByDoc(res.fact_num)}>Auditar Detalle</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {pagination.hasMore && (
                        <div className="load-more-section">
                            <button className={`load-more-btn ${nextBatch ? 'ready' : ''}`} onClick={loadMore} disabled={loadingMore && !nextBatch}>
                                {loadingMore && !nextBatch ? 'Cargando...' : nextBatch ? 'Mostrar Siguientes 50' : 'Cargar más resultados'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QuotationAudit;
