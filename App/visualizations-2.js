// Continuação das visualizações D3.js
// (colors, toNumber, convertBigInt já estão definidos em visualizations-1.js)

function createTooltip() {
    let tooltip = d3.select('.tooltip');
    if (tooltip.empty()) {
        tooltip = d3.select('body')
            .append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0);
    }
    return tooltip;
}

// 5. Composição de tarifas (Stacked Bar Chart) - COMPLETO com todos os componentes
function visualizeFareComposition(data) {
    console.log('📊 visualizeFareComposition - Dados recebidos:', data);
    
    const container = d3.select('#fare-composition');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 150, bottom: 60, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Preparar dados (converter BigInt) - TODOS os componentes
    // Filtro de ano não é mais necessário - dados já vêm filtrados da VIEW clean_trips
    const validData = data.map(convertBigInt);
    console.log('📊 visualizeFareComposition - Dados recebidos:', validData);
    
    if (validData.length === 0) {
        console.error('❌ Nenhum dado válido para composição de tarifas');
        return;
    }
    
    const components = ['fare', 'extra', 'mta_tax', 'tip', 'tolls', 'improvement_surcharge', 'congestion_surcharge', 'airport_fee'];
    const componentNames = {
        fare: 'Tarifa Base',
        extra: 'Extras',
        mta_tax: 'Taxa MTA',
        tip: 'Gorjeta',
        tolls: 'Pedágios',
        improvement_surcharge: 'Sobretaxa Melhoria',
        congestion_surcharge: 'Sobretaxa Congestionamento',
        airport_fee: 'Taxa Aeroporto'
    };
    
    const stackData = validData.map(d => {
        const obj = {year: toNumber(d.year).toString()};
        components.forEach(comp => obj[comp] = toNumber(d[comp]) || 0);
        return obj;
    });
    
    // Stack
    const stack = d3.stack()
        .keys(components);
    
    const series = stack(stackData);
    
    // Escalas
    const x = d3.scaleBand()
        .domain(stackData.map(d => d.year))
        .range([0, width])
        .padding(0.3);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(series, s => d3.max(s, d => d[1]))])
        .nice()
        .range([height, 0]);
    
    // Cores diferenciadas para cada componente
    const color = d3.scaleOrdinal()
        .domain(components)
        .range(['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0', '#a8edea']);
    
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
        .call(d3.axisLeft(y).tickFormat(d => '$' + d));
    
    // Barras empilhadas
    const tooltip = createTooltip();
    
    svg.selectAll('.series')
        .data(series)
        .enter().append('g')
        .attr('class', 'series')
        .attr('fill', d => color(d.key))
        .selectAll('rect')
        .data(d => d)
        .enter().append('rect')
        .attr('class', 'bar')
        .attr('x', d => x(d.data.year))
        .attr('y', height)
        .attr('height', 0)
        .attr('width', x.bandwidth())
        .on('mouseover', function(event, d) {
            const key = d3.select(this.parentNode).datum().key;
            const value = d[1] - d[0];
            const total = d.data.total || d[1];
            const percentage = total > 0 ? (value / total * 100).toFixed(1) : 0;
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`<h4>${componentNames[key]} - ${d.data.year}</h4>
                          <p><strong>Valor Médio:</strong> $${value.toFixed(2)}</p>
                          <p><strong>% do Total:</strong> ${percentage}%</p>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        })
        .transition()
        .duration(800)
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]));
    
    // Legenda
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + 10}, 0)`);
    
    components.forEach((comp, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        lg.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', color(comp));
        
        lg.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .style('font-size', '10px')
            .text(componentNames[comp]);
    });
    
    // Título dos eixos
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Valor Médio ($)');
}

