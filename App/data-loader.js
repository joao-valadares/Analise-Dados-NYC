// Configuração DuckDB e carregamento de dados
import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.28.0/+esm';

let db;
let conn;

// Inicializar DuckDB
async function initDuckDB() {
    try {
        const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
        const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
        
        // Criar worker com blob URL para evitar bloqueios de tracking prevention
        const worker_url = URL.createObjectURL(
            new Blob([`importScripts("${bundle.mainWorker}");`], {type: 'text/javascript'})
        );
        const worker = new Worker(worker_url);
        const logger = new duckdb.ConsoleLogger();
        
        // Configurar DuckDB sem acesso a storage (evita bloqueios)
        db = new duckdb.AsyncDuckDB(logger, worker);
        await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
        URL.revokeObjectURL(worker_url);
        conn = await db.connect();
        
        console.log('✅ DuckDB inicializado com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao inicializar DuckDB:', error);
        throw new Error('Falha ao inicializar DuckDB. Verifique se o Tracking Prevention está bloqueando o CDN.');
    }
}

// Verificar se um arquivo existe
async function checkFileExists(path) {
    try {
        const response = await fetch(path, { method: 'HEAD' });
        return response.ok;
    } catch {
        return false;
    }
}

// Carregar arquivos parquet
async function loadData() {
    const progressDiv = document.getElementById('progress');
    
    try {
        // Verificar se pelo menos um arquivo existe
        progressDiv.innerHTML = 'Verificando arquivos...';
        const testFile = '../Data/2019/yellow_tripdata_2019-10.parquet';
        const exists = await checkFileExists(testFile);
        
        if (!exists) {
            progressDiv.innerHTML = `<span style="color: red;">❌ Arquivos não encontrados!</span><br><br>
                <strong>Os arquivos Parquet devem estar em:</strong><br>
                - Data/2019/yellow_tripdata_2019-10.parquet (na raiz do projeto)<br>
                - Data/2019/yellow_tripdata_2019-11.parquet<br>
                - Data/2019/yellow_tripdata_2019-12.parquet<br>
                - Data/2020/yellow_tripdata_2020-10.parquet<br>
                - Data/2020/yellow_tripdata_2020-11.parquet<br>
                - Data/2020/yellow_tripdata_2020-12.parquet<br><br>
                <strong>Por favor:</strong><br>
                1. Baixe os dados de <a href="https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page" target="_blank">NYC TLC</a><br>
                2. Coloque os arquivos nas pastas Data/2019/ e Data/2020/ (na raiz do projeto)<br>
                3. Apenas os meses 10, 11 e 12 são necessários para esta análise`;
            return false;
        }
        
        progressDiv.innerHTML = 'Inicializando DuckDB...';
        await initDuckDB();
        
        // Configurar otimizações de performance (WebAssembly - memória limitada)
        await conn.query(`SET memory_limit='1.5GB'`); // Limite seguro para navegador
        await conn.query(`SET preserve_insertion_order=false`); // Permite otimizações adicionais
        
        progressDiv.innerHTML = 'Carregando arquivos parquet...';
        
        // Registrar arquivos de 2019 e 2020 (APENAS OUT, NOV, DEZ) - PROGRESSIVAMENTE
        const filesToLoad = [
            { year: 2019, month: '10' },
            { year: 2019, month: '11' },
            { year: 2019, month: '12' },
            { year: 2020, month: '10' },
            { year: 2020, month: '11' },
            { year: 2020, month: '12' }
        ];
        
        // Carregar arquivos UM POR VEZ para evitar sobrecarga de memória
        let fileIndex = 0;
        for (const { year, month } of filesToLoad) {
            fileIndex++;
            const filename = `yellow_tripdata_${year}-${month}.parquet`;
            const path = `../Data/${year}/${filename}`;
            progressDiv.innerHTML = `📦 Carregando arquivo ${fileIndex}/${filesToLoad.length}: ${filename}...`;
            
            try {
                // Fazer fetch do arquivo
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`Arquivo não encontrado: ${path}`);
                }
                
                // Ler progressivamente em chunks
                const reader = response.body.getReader();
                const contentLength = +response.headers.get('Content-Length');
                let receivedLength = 0;
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    chunks.push(value);
                    receivedLength += value.length;
                    
                    // Atualizar progresso
                    if (contentLength > 0) {
                        const percentComplete = Math.round((receivedLength / contentLength) * 100);
                        progressDiv.innerHTML = `📦 Carregando arquivo ${fileIndex}/${filesToLoad.length}: ${filename} (${percentComplete}%)...`;
                    }
                }
                
                // Combinar chunks
                const arrayBuffer = new Uint8Array(receivedLength);
                let position = 0;
                for (const chunk of chunks) {
                    arrayBuffer.set(chunk, position);
                    position += chunk.length;
                }
                
                // Registrar no DuckDB
                await db.registerFileBuffer(`${filename}`, arrayBuffer);
                
                // Criar view
                await conn.query(`
                    CREATE OR REPLACE VIEW data_${year}_${month} AS 
                    SELECT * FROM parquet_scan('${filename}')
                `);
                
                console.log(`✅ ${filename} carregado com sucesso (${fileIndex}/${filesToLoad.length})`);
            } catch (error) {
                console.error(`❌ Erro ao carregar ${filename}:`, error);
                progressDiv.innerHTML = `❌ Erro ao carregar ${filename}: ${error.message}`;
                return false;
            }
        }
        
        
        // ======================================================
        // CRIAÇÃO DE VIEWS COM REGRAS DE LIMPEZA COMPLETAS
        // ======================================================
        
        progressDiv.innerHTML = 'Criando view otimizada (leitura direta de Parquet)...';
        
        // 1. View que lê DIRETAMENTE dos Parquets com TODOS os dados
        // Usando todos os registros para análise precisa
        await conn.query(`
            CREATE OR REPLACE VIEW raw_trips AS
            SELECT 
                VendorID,
                tpep_pickup_datetime,
                tpep_dropoff_datetime,
                passenger_count,
                trip_distance,
                RatecodeID,
                store_and_fwd_flag,
                PULocationID,
                DOLocationID,
                payment_type,
                fare_amount,
                extra,
                mta_tax,
                tip_amount,
                tolls_amount,
                improvement_surcharge,
                total_amount,
                congestion_surcharge,
                airport_fee
            FROM (
                SELECT * FROM data_2019_10 UNION ALL
                SELECT * FROM data_2019_11 UNION ALL
                SELECT * FROM data_2019_12 UNION ALL
                SELECT * FROM data_2020_10 UNION ALL
                SELECT * FROM data_2020_11 UNION ALL
                SELECT * FROM data_2020_12
            )
        `);
        
        console.log('ℹ️ Analisando OUT, NOV, DEZ de 2019 e 2020');
        console.log('ℹ️ Usando 100% dos dados (sem amostragem)');
        console.log('ℹ️ Isso pode levar alguns segundos, mas garante precisão total');
        
        progressDiv.innerHTML = 'Aplicando regras de limpeza SIMPLIFICADAS...';
        
        // 2. View SIMPLIFICADA com apenas campos essenciais
        await conn.query(`
            CREATE OR REPLACE VIEW trips_with_calcs AS
            SELECT 
                *,
                EXTRACT(YEAR FROM tpep_pickup_datetime) as year,
                EXTRACT(MONTH FROM tpep_pickup_datetime) as month,
                EXTRACT(DAY FROM tpep_pickup_datetime) as day,
                EXTRACT(HOUR FROM tpep_pickup_datetime) as hour,
                EXTRACT(DOW FROM tpep_pickup_datetime) as day_of_week
            FROM raw_trips
        `);
        
        progressDiv.innerHTML = 'Aplicando filtros (usando VIEW otimizada)...';
        
        // 3. Usar VIEW em vez de TABLE para economizar memória
        // Views não ocupam memória adicional - são calculadas sob demanda
        await conn.query(`
            CREATE OR REPLACE VIEW clean_trips AS
            SELECT *
            FROM trips_with_calcs
            WHERE 
                -- FILTROS GLOBAIS CENTRALIZADOS
                -- Anos válidos: apenas 2019 e 2020
                year IN (2019, 2020)
                -- Distância mínima: remover viagens muito curtas (< 0.01 milhas)
                AND trip_distance >= 0.01
                -- Filtros de qualidade
                AND tpep_pickup_datetime IS NOT NULL
                AND tpep_dropoff_datetime IS NOT NULL
                AND tpep_dropoff_datetime > tpep_pickup_datetime
                AND trip_distance <= 100
                AND total_amount >= 0
                AND fare_amount >= 0
                AND passenger_count >= 0
                AND passenger_count <= 6
                AND payment_type >= 1
                AND payment_type <= 6
        `);
        
        console.log('✅ View clean_trips criada com sucesso! (economia de memória)');
        
        progressDiv.innerHTML = `Dados carregados com sucesso! Contando registros...`;
        
        // Contagem final - 100% dos dados
        const countResult = await conn.query('SELECT COUNT(*) as total FROM clean_trips');
        const totalRecords = countResult.toArray()[0].total;
        console.log(`✅ Total de registros: ${Number(totalRecords).toLocaleString()}`);
        
        progressDiv.innerHTML = `Dados carregados com sucesso! (${Number(totalRecords).toLocaleString()} registros)`;
        return true;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        progressDiv.innerHTML = `Erro: ${error.message}`;
        return false;
    }
}

