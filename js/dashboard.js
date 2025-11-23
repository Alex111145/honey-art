document.addEventListener('DOMContentLoaded', function() {
    
    // --- GRAFICO 1: ANDAMENTO SALDO ---
    const ctxSaldo = document.getElementById('liquidazioneChart');
    if (ctxSaldo) {
        new Chart(ctxSaldo, {
            type: 'line',
            data: {
                labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
                datasets: [{
                    label: 'Saldo Cumulativo (€)',
                    data: [1200, 500, -1500, -200, 4500, 12000],
                    borderColor: '#C19F29',
                    borderWidth: 2,
                    fill: {
                        target: 'origin',
                        above: 'rgba(193, 159, 41, 0.2)',
                        below: 'rgba(220, 53, 69, 0.2)'
                    },
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        grid: {
                            color: (context) => context.tick.value === 0 ? '#666' : 'rgba(0, 0, 0, 0.1)',
                            lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                        }
                    }
                }
            }
        });
    }

    // --- GRAFICO 2: PRODOTTI PIÙ VENDUTI (NUOVO) ---
    const ctxTop = document.getElementById('topProductsChart');
    if (ctxTop) {
        // Recuperiamo i prodotti dal DB locale per mostrare nomi reali
        const storedProducts = localStorage.getItem('honeyArtProducts');
        let productNames = [];
        let salesData = [];

        if (storedProducts) {
            const products = JSON.parse(storedProducts);
            // Prendiamo i primi 5 prodotti o tutti se sono meno di 5
            const topProducts = products.slice(0, 7); 
            
            productNames = topProducts.map(p => p.name);
            
            // SIMULAZIONE VENDITE: Generiamo numeri casuali basati sull'ID per simulare "quelli più presenti nel db"
            // In un sistema reale, qui leggeresti un array 'salesHistory'
            salesData = topProducts.map(p => Math.floor(Math.random() * 50) + 10); 
        } else {
            // Dati di fallback se il DB è vuoto
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
                    backgroundColor: [
                        'rgba(193, 159, 41, 0.7)',  // Oro
                        'rgba(91, 66, 0, 0.7)',     // Marrone
                        'rgba(218, 165, 32, 0.7)',  // Altro Oro
                        'rgba(139, 114, 25, 0.7)'   // Bronzo
                    ],
                    borderColor: '#5B4200',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y', // Grafico a barre orizzontali per leggere meglio i nomi
                plugins: {
                    legend: { display: false } // Nasconde la legenda ridondante
                }
            }
        });
    }
});