// 7. Correlação Distância vs Tarifa (Scatter plot)
function visualizeDistanceFareCorrelation(data) {
    const container = d3.select('#distance-fare-correlation');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 100, bottom: 60, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Converter BigInt nos dados
    const cleanData = data.map(convertBigInt);
    
    console.log(`📊 Renderizando correlação com ${cleanData.length} pontos agregados`);
    
    // Escalas
    const x = d3.scaleLinear()
        .domain([0, d3.max(cleanData, d => d.trip_distance)])
        .nice()
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(cleanData, d => d.total_amount)])
        .nice()
        .range([height, 0]);
    
    // Escala de tamanho baseada no número de viagens
    const maxCount = d3.max(cleanData, d => toNumber(d.trip_count));
    const radiusScale = d3.scaleSqrt()
        .domain([0, maxCount])
        .range([2, 15]); // Raio varia de 2 a 15px
    
    const color = d3.scaleOrdinal()
        .domain([2019, 2020])
        .range([colors.year2019, colors.year2020]);
    
    // Grade
    svg.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(y).tickSize(-width).tickFormat(''));
    
    svg.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSize(-height).tickFormat(''));
    
    // Eixos
    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append('text')
        .attr('x', width / 2)
        .attr('y', 40)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Distância (milhas)');
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).tickFormat(d => '$' + d))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -60)
        .attr('fill', 'currentColor')
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Tarifa Total ($)');
    
    // Pontos (agora agregados com tamanho proporcional)
    const tooltip = createTooltip();
    
    svg.selectAll('.dot-scatter')
        .data(cleanData)
        .enter().append('circle')
        .attr('class', 'dot-scatter')
        .attr('cx', d => x(toNumber(d.trip_distance)))
        .attr('cy', d => y(toNumber(d.total_amount)))
        .attr('r', d => radiusScale(toNumber(d.trip_count)))
        .attr('fill', d => color(d.year))
        .attr('opacity', 0.5)
        .attr('stroke', d => color(d.year))
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            d3.select(this).attr('opacity', 1).attr('stroke-width', 2);
            tooltip.transition().duration(200).style('opacity', .9);
            tooltip.html(`<h4>${d.year} - ${toNumber(d.trip_distance).toFixed(1)} milhas</h4>
                          <p><strong>Tarifa Média:</strong> $${toNumber(d.total_amount).toFixed(2)}</p>
                          <p><strong>Viagens:</strong> ${toNumber(d.trip_count).toLocaleString()}</p>
                          <p><strong>Variação:</strong> $${toNumber(d.min_fare).toFixed(2)} - $${toNumber(d.max_fare).toFixed(2)}</p>
                          <p style="color: #999; font-size: 11px;">Tamanho do círculo = volume de viagens</p>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function(d) {
            d3.select(this).attr('opacity', 0.5).attr('stroke-width', 1);
            tooltip.transition().duration(500).style('opacity', 0);
        });
    
    // Linha de tendência (regressão linear ponderada pelo volume)
    [2019, 2020].forEach(year => {
        const yearData = cleanData.filter(d => d.year === year);

        // Calcular regressão linear PONDERADA (cada ponto tem peso = trip_count)
        const totalWeight = d3.sum(yearData, d => toNumber(d.trip_count));
        const sumWX = d3.sum(yearData, d => toNumber(d.trip_count) * toNumber(d.trip_distance));
        const sumWY = d3.sum(yearData, d => toNumber(d.trip_count) * toNumber(d.total_amount));
        const sumWXY = d3.sum(yearData, d => toNumber(d.trip_count) * toNumber(d.trip_distance) * toNumber(d.total_amount));
        const sumWX2 = d3.sum(yearData, d => toNumber(d.trip_count) * toNumber(d.trip_distance) * toNumber(d.trip_distance));

        const slope = (totalWeight * sumWXY - sumWX * sumWY) / (totalWeight * sumWX2 - sumWX * sumWX);
        const intercept = (sumWY - slope * sumWX) / totalWeight;
        
        const trendLine = d3.line()
            .x(d => x(d))
            .y(d => y(slope * d + intercept));
        
        const xDomain = x.domain();
        svg.append('path')
            .datum([xDomain[0], xDomain[1]])
            .attr('class', 'trend-line')
            .attr('d', trendLine)
            .attr('stroke', color(year))
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('fill', 'none');
    });
    
    // Legenda
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 80}, 20)`);
    
    [2019, 2020].forEach((year, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        lg.append('circle')
            .attr('cx', 9)
            .attr('cy', 9)
            .attr('r', 6)
            .attr('fill', color(year))
            .attr('opacity', 0.6);
        
        lg.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text(year);
    });
    
    // Título dos eixos
    svg.append('text')
        .attr('transform', `translate(${width/2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .text('Distância da Viagem (milhas)');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Tarifa Total ($)');
}

// 8. Distribuição de pagamentos (Donut Chart)
function visualizePaymentDistribution(data) {
    console.log('📊 visualizePaymentDistribution - Dados recebidos:', data);
    
    const container = d3.select('#payment-distribution');
    container.selectAll('*').remove();
    
    if (!data || data.length === 0) {
        console.error('❌ Nenhum dado para distribuição de pagamento');
        container.append('p')
            .style('text-align', 'center')
            .style('padding', '50px')
            .text('Nenhum dado disponível para esta visualização');
        return;
    }
    
    const width = container.node().getBoundingClientRect().width;
    const height = 450;
    const radius = Math.min(width, height) / 3 - 40; // Reduzido de /2 para /3
    
    const svg = container.append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Criar um grupo para cada ano
    const years = [2019, 2020];
    const gWidth = width / 2;
    
    years.forEach((year, idx) => {
        const g = svg.append('g')
            .attr('transform', `translate(${gWidth * idx + gWidth/2}, ${height/2})`);
        
        // Converter BigInt e filtrar dados do ano - APENAS DINHEIRO E CARTÃO
        const yearData = data
            .map(convertBigInt)
            .map(d => ({
                year: toNumber(d.year),
                payment_type: toNumber(d.payment_type),
                payment_name: d.payment_name,
                count: toNumber(d.count),
                avg_amount: toNumber(d.avg_amount) || 0
            }))
            .filter(d => {
                const isCashOrCard = d.payment_type === 1 || d.payment_type === 2; // 1=Cartão, 2=Dinheiro
                return d.year === year && d.count > 0 && !isNaN(d.count) && isCashOrCard;
            });
        
        console.log(`📊 Dados para ${year}:`, yearData);
        
        // Se não há dados para este ano, mostrar mensagem
        if (yearData.length === 0) {
            g.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', 0)
                .style('font-size', '14px')
                .text(`Sem dados para ${year}`);
            return;
        }
        
        const pie = d3.pie()
            .value(d => d.count)
            .sort(null);
        
        const arc = d3.arc()
            .innerRadius(radius * 0.5)
            .outerRadius(radius);
        
        const arcHover = d3.arc()
            .innerRadius(radius * 0.5)
            .outerRadius(radius * 1.1);
        
        const color = d3.scaleOrdinal()
            .domain(yearData.map(d => d.payment_name))
            .range(colors.payment);
        
        const tooltip = createTooltip();
        
        const arcs = g.selectAll('.arc')
            .data(pie(yearData))
            .enter().append('g')
            .attr('class', 'arc');
        
        arcs.append('path')
            .attr('d', arc)
            .attr('fill', d => color(d.data.payment_name))
            .attr('stroke', 'white')
            .attr('stroke-width', 2)
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', arcHover);
                
                tooltip.transition().duration(200).style('opacity', .9);
                const percent = (d.data.count / d3.sum(yearData, d => d.count) * 100).toFixed(1);
                tooltip.html(`<h4>${d.data.payment_name}</h4>
                              <p><strong>Viagens:</strong> ${d3.format(',')(d.data.count)}</p>
                              <p><strong>Percentual:</strong> ${percent}%</p>
                              <p><strong>Valor Médio:</strong> $${d.data.avg_amount.toFixed(2)}</p>`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('d', arc);
                
                tooltip.transition().duration(500).style('opacity', 0);
            })
            .transition()
            .duration(1000)
            .attrTween('d', function(d) {
                const i = d3.interpolate({startAngle: 0, endAngle: 0}, d);
                return t => arc(i(t));
            });
        
        // Título
        g.append('text')
            .attr('text-anchor', 'middle')
            .attr('y', -radius - 20)
            .style('font-size', '18px')
            .style('font-weight', 'bold')
            .text(year);
    });
    
    // Legenda centralizada - apenas tipos de pagamento válidos
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width/2 - 100}, ${height - 30})`);
    
    // Obter tipos de pagamento únicos dos dados convertidos - APENAS DINHEIRO E CARTÃO
    const validData = data.map(convertBigInt).filter(d => {
        const count = toNumber(d.count);
        const paymentType = toNumber(d.payment_type);
        const isCashOrCard = paymentType === 1 || paymentType === 2; // 1=Cartão, 2=Dinheiro
        return count > 0 && isCashOrCard;
    });
    
    const uniquePayments = [...new Set(validData.map(d => d.payment_name))].filter(p => p);
    
    console.log('📊 Tipos de pagamento únicos:', uniquePayments);
    
    uniquePayments.forEach((payment, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(${(i % 3) * 80}, ${Math.floor(i / 3) * 25})`);
        
        lg.append('rect')
            .attr('width', 15)
            .attr('height', 15)
            .attr('fill', colors.payment[i % colors.payment.length]);
        
        lg.append('text')
            .attr('x', 20)
            .attr('y', 7)
            .attr('dy', '.35em')
            .style('font-size', '11px')
            .text(payment);
    });
}

// 9. Histograma de Distância
function visualizeDistanceHistogram(data) {
    console.log('📊 visualizeDistanceHistogram - Dados recebidos:', data.length, 'registros');
    console.log('📊 Amostra dos dados:', data.slice(0, 5));
    
    const container = d3.select('#distance-histogram');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 80, bottom: 60, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Preparar dados PRÉ-AGREGADOS (já vem com contagem do SQL)
    const cleanData = data.map(d => ({
        distance: toNumber(d.trip_distance),
        year: toNumber(d.year),
        frequency: toNumber(d.frequency) || 1
    })).filter(d => {
        // Filtro de ano não é mais necessário - dados já vêm filtrados da VIEW clean_trips
        return !isNaN(d.distance) && 
               d.distance >= 0 && 
               d.distance <= 20;
    });
    
    console.log('📊 visualizeDistanceHistogram - Dados limpos:', cleanData.length, 'bins agregados');
    console.log('📊 Amostra dos dados limpos:', cleanData.slice(0, 5));
    
    if (cleanData.length === 0) {
        console.error('❌ Nenhum dado válido para histograma de distância');
        return;
    }
    
    // Agrupar por ano
    const data2019 = cleanData.filter(d => d.year === 2019);
    const data2020 = cleanData.filter(d => d.year === 2020);
    
    // Criar bins manualmente com os dados pré-agregados
    const bins2019 = data2019.map(d => ({
        x0: d.distance,
        x1: d.distance + 0.5,
        length: d.frequency
    }));
    
    const bins2020 = data2020.map(d => ({
        x0: d.distance,
        x1: d.distance + 0.5,
        length: d.frequency
    }));
    
    // Escalas
    const x = d3.scaleLinear()
        .domain([0, 20])
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max([...bins2019, ...bins2020], d => d.length)])
        .nice()
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
        .call(d3.axisBottom(x).tickFormat(d => d + ' mi'));
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).tickFormat(d => d3.format('.2s')(d)));
    
    // Barras 2019
    svg.selectAll('.bar-2019')
        .data(bins2019)
        .enter().append('rect')
        .attr('class', 'bar bar-2019')
        .attr('x', d => x(d.x0))
        .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', color(2019))
        .attr('opacity', 0.6)
        .transition()
        .duration(800)
        .attr('y', d => y(d.length))
        .attr('height', d => height - y(d.length));
    
    // Barras 2020
    svg.selectAll('.bar-2020')
        .data(bins2020)
        .enter().append('rect')
        .attr('class', 'bar bar-2020')
        .attr('x', d => x(d.x0))
        .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr('y', height)
        .attr('height', 0)
        .attr('fill', color(2020))
        .attr('opacity', 0.6)
        .transition()
        .duration(800)
        .attr('y', d => y(d.length))
        .attr('height', d => height - y(d.length));
    
    // Legenda
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width - 100}, 20)`);
    
    [2019, 2020].forEach((year, i) => {
        const lg = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);
        
        lg.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('fill', color(year))
            .attr('opacity', 0.6);
        
        lg.append('text')
            .attr('x', 24)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text(year);
    });
    
    // Títulos
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 50)
        .attr('text-anchor', 'middle')
        .text('Distância da Viagem (milhas)');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -margin.left + 20)
        .attr('x', -height / 2)
        .attr('text-anchor', 'middle')
        .text('Frequência');
}

// Exportar funções
window.Visualizations2 = {
    visualizeFareComposition,
    visualizeDistanceFareCorrelation,
    visualizePaymentDistribution,
    visualizeDistanceHistogram
};
