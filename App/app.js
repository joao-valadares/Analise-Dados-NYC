// Aplicação principal

async function main() {
    console.log('Iniciando aplicação...');
    
    // Carregar dados
    try {
        const success = await window.TaxiAnalysis.loadData();
        
        if (!success) {
            throw new Error('Falha ao carregar dados');
        }
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        const loadingDiv = document.getElementById('loading');
        loadingDiv.innerHTML = `
            <h1 style="color: #f44336;">❌ Erro ao Inicializar</h1>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px; text-align: left; max-width: 600px;">
                <h3>⚠️ Tracking Prevention Detectado</h3>
                <p><strong>Seu navegador está bloqueando o carregamento do DuckDB.</strong></p>
                <p><strong>Solução:</strong></p>
                <ol style="text-align: left;">
                    <li>Clique no ícone de <strong>escudo 🛡️</strong> na barra de endereços</li>
                    <li>Desative a "Prevenção de rastreamento" ou "Proteção aprimorada" para este site</li>
                    <li>Recarregue a página (F5)</li>
                </ol>
                <p style="margin-top: 15px; color: #666;">
                    <em>Nota: Isso é necessário porque o DuckDB é carregado de um CDN externo (jsdelivr.net)</em>
                </p>
            </div>
            <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
                🔄 Tentar Novamente
            </button>
        `;
        return;
    }
    
    // Ocultar loading e carregar todas as visualizações automaticamente
    document.getElementById('loading').style.display = 'none';
    
    console.log('✅ Dados carregados! Gerando visualizações...');
    
    // Carregar todas as visualizações automaticamente
    await updateVisualizations();
}

async function updateVisualizations() {
    console.log('🔄 Carregando todas as visualizações...');
    
    // Sempre usar todos os anos e meses
    const currentYear = 'both';
    const currentMonth = 'all';
    
    try {
        // ===================================================
        // 1. ANÁLISE TEMPORAL
        // ===================================================
        console.log('⏰ [1/4] Carregando análise temporal...');
        const temporal = await window.TaxiAnalysis.getTemporalPatterns(currentYear, currentMonth);
        
        document.getElementById('temporal-analysis').style.display = 'block';
        window.Visualizations.visualizeHourlyPattern(temporal.hourlyPattern);
        window.Visualizations.visualizeWeeklyPattern(temporal.weeklyPattern);
        
        // ===================================================
        // 2. ANÁLISE DE TARIFAS
        // ===================================================
        console.log('💰 [2/4] Carregando análise de tarifas...');
        const fare = await window.TaxiAnalysis.getFareAnalysis(currentYear, currentMonth);
        
        document.getElementById('fare-analysis').style.display = 'block';
        window.Visualizations2.visualizeFareComposition(fare.fareComposition);
        
        // ===================================================
        // 3. MÉTODOS DE PAGAMENTO
        // ===================================================
        console.log('💳 [3/4] Carregando análise de pagamentos...');
        const payment = await window.TaxiAnalysis.getPaymentAnalysis(currentYear, currentMonth);
        
        document.getElementById('payment-analysis').style.display = 'block';
        window.Visualizations2.visualizePaymentDistribution(payment.paymentDist);
        window.Visualizations3.visualizeTipsByPayment(payment.tipsByPayment);
        
        // ===================================================
        // 4. IMPACTO DA PANDEMIA
        // ===================================================
        console.log('🦠 [4/4] Carregando análise de impacto da pandemia...');
        const pandemic = await window.TaxiAnalysis.getPandemicImpact(currentYear, currentMonth);
        
        document.getElementById('pandemic-impact').style.display = 'block';
        window.Visualizations3.visualizeBehaviorChanges(pandemic.behaviorChanges);
        
        console.log('✅ Todas as visualizações carregadas com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao carregar visualizações:', error);
        alert('❌ Erro ao carregar visualizações. Verifique o console para mais detalhes.\n\nErro: ' + error.message);
    }
}

// Iniciar aplicação quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
