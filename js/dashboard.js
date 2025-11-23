document.addEventListener('DOMContentLoaded', function() {
    
    // --- 1. RECUPERO DATI ---
    const storedSales = localStorage.getItem('honeyArtSales');
    const sales = storedSales ? JSON.parse(storedSales) : [];
    
    const storedExpenses = localStorage.getItem('honeyArtExpenses');
    const expenses = storedExpenses ? JSON.parse(storedExpenses) : [];
    
    // Se non ci sono dati, usiamo dati finti per non lasciare i grafici vuoti all'inizio
    const hasData = sales.length > 0;
    
    // --- 2. CALCOLO TOTALI PER I BANNER ---
    let totalRevenue = 0;
    let totalCash = 0;
    let totalPOS = 0;
    let totalExpenses = 0;

    sales.forEach(s => {
        totalRevenue += s.amount;
        if (s.method === 'contanti') totalCash += s.amount;
        if (s.method === 'pos') totalPOS += s.amount;
    });

    expenses.forEach(e => {
        totalExpenses += Math.abs(e.amount); // Somma spese positivo
    });
    
    const saldo = totalRevenue - totalExpenses;

    // Aggiorna Banner HTML
    if (document.getElementById('saldo-totale')) {
        document.getElementById('saldo-totale').textContent = `€${saldo.toFixed(2).replace('.', ',')}`;
        document.getElementById('guadagno-totale').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-totale').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
        // Per semplicità "mese" = totale in questa demo statica, o metti 0
        document.getElementById('guadagno-mese').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-mese').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
    }

    // --- 3. CONFIGURAZIONE GRAFICI ---

    // A. Grafico Andamento Saldo (Full Width)
    const ctxSaldo = document.getElementById('liquidazioneChart');
    if (ctxSaldo) {
        // Dati simulati per estetica se vuoto, altrimenti usiamo il totale
        const labels = hasData ? sales.map(s => new Date(s.date).toLocaleDateString()) : ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu'];
        // Creiamo una curva di accumulo
        let acc = 0;
        const dataPoints = hasData ? sales.map(s => { acc += s.amount; return acc; }) : [1200, 1800, 500, 2200, 4500, saldo || 6000];

        new Chart(ctxSaldo, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Saldo Cumulativo (€)',
                    data: dataPoints,
                    borderColor: '#C19F29',
                    borderWidth: 3,
                    fill: {
                        target: 'origin',
                        above: 'rgba(193, 159, 41, 0.2)',
                        below: 'rgba(220, 53, 69, 0.2)'
                    },
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // B. Grafico Contanti (Simulazione Andamento)
    const ctxCash = document.getElementById('cashChart');
    if (ctxCash) {
        let accCash = 0;
        // Filtra solo vendite contanti o usa dati finti
        const cashSales = hasData ? sales.filter(s => s.method === 'contanti') : [];
        const cashData = hasData ? cashSales.map(s => { accCash += s.amount; return accCash; }) : [200, 400, 450, 800, 1200];
        const cashLabels = hasData ? cashSales.map(s => new Date(s.date).toLocaleDateString()) : ['Sett 1', 'Sett 2', 'Sett 3', 'Sett 4'];

        new Chart(ctxCash, {
            type: 'bar', // A barre per variare
            data: {
                labels: cashLabels,
                datasets: [{
                    label: 'Totale Contanti (€)',
                    data: cashData,
                    backgroundColor: 'rgba(25, 135, 84, 0.6)', // Verde Soldi
                    borderColor: '#198754',
                    borderWidth: 1
                }]
            },
            options: { responsive: true }
        });
    }

    // C. Grafico POS (Simulazione Andamento)
    const ctxPOS = document.getElementById('posChart');
    if (ctxPOS) {
        let accPOS = 0;
        const posSales = hasData ? sales.filter(s => s.method === 'pos') : [];
        const posData = hasData ? posSales.map(s => { accPOS += s.amount; return accPOS; }) : [500, 1200, 1500, 2200, 3000];
        const posLabels = hasData ? posSales.map(s => new Date(s.date).toLocaleDateString()) : ['Sett 1', 'Sett 2', 'Sett 3', 'Sett 4'];

        new Chart(ctxPOS, {
            type: 'line',
            data: {
                labels: posLabels,
                datasets: [{
                    label: 'Totale POS (€)',
                    data: posData,
                    borderColor: '#0d6efd', // Blu Carta di Credito
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true }
        });
    }

    // D. Grafico Prodotti Più Venduti (Full Width)
    const ctxTop = document.getElementById('topProductsChart');
    if (ctxTop) {
        // Calcolo reale dai dati di vendita
        let productCounts = {};
        
        if (hasData) {
            sales.forEach(order => {
                order.items.forEach(item => {
                    if (productCounts[item.name]) {
                        productCounts[item.name] += item.quantity;
                    } else {
                        productCounts[item.name] = item.quantity;
                    }
                });
            });
        } else {
            // Dati finti
            productCounts = { 'Miele Acacia': 12, 'Set Regalo': 8, 'Vasetto Lavanda': 5, 'Miele Castagno': 15 };
        }

        const pLabels = Object.keys(productCounts);
        const pData = Object.values(productCounts);

        new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: pLabels,
                datasets: [{
                    label: 'Quantità Venduta',
                    data: pData,
                    backgroundColor: [
                        'rgba(193, 159, 41, 0.7)',
                        'rgba(91, 66, 0, 0.7)',
                        'rgba(218, 165, 32, 0.7)',
                        'rgba(139, 114, 25, 0.7)'
                    ],
                    borderColor: '#5B4200',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y', // Orizzontale
                plugins: { legend: { display: false } }
            }
        });
    }
});