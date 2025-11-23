// Inizializzazione base del grafico per l'elemento <canvas id="liquidazioneChart"> presente in dashboard.html
document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('liquidazioneChart');
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'],
                datasets: [{
                    label: 'Saldo Cumulativo (€)',
                    data: [1200, 3500, 4200, 8000, 11000, 15800], // Dati congruenti con l'HTML statico
                    borderColor: '#C19F29',
                    backgroundColor: 'rgba(193, 159, 41, 0.2)',
                    fill: true
                }]
            },
            options: { responsive: true }
        });
    }
});