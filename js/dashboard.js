document.addEventListener('DOMContentLoaded', async function() {
    
    if (!window.supabaseClient) {
        setTimeout(() => location.reload(), 1000);
        return;
    }

    // --- 1. SCARICA DATI ---
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

    // --- 2. CALCOLO TOTALI ---
    let totalRevenue = 0;      // Incasso Totale (Prezzo Vendita)
    let totalExpenses = 0;     // Spese Extra
    let totalHoneyCost = 0;    // Costo Miele (Debito)

    sales.forEach(s => {
        totalRevenue += s.total_amount;
        
        // Calcola il costo interno del miele per ogni articolo venduto
        if (s.items && Array.isArray(s.items)) {
            s.items.forEach(item => {
                const cost = item.cost || 0; 
                const qty = item.quantity || 1;
                totalHoneyCost += (cost * qty);
            });
        }
    });

    expenses.forEach(e => totalExpenses += Math.abs(e.amount));
    
    // FORMULA: Saldo Utile = Prezzo Vendita - Prezzo Miele - Spese Extra
    const saldoUtile = totalRevenue - totalHoneyCost - totalExpenses;

    if (document.getElementById('saldo-totale')) {
        document.getElementById('saldo-totale').textContent = `€${saldoUtile.toFixed(2).replace('.', ',')}`;
        document.getElementById('guadagno-totale').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('debito-totale').textContent = `-€${totalHoneyCost.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-totale').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
    }

    // --- 3. GRAFICI ---

    // A. Timeline Saldo (Utile Progressivo)
    const transactions = [];

    // Aggiungi Vendite (Utile = Prezzo - Costo)
    sales.forEach(s => {
        let saleCost = 0;
        if (s.items) {
            s.items.forEach(i => saleCost += (i.cost || 0) * (i.quantity || 1));
        }
        const saleProfit = s.total_amount - saleCost; // Utile della singola vendita
        
        transactions.push({
            date: new Date(s.created_at),
            amount: saleProfit,
            type: 'sale'
        });
    });

    // Aggiungi Spese (Negative)
    expenses.forEach(e => {
        transactions.push({
            date: new Date(e.created_at),
            amount: parseFloat(e.amount), 
            type: 'expense'
        });
    });

    transactions.sort((a, b) => a.date - b.date);

    let runningBalance = 0;
    const saldoLabels = [];
    const saldoData = [];

    transactions.forEach(t => {
        runningBalance += t.amount;
        saldoLabels.push(t.date.toLocaleDateString('it-IT'));
        saldoData.push(runningBalance);
    });

    // B. Stats Giornaliere (Incassi Puri)
    const dailyStats = {};
    sales.forEach(s => {
        const dateKey = new Date(s.created_at).toLocaleDateString('it-IT');
        if (!dailyStats[dateKey]) dailyStats[dateKey] = { pos: 0, cash: 0 };
        if (s.payment_method === 'pos') dailyStats[dateKey].pos += s.total_amount;
        else dailyStats[dateKey].cash += s.total_amount;
    });

    const sortedDays = Object.keys(dailyStats).sort((a, b) => {
        const [da, ma, ya] = a.split('/');
        const [db, mb, yb] = b.split('/');
        return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });

    const diffData = sortedDays.map(d => dailyStats[d].pos - dailyStats[d].cash);
    const cashData = sortedDays.map(d => dailyStats[d].cash);
    const posData = sortedDays.map(d => dailyStats[d].pos);

    // --- 4. RENDER GRAFICI ---

    const ctxSaldo = document.getElementById('liquidazioneChart');
    if (ctxSaldo) {
        new Chart(ctxSaldo, {
            type: 'line',
            data: {
                labels: saldoLabels,
                datasets: [{
                    label: 'Utile Cumulativo (€)',
                    data: saldoData,
                    borderColor: '#C19F29',
                    borderWidth: 2,
                    fill: true,
                    backgroundColor: 'rgba(193, 159, 41, 0.1)',
                    tension: 0.3
                }]
            },
            options: { responsive: true, aspectRatio: 2 }
        });
    }

    const ctxDiff = document.getElementById('diffChart');
    if (ctxDiff) {
        new Chart(ctxDiff, {
            type: 'bar',
            data: {
                labels: sortedDays,
                datasets: [{
                    label: 'Diff (POS - Cash)',
                    data: diffData,
                    backgroundColor: diffData.map(v => v >= 0 ? 'rgba(13, 110, 253, 0.7)' : 'rgba(25, 135, 84, 0.7)')
                }]
            },
            options: { responsive: true, aspectRatio: 2 }
        });
    }

    const ctxCash = document.getElementById('cashChart');
    if (ctxCash) {
        new Chart(ctxCash, {
            type: 'line',
            data: {
                labels: sortedDays,
                datasets: [{
                    label: 'Contanti',
                    data: cashData,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.2)',
                    fill: true
                }]
            },
            options: { responsive: true }
        });
    }

    const ctxPOS = document.getElementById('posChart');
    if (ctxPOS) {
        new Chart(ctxPOS, {
            type: 'line',
            data: {
                labels: sortedDays,
                datasets: [{
                    label: 'POS',
                    data: posData,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.2)',
                    fill: true
                }]
            },
            options: { responsive: true }
        });
    }

    const ctxTop = document.getElementById('topProductsChart');
    if (ctxTop) {
        let productCounts = {};
        sales.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    const name = item.name;
                    productCounts[name] = (productCounts[name] || 0) + item.quantity;
                });
            }
        });

        const sortedProducts = Object.entries(productCounts).sort(([,a], [,b]) => b - a).slice(0, 10);
        
        new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: sortedProducts.map(([k]) => k),
                datasets: [{
                    label: 'Qta',
                    data: sortedProducts.map(([,v]) => v),
                    backgroundColor: '#C19F29'
                }]
            },
            options: { indexAxis: 'y' }
        });
    }
});