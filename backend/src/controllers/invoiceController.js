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
                    n.fact_num = @number
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
                    n.num_doc = @number
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