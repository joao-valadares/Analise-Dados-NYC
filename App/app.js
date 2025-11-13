// Aplicação principal

async function main() {
    // Aguardar todos os scripts carregarem
    while (!window.Utils || !window.TaxiAnalysis || !window.Visualizations || !window.Visualizations2 || !window.Visualizations3) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    try {
        if (!await window.TaxiAnalysis.loadData()) {
            throw new Error('Falha ao carregar dados');
        }
        
        document.getElementById('loading').style.display = 'none';
        await updateVisualizations();
    } catch (error) {
        console.error('❌ Erro:', error);
        document.getElementById('loading').innerHTML = `
            <h1 style="color: #f44336;">❌ Erro ao Inicializar</h1>
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px; text-align: left; max-width: 600px;">
                <h3>⚠️ Tracking Prevention Detectado</h3>
                <p><strong>Seu navegador está bloqueando o carregamento do DuckDB.</strong></p>
                <p><strong>Solução:</strong></p>
                <ol style="text-align: left;">
                    <li>Clique no ícone de <strong>escudo 🛡️</strong> na barra de endereços</li>
                    <li>Desative a "Prevenção de rastreamento" para este site</li>
                    <li>Recarregue a página (F5)</li>
                </ol>
            </div>
            <button onclick="location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">
                🔄 Tentar Novamente
            </button>
        `;
    }
}

async function updateVisualizations() {
    try {
        const temporal = await window.TaxiAnalysis.getTemporalPatterns();
        document.getElementById('temporal-analysis').style.display = 'block';
        window.Visualizations.visualizeHourlyPattern(temporal.hourlyPattern);
        window.Visualizations.visualizeWeeklyPattern(temporal.weeklyPattern);
        
        const fare = await window.TaxiAnalysis.getFareAnalysis();
        document.getElementById('fare-analysis').style.display = 'block';
        window.Visualizations2.visualizeFareComposition(fare.fareComposition);
        
        const payment = await window.TaxiAnalysis.getPaymentAnalysis();
        document.getElementById('payment-analysis').style.display = 'block';
        window.Visualizations2.visualizePaymentDistribution(payment.paymentDist);
        window.Visualizations3.visualizeTipsByPayment(payment.tipsByPayment);
        
        const pandemic = await window.TaxiAnalysis.getPandemicImpact();
        document.getElementById('pandemic-impact').style.display = 'block';
        window.Visualizations3.visualizeBehaviorChanges(pandemic.behaviorChanges);
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('Erro ao carregar visualizações: ' + error.message);
    }
}

// Iniciar aplicação quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