// ======================================================
// SISTEMA DE CACHE PARA EVITAR QUERIES DUPLICADAS
// ======================================================
const queryCache = new Map();

// Executar query com cache
async function executeQuery(query, useCache = true) {
    // Criar chave única baseada na query
    const cacheKey = query.trim();
    
    // Verificar se resultado está em cache
    if (useCache && queryCache.has(cacheKey)) {
        console.log('📦 Cache hit:', cacheKey.substring(0, 50) + '...');
        return queryCache.get(cacheKey);
    }
    
    // Executar query
    console.log('🔍 Executando query:', cacheKey.substring(0, 50) + '...');
    const result = await conn.query(query);
    const data = result.toArray().map(row => Object.fromEntries(row));
    
    // Armazenar em cache
    if (useCache) {
        queryCache.set(cacheKey, data);
        console.log(`✅ Resultado armazenado em cache (${data.length} registros)`);
    }
    
    return data;
}

// Limpar cache (útil para atualização de filtros)
function clearCache() {
    queryCache.clear();
    console.log('🧹 Cache limpo completamente');
}

// Limpar cache seletivamente baseado nas seções carregadas
function clearCacheForSections(sectionsToLoad) {
    const sectionsToKeep = [];
    
    // Identificar padrões de query por seção
    const sectionPatterns = {
        quality: ['recordsByMonth', 'qualityStats', 'COUNT(*) as total FROM raw_trips', 'COUNT(*) as total FROM clean_trips'],
        temporal: ['hourlyPattern', 'weeklyPattern', 'monthlyTrend', 'hourDayHeatmap'],
        trip: ['distanceHistogram', 'passengerDistribution'],
        fare: ['fareComposition', 'fareDistribution', 'distanceFareCorr'],
        payment: ['paymentDist', 'paymentTrend', 'tipsByPayment'],
        pandemic: ['volumeComparison', 'behaviorChanges']
    };
    
    // Coletar padrões das seções que serão mantidas
    Object.keys(sectionsToLoad).forEach(section => {
        if (sectionsToLoad[section] && sectionPatterns[section]) {
            sectionsToKeep.push(...sectionPatterns[section]);
        }
    });
    
    // Limpar apenas entradas que não pertencem às seções mantidas
    let removed = 0;
    const keysToRemove = [];
    
    for (const [key, value] of queryCache.entries()) {
        const shouldKeep = sectionsToKeep.some(pattern => key.includes(pattern));
        if (!shouldKeep) {
            keysToRemove.push(key);
        }
    }
    
    keysToRemove.forEach(key => {
        queryCache.delete(key);
        removed++;
    });
    
    console.log(`🧹 Cache limpo: ${removed} entrada(s) removida(s), ${queryCache.size} mantida(s)`);
}

