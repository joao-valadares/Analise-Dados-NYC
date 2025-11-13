// Visualizações D3.js

const colors = {
    primary: '#667eea',
    secondary: '#764ba2',
    year2019: '#4CAF50',
    year2020: '#f44336',
    gradient: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
    payment: ['#667eea', '#4CAF50', '#FF9800', '#f44336', '#9E9E9E']
};

// Converter BigInt para Number (DuckDB retorna BigInt)
function toNumber(value) {
    if (typeof value === 'bigint') {
        return Number(value);
    }
    return value;
}

// Converter objeto com BigInt para números
function convertBigInt(obj) {
    const newObj = {};
    for (const key in obj) {
        if (typeof obj[key] === 'bigint') {
            newObj[key] = Number(obj[key]);
        } else {
            newObj[key] = obj[key];
        }
    }
    return newObj;
}

// Criar tooltip
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

// 2. Padrão por hora do dia
function visualizeHourlyPattern(data) {
    const container = d3.select('#hourly-pattern');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 100, bottom: 60, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Converter BigInt e agrupar por ano
    const cleanData = data.map(convertBigInt);
    const groupedData = d3.group(cleanData, d => d.year);
    
    // Escalas
    const x = d3.scaleLinear()
        .domain([0, 23])
        .range([0, width]);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(cleanData, d => toNumber(d.trips))])
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
        .call(d3.axisBottom(x).ticks(24));
    
    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).tickFormat(d => d3.format('.2s')(d)));
    
    // Linha
    const line = d3.line()
        .x(d => x(d.hour))
        .y(d => y(d.trips))
        .curve(d3.curveMonotoneX);
    
    const tooltip = createTooltip();
    
    // Área
    const area = d3.area()
        .x(d => x(d.hour))
        .y0(height)
        .y1(d => y(d.trips))
        .curve(d3.curveMonotoneX);
    
    groupedData.forEach((values, year) => {
        // Área
        svg.append('path')
            .datum(values)
            .attr('class', 'area')
            .attr('fill', color(year))
            .attr('d', area)
            .style('opacity', 0.3);
        
        // Linha
        svg.append('path')
            .datum(values)
            .attr('class', 'line')
            .attr('stroke', color(year))
            .attr('d', line)
            .attr('stroke-width', 2.5)
            .attr('fill', 'none');
        
        // Pontos
        svg.selectAll(`.dot-${year}`)
            .data(values)
            .enter().append('circle')
            .attr('class', `dot dot-${year}`)
            .attr('cx', d => x(d.hour))
            .attr('cy', d => y(d.trips))
            .attr('r', 4)
            .attr('fill', color(year))
            .on('mouseover', function(event, d) {
                d3.select(this).attr('r', 6);
                tooltip.transition().duration(200).style('opacity', .9);
                tooltip.html(`<h4>${d.hour}:00 - ${year}</h4>
                              <p><strong>Viagens:</strong> ${d3.format(',')(d.trips)}</p>
                              <p><strong>Tarifa Média:</strong> $${d.avg_fare}</p>
                              <p><strong>Distância Média:</strong> ${d.avg_distance} mi</p>`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).attr('r', 4);
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
            .attr('stroke-width', 2.5);
        
        lg.append('text')
            .attr('x', 35)
            .attr('y', 9)
            .attr('dy', '.35em')
            .text(year);
    });
    
    // Título dos eixos
    svg.append('text')
        .attr('transform', `translate(${width/2}, ${height + margin.bottom - 10})`)
        .style('text-anchor', 'middle')
        .text('Hora do Dia');
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .text('Número de Viagens');
}

// 3. Padrão semanal
function visualizeWeeklyPattern(data) {
    const container = d3.select('#weekly-pattern');
    container.selectAll('*').remove();
    
    const margin = {top: 20, right: 80, bottom: 60, left: 80};
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Preparar dados (converter BigInt) e validar
    // Filtro de ano não é mais necessário - dados já vêm filtrados da VIEW clean_trips
    const cleanData = data.map(convertBigInt).map(d => ({
        day_name: d.day_name,
        day_of_week: toNumber(d.day_of_week),
        year: toNumber(d.year),
        trips: toNumber(d.trips),
        avg_fare: toNumber(d.avg_fare) || 0
    })).filter(d => {
        return d.day_name && !isNaN(d.trips);
    });
    
    if (cleanData.length === 0) {
        console.error('Nenhum dado válido para padrão semanal');
        return;
    }
    
    const daysOrder = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const groupedData = d3.group(cleanData, d => d.day_name);
    
    const chartData = daysOrder.map(day => {
        const dayData = groupedData.get(day) || [];
        return {
            day: day,
            y2019: dayData.find(d => d.year === 2019)?.trips || 0,
            y2020: dayData.find(d => d.year === 2020)?.trips || 0,
            fare2019: dayData.find(d => d.year === 2019)?.avg_fare || 0,
            fare2020: dayData.find(d => d.year === 2020)?.avg_fare || 0
        };
    });
    
    // Escalas
    const x0 = d3.scaleBand()
        .domain(chartData.map(d => d.day))
        .rangeRound([0, width])
        .paddingInner(0.1);
    
    const x1 = d3.scaleBand()
        .domain(['2019', '2020'])
        .rangeRound([0, x0.bandwidth()])
        .padding(0.05);
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, d => Math.max(d.y2019, d.y2020))])
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
        .call(d3.axisLeft(y).tickFormat(d => d3.format('.2s')(d)));
    
    // Barras
    const tooltip = createTooltip();
    
    const dayGroup = svg.selectAll('.day-group')
        .data(chartData)
        .enter().append('g')
        .attr('class', 'day-group')
        .attr('transform', d => `translate(${x0(d.day)},0)`);
    
    dayGroup.selectAll('rect')
        .data(d => ['2019', '2020'].map(year => ({
            year: year,
            day: d.day,
            value: year === '2019' ? d.y2019 : d.y2020,
            fare: year === '2019' ? d.fare2019 : d.fare2020
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
            tooltip.html(`<h4>${d.day} - ${d.year}</h4>
                          <p><strong>Viagens:</strong> ${d3.format(',')(d.value)}</p>
                          <p><strong>Tarifa Média:</strong> $${d.fare}</p>`)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
            tooltip.transition().duration(500).style('opacity', 0);
        })
        .transition()
        .duration(800)
        .attr('y', d => y(d.value))
        .attr('height', d => height - y(d.value));
    
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
        .text('Número de Viagens');
}

// 5. Heatmap Hora x Dia da Semana
function visualizeHourDayHeatmap(data) {
    const container = d3.select('#hour-day-heatmap');
    container.selectAll('*').remove();
    
    // Criar dois heatmaps lado a lado (2019 e 2020)
    const years = [2019, 2020];
    const margin = {top: 50, right: 20, bottom: 80, left: 80}; // Aumentado bottom margin
    const heatmapWidth = 400;
    const heatmapHeight = 300;
    const gap = 50;
    
    const totalWidth = (heatmapWidth + margin.left + margin.right) * 2 + gap;
    const totalHeight = heatmapHeight + margin.top + margin.bottom + 20; // +20px extra para legenda
    
    const svg = container.append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight);
    
    // Preparar dados e validar
    // Filtro de ano não é mais necessário - dados já vêm filtrados da VIEW clean_trips
    const cleanData = data.map(convertBigInt).map(d => ({
        year: toNumber(d.year),
        day_of_week: toNumber(d.day_of_week),
        hour: toNumber(d.hour),
        trips: toNumber(d.trips),
        avg_fare: toNumber(d.avg_fare) || 0
    })).filter(d => {
        return d.day_of_week >= 0 && d.day_of_week <= 6 &&
               d.hour >= 0 && d.hour <= 23 &&
               !isNaN(d.trips);
    });
    
    if (cleanData.length === 0) {
        console.error('Nenhum dado válido para heatmap');
        return;
    }
    
    const dataByYear = d3.group(cleanData, d => d.year);
    
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const hours = d3.range(0, 24);
    
    const tooltip = createTooltip();
    
    years.forEach((year, yearIndex) => {
        const yearData = dataByYear.get(year) || [];
        const xOffset = yearIndex * (heatmapWidth + margin.left + margin.right + gap);
        
        const g = svg.append('g')
            .attr('transform', `translate(${xOffset + margin.left},${margin.top})`);
        
        // Título
        g.append('text')
            .attr('x', heatmapWidth / 2)
            .attr('y', -20)
            .attr('text-anchor', 'middle')
            .style('font-size', '16px')
            .style('font-weight', 'bold')
            .text(year);
        
        // Criar matriz de dados
        const matrix = [];
        for (let day = 0; day < 7; day++) {
            for (let hour = 0; hour < 24; hour++) {
                const cell = yearData.find(d => d.day_of_week === day && d.hour === hour);
                matrix.push({
                    day,
                    hour,
                    trips: cell ? toNumber(cell.trips) : 0,
                    avg_fare: cell ? toNumber(cell.avg_fare) : 0
                });
            }
        }
        
        // Escala de cor
        const colorScale = d3.scaleSequential(d3.interpolateYlGnBu)
            .domain([0, d3.max(matrix, d => d.trips)]);
        
        // Escalas de posição
        const xScale = d3.scaleBand()
            .domain(hours)
            .range([0, heatmapWidth])
            .padding(0.05);
        
        const yScale = d3.scaleBand()
            .domain(d3.range(0, 7))
            .range([0, heatmapHeight])
            .padding(0.05);
        
        // Células do heatmap
        g.selectAll('rect')
            .data(matrix)
            .enter().append('rect')
            .attr('x', d => xScale(d.hour))
            .attr('y', d => yScale(d.day))
            .attr('width', xScale.bandwidth())
            .attr('height', yScale.bandwidth())
            .attr('fill', d => d.trips > 0 ? colorScale(d.trips) : '#f0f0f0')
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .on('mouseover', function(event, d) {
                d3.select(this).attr('stroke', '#000').attr('stroke-width', 2);
                tooltip.transition().duration(200).style('opacity', .9);
                tooltip.html(`<h4>${dayNames[d.day]} - ${d.hour}:00h (${year})</h4>
                              <p><strong>Viagens:</strong> ${d3.format(',')(d.trips)}</p>
                              <p><strong>Tarifa Média:</strong> $${d.avg_fare.toFixed(2)}</p>`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 28) + 'px');
            })
            .on('mouseout', function() {
                d3.select(this).attr('stroke', '#fff').attr('stroke-width', 1);
                tooltip.transition().duration(500).style('opacity', 0);
            });
        
        // Eixo X (horas)
        const xAxis = d3.axisBottom(xScale)
            .tickValues([0, 6, 12, 18, 23])
            .tickFormat(d => `${d}h`);
        
        g.append('g')
            .attr('class', 'axis')
            .attr('transform', `translate(0,${heatmapHeight})`)
            .call(xAxis);
        
        // Eixo Y (dias)
        const yAxis = d3.axisLeft(yScale)
            .tickFormat(d => dayNames[d]);
        
        g.append('g')
            .attr('class', 'axis')
            .call(yAxis);
        
        // Label eixo X
        g.append('text')
            .attr('x', heatmapWidth / 2)
            .attr('y', heatmapHeight + 40)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Hora do Dia');
    });
    
    // Legenda de cores (compartilhada)
    const legendWidth = 300;
    const legendHeight = 20;
    const legendX = (totalWidth - legendWidth) / 2;
    const legendY = totalHeight - 50; // Ajustado para não vazar
    
    const allTrips = cleanData.map(d => toNumber(d.trips));
    const maxTrips = d3.max(allTrips);
    
    const legendScale = d3.scaleSequential(d3.interpolateYlGnBu)
        .domain([0, maxTrips]);
    
    const legendAxis = d3.scaleLinear()
        .domain([0, maxTrips])
        .range([0, legendWidth]);
    
    const legendG = svg.append('g')
        .attr('transform', `translate(${legendX},${legendY})`);
    
    // Gradiente
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
        .attr('id', 'heatmap-gradient');
    
    gradient.selectAll('stop')
        .data(d3.range(0, 1.1, 0.1))
        .enter().append('stop')
        .attr('offset', d => `${d * 100}%`)
        .attr('stop-color', d => legendScale(d * maxTrips));
    
    legendG.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#heatmap-gradient)');
    
    legendG.append('g')
        .attr('transform', `translate(0,${legendHeight})`)
        .call(d3.axisBottom(legendAxis).ticks(5).tickFormat(d => d3.format('.2s')(d)))
        .select('.domain').remove();
    
    legendG.append('text')
        .attr('x', legendWidth / 2)
        .attr('y', -5)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text('Número de Viagens');
}

// Continua no próximo arquivo...
window.Visualizations = {
    visualizeHourlyPattern,
    visualizeWeeklyPattern,
    visualizeHourDayHeatmap
};
