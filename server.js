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

// Função para converter valor do formato '$1,500.00' ou '$150.00' para número
function converterValor(valor) {
  if (!valor || valor === 'null' || valor === 'NaN') return null;
  
  // Se já for número, retorna ele
  if (typeof valor === 'number') return valor;
  
  // Converte para string e limpa
  let valorStr = String(valor).trim();
  
  // Remove o símbolo de moeda (R$ ou $)
  valorStr = valorStr.replace(/[R$\s]/g, '');
  
  // Remove vírgulas (separador de milhar) e converte para número
  // Ex: "1,500.00" -> "1500.00"
  valorStr = valorStr.replace(/,/g, '');
  
  const numero = parseFloat(valorStr);
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
    
    console.log(`🔍 Busca: "${termoLimpo}" - ${dadosConvertidos.length} resultados`);
    
    // Mostrar primeira conversão como exemplo
    if (dadosConvertidos.length > 0) {
      console.log('Exemplo conversão:', {
        original: result.rows[0].valor_total,
        convertido: dadosConvertidos[0].valor_total
      });
    }
    
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

// Rota de teste de conexão e conversão
app.get('/api/teste-conversao', async (req, res) => {
  try {
    const result = await pool.query('SELECT valor_cod, recebido, resta FROM public.tb_boletos LIMIT 5');
    
    const exemplos = result.rows.map(row => ({
      original: {
        valor_cod: row.valor_cod,
        recebido: row.recebido,
        resta: row.resta
      },
      convertido: {
        valor_cod: converterValor(row.valor_cod),
        recebido: converterValor(row.recebido),
        resta: converterValor(row.resta)
      }
    }));
    
    res.json({ 
      success: true,
      exemplos: exemplos
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor rodando em http://localhost:${port}`);
  console.log(`📡 Conectado ao Neon Database`);
});