// Função auxiliar para construir cláusula WHERE
function buildWhereClause(year, month, hasExistingWhere = false) {
    const conditions = [];
    
    if (year !== 'both') {
        conditions.push(`year = ${year}`);
    }
    
    if (month !== 'all') {
        conditions.push(`month = ${month}`);
    }
    
    if (conditions.length === 0) {
        return '';
    }
    
    // Se já existe WHERE, usar AND, senão usar WHERE
    const keyword = hasExistingWhere ? 'AND' : 'WHERE';
    return `${keyword} ${conditions.join(' AND ')}`;
}

// ======================================================
// FUNÇÕES DE ANÁLISE
// ======================================================

// Análise de qualidade dos dados
async function getDataQuality(year = 'both', month = 'all') {
    let whereClause = buildWhereClause(year, month);
    
    // Contagem de registros brutos
    const rawCount = await executeQuery(`
        SELECT COUNT(*) as total
        FROM raw_trips
        ${whereClause ? whereClause.replace('year', 'EXTRACT(YEAR FROM tpep_pickup_datetime)').replace('month', 'EXTRACT(MONTH FROM tpep_pickup_datetime)') : ''}
    `);
    
    // Contagem de registros limpos
    const cleanCount = await executeQuery(`
        SELECT COUNT(*) as total
        FROM clean_trips
        ${whereClause}
    `);
    
    // Estatísticas SIMPLIFICADAS de remoção
    const removalStats = await executeQuery(`
        SELECT 
            'Registros removidos' as rule,
            (SELECT COUNT(*) FROM raw_trips) - (SELECT COUNT(*) FROM clean_trips) as removed_count
    `);
    
    // Registros por mês (limpos) - DADOS COMPLETOS
    const recordsByMonth = await executeQuery(`
        SELECT 
            year,
            month,
            COUNT(*) as count
        FROM clean_trips
        ${whereClause}
        GROUP BY year, month
        ORDER BY year, month
    `);
    
    // Estatísticas básicas de qualidade
    const qualityStats = await executeQuery(`
        SELECT 
            'Total Viagens Limpas' as metric,
            CAST(COUNT(*) as DOUBLE) as value
        FROM clean_trips
        ${whereClause}
        UNION ALL
        SELECT 
            'Distância Média (mi)',
            ROUND(AVG(trip_distance), 2)
        FROM clean_trips
        ${whereClause}
        UNION ALL
        SELECT 
            'Tarifa Média ($)',
            ROUND(AVG(total_amount), 2)
        FROM clean_trips
        ${whereClause}
    `);
    
    return { 
        recordsByMonth, 
        qualityStats, 
        removalStats,
        rawCount: rawCount[0]?.total || 0,
        cleanCount: cleanCount[0]?.total || 0
    };
}

