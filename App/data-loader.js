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
        
        // Configurar otimizações de performance
        await conn.query(`SET memory_limit='1.5GB'`);
        
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
        
        progressDiv.innerHTML = 'Aplicando filtros de qualidade...';
        
        // View otimizada com campos calculados e filtros
        await conn.query(`
            CREATE OR REPLACE VIEW clean_trips AS
            SELECT 
                *,
                EXTRACT(YEAR FROM tpep_pickup_datetime) as year,
                EXTRACT(MONTH FROM tpep_pickup_datetime) as month,
                EXTRACT(HOUR FROM tpep_pickup_datetime) as hour,
                EXTRACT(DOW FROM tpep_pickup_datetime) as day_of_week
            FROM raw_trips
            WHERE 
                year IN (2019, 2020)
                AND trip_distance >= 0.01
                AND trip_distance <= 100
                AND tpep_pickup_datetime IS NOT NULL
                AND tpep_dropoff_datetime IS NOT NULL
                AND tpep_dropoff_datetime > tpep_pickup_datetime
                AND total_amount >= 0
                AND fare_amount >= 0
                AND passenger_count BETWEEN 0 AND 6
                AND payment_type BETWEEN 1 AND 6
        `);
        
        const countResult = await conn.query('SELECT COUNT(*) as total FROM clean_trips');
        const totalRecords = Number(countResult.toArray()[0].total);
        
        progressDiv.innerHTML = `✅ ${totalRecords.toLocaleString()} registros carregados`;
        return true;
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        progressDiv.innerHTML = `Erro: ${error.message}`;
        return false;
    }
}

// Executar query SQL
async function executeQuery(query) {
    const result = await conn.query(query);
    return result.toArray().map(row => Object.fromEntries(row));
}

// ======================================================
// FUNÇÕES DE ANÁLISE
// ======================================================

// Padrões temporais
async function getTemporalPatterns() {
    const hourlyPattern = await executeQuery(`
        SELECT 
            hour,
            year,
            COUNT(*) as trips,
            ROUND(AVG(total_amount), 2) as avg_fare
        FROM clean_trips
        GROUP BY hour, year
        ORDER BY hour, year
    `);
    
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
        GROUP BY day_of_week, year
        ORDER BY day_of_week, year
    `);
    
    return { hourlyPattern, weeklyPattern };
}

// Análise de tarifas
async function getFareAnalysis() {
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
        GROUP BY year
    `);
    
    return { fareComposition };
}

// Análise de pagamentos
async function getPaymentAnalysis() {
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
        GROUP BY year, payment_type
        ORDER BY year, count DESC
    `);
    
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
        GROUP BY year, payment_type
        ORDER BY year, payment_type
    `);
    
    return { paymentDist, tipsByPayment };
}

// Análise de impacto da pandemia
async function getPandemicImpact() {
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
        GROUP BY year
    `);
    
    return { behaviorChanges };
}

// ======================================================
// EXPORTAR FUNÇÕES
// ======================================================
window.TaxiAnalysis = {
    loadData,
    getTemporalPatterns,
    getFareAnalysis,
    getPaymentAnalysis,
    getPandemicImpact
};
