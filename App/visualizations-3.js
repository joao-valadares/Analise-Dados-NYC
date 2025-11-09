// Visualizações de impacto da pandemia
console.log('Carregando visualizations-3.js...');
// Nota: colors, toNumber, convertBigInt e createTooltip são definidos em visualizations-1.js e disponíveis globalmente

// 9. Gorjetas por tipo de pagamento
function visualizeTipsByPayment(data) {
    const container = d3.select('#tips-by-payment');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 80, bottom: 100, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Preparar dados (converter BigInt)
    const cleanData = data.map(convertBigInt);
    const paymentTypes = [...new Set(cleanData.map(d => d.payment_name))];
    const groupedData = d3.group(cleanData, d => d.payment_name);
    
    const chartData = paymentTypes.map(type => {
        const typeData = groupedData.get(type) || [];
        return {
            type: type,
            tip2019: toNumber(typeData.find(d => d.year === 2019)?.avg_tip || 0),
            tip2020: toNumber(typeData.find(d => d.year === 2020)?.avg_tip || 0),
            pct2019: toNumber(typeData.find(d => d.year === 2019)?.tip_percentage || 0),
            pct2020: toNumber(typeData.find(d => d.year === 2020)?.tip_percentage || 0)
        };
    })
    // Filtrar apenas "Outro" com 0 gorjetas, mas manter Cartão e Dinheiro
    .filter(d => d.type === 'Cartão' || d.type === 'Dinheiro' || d.tip2019 > 0 || d.tip2020 > 0);
    
    // Escalas
    const x0 = d3.scaleBand()
        .domain(chartData.map(d => d.type))
        .rangeRound([0, width])
        .paddingInner(0.1);
    
    const x1 = d3.scaleBand()
        .domain(['2019', '2020'])
        .rangeRound([0, x0.bandwidth()])
        .padding(0.05);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => Math.max(d.tip2019, d.tip2020))])
        .nice()
        .rangeRound([height, 0]);
    
    const color = d3.scaleOrdinal()
        .domain(['2019', '2020'])
        .range([colors.year2019, colors.year2020]);
    
    // Grade
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));
    
    // Eixos
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).tickFormat(d => '$' + d));
    
    // Barras
    const tooltip = createTooltip();
    
    const typeGroup = svg.selectAll('.type-group')
        .data(chartData)
        .enter().append('g')
        .attr('class', 'type-group')
        .attr('transform', d => `translate(${x0(d.type)},0)`);
    
    typeGroup.selectAll('rect')
        .data(d => ['2019', '2020'].map(year => ({
            year: year,
            type: d.type,
            tip: year === '2019' ? d.tip2019 : d.tip2020,
            pct: year === '2019' ? d.pct2019 : d.pct2020
        })))
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x1(d.year))
        .attr('y', height)
        .attr('width', x1.bandwidth())
        .attr('height', 0)
        .attr('fill', d => color(d.year))
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            
            // Nota especial para pagamentos em dinheiro
            const cashNote = (d.type === 'Dinheiro' && d.tip === 0) 
                ? '<p style="color: #ff9800; font-size: 12px; margin-top: 8px;"><em>⚠️ Gorjetas em dinheiro não são registradas no sistema</em></p>'
                : '';
            
            // Nota explicando que é por tipo específico
            const specificNote = '<p style="color: #666; font-size: 11px; margin-top: 6px; border-top: 1px solid #eee; padding-top: 6px;"><em>📊 Estatística específica deste método de pagamento</em></p>';
            
            tooltip.html(`<h4>${d.type} - ${d.year}</h4>
                          <p><strong>Gorjeta Média:</strong> $${d.tip.toFixed(2)}</p>
                          <p><strong>Percentual:</strong> ${d.pct.toFixed(1)}% da tarifa</p>
                          ${cashNote}
                          ${specificNote}`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        })
        .transition()
        .duration(800)
        .attr('y', d => y(d.tip))
        .attr('height', d => height - y(d.tip));
    
    // Legenda
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 100}, 0)`);
    
    ['2019', '2020'].forEach((year, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        lg.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', color(year));
        
        lg.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text(year);
    });
    
    // Título dos eixos
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Gorjeta Média ($)');
    
    // Nota explicativa sobre gorjetas em dinheiro
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 85)
        .style('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#ff9800')
        .style('font-style', 'italic')
        .text('⚠️ Gorjetas em dinheiro não são registradas no sistema de pagamento');
}

// 10. Comparação de volume na pandemia
function visualizePandemicVolume(data) {
    const container = d3.select('#pandemic-volume');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 100, bottom: 60, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 450 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Preparar dados (converter BigInt)
    const cleanData = data.map(convertBigInt);
    const monthNames = ['Out', 'Nov', 'Dez'];
    const groupedData = d3.group(cleanData, d => d.month);
    
    const chartData = Array.from(groupedData, ([month, values]) => {
        const d2019 = values.find(v => v.year === 2019);
        const d2020 = values.find(v => v.year === 2020);
        const trips2019 = toNumber(d2019?.trips || 0);
        const trips2020 = toNumber(d2020?.trips || 0);
        return {
            month: monthNames[month - 7],
            trips2019: trips2019,
            trips2020: trips2020,
            diff: ((trips2020) - (trips2019)) / (trips2019 || 1) * 100
        };
    });
    
    // Escalas para as barras
    const x = d3.scaleBand()
        .domain(chartData.map(d => d.month))
        .range([0, width])
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => Math.max(d.trips2019, d.trips2020))])
        .nice()
        .range([height - 100, 0]);
    
    // Escala para a linha de diferença
    const yDiff = d3.scaleLinear()
        .domain([d3.min(chartData, d => d.diff) - 10, 0])
        .range([height, height - 90]);
    
    const color = d3.scaleOrdinal()
        .domain(['2019', '2020'])
        .range([colors.year2019, colors.year2020]);
    
    // Grade
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));
    
    // Eixo X
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height - 100})`)
        .call(d3.axisBottom(x));
    
    // Eixo Y esquerdo (viagens)
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).tickFormat(d => d3.format('.2s')(d)));
    
    // Eixo Y direito (diferença %)
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(${width}, 0)`)
        .call(d3.axisRight(yDiff).tickFormat(d => d.toFixed(0) + '%'));
    
    const tooltip = createTooltip();
    
    // Área de diferença
    const area = d3.area()
        .x(d => x(d.month) + x.bandwidth() / 2)
        .y0(yDiff(0))
        .y1(d => yDiff(d.diff))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(chartData)
        .attr('class', 'area')
        .attr('fill', colors.year2020)
        .attr('d', area)
        .style('opacity', 0.2);
    
    // Linha de diferença
    const line = d3.line()
        .x(d => x(d.month) + x.bandwidth() / 2)
        .y(d => yDiff(d.diff))
        .curve(d3.curveMonotoneX);
    
    svg.append('path')
        .datum(chartData)
        .attr('class', 'line')
        .attr('stroke', colors.year2020)
        .attr('d', line)
        .attr('stroke-width', 2)
        .attr('fill', 'none');
    
    // Pontos na linha de diferença
    svg.selectAll('.diff-dot')
        .data(chartData)
        .enter().append('circle')
        .attr('class', 'diff-dot')
        .attr('cx', d => x(d.month) + x.bandwidth() / 2)
        .attr('cy', d => yDiff(d.diff))
        .attr('r', 4)
        .attr('fill', colors.year2020);
    
    // Barras para cada ano
    const barWidth = x.bandwidth() / 2.2;
    
    // Barras 2019
    svg.selectAll('.bar-2019')
        .data(chartData)
        .enter().append('rect')
        .attr('class', 'bar bar-2019')
        .attr('x', d => x(d.month))
        .attr('y', height - 100)
        .attr('width', barWidth)
        .attr('height', 0)
        .attr('fill', color('2019'))
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`<h4>${d.month} 2019</h4>
                          <p><strong>Viagens:</strong> ${d3.format(',')(d.trips2019)}</p>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        })
        .transition()
        .duration(800)
        .attr('y', d => y(d.trips2019))
        .attr('height', d => height - 100 - y(d.trips2019));
    
    // Barras 2020
    svg.selectAll('.bar-2020')
        .data(chartData)
        .enter().append('rect')
        .attr('class', 'bar bar-2020')
        .attr('x', d => x(d.month) + barWidth + 2)
        .attr('y', height - 100)
        .attr('width', barWidth)
        .attr('height', 0)
        .attr('fill', color('2020'))
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`<h4>${d.month} 2020</h4>
                          <p><strong>Viagens:</strong> ${d3.format(',')(d.trips2020)}</p>
                          <p><strong>Mudança:</strong> ${d.diff.toFixed(1)}%</p>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        })
        .transition()
        .duration(800)
        .attr('y', d => y(d.trips2020))
        .attr('height', d => height - 100 - y(d.trips2020));
    
    // Legenda
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 150}, 20)`);
    
    // Barras
    ['2019', '2020'].forEach((year, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        lg.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', color(year));
        
        lg.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text(`Viagens ${year}`);
    });
    
    // Linha de diferença
    const lg = legend.append('g')
        .attr('transform', `translate(0, 50)`);
    
    lg.append('line')
        .attr('x1', 0)
        .attr('x2', 18)
        .attr('y1', 9)
        .attr('y2', 9)
        .attr('stroke', colors.year2020)
        .attr('stroke-width', 2);
    
    lg.append('text')
        .attr('x', 24)
        .attr('y', 9)
        .attr('dy', '.35em')
        .text('Variação %');
    
    // Títulos dos eixos
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height - 100) / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Número de Viagens');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', width + margin.right - 20)
        .attr('x', 0 - (height - 50))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Variação 2020 vs 2019 (%)');
}