// Padrões temporais
async function getTemporalPatterns(year = 'both', month = 'all') {
    let whereClause = buildWhereClause(year, month);
    
    // Padrão por hora do dia - DADOS COMPLETOS
    const hourlyPattern = await executeQuery(`
        SELECT 
            hour,
            year,
            COUNT(*) as trips,
            ROUND(AVG(total_amount), 2) as avg_fare
        FROM clean_trips
        ${whereClause}
        GROUP BY hour, year
        ORDER BY hour, year
    `);
    
    // Padrão por dia da semana - DADOS COMPLETOS e nome do dia
    const weeklyPattern = await executeQuery(`
        SELECT 
            day_of_week,
            CASE day_of_week
                WHEN 0 THEN 'Domingo'
                WHEN 1 THEN 'Segunda'
                WHEN 2 THEN 'Terça'
                WHEN 3 THEN 'Quarta'
                WHEN 4 THEN 'Quinta'
                WHEN 5 THEN 'Sexta'
                WHEN 6 THEN 'Sábado'
            END as day_name,
            year,
            COUNT(*) as trips,
            ROUND(AVG(total_amount), 2) as avg_fare
        FROM clean_trips
        ${whereClause}
        GROUP BY day_of_week, year
        ORDER BY day_of_week, year
    `);
    
    // Heatmap: hora x dia da semana - DADOS COMPLETOS e por ANO
    const hourDayHeatmap = await executeQuery(`
        SELECT 
            hour,
            day_of_week,
            year,
            COUNT(*) as trips,
            ROUND(AVG(total_amount), 2) as avg_fare
        FROM clean_trips
        ${whereClause}
        GROUP BY hour, day_of_week, year
        ORDER BY year, day_of_week, hour
    `);
    
    // Tendência mensal - DADOS COMPLETOS e campos completos
    const monthlyTrend = await executeQuery(`
        SELECT 
            year,
            month,
            COUNT(*) as trips,
            ROUND(AVG(total_amount), 2) as avg_fare,
            ROUND(SUM(total_amount), 2) as total_revenue
        FROM clean_trips
        ${whereClause}
        GROUP BY year, month
        ORDER BY year, month
    `);
    
    return { hourlyPattern, weeklyPattern, hourDayHeatmap, monthlyTrend };
}

