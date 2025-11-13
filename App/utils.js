// Utilidades compartilhadas para todas as visualizações

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

// Criar tooltip (singleton)
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

// Paleta de cores
const colors = {
    primary: '#667eea',
    secondary: '#764ba2',
    year2019: '#4CAF50',
    year2020: '#f44336',
    gradient: ['#667eea', '#764ba2', '#f093fb', '#4facfe'],
    payment: ['#667eea', '#4CAF50', '#FF9800', '#f44336', '#9E9E9E']
};

// Exportar para uso global
window.Utils = {
    toNumber,
    convertBigInt,
    createTooltip,
    colors
};
