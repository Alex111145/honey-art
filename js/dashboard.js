document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('liquidazioneChart');
    
    // Se il canvas non esiste nella pagina, fermiamo lo script per evitare errori
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
            datasets: [{
                label: 'Saldo Cumulativo (€)',
                // ESEMPIO: Marzo e Aprile sono in negativo per simulare delle perdite
                data: [1200, 500, -1500, -200, 4500, 12000],
                borderColor: '#C19F29', // Colore Oro (Linea)
                borderWidth: 2,
                // Configurazione riempimento intelligente (Oro sopra, Rosso sotto)
                fill: {
                    target: 'origin', // Riempie rispetto alla linea dello zero
                    above: 'rgba(193, 159, 41, 0.2)',   // Colore Oro trasparente per i guadagni
                    below: 'rgba(220, 53, 69, 0.2)'     // Colore Rosso trasparente per le perdite
                },
                tension: 0.3 // Curvatura della linea
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        // Formatta i numeri nel tooltip come valuta (es. -€1.500,00)
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false, // Permette al grafico di scendere sotto lo zero
                    grid: {
                        // Colora la linea dello zero di scuro per distinguerla
                        color: (context) => context.tick.value === 0 ? '#666' : 'rgba(0, 0, 0, 0.1)',
                        lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                    }
                }
            }
        }
    });
});