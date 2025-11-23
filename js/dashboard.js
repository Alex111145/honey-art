document.addEventListener('DOMContentLoaded', function() {
    
    // --- GRAFICO 1: ANDAMENTO SALDO (Lineare) ---
    const ctxSaldo = document.getElementById('liquidazioneChart');
    if (ctxSaldo) {
        new Chart(ctxSaldo, {
            type: 'line',
            data: {
                labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
                datasets: [{
                    label: 'Saldo Cumulativo (€)',
                    // Dati simulati inclusi negativi
                    data: [1200, 500, -1500, -200, 4500, 12000],
                    borderColor: '#C19F29',
                    borderWidth: 2,
                    fill: {
                        target: 'origin',
                        above: 'rgba(193, 159, 41, 0.2)', // Oro per positivi
                        below: 'rgba(220, 53, 69, 0.2)'   // Rosso per negativi
                    },
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        grid: {
                            // Linea dello zero marcata
                            color: (context) => context.tick.value === 0 ? '#666' : 'rgba(0, 0, 0, 0.1)',
                            lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                        }
                    }
                }
            }
        });
    }

    // --- GRAFICO 2: PRODOTTI PIÙ VENDUTI (Barre Orizzontali) ---
    const ctxTop = document.getElementById('topProductsChart');
    if (ctxTop) {
        const storedProducts = localStorage.getItem('honeyArtProducts');
        let productNames = [];
        let salesData = [];

        if (storedProducts) {
            const products = JSON.parse(storedProducts);
            // Prende fino a 5 prodotti dal DB locale
            const topProducts = products.slice(0, 5);
            productNames = topProducts.map(p => p.name);
            // Simula vendite
            salesData = topProducts.map(() => Math.floor(Math.random() * 50) + 10); 
        } else {
            productNames = ['Miele Acacia', 'Vasetto Lavanda', 'Set Regalo', 'Miele Castagno'];
            salesData = [45, 30, 25, 15];
        }

        new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: productNames,
                datasets: [{
                    label: 'Unità Vendute',
                    data: salesData,
                    backgroundColor: 'rgba(193, 159, 41, 0.7)',
                    borderColor: '#5B4200',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y', // Barre Orizzontali
                plugins: { legend: { display: false } }
            }
        });
    }
});