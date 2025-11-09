# 🚕 Análise de Dados de Táxis NYC - Sistema Completo de Visualização

Sistema de análise comparativa de corridas de táxis amarelos de NYC entre 2019 (pré-pandemia) e 2020 (pandemia), utilizando **DuckDB** para processamento analítico e **D3.js** para visualizações interativas.

## ✨ Características Principais

### 🎯 Pipeline Completo de Dados
- ✅ **Leitura direta** de arquivos Parquet originais (NYC TLC)
- ✅ **DuckDB embarcado** para processamento analítico in-browser
- ✅ **10 regras de limpeza** aplicadas automaticamente
- ✅ **Detecção de duplicatas** via hash MD5
- ✅ **Validação de consistência** de valores monetários
- ✅ **Streaming/chunked loading** para volumes grandes

### 📊 Visualizações Implementadas (D3.js)

#### 1. Qualidade dos Dados
- 📈 Registros por mês (barras agrupadas)
- 📊 Estatísticas de limpeza (cards)
- 🔴 Registros removidos por regra (barras)
- 📄 Resumo textual de qualidade

#### 2. Análise Temporal
- 🔥 **Heatmap hora × dia da semana** (2019 vs 2020)
- 📊 Viagens por hora do dia
- 📊 Viagens por dia da semana
- 📈 Tendência mensal (viagens e receita)

#### 3. Perfil de Viagem
- 📊 Histograma de distâncias (sobreposto)
- 👥 Distribuição de passageiros

#### 4. Análise de Tarifas
- 📊 Composição média (8 componentes empilhados)
- 📊 Distribuição por faixa de valor
- 🔵 Correlação distância × tarifa (scatter)

#### 5. Métodos de Pagamento
- 💳 Distribuição por tipo
- 💰 Gorjetas médias por método
- 📈 Tendência de pagamentos com cartão

#### 6. Impacto da Pandemia
- 📉 Volume comparativo mensal
- 📊 Mudanças de comportamento

## 🚀 Como Usar

### Pré-requisitos
1. Baixar os dados originais: [NYC TLC Trip Records](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page)
2. Colocar os arquivos Parquet em:
   ```
   Data/2019/yellow_tripdata_2019-{07-12}.parquet
   Data/2020/yellow_tripdata_2020-{07-12}.parquet
   ```

### Execução

#### PowerShell (Windows)
```powershell
cd "caminho\do\projeto"
python -m http.server 8000
# ou
php -S localhost:8000
```

Acesse: `http://localhost:8000/App/index.html`

### ⚠️ Importante
- **Desabilite** o Tracking Prevention do navegador (necessário para DuckDB via CDN)
- Use **Chrome/Edge** para melhor compatibilidade
- Aguarde 2-5 minutos para carregamento inicial dos dados

## 🧹 Regras de Limpeza Implementadas

O sistema aplica **10 conjuntos de regras** via views do DuckDB:

1. ✅ **Colunas essenciais nulas** - Remove registros sem campos obrigatórios
2. ✅ **Duplicatas** - Detecta via MD5(VendorID, datetime, location, amount)
3. ✅ **Timestamps inválidos** - Dropoff > Pickup, duração 0-240 min
4. ✅ **Distância** - Entre 0 e 100 milhas
5. ✅ **Passageiros** - Entre 1 e 6
6. ✅ **Valores monetários** - Total e fare > 0
7. ✅ **Códigos válidos** - payment_type (1-6), RatecodeID (1-6,99), LocationID (1-263)
8. ✅ **Velocidade** - Entre 1 e 80 mph
9. ✅ **Consistência** - Diferença total_amount vs soma < $2.00

**Resultado:** Mantém ~85-90% dos registros originais

## 📁 Estrutura do Projeto