// 11. Mudanças de comportamento
function visualizeBehaviorChanges(data) {
    const container = d3.select('#behavior-changes');
    container.selectAll('*').remove();
    
    // Criar caixas de estatísticas
    const stats = container.append('div')
        .attr('class', 'stats-box');
    
    const metrics = [
        {label: 'Distância Média (mi)', key: 'avg_distance'},
        {label: 'Tarifa Média ($)', key: 'avg_fare'},
        {label: 'Duração Média (min)', key: 'avg_duration'},
        {label: 'Passageiros Médios', key: 'avg_passengers'},
        {label: 'Gorjeta Média (%)', key: 'avg_tip_pct'}
    ];
    
    // Converter BigInt nos dados
    const cleanData = data.map(convertBigInt);
    
    metrics.forEach(metric => {
        const val2019 = toNumber(cleanData.find(d => d.year === 2019)?.[metric.key] || 0);
        const val2020 = toNumber(cleanData.find(d => d.year === 2020)?.[metric.key] || 0);
        const change = ((val2020 - val2019) / val2019 * 100).toFixed(1);
        
        const item = stats.append('div')
            .attr('class', 'stat-item');
        
        item.append('div')
            .attr('class', 'stat-label')
            .text(metric.label);
        
        item.append('div')
            .style('font-size', '0.95em')
            .style('margin', '8px 0')
            .html(`2019: <strong>${val2019}</strong> | 2020: <strong>${val2020}</strong>`);
        
        item.append('div')
            .style('font-size', '1.2em')
            .style('font-weight', 'bold')
            .style('color', change > 0 ? '#4CAF50' : '#f44336')
            .html(`${change > 0 ? '▲' : '▼'} ${Math.abs(change)}%`);
    });
    
    // Gráfico radar
    const margin = {top: 80, right: 80, bottom: 80, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    const radius = Math.min(width, height) / 2;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${width/2 + margin.left}, ${height/2 + margin.top})`);
    
    // Normalizar dados para radar
    // Converter BigInt para o radar
    const cleanDataRadar = data.map(convertBigInt);
    
    const radarData = metrics.map(metric => {
        const val2019 = toNumber(cleanDataRadar.find(d => d.year === 2019)?.[metric.key] || 0);
        const val2020 = toNumber(cleanDataRadar.find(d => d.year === 2020)?.[metric.key] || 0);
        const max = Math.max(val2019, val2020);
        
        return {
            axis: metric.label,
            value2019: val2019 / max,
            value2020: val2020 / max
        };
    });
    
    const angleSlice = Math.PI * 2 / radarData.length;
    
    // Escala radial
    const rScale = d3.scaleLinear()
        .domain([0, 1])
        .range([0, radius]);
    
    // Círculos de grade
    [0.2, 0.4, 0.6, 0.8, 1].forEach(d => {
        svg.append('circle')
            .attr('r', rScale(d))
            .attr('fill', 'none')
            .attr('stroke', '#ddd')
            .attr('stroke-width', 1);
    });
    
    // Linhas de grade (eixos)
    radarData.forEach((d, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const lineCoord = {
            x: rScale(1) * Math.cos(angle),
            y: rScale(1) * Math.sin(angle)
        };
        
        svg.append('line')
            .attr('x1', 0)
            .attr('y1', 0)
            .attr('x2', lineCoord.x)
            .attr('y2', lineCoord.y)
            .attr('stroke', '#ddd')
            .attr('stroke-width', 1);
        
        // Labels
        const labelCoord = {
            x: rScale(1.15) * Math.cos(angle),
            y: rScale(1.15) * Math.sin(angle)
        };
        
        svg.append('text')
            .attr('x', labelCoord.x)
            .attr('y', labelCoord.y)
            .attr('text-anchor', 'middle')
            .attr('dy', '0.35em')
            .style('font-size', '12px')
            .text(d.axis);
    });
    
    // Função para criar coordenadas do radar
    const radarLine = d3.lineRadial()
        .radius(d => rScale(d.value))
        .angle((d, i) => angleSlice * i)
        .curve(d3.curveLinearClosed);
    
    const tooltip = createTooltip();
    
    // Desenhar áreas
    [
        {year: 2019, color: colors.year2019, key: 'value2019'},
        {year: 2020, color: colors.year2020, key: 'value2020'}
    ].forEach(yearConfig => {
        const radarValues = radarData.map(d => ({
            value: d[yearConfig.key],
            axis: d.axis
        }));
        
        svg.append('path')
            .datum(radarValues)
            .attr('d', radarLine)
            .attr('fill', yearConfig.color)
            .attr('fill-opacity', 0.3)
            .attr('stroke', yearConfig.color)
            .attr('stroke-width', 2);
        
        // Pontos
        svg.selectAll(`.dot-radar-${yearConfig.year}`)
            .data(radarValues)
            .enter().append('circle')
            .attr('class', `dot-radar-${yearConfig.year}`)
            .attr('cx', (d, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                return rScale(d.value) * Math.cos(angle);
            })
            .attr('cy', (d, i) => {
                const angle = angleSlice * i - Math.PI / 2;
                return rScale(d.value) * Math.sin(angle);
            })
            .attr('r', 5)
            .attr('fill', yearConfig.color)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 8);
                tooltip.transition().duration(200).style('opacity', .9);
                tooltip.html(`<h4>${d.axis} - ${yearConfig.year}</h4>
                              <p><strong>Valor Normalizado:</strong> ${(d.value * 100).toFixed(1)}%</p>`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 5);
                tooltip.transition().duration(500).style('opacity', 0);
            });
    });
    
    // Legenda
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${-radius}, ${radius + 40})`);
    
    [
        {year: 2019, color: colors.year2019},
        {year: 2020, color: colors.year2020}
    ].forEach((config, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(${i * 100}, 0)`);
        
        lg.append('circle')
            .attr('cx', 9)
            .attr('cy', 9)
            .attr('r', 6)
            .attr('fill', config.color);
        
        lg.append('text')
            .attr('x', 20)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text(config.year);
    });
}

// 12. Qualidade de dados
function visualizeDataQuality(stats) {
    const container = d3.select('#data-quality-chart');
    container.selectAll('*').remove();
    
    // Criar caixas de estatísticas
    const statsBox = container.append('div')
        .attr('class', 'stats-box');
    
    // Converter BigInt nos stats
    const cleanStats = stats.map(convertBigInt);
    
    cleanStats.forEach(stat => {
        const item = statsBox.append('div')
            .attr('class', 'stat-item');
        
        item.append('span')
            .attr('class', 'stat-value')
            .text(d3.format(',')(toNumber(stat.value)));
        
        item.append('span')
            .attr('class', 'stat-label')
            .text(stat.metric);
    });
}

// 12. Visualização de Remoção de Dados (Data Cleaning Stats)
function visualizeDataRemoval(removalStats, rawCount, cleanCount) {
    const container = d3.select('#data-removal-stats');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 20, bottom: 120, left: 100};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Preparar dados
    const cleanData = removalStats.map(convertBigInt);
    const totalRaw = typeof rawCount === 'bigint' ? Number(rawCount) : rawCount;
    const totalClean = typeof cleanCount === 'bigint' ? Number(cleanCount) : cleanCount;
    
    // Adicionar totais
    const dataWithTotals = [
        {rule: 'Registros Originais', removed_count: totalRaw, isTotal: true},
        ...cleanData,
        {rule: 'Registros Limpos', removed_count: totalClean, isClean: true}
    ];
    
    // Escalas
    const x = d3.scaleBand()
        .domain(dataWithTotals.map(d => d.rule))
        .range([0, width])
        .padding(0.2);
    
    const y = d3.scaleLinear()
        .domain([0, Math.max(totalRaw, d3.max(cleanData, d => toNumber(d.removed_count)))])
        .nice()
        .range([height, 0]);
    
    // Grade
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));
    
    // Eixos
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-.8em')
        .attr('dy', '.15em')
        .attr('transform', 'rotate(-45)');
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).tickFormat(d => d3.format('.2s')(d)));
    
    // Barras
    const tooltip = createTooltip();
    
    svg.selectAll('.bar')
        .data(dataWithTotals)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.rule))
        .attr('y', height)
        .attr('width', x.bandwidth())
        .attr('height', 0)
        .attr('fill', d => d.isTotal ? '#667eea' : d.isClean ? '#43e97b' : '#f44336')
        .on('mouseover', function(event, d) {
            tooltip.transition().duration(200).style('opacity', .9);
            const count = toNumber(d.removed_count);
            const pct = totalRaw > 0 ? (count / totalRaw * 100).toFixed(2) : 0;
            tooltip.html(`<h4>${d.rule}</h4>
                          <p><strong>Registros:</strong> ${d3.format(',')(count)}</p>
                          <p><strong>% do Total:</strong> ${pct}%</p>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        })
        .transition()
        .duration(800)
        .attr('y', d => y(toNumber(d.removed_count)))
        .attr('height', d => height - y(toNumber(d.removed_count)));
    
    // Título
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .text('Número de Registros');
    
    // Adicionar resumo textual
    const summary = container.append('div')
        .attr('class', 'data-quality-summary')
        .style('margin-top', '20px')
        .style('padding', '15px')
        .style('background', '#f5f5f5')
        .style('border-radius', '8px');
    
    const removed = totalRaw - totalClean;
    const removedPct = totalRaw > 0 ? (removed / totalRaw * 100).toFixed(1) : 0;
    
    summary.html(`
        <h4>📊 Resumo da Limpeza de Dados</h4>
        <p><strong>Total de registros originais:</strong> ${d3.format(',')(totalRaw)}</p>
        <p><strong>Registros removidos:</strong> ${d3.format(',')(removed)} (${removedPct}%)</p>
        <p><strong>Registros limpos:</strong> ${d3.format(',')(totalClean)} (${(100 - removedPct).toFixed(1)}%)</p>
    `);
}

