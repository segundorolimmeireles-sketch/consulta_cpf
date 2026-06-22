require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configurar conexão com Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Servir arquivos estáticos
app.use(express.static('public'));

// Rota para buscar dados por CPF, nome ou contato
app.get('/api/buscar', async (req, res) => {
  const { termo } = req.query;
  
  if (!termo || termo.trim() === '') {
    return res.json({ 
      success: false, 
      message: 'Por favor, forneça um termo de busca',
      dados: [] 
    });
  }
  
  try {
    const termoLimpo = termo.trim();
    
    const result = await pool.query(`
      SELECT 
        cod, 
        cpf_pagador as cpf, 
        nome_cliente as nome_completo,
        contato_cliente as contato,
        contato_cliente2 as contato2,
        valor_cod as valor_total, 
        recebido as pago, 
        resta, 
        dt_vencimento as data_vencimento,
        tipo,
        endereco,
        referencia,
        obs,
        dt_pagamento,
        parcela,
        ficha,
        nome_emp,
        uf,
        cidade,
        baixa
      FROM public.tb_boletos 
      WHERE 
        cpf_pagador ILIKE $1 
        OR nome_cliente = $2
        OR contato_cliente ILIKE $1
        OR contato_cliente2 ILIKE $1
      ORDER BY dt_vencimento DESC
      LIMIT 50
    `, [`%${termoLimpo}%`, termoLimpo]);
    
    console.log(`🔍 Busca realizada: "${termoLimpo}" - ${result.rows.length} resultados`);
    console.log('Primeiro resultado:', result.rows[0]); // Debug
    
    res.json({ 
      success: true, 
      termo: termoLimpo,
      total: result.rows.length,
      dados: result.rows 
    });
    
  } catch (err) {
    console.error('Erro na consulta:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar dados no banco',
      error: err.message 
    });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
  console.log(`📡 Conectado ao Neon Database`);
});