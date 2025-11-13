// Visualizações D3.js - Impacto da Pandemia

// Gorjetas por tipo de pagamento
function visualizeTipsByPayment(data) {
    const { toNumber, convertBigInt, createTooltip, colors } = window.Utils;
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
    
    // Preparar dados (converter BigInt) - FILTRAR APENAS CARTÃO
    const cleanData = data.map(convertBigInt).filter(d => d.payment_name === 'Cartão');
    const groupedData = d3.group(cleanData, d => d.payment_name);
    
    const chartData = [{
        type: 'Cartão',
        tip2019: toNumber(cleanData.find(d => d.year === 2019)?.avg_tip || 0),
        tip2020: toNumber(cleanData.find(d => d.year === 2020)?.avg_tip || 0),
        pct2019: toNumber(cleanData.find(d => d.year === 2019)?.tip_percentage || 0),
        pct2020: toNumber(cleanData.find(d => d.year === 2020)?.tip_percentage || 0)
    }];
    
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
            tooltip.html(`<h4>${d.type} - ${d.year}</h4>
                          <p><strong>Gorjeta Média:</strong> $${d.tip.toFixed(2)}</p>
                          <p><strong>Percentual:</strong> ${d.pct.toFixed(1)}% da tarifa</p>`)
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
}

// Mudanças de comportamento
function visualizeBehaviorChanges(data) {
    const { toNumber, convertBigInt, createTooltip, colors } = window.Utils;
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


// Exportar funções
window.Visualizations3 = {
    visualizeTipsByPayment,
    visualizeBehaviorChanges
};
