const { getConnection, sql } = require('../db/connection');

exports.getInvoice = async (req, res) => {
    try {
        const type = req.params.type;
        const number = req.params.number; 
        const pool = await getConnection();

        let baseQuery = '';
        
        // Optimización: Dependiendo de lo que estemos buscando, iniciamos desde esa tabla
        // y hacemos los joins correspondientes. Esto es muchísimo más rápido que un FULL OUTER JOIN global.
        if (type === 'factura') {
            baseQuery = `
                SELECT DISTINCT
                    f.fact_num AS Factura,
                    f.num_doc AS Nota,
                    n.num_doc AS Cotizacion
                FROM 
                    reng_fac AS f WITH(NOLOCK)
                LEFT JOIN 
                    reng_nde AS n WITH(NOLOCK) ON f.num_doc = n.fact_num AND n.tipo_doc = 'T'
                WHERE 
                    f.fact_num = @number
            `;
        } else if (type === 'nota') {
            baseQuery = `
                SELECT DISTINCT
                    f.fact_num AS Factura,
                    n.fact_num AS Nota,
                    n.num_doc AS Cotizacion
                FROM 
                    reng_nde AS n WITH(NOLOCK)
                LEFT JOIN 
                    reng_fac AS f WITH(NOLOCK) ON f.num_doc = n.fact_num AND n.tipo_doc = 'T'
                WHERE 
                    n.fact_num = @number AND n.tipo_doc = 'T'
            `;
        } else if (type === 'cotizacion') {
            baseQuery = `
                SELECT DISTINCT
                    f.fact_num AS Factura,
                    n.fact_num AS Nota,
                    n.num_doc AS Cotizacion
                FROM 
                    reng_nde AS n WITH(NOLOCK)
                LEFT JOIN 
                    reng_fac AS f WITH(NOLOCK) ON f.num_doc = n.fact_num AND n.tipo_doc = 'T'
                WHERE 
                    n.num_doc = @number AND n.tipo_doc = 'T'
            `;
        } else {
            return res.status(400).json({ error: "Tipo de documento inválido" });
        }
        
        const result = await pool.request()
            .input('number', sql.VarChar, number)
            .query(baseQuery);

        if (result.recordset.length > 0) {
            res.json(result.recordset); // Ahora devolvemos todos los resultados encontrados
        } else {
            res.status(404).json({ message: "Documento no encontrado en la base de datos" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al realizar la consulta" });
    }
};

/**
 * Exportar Cotizaciones de un Día Específico a CSV (Excel compatible)
 */
exports.exportQuotesByDay = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ error: "Fecha requerida (date)" });
        }

        const pool = await getConnection();
        
        const exportQuery = `
            SELECT 
                c.fact_num, 
                c.fec_emis, 
                c.co_cli, 
                cl.cli_des, 
                c.co_ven, 
                c.status, 
                c.tot_neto, 
                c.tasa,
                MAX(rn.fact_num) as note_num,
                MAX(rf.fact_num) as inv_num
            FROM cotiz_c c WITH(NOLOCK)
            LEFT JOIN clientes cl WITH(NOLOCK) ON c.co_cli = cl.co_cli
            LEFT JOIN reng_nde rn WITH(NOLOCK) ON rn.num_doc = c.fact_num AND rn.tipo_doc = 'T'
            LEFT JOIN reng_fac rf WITH(NOLOCK) ON rf.num_doc = rn.fact_num
            WHERE c.fec_emis >= CAST(@tarDate AS DATETIME) 
              AND c.fec_emis < DATEADD(day, 1, CAST(@tarDate AS DATETIME))
            GROUP BY 
                c.fact_num, c.fec_emis, c.co_cli, cl.cli_des, c.co_ven, c.status, c.tot_neto, c.tasa
            ORDER BY c.fec_emis DESC
        `;

        const request = pool.request();
        // Aumentar timeout por si hay muchos datos (ms)
        request.requestTimeout = 120000;  

        const result = await request
            .input('tarDate', sql.Date, date)
            .query(exportQuery);

        // Cabeceras CSV
        const headers = ["Cotización", "Fecha", "Cód. Cliente", "Cliente", "Vendedor", "Estatus", "Tasa", "Total Neto", "Nota", "Factura"];
        
        // Generar contenido CSV (Uso de ";" para compatibilidad Excel en español)
        let csvContent = headers.join(";") + "\r\n";
        
        result.recordset.forEach(r => {
            const row = [
                r.fact_num ? String(r.fact_num).trim() : '',
                r.fec_emis ? new Date(r.fec_emis).toLocaleDateString('es-VE') : '',
                r.co_cli ? String(r.co_cli).trim() : '',
                r.cli_des ? `"${String(r.cli_des).trim().replace(/"/g, '""')}"` : '',
                r.co_ven ? String(r.co_ven).trim() : '',
                r.status ? String(r.status).trim() : '',
                r.tasa ? r.tasa : '',
                r.tot_neto ? r.tot_neto : '',
                r.note_num ? String(r.note_num).trim() : 'N/A',
                r.inv_num ? String(r.inv_num).trim() : 'N/A'
            ];
            csvContent += row.join(";") + "\r\n";
        });

        // Añadir BOM (Byte Order Mark) para que Excel reconozca UTF-8 correctamente
        const bom = Buffer.from('\uFEFF', 'utf8');
        const bufferContent = Buffer.from(csvContent, 'utf8');
        const buffer = Buffer.concat([bom, bufferContent]);

        // Configurar Headers para descarga de CSV
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="cotizaciones_${date}.csv"`);
        
        res.status(200).send(buffer);

    } catch (error) {
        console.error("Error al exportar cotizaciones:", error);
        res.status(500).json({ error: "Error al exportar csv de cotizaciones", details: error.message });
    }
};