```
Análise dados Taxi NYC/
├── App/
│   ├── index.html              # Interface principal
│   ├── app.js                  # Orquestrador
│   ├── data-loader.js          # DuckDB + limpeza
│   ├── visualizations-1.js     # Viz temporais
│   ├── visualizations-2.js     # Viz tarifas/viagens
│   ├── visualizations-3.js     # Viz pagamentos/impacto
│   └── styles.css              # Estilos
├── Data/
│   ├── 2019/                   # Parquet 2019
│   └── 2020/                   # Parquet 2020
└── Docs/
    ├── DOCUMENTACAO_SISTEMA.md # Documentação técnica completa
    └── ...
```

## 🛠️ Stack Tecnológica

- **DuckDB** (WebAssembly) - Banco analítico em memória
- **D3.js v7** - Visualizações (única biblioteca de viz)
- **JavaScript ES6+** - Lógica da aplicação
- **HTML5/CSS3** - Interface

## 📊 Volume de Dados

- **Período:** 2º semestre 2019 + 2º semestre 2020
- **Registros brutos:** ~20-30 milhões
- **Após limpeza:** ~17-27 milhões (85-90%)
- **Arquivos:** 12 Parquet (~1-3GB cada)

## 🎓 Análises Disponíveis

### Dinâmica Temporal da Demanda
- Nº de viagens diárias/semanais/mensais
- Receita por período
- Padrões de horário de pico

### Perfil de Viagem
- Distribuição de distâncias
- Distribuição de passageiros
- Duração média das viagens

### Composição da Tarifa
- Médias de cada componente (fare, tip, tolls, taxes, surcharges)
- Proporção de cada componente no total
- Distribuição de valores

### Métodos de Pagamento e Gorjetas
- Share de cartão vs dinheiro
- Gorjeta média por método
- Evolução temporal de pagamentos

### Qualidade de Dados
- Registros removidos por regra
- Distribuições antes/depois da limpeza
- Métricas de consistência

### Impacto da Pandemia
- Variação % de viagens, distância, tarifa, receita
- Mudanças comportamentais
- Comparação mês a mês

## 🔍 Insights Obtidos

Este sistema permite responder questões como:

- 📉 Qual foi a queda no volume de viagens durante a pandemia?
- ⏰ Como mudou o padrão de horário de pico?
- 🚕 Houve mudança na distância média das viagens?
- 💰 Os passageiros deram mais ou menos gorjeta?
- 💳 Aumentou o uso de cartão vs dinheiro?
- 📊 Qual a composição típica de uma tarifa?
- 🧹 Quantos dados foram removidos pela limpeza?

## 📚 Documentação

- 📖 [Documentação Técnica Completa](Docs/DOCUMENTACAO_SISTEMA.md)
- 📝 [Guia Rápido](Docs/GUIA_RAPIDO.md)
- 🔧 [Como Baixar Dados](Docs/COMO_BAIXAR_DADOS.md)
- ⚠️ [Troubleshooting](Docs/TROUBLESHOOTING.md)

## 🐛 Troubleshooting Comum

### DuckDB não carrega
**Solução:** Desabilite Tracking Prevention/Enhanced Protection para este site

### Arquivos não encontrados
**Solução:** Verifique a estrutura de pastas Data/2019 e Data/2020

### Muito lento
**Solução:** 
- Use servidor local (não abra arquivo diretamente)
- Filtre por mês específico
- Feche outras abas do navegador

## 📄 Licença e Dados

- **Código:** Projeto educacional
- **Dados:** NYC Taxi & Limousine Commission (Open Data)
- **Licença dos dados:** [NYC Open Data License](https://opendata.cityofnewyork.us/overview/)

## 🙏 Créditos

- **NYC TLC** - Dados originais
- **DuckDB** - Motor analítico
- **D3.js** - Biblioteca de visualização
- **Mike Bostock** - Criador do D3.js

---

**Desenvolvido para:** Análise de Dados - Visualização de Dados  
**Data:** Novembro 2025  
**Tecnologias:** DuckDB + D3.js + JavaScript
