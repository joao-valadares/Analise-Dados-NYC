// Visualizações D3.js - Análise Temporal

// Padrão por hora do dia
function visualizeHourlyPattern(data) {
    const { toNumber, convertBigInt, createTooltip, colors } = window.Utils;
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

// Padrão semanal
function visualizeWeeklyPattern(data) {
    const { toNumber, convertBigInt, createTooltip, colors } = window.Utils;
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
    
    const cleanData = data.map(convertBigInt).map(d => ({
        day_name: d.day_name,
        day_of_week: toNumber(d.day_of_week),
        year: toNumber(d.year),
        trips: toNumber(d.trips),
        avg_fare: toNumber(d.avg_fare) || 0
    })).filter(d => d.day_name && !isNaN(d.trips));
    
    if (!cleanData.length) return;
    
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

// Exportar funções
window.Visualizations = {
    visualizeHourlyPattern,
    visualizeWeeklyPattern
};
