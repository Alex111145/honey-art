document.addEventListener('DOMContentLoaded', async function() {
    
    // Verifica connessione DB
    if (!window.supabaseClient) {
        setTimeout(() => location.reload(), 1000);
        return;
    }

    // --- 1. SCARICA DATI (VENDITE E SPESE) ---
    let sales = [];
    let expenses = [];
    
    try {
        const { data: salesData, error: sErr } = await window.supabaseClient
            .from('sales')
            .select('*')
            .order('created_at', { ascending: true });
        if (sErr) throw sErr;
        sales = salesData;

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

    // --- 2. CALCOLO TOTALI PER I BANNER ---
    let totalRevenue = 0;
    let totalExpenses = 0;

    sales.forEach(s => totalRevenue += s.total_amount);
    expenses.forEach(e => totalExpenses += Math.abs(e.amount));
    
    const saldo = totalRevenue - totalExpenses;

    if (document.getElementById('saldo-totale')) {
        document.getElementById('saldo-totale').textContent = `€${saldo.toFixed(2).replace('.', ',')}`;
        document.getElementById('guadagno-totale').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-totale').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
        // Semplificazione: Mese = Totale per questa demo
        document.getElementById('guadagno-mese').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-mese').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
    }

    // --- 3. ELABORAZIONE DATI PER I GRAFICI ---

    // A. GRAFICO SALDO (Timeline Unificata)
    // Uniamo entrate e uscite in un'unica lista ordinata
    const transactions = [
        ...sales.map(s => ({
            date: new Date(s.created_at),
            amount: parseFloat(s.total_amount), // + Entrata
            type: 'sale'
        })),
        ...expenses.map(e => ({
            date: new Date(e.created_at),
            amount: parseFloat(e.amount), // - Uscita (già negativo nel DB)
            type: 'expense'
        }))
    ];

    // Ordina cronologicamente
    transactions.sort((a, b) => a.date - b.date);

    // Calcola il saldo progressivo
    let runningBalance = 0;
    const saldoLabels = [];
    const saldoData = [];

    transactions.forEach(t => {
        runningBalance += t.amount;
        saldoLabels.push(t.date.toLocaleDateString('it-IT'));
        saldoData.push(runningBalance);
    });

    // B. RAGGRUPPAMENTO PER GIORNO (Per Contanti, POS, Differenza)
    const dailyStats = {};
    
    sales.forEach(s => {
        // Usa la data locale italiana come chiave univoca
        const dateKey = new Date(s.created_at).toLocaleDateString('it-IT');
        
        if (!dailyStats[dateKey]) {
            dailyStats[dateKey] = { pos: 0, cash: 0 };
        }
        
        if (s.payment_method === 'pos') {
            dailyStats[dateKey].pos += s.total_amount;
        } else {
            dailyStats[dateKey].cash += s.total_amount;
        }
    });

    // Ordina le date correttamente
    const sortedDays = Object.keys(dailyStats).sort((a, b) => {
        const [da, ma, ya] = a.split('/');
        const [db, mb, yb] = b.split('/');
        return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });

    // Estrai i dati ordinati
    const diffData = sortedDays.map(d => dailyStats[d].pos - dailyStats[d].cash);
    const cashData = sortedDays.map(d => dailyStats[d].cash);
    const posData = sortedDays.map(d => dailyStats[d].pos);


    // --- 4. RENDERING GRAFICI ---

    // 1. Andamento Saldo
    const ctxSaldo = document.getElementById('liquidazioneChart');
    if (ctxSaldo) {
        new Chart(ctxSaldo, {
            type: 'line',
            data: {
                labels: saldoLabels,
                datasets: [{
                    label: 'Saldo Cumulativo (€)',
                    data: saldoData,
                    borderColor: '#C19F29',
                    borderWidth: 2,
                    fill: {
                        target: 'origin',
                        above: 'rgba(193, 159, 41, 0.2)',
                        below: 'rgba(220, 53, 69, 0.2)'
                    },
                    tension: 0.3,
                    pointRadius: 2
                }]
            },
            options: { 
                responsive: true,
                aspectRatio: window.innerWidth < 768 ? 2 : 4,
                scales: {
                    y: { grid: { color: c => c.tick.value === 0 ? '#333' : 'rgba(0,0,0,0.1)' } }
                }
            }
        });
    }

    // 2. Differenza POS vs Contanti
    const ctxDiff = document.getElementById('diffChart');
    if (ctxDiff) {
        const bgColors = diffData.map(val => val >= 0 ? 'rgba(13, 110, 253, 0.7)' : 'rgba(25, 135, 84, 0.7)');
        const borderColors = diffData.map(val => val >= 0 ? '#0d6efd' : '#198754');

        new Chart(ctxDiff, {
            type: 'bar',
            data: {
                labels: sortedDays,
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

    // 3. Contanti (Linea)
    const ctxCash = document.getElementById('cashChart');
    if (ctxCash) {
        new Chart(ctxCash, {
            type: 'line',
            data: {
                labels: sortedDays,
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

    // 4. POS (Linea)
    const ctxPOS = document.getElementById('posChart');
    if (ctxPOS) {
        new Chart(ctxPOS, {
            type: 'line',
            data: {
                labels: sortedDays,
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

    // 5. Prodotti Più Venduti (Ordinati!)
    const ctxTop = document.getElementById('topProductsChart');
    if (ctxTop) {
        let productCounts = {};
        
        if (hasData) {
            sales.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
                    });
                }
            });
        }

        // Ordina per quantità decrescente
        const sortedProducts = Object.entries(productCounts)
            .sort(([,a], [,b]) => b - a) // Sort by value desc
            .slice(0, 10); // Prendi i top 10
        
        const pLabels = sortedProducts.map(([k]) => k);
        const pData = sortedProducts.map(([,v]) => v);

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
                indexAxis: 'y',
                plugins: { legend: { display: false } }
            }
        });
    }
});