// Análise de tarifas - SIMPLIFICADO
async function getFareAnalysis(year = 'both', month = 'all') {
    let whereClause = buildWhereClause(year, month);
    
    // Composição completa da tarifa com TODOS os componentes
    const fareComposition = await executeQuery(`
        SELECT 
            year,
            ROUND(AVG(fare_amount), 2) as fare,
            ROUND(AVG(COALESCE(extra, 0)), 2) as extra,
            ROUND(AVG(COALESCE(mta_tax, 0)), 2) as mta_tax,
            ROUND(AVG(COALESCE(tip_amount, 0)), 2) as tip,
            ROUND(AVG(COALESCE(tolls_amount, 0)), 2) as tolls,
            ROUND(AVG(COALESCE(improvement_surcharge, 0)), 2) as improvement_surcharge,
            ROUND(AVG(COALESCE(congestion_surcharge, 0)), 2) as congestion_surcharge,
            ROUND(AVG(COALESCE(airport_fee, 0)), 2) as airport_fee,
            ROUND(AVG(total_amount), 2) as total
        FROM clean_trips
        ${whereClause}
        GROUP BY year
    `);
    
    // Distribuição de tarifas
    const fareDistribution = await executeQuery(`
        SELECT 
            year,
            CASE 
                WHEN total_amount < 10 THEN '0-10'
                WHEN total_amount < 20 THEN '10-20'
                WHEN total_amount < 30 THEN '20-30'
                ELSE '30+'
            END as fare_range,
            COUNT(*) as count
        FROM clean_trips
        ${whereClause}
        GROUP BY year, fare_range
        ORDER BY year, fare_range
    `);
    
    // Correlação Distância x Tarifa - OTIMIZADO (Agregação + Amostragem)
    // ESTRATÉGIA 1: Agregação por bins de 0.1 milhas (reduz de milhões para ~400 pontos)
    const distanceFareCorr = await executeQuery(`
        SELECT 
            ROUND(trip_distance * 10) / 10 as trip_distance,
            year,
            ROUND(AVG(total_amount), 2) as total_amount,
            COUNT(*) as trip_count,
            ROUND(MIN(total_amount), 2) as min_fare,
            ROUND(MAX(total_amount), 2) as max_fare,
            ROUND(STDDEV(total_amount), 2) as fare_stddev
        FROM clean_trips
        WHERE trip_distance <= 20
            AND trip_distance >= 0.1
            AND total_amount <= 200
            AND total_amount >= 2.5
            ${whereClause ? whereClause.replace('WHERE', 'AND') : ''}
        GROUP BY ROUND(trip_distance * 10) / 10, year
        ORDER BY trip_distance, year
    `);
    
    return { fareComposition, fareDistribution, distanceFareCorr };
}

// Perfil de viagem - COMPLETO
async function getTripProfile(year = 'both', month = 'all') {
    let whereClause = buildWhereClause(year, month);
    
    // Histograma de distâncias (pré-agregado) - DADOS COMPLETOS
    const distanceHistogram = await executeQuery(`
        SELECT 
            FLOOR(trip_distance * 2) / 2 as trip_distance,
            year,
            COUNT(*) as frequency
        FROM clean_trips
        WHERE trip_distance <= 20
            ${whereClause ? whereClause.replace('WHERE', 'AND') : ''}
        GROUP BY FLOOR(trip_distance * 2) / 2, year
        ORDER BY trip_distance, year
    `);
    
    // Distribuição de passageiros - DADOS COMPLETOS
    const passengerDistribution = await executeQuery(`
        SELECT 
            year,
            passenger_count,
            COUNT(*) as count
        FROM clean_trips
        ${whereClause}
        GROUP BY year, passenger_count
        ORDER BY year, passenger_count
    `);
    
    return { distanceHistogram, passengerDistribution };
}

