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

// Rota para buscar dados
app.get('/api/boletos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        cod, 
        cpf_pagador as cpf, 
        nome_cliente as nome_completo, 
        valor_cod as valor_total, 
        recebido as pago, 
        resta, 
        dt_vencimento as data_vencimento 
      FROM public.tb_boletos 
      ORDER BY dt_vencimento DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro na consulta:', err);
    res.status(500).json({ error: 'Erro ao buscar dados' });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});