const { getConnection, sql } = require('../db/connection');

/**
 * Helper para obtener artículos con Precio Maestro (Deal)
 * r: Tabla del renglón (Datos Reales de la operación)
 * a: Tabla de artículos (Referencia de precios maestros)
 */
const getItemsWithDealQuery = (table, filterCol, artPriceColumn) => {
    let extraCondition = '';
    if (table === 'reng_nde') {
        extraCondition = " AND r.tipo_doc = 'T'";
    }
    return `
        SELECT 
            r.reng_num, r.co_art, r.des_art, r.total_art, r.prec_vta, r.porc_desc, r.reng_neto, r.fact_num,
            a.${artPriceColumn} as deal_price_usd
        FROM ${table} AS r WITH(NOLOCK)
        LEFT JOIN art AS a WITH(NOLOCK) ON r.co_art = a.co_art
        WHERE r.${filterCol} = @filterVal ${extraCondition}
        ORDER BY r.reng_num
    `;
};

/**
 * Auditoría Individual (Detalle de 10 Columnas)
 */
exports.getQuotationDetails = async (req, res) => {
    try {
        const docNum = req.params.docNum;
        const pool = await getConnection();

        const quoteHeaderQuery = `
            SELECT c.fact_num, c.fec_emis, c.co_cli, c.co_ven, c.status, c.descrip, c.tot_bruto, c.iva, c.tot_neto, c.tasa,
                   tc.precio_a as cli_precio_nivel
            FROM cotiz_c AS c WITH(NOLOCK)
            LEFT JOIN clientes AS cl WITH(NOLOCK) ON c.co_cli = cl.co_cli
            LEFT JOIN tipo_cli AS tc WITH(NOLOCK) ON cl.tipo = tc.tip_cli
            WHERE c.fact_num = @docNum
        `;

        const quoteHeaderRes = await pool.request().input('docNum', sql.VarChar, docNum).query(quoteHeaderQuery);
        if (quoteHeaderRes.recordset.length === 0) return res.status(404).json({ message: "Cotización no encontrada" });

        const header = quoteHeaderRes.recordset[0];
        const cliPriceNivel = header.cli_precio_nivel || 'PRECIO 1';
        let artPriceCol = cliPriceNivel.includes('2') ? 'prec_vta2' : cliPriceNivel.includes('3') ? 'prec_vta3' : cliPriceNivel.includes('4') ? 'prec_vta4' : 'prec_vta1';

        const [quoteItemsRes, noteItemsInitRes] = await Promise.all([
            pool.request().input('filterVal', sql.VarChar, docNum).query(getItemsWithDealQuery('reng_cac', 'fact_num', artPriceCol)),
            pool.request().input('filterVal', sql.VarChar, docNum).query(getItemsWithDealQuery('reng_nde', 'num_doc', artPriceCol))
        ]);

        let noteHeaderData = null;
        let noteItemsData = noteItemsInitRes.recordset;
        let invoiceHeaderData = null;
        let invoiceItemsData = [];

        if (noteItemsData.length > 0 && noteItemsData[0].fact_num) {
            const noteDocNum = String(noteItemsData[0].fact_num).trim();
            if (noteDocNum !== 'undefined' && noteDocNum !== '') {
                const noteHeaderRes = await pool.request().input('noteDocNum', sql.VarChar, noteDocNum)
                    .query(`SELECT fact_num, fec_emis, co_cli, co_ven, status, descrip, tot_bruto, iva, tot_neto, tasa FROM not_ent WITH(NOLOCK) WHERE fact_num = @noteDocNum`);
                noteHeaderData = noteHeaderRes.recordset[0] || null;

                if (noteHeaderData) {
                    const invItemsRes = await pool.request().input('filterVal', sql.VarChar, noteDocNum).query(getItemsWithDealQuery('reng_fac', 'num_doc', artPriceCol));
                    invoiceItemsData = invItemsRes.recordset;

                    if (invoiceItemsData.length > 0 && invoiceItemsData[0].fact_num) {
                        const invDocNum = String(invoiceItemsData[0].fact_num).trim();
                        const invHeaderRes = await pool.request().input('invDocNum', sql.VarChar, invDocNum)
                            .query(`SELECT fact_num, fec_emis, co_cli, co_ven, status, descrip, tot_bruto, iva, tot_neto, tasa FROM factura WITH(NOLOCK) WHERE fact_num = @invDocNum`);
                        invoiceHeaderData = invHeaderRes.recordset[0] || null;
                    }
                }
            }
        }

        res.json({ clientLevel: cliPriceNivel, quotation: { header, items: quoteItemsRes.recordset }, deliveryNote: { header: noteHeaderData, items: noteItemsData }, invoice: { header: invoiceHeaderData, items: invoiceItemsData } });
    } catch (error) {
        res.status(500).json({ error: "Error en detalle auditoría", details: error.message });
    }
};