// Análise de pagamentos - SIMPLIFICADO
async function getPaymentAnalysis(year = 'both', month = 'all') {
    let whereClause = buildWhereClause(year, month);
    
    // Distribuição básica por tipo de pagamento - DADOS COMPLETOS
    const paymentDist = await executeQuery(`
        SELECT 
            year,
            payment_type,
            CASE payment_type
                WHEN 1 THEN 'Cartão'
                WHEN 2 THEN 'Dinheiro'
                WHEN 3 THEN 'Sem Cobrança'
                WHEN 4 THEN 'Disputa'
                WHEN 5 THEN 'Desconhecido'
                WHEN 6 THEN 'Viagem Cancelada'
                ELSE 'Outro'
            END as payment_name,
            COUNT(*) as count,
            ROUND(AVG(total_amount), 2) as avg_amount
        FROM clean_trips
        ${whereClause}
        GROUP BY year, payment_type
        ORDER BY year, count DESC
    `);
    
    // Tendência de pagamentos - DADOS COMPLETOS e percentual
    const paymentTrend = await executeQuery(`
        WITH payment_counts AS (
            SELECT 
                year,
                month,
                payment_type,
                CASE payment_type
                    WHEN 1 THEN 'Cartão'
                    WHEN 2 THEN 'Dinheiro'
                    ELSE 'Outro'
                END as payment_name,
                COUNT(*) as count
            FROM clean_trips
            ${whereClause}
            GROUP BY year, month, payment_type
        ),
        month_totals AS (
            SELECT 
                year,
                month,
                SUM(count) as total
            FROM payment_counts
            GROUP BY year, month
        )
        SELECT 
            pc.year,
            pc.month,
            pc.payment_type,
            pc.payment_name,
            pc.count,
            ROUND(CAST(pc.count AS DOUBLE) / mt.total * 100, 2) as percentage
        FROM payment_counts pc
        JOIN month_totals mt ON pc.year = mt.year AND pc.month = mt.month
        ORDER BY pc.year, pc.month, pc.payment_type
    `);
    
    // Gorjetas por tipo de pagamento - DADOS COMPLETOS e nomes
    const tipsByPayment = await executeQuery(`
        SELECT 
            year,
            payment_type,
            CASE payment_type
                WHEN 1 THEN 'Cartão'
                WHEN 2 THEN 'Dinheiro'
                ELSE 'Outro'
            END as payment_name,
            ROUND(AVG(tip_amount), 2) as avg_tip,
            ROUND(AVG(tip_amount / NULLIF(total_amount, 0) * 100), 2) as tip_percentage,
            COUNT(*) as count
        FROM clean_trips
        ${whereClause}
        GROUP BY year, payment_type
        ORDER BY year, payment_type
    `);
    
    return { paymentDist, paymentTrend, tipsByPayment };
}

// Análise de impacto da pandemia - DADOS COMPLETOS
async function getPandemicImpact(year = 'both', month = 'all') {
    let whereClause = buildWhereClause(year, month);
    
    // Comparação de volume mensal - DADOS COMPLETOS
    const volumeComparison = await executeQuery(`
        SELECT 
            year,
            month,
            COUNT(*) as trips,
            ROUND(AVG(trip_distance), 2) as avg_distance,
            ROUND(AVG(total_amount), 2) as avg_fare
        FROM clean_trips
        ${whereClause}
        GROUP BY year, month
        ORDER BY month, year
    `);
    
    // Mudanças de comportamento - DADOS COMPLETOS e campos completos
    const behaviorChanges = await executeQuery(`
        SELECT 
            year,
            ROUND(AVG(trip_distance), 2) as avg_distance,
            ROUND(AVG(total_amount), 2) as avg_fare,
            ROUND(AVG(EXTRACT(EPOCH FROM (tpep_dropoff_datetime - tpep_pickup_datetime)) / 60), 2) as avg_duration,
            ROUND(AVG(passenger_count), 2) as avg_passengers,
            ROUND(AVG(tip_amount / NULLIF(total_amount, 0) * 100), 2) as avg_tip_pct,
            COUNT(*) as total_trips
        FROM clean_trips
        ${whereClause}
        GROUP BY year
    `);
    
    return { volumeComparison, behaviorChanges };
}

// ======================================================
// EXPORTAR FUNÇÕES
// ======================================================
window.TaxiAnalysis = {
    loadData,
    executeQuery,
    clearCache,
    clearCacheForSections,
    getDataQuality,
    getTemporalPatterns,
    getFareAnalysis,
    getTripProfile,
    getPaymentAnalysis,
    getPandemicImpact
};