// 13. Análise de Tendência de Pagamento
function visualizePaymentTrend(data) {
    const container = d3.select('#payment-trend');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 100, bottom: 60, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Preparar dados e validar
    // Filtro de ano não é mais necessário - dados já vêm filtrados da VIEW clean_trips
    const cleanData = data.map(convertBigInt).map(d => ({
        year: toNumber(d.year),
        month: toNumber(d.month),
        payment_name: d.payment_name,
        percentage: toNumber(d.percentage) || 0,
        count: toNumber(d.count) || 0
    })).filter(d => {
        return d.month >= 10 && d.month <= 12 &&
               (d.payment_name === 'Cartão' || d.payment_name === 'Dinheiro') &&
               !isNaN(d.percentage);
    });
    
    if (cleanData.length === 0) {
        console.error('Nenhum dado válido para tendência de pagamento');
        return;
    }
    
    const monthNames = ['Out', 'Nov', 'Dez'];
    
    // Agrupar por ano
    const dataByYear = d3.group(cleanData, d => d.year);
    
    // Obter apenas os meses disponíveis
    const availableMonths = [...new Set(cleanData.map(d => monthNames[d.month - 1]))];
    
    // Escalas
    const x = d3.scaleBand()
        .domain(availableMonths)
        .range([0, width])
        .padding(0.1);
    
    const y = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
    
    const color = d3.scaleOrdinal()
        .domain([2019, 2020])
        .range([colors.year2019, colors.year2020]);
    
    // Grade
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));
    
    // Eixos
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).tickFormat(d => d + '%'));
    
    // Linhas por ano
    const line = d3.line()
        .defined(d => !isNaN(d.percentage) && d.monthName !== undefined)
        .x(d => x(d.monthName) + x.bandwidth() / 2)
        .y(d => y(d.percentage))
        .curve(d3.curveMonotoneX);
    
    const tooltip = createTooltip();
    
    dataByYear.forEach((values, year) => {
        // Filtrar apenas cartão e adicionar monthName
        const cardData = values
            .filter(d => d.payment_name === 'Cartão')
            .map(d => ({
                ...d,
                monthName: monthNames[d.month - 1]
            }))
            .sort((a, b) => a.month - b.month);
        
        if (cardData.length === 0) return;
        
        // Linha
        svg.append('path')
            .datum(cardData)
            .attr('class', 'line')
            .attr('fill', 'none')
            .attr('stroke', color(year))
            .attr('stroke-width', 3)
            .attr('d', line);
        
        // Pontos
        svg.selectAll(`.dot-payment-${year}`)
            .data(cardData)
            .enter().append('circle')
            .attr('class', `dot dot-payment-${year}`)
            .attr('cx', d => x(d.monthName) + x.bandwidth() / 2)
            .attr('cy', d => y(d.percentage))
            .attr('r', 5)
            .attr('fill', color(year))
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 8);
                tooltip.transition().duration(200).style('opacity', .9);
                tooltip.html(`<h4>${d.monthName} ${d.year}</h4>
                              <p><strong>Pagamentos com Cartão:</strong> ${d.percentage.toFixed(1)}%</p>
                              <p><strong>Total de Viagens:</strong> ${d3.format(',')(d.count)}</p>`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 5);
                tooltip.transition().duration(500).style('opacity', 0);
            });
    });
    
    // Legenda
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 80}, 20)`);
    
    [2019, 2020].forEach((year, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        lg.append('line')
            .attr('x1', 0)
            .attr('x2', 30)
            .attr('y1', 9)
            .attr('y2', 9)
            .attr('stroke', color(year))
            .attr('stroke-width', 3);
        
        lg.append('text')
            .attr('x', 35)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text(year);
    });
    
    // Títulos
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 50)
        .attr('text-anchor', 'middle')
        .text('Mês');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .text('% Pagamentos com Cartão');
}

// Exportar funções
window.Visualizations3 = {
    visualizeTipsByPayment,
    visualizePandemicVolume,
    visualizeBehaviorChanges,
    visualizeDataQuality,
    visualizeDataRemoval,
    visualizePaymentTrend
};

console.log('✅ visualizations-3.js carregado com sucesso!', window.Visualizations3);