/**
 * Auditoría por Rango (Alta Velocidad: Síncrono con CTE)
 * Esta versión audita SOLAMENTE los 50 resultados paginados, eliminando el timeout.
 */
exports.getAuditByRange = async (req, res) => {
    try {
        const { start, end } = req.query;
        let page = parseInt(req.query.page) || 1;
        const limit = 50; 
        const offset = (page - 1) * limit;

        if (!start || !end) return res.status(400).json({ error: "Fechas requeridas (start, end)" });

        const pool = await getConnection();

        // 1. Conteo Total (Rápido)
        const countRes = await pool.request()
            .input('start', sql.DateTime, start)
            .input('end', sql.DateTime, end)
            .query(`SELECT COUNT(*) as total FROM cotiz_c WITH(NOLOCK) WHERE fec_emis BETWEEN @start AND @end`);
        
        const totalResults = countRes.recordset[0].total;

        // 2. Consulta CTE (Audita solo los 50 en pantalla)
        const rangeQuery = `
            WITH PagedDocs AS (
                SELECT 
                    fact_num, fec_emis, co_cli, tot_neto, tasa
                FROM cotiz_c WITH(NOLOCK)
                WHERE fec_emis BETWEEN @start AND @end
                ORDER BY fec_emis DESC
                OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
            )
            SELECT 
                p.*, cl.cli_des,
                rn.fact_num as note_num,
                rf.fact_num as inv_num,
                CASE WHEN EXISTS (
                    SELECT 1 FROM reng_cac r WITH(NOLOCK) 
                    JOIN art a WITH(NOLOCK) ON r.co_art = a.co_art
                    JOIN tipo_cli tc WITH(NOLOCK) ON cl.tipo = tc.tip_cli
                    WHERE r.fact_num = p.fact_num 
                      AND ABS(r.prec_vta - (CASE 
                        WHEN tc.precio_a LIKE '%2%' THEN a.prec_vta2 
                        WHEN tc.precio_a LIKE '%3%' THEN a.prec_vta3 
                        WHEN tc.precio_a LIKE '%4%' THEN a.prec_vta4 
                        ELSE a.prec_vta1 END * p.tasa)) > 0.06
                ) THEN 1 ELSE 0 END as errQ
            FROM PagedDocs AS p
            LEFT JOIN clientes AS cl WITH(NOLOCK) ON p.co_cli = cl.co_cli
            OUTER APPLY (
                SELECT TOP 1 n.fact_num FROM reng_nde n WITH(NOLOCK) WHERE n.num_doc = p.fact_num AND n.tipo_doc = 'T'
            ) rn
            OUTER APPLY (
                SELECT TOP 1 f.fact_num FROM reng_fac f WITH(NOLOCK) WHERE f.num_doc = rn.fact_num
            ) rf
        `;

        const request = pool.request();
        request.requestTimeout = 60000;
        const result = await request
            .input('start', sql.DateTime, start)
            .input('end', sql.DateTime, end)
            .query(rangeQuery);

        res.json({
            results: result.recordset,
            pagination: { page, limit, total: totalResults, hasMore: offset + result.recordset.length < totalResults }
        });
    } catch (error) {
        console.error("Error en Auditoría Síncrona:", error);
        res.status(500).json({ error: "Error al consultar auditoría", details: error.message });
    }
};
