document.addEventListener('DOMContentLoaded', async function() {
    
    // Verifica se Supabase è pronto
    if (!window.supabaseClient) {
        // Riprova dopo un secondo se la connessione è lenta
        setTimeout(() => location.reload(), 1000);
        return;
    }

    // --- 1. SCARICA DATI (Vendite e Spese) ---
    let sales = [];
    let expenses = [];
    
    try {
        // Scarica Vendite
        const { data: salesData, error: sErr } = await window.supabaseClient
            .from('sales')
            .select('*')
            .order('created_at', { ascending: true });
        if (sErr) throw sErr;
        sales = salesData;

        // Scarica Spese
        const { data: expensesData, error: eErr } = await window.supabaseClient
            .from('expenses')
            .select('*')
            .order('created_at', { ascending: true });
        if (eErr) throw eErr;
        expenses = expensesData;

    } catch (err) {
        console.error("Errore caricamento dati:", err);
        return; 
    }

    const hasData = sales.length > 0 || expenses.length > 0;

    // --- 2. AGGIORNAMENTO BANNER (TOTALI) ---
    let totalRevenue = 0;
    let totalExpenses = 0;

    // Somma Ricavi
    sales.forEach(s => totalRevenue += s.total_amount);
    
    // Somma Spese (Nel DB sono negative, usiamo valore assoluto per i banner di testo)
    expenses.forEach(e => totalExpenses += Math.abs(e.amount));
    
    const saldo = totalRevenue - totalExpenses;

    // Scrivi i valori nei box in alto
    if (document.getElementById('saldo-totale')) {
        document.getElementById('saldo-totale').textContent = `€${saldo.toFixed(2).replace('.', ',')}`;
        document.getElementById('guadagno-totale').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-totale').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
        
        // Per semplicità in questa versione usiamo i totali anche nei campi mese
        // (In una versione avanzata filtreremmo per new Date().getMonth())
        document.getElementById('guadagno-mese').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-mese').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
    }

    // --- 3. PREPARAZIONE DATI PER I GRAFICI ---

    // A. GRAFICO SALDO: Uniamo Vendite e Spese in un'unica timeline
    const transactions = [
        ...sales.map(s => ({
            date: new Date(s.created_at),
            amount: parseFloat(s.total_amount), // Entrata (positiva)
            type: 'sale'
        })),
        ...expenses.map(e => ({
            date: new Date(e.created_at),
            amount: parseFloat(e.amount), // Uscita (già negativa nel DB)
            type: 'expense'
        }))
    ];

    // Ordiniamo tutto per data (dal passato al presente)
    transactions.sort((a, b) => a.date - b.date);

    // Calcoliamo il saldo progressivo passo dopo passo
    let runningBalance = 0;
    const saldoLabels = [];
    const saldoData = [];

    transactions.forEach(t => {
        runningBalance += t.amount; // Se è spesa (negativa), il saldo scende
        saldoLabels.push(t.date.toLocaleDateString('it-IT'));
        saldoData.push(runningBalance);
    });

    // B. RAGGRUPPAMENTO GIORNALIERO (Per Differenza, Contanti, POS)
    // Creiamo un oggetto per sommare i totali giorno per giorno
    const dailyStats = {};
    
    // Elabora Vendite
    sales.forEach(s => {
        const dateKey = new Date(s.created_at).toLocaleDateString('it-IT');
        if (!dailyStats[dateKey]) dailyStats[dateKey] = { pos: 0, cash: 0 };
        
        if (s.payment_method === 'pos') dailyStats[dateKey].pos += s.total_amount;
        else dailyStats[dateKey].cash += s.total_amount;
    });

    // Estrai array per i grafici
    const days = Object.keys(dailyStats); // Le date uniche
    const diffData = days.map(d => dailyStats[d].pos - dailyStats[d].cash); // Differenza
    const cashData = days.map(d => dailyStats[d].cash); // Solo Contanti
    const posData = days.map(d => dailyStats[d].pos);   // Solo POS


    // --- 4. CONFIGURAZIONE GRAFICI CHART.JS ---

    // 1. Grafico Andamento Saldo (Linea che sale e scende)
    const ctxSaldo = document.getElementById('liquidazioneChart');
    if (ctxSaldo) {
        new Chart(ctxSaldo, {
            type: 'line',
            data: {
                labels: saldoLabels, // Date di ogni transazione
                datasets: [{
                    label: 'Saldo Cumulativo (€)',
                    data: saldoData,     // Valori progressivi
                    borderColor: '#C19F29',
                    borderWidth: 2,
                    // Area colorata: Oro se sopra zero, Rossa se sotto zero
                    fill: {
                        target: 'origin',
                        above: 'rgba(193, 159, 41, 0.2)',
                        below: 'rgba(220, 53, 69, 0.2)'
                    },
                    tension: 0.3, // Curvatura linea
                    pointRadius: 2
                }]
            },
            options: { 
                responsive: true,
                // Adatta l'aspetto: largo su PC, più alto su mobile
                aspectRatio: window.innerWidth < 768 ? 2 : 4,
                scales: {
                    y: {
                        grid: {
                            // Linea dello zero più marcata
                            color: (context) => context.tick.value === 0 ? '#333' : 'rgba(0,0,0,0.1)',
                            lineWidth: (context) => context.tick.value === 0 ? 2 : 1
                        }
                    }
                }
            }
        });
    }

    // 2. Istogramma Differenza (POS vs Contanti)
    const ctxDiff = document.getElementById('diffChart');
    if (ctxDiff) {
        const bgColors = diffData.map(val => val >= 0 ? 'rgba(13, 110, 253, 0.7)' : 'rgba(25, 135, 84, 0.7)');
        const borderColors = diffData.map(val => val >= 0 ? '#0d6efd' : '#198754');

        new Chart(ctxDiff, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Differenza (€)',
                    data: diffData,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                aspectRatio: window.innerWidth < 768 ? 2 : 4,
                plugins: { legend: { display: false } },
                scales: { y: { grid: { color: c => c.tick.value === 0 ? '#333' : 'rgba(0,0,0,0.1)', lineWidth: c => c.tick.value === 0 ? 2 : 1 } } }
            }
        });
    }

    // 3. Grafico Contanti (Linea Verde)
    const ctxCash = document.getElementById('cashChart');
    if (ctxCash) {
        new Chart(ctxCash, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Totale Contanti (€)',
                    data: cashData,
                    backgroundColor: 'rgba(25, 135, 84, 0.2)',
                    borderColor: '#198754',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true }
        });
    }

    // 4. Grafico POS (Linea Blu)
    const ctxPOS = document.getElementById('posChart');
    if (ctxPOS) {
        new Chart(ctxPOS, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'Totale POS (€)',
                    data: posData,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.2)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: { responsive: true }
        });
    }

    // 5. Grafico Prodotti Più Venduti (Barre)
    const ctxTop = document.getElementById('topProductsChart');
    if (ctxTop) {
        let productCounts = {};
        // Analizza il JSON degli items dentro ogni vendita
        if (hasData) {
            sales.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
                    });
                }
            });
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
                    backgroundColor: 'rgba(193, 159, 41, 0.7)',
                    borderColor: '#5B4200',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y', // Barre orizzontali per leggere meglio i nomi
                plugins: { legend: { display: false } }
            }
        });
    }
});