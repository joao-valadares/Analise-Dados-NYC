// Aplicação principal

let currentYear = 'both';
let currentMonth = 'all';
let loadedSections = new Set(); // Rastrear quais seções foram carregadas

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
    
    // Ocultar loading e mostrar controles
    document.getElementById('loading').style.display = 'none';
    document.getElementById('controls').style.display = 'block';
    
    // Configurar event listeners
    document.getElementById('refreshBtn').addEventListener('click', updateVisualizationsClick);
    document.getElementById('yearSelect').addEventListener('change', e => {
        currentYear = e.target.value;
    });
    document.getElementById('monthSelect').addEventListener('change', e => {
        currentMonth = e.target.value;
    });
    
    // Botões de seleção de seções
    document.getElementById('selectAllBtn').addEventListener('click', () => {
        document.querySelectorAll('.section-checkbox').forEach(cb => cb.checked = true);
    });
    document.getElementById('selectNoneBtn').addEventListener('click', () => {
        document.querySelectorAll('.section-checkbox').forEach(cb => cb.checked = false);
    });
    
    // Mostrar info de memória
    document.getElementById('memory-info').style.display = 'block';
    updateMemoryInfo();
    
    console.log('✅ Sistema pronto! Selecione as seções que deseja carregar.');
}

async function updateVisualizationsClick() {
    const btn = document.getElementById('refreshBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Carregando...';
    
    // Verificar quais seções estão selecionadas
    const sectionsToLoad = {
        quality: document.getElementById('section-quality').checked,
        temporal: document.getElementById('section-temporal').checked,
        trip: document.getElementById('section-trip').checked,
        fare: document.getElementById('section-fare').checked,
        payment: document.getElementById('section-payment').checked,
        pandemic: document.getElementById('section-pandemic').checked
    };
    
    // Contar seções selecionadas
    const selectedCount = Object.values(sectionsToLoad).filter(v => v).length;
    if (selectedCount === 0) {
        alert('⚠️ Selecione pelo menos uma seção para carregar!');
        btn.disabled = false;
        btn.textContent = '🔄 Carregar Seções Selecionadas';
        return;
    }
    
    console.log(`🔄 Carregando ${selectedCount} seção(ões) selecionada(s)...`);
    
    // Limpar cache de seções desmarcadas para liberar memória
    window.TaxiAnalysis.clearCacheForSections(sectionsToLoad);
    
    await updateVisualizations(sectionsToLoad);
    
    btn.disabled = false;
    btn.textContent = '🔄 Carregar Seções Selecionadas';
    updateMemoryInfo();
}

async function updateVisualizations(sectionsToLoad = null) {
    console.log('🔄 Carregando visualizações...', {year: currentYear, month: currentMonth, sections: sectionsToLoad});
    
    // Se não especificado, carregar todas
    if (!sectionsToLoad) {
        sectionsToLoad = {
            quality: true,
            temporal: true,
            trip: true,
            fare: true,
            payment: true,
            pandemic: true
        };
    }
    
    try {
        let loadedCount = 0;
        const totalSections = Object.values(sectionsToLoad).filter(v => v).length;
        
        // ===================================================
        // 1. QUALIDADE DOS DADOS
        // ===================================================
        if (sectionsToLoad.quality) {
            console.log(`📊 [${++loadedCount}/${totalSections}] Carregando análise de qualidade...`);
            const dataQuality = await window.TaxiAnalysis.getDataQuality(currentYear, currentMonth);
            
            document.getElementById('data-quality').style.display = 'block';
            window.Visualizations.visualizeRecordsByMonth(dataQuality.recordsByMonth);
            window.Visualizations3.visualizeDataQuality(dataQuality.qualityStats);
            window.Visualizations3.visualizeDataRemoval(
                dataQuality.removalStats, 
                dataQuality.rawCount, 
                dataQuality.cleanCount
            );
            loadedSections.add('quality');
        } else {
            document.getElementById('data-quality').style.display = 'none';
            loadedSections.delete('quality');
        }
        
        // ===================================================
        // 2. ANÁLISE TEMPORAL
        // ===================================================
        if (sectionsToLoad.temporal) {
            console.log(`⏰ [${++loadedCount}/${totalSections}] Carregando análise temporal...`);
            const temporal = await window.TaxiAnalysis.getTemporalPatterns(currentYear, currentMonth);
            
            document.getElementById('temporal-analysis').style.display = 'block';
            window.Visualizations.visualizeHourDayHeatmap(temporal.hourDayHeatmap);
            window.Visualizations.visualizeHourlyPattern(temporal.hourlyPattern);
            window.Visualizations.visualizeWeeklyPattern(temporal.weeklyPattern);
            window.Visualizations.visualizeMonthlyTrend(temporal.monthlyTrend);
            loadedSections.add('temporal');
        } else {
            document.getElementById('temporal-analysis').style.display = 'none';
            loadedSections.delete('temporal');
        }
        
        // ===================================================
        // 3. PERFIL DE VIAGEM
        // ===================================================
        if (sectionsToLoad.trip) {
            console.log(`🚕 [${++loadedCount}/${totalSections}] Carregando perfil de viagem...`);
            const tripProfile = await window.TaxiAnalysis.getTripProfile(currentYear, currentMonth);
            
            document.getElementById('trip-profile').style.display = 'block';
            window.Visualizations2.visualizeDistanceHistogram(tripProfile.distanceHistogram);
            window.Visualizations2.visualizePassengerDistribution(tripProfile.passengerDistribution);
            loadedSections.add('trip');
        } else {
            document.getElementById('trip-profile').style.display = 'none';
            loadedSections.delete('trip');
        }
        
        // ===================================================
        // 4. ANÁLISE DE TARIFAS
        // ===================================================
        if (sectionsToLoad.fare) {
            console.log(`💰 [${++loadedCount}/${totalSections}] Carregando análise de tarifas...`);
            const fare = await window.TaxiAnalysis.getFareAnalysis(currentYear, currentMonth);
            
            document.getElementById('fare-analysis').style.display = 'block';
            window.Visualizations2.visualizeFareComposition(fare.fareComposition);
            window.Visualizations2.visualizeFareDistribution(fare.fareDistribution);
            window.Visualizations2.visualizeDistanceFareCorrelation(fare.distanceFareCorr);
            loadedSections.add('fare');
        } else {
            document.getElementById('fare-analysis').style.display = 'none';
            loadedSections.delete('fare');
        }
        
        // ===================================================
        // 5. MÉTODOS DE PAGAMENTO
        // ===================================================
        if (sectionsToLoad.payment) {
            console.log(`💳 [${++loadedCount}/${totalSections}] Carregando análise de pagamentos...`);
            const payment = await window.TaxiAnalysis.getPaymentAnalysis(currentYear, currentMonth);
            
            document.getElementById('payment-analysis').style.display = 'block';
            window.Visualizations2.visualizePaymentDistribution(payment.paymentDist);
            window.Visualizations3.visualizeTipsByPayment(payment.tipsByPayment);
            window.Visualizations3.visualizePaymentTrend(payment.paymentTrend);
            loadedSections.add('payment');
        } else {
            document.getElementById('payment-analysis').style.display = 'none';
            loadedSections.delete('payment');
        }
        
        // ===================================================
        // 6. IMPACTO DA PANDEMIA
        // ===================================================
        if (sectionsToLoad.pandemic) {
            console.log(`🦠 [${++loadedCount}/${totalSections}] Carregando análise de impacto da pandemia...`);
            const pandemic = await window.TaxiAnalysis.getPandemicImpact(currentYear, currentMonth);
            
            document.getElementById('pandemic-impact').style.display = 'block';
            window.Visualizations3.visualizePandemicVolume(pandemic.volumeComparison);
            window.Visualizations3.visualizeBehaviorChanges(pandemic.behaviorChanges);
            loadedSections.add('pandemic');
        } else {
            document.getElementById('pandemic-impact').style.display = 'none';
            loadedSections.delete('pandemic');
        }
        
        console.log(`✅ ${loadedCount} seção(ões) carregada(s) com sucesso!`);
    } catch (error) {
        console.error('❌ Erro ao carregar visualizações:', error);
        alert('❌ Erro ao carregar visualizações. Verifique o console para mais detalhes.\n\nErro: ' + error.message);
    }
}

// Atualizar informação de memória
function updateMemoryInfo() {
    const memoryDiv = document.getElementById('memory-usage');
    
    if (performance.memory) {
        const usedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        const totalMB = (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2);
        const percent = ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(1);
        
        memoryDiv.innerHTML = `${usedMB} MB / ${totalMB} MB (${percent}%) | Seções carregadas: ${loadedSections.size}/6`;
        
        // Alerta se memória alta
        if (percent > 80) {
            memoryDiv.innerHTML += ' <span style="color: red;">⚠️ MEMÓRIA ALTA!</span>';
        }
    } else {
        memoryDiv.innerHTML = `Seções carregadas: ${loadedSections.size}/6 (monitoramento de memória não disponível neste navegador)`;
    }
}

// Iniciar aplicação quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}
