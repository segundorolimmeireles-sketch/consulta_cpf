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

// Função para converter valor do formato '$150,00' para número
function converterValor(valor) {
  if (!valor || valor === 'null' || valor === 'NaN') return null;
  
  // Se já for número, retorna ele
  if (typeof valor === 'number') return valor;
  
  // Converte string: remove $, substitui , por . e converte para número
  const valorLimpo = String(valor)
    .replace('$', '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  
  const numero = parseFloat(valorLimpo);
  return isNaN(numero) ? null : numero;
}

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
    
    // Converter os valores de string para número
    const dadosConvertidos = result.rows.map(row => ({
      ...row,
      valor_total: converterValor(row.valor_total),
      pago: converterValor(row.pago),
      resta: converterValor(row.resta)
    }));
    
    console.log(`🔍 Busca realizada: "${termoLimpo}" - ${dadosConvertidos.length} resultados`);
    
    res.json({ 
      success: true, 
      termo: termoLimpo,
      total: dadosConvertidos.length,
      dados: dadosConvertidos 
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

// Rota de teste de conexão
app.get('/api/teste-conexao', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    const resultValores = await pool.query('SELECT valor_cod, recebido, resta FROM public.tb_boletos LIMIT 1');
    
    console.log('Valores originais do banco:', resultValores.rows[0]);
    
    const convertido = {
      valor_total: converterValor(resultValores.rows[0].valor_cod),
      pago: converterValor(resultValores.rows[0].recebido),
      resta: converterValor(resultValores.rows[0].resta)
    };
    
    console.log('Valores convertidos:', convertido);
    
    res.json({ 
      success: true, 
      message: 'Conexão com Neon funcionando!',
      timestamp: result.rows[0].now,
      valores_originais: resultValores.rows[0],
      valores_convertidos: convertido
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      message: 'Erro de conexão com Neon',
      error: err.message 
    });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
  console.log(`📡 Conectado ao Neon Database`);
});