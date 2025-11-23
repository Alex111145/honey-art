document.addEventListener('DOMContentLoaded', async function() {
    
    // Attendi DB
    if (!window.supabaseClient) {
        // Riprova dopo un po' se non è pronto
        setTimeout(() => location.reload(), 1000);
        return;
    }

    // 1. SCARICA DATI
    let sales = [];
    let expenses = [];
    
    try {
        const { data: salesData, error: sErr } = await window.supabaseClient.from('sales').select('*');
        if (sErr) throw sErr;
        sales = salesData;

        const { data: expensesData, error: eErr } = await window.supabaseClient.from('expenses').select('*');
        if (eErr) throw eErr;
        expenses = expensesData;

    } catch (err) {
        console.error("Errore dashboard:", err);
        return; 
    }

    const hasData = sales.length > 0;
    
    // 2. CALCOLI
    let totalRevenue = 0;
    let totalExpenses = 0;

    sales.forEach(s => totalRevenue += s.total_amount);
    expenses.forEach(e => totalExpenses += Math.abs(e.amount));
    const saldo = totalRevenue - totalExpenses;

    if (document.getElementById('saldo-totale')) {
        document.getElementById('saldo-totale').textContent = `€${saldo.toFixed(2).replace('.', ',')}`;
        document.getElementById('guadagno-totale').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-totale').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
        document.getElementById('guadagno-mese').textContent = `€${totalRevenue.toFixed(2).replace('.', ',')}`;
        document.getElementById('spesa-mese').textContent = `-€${totalExpenses.toFixed(2).replace('.', ',')}`;
    }

    // 3. GRAFICI
    sales.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const groupedSales = [];
    if (hasData) {
        sales.forEach(s => {
            const dateStr = new Date(s.created_at).toLocaleDateString();
            let group = groupedSales.find(g => g.date === dateStr);
            if (!group) {
                group = { date: dateStr, pos: 0, cash: 0 };
                groupedSales.push(group);
            }
            if (s.payment_method === 'pos') group.pos += s.total_amount;
            else group.cash += s.total_amount;
        });
    }

    // Grafico Saldo
    const ctxSaldo = document.getElementById('liquidazioneChart');
    if (ctxSaldo) {
        const labels = hasData ? sales.map(s => new Date(s.created_at).toLocaleDateString()) : [];
        let acc = 0;
        const dataPoints = hasData ? sales.map(s => { acc += s.total_amount; return acc; }) : [];

        new Chart(ctxSaldo, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Saldo Cumulativo (€)',
                    data: dataPoints,
                    borderColor: '#C19F29',
                    borderWidth: 3,
                    fill: { target: 'origin', above: 'rgba(193, 159, 41, 0.2)', below: 'rgba(220, 53, 69, 0.2)' },
                    tension: 0.4
                }]
            },
            options: { responsive: true, aspectRatio: window.innerWidth < 768 ? 2 : 4 }
        });
    }

    // Grafico Differenza
    const ctxDiff = document.getElementById('diffChart');
    if (ctxDiff) {
        const diffLabels = groupedSales.map(g => g.date);
        const diffData = groupedSales.map(g => g.pos - g.cash);
        const bgColors = diffData.map(val => val >= 0 ? 'rgba(13, 110, 253, 0.7)' : 'rgba(25, 135, 84, 0.7)');
        const borderColors = diffData.map(val => val >= 0 ? '#0d6efd' : '#198754');

        new Chart(ctxDiff, {
            type: 'bar',
            data: {
                labels: diffLabels,
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

    // Grafico Contanti (Lineare)
    const ctxCash = document.getElementById('cashChart');
    if (ctxCash) {
        let accCash = 0;
        const cashSales = hasData ? sales.filter(s => s.payment_method === 'contanti') : [];
        const cashData = cashSales.map(s => { accCash += s.total_amount; return accCash; });
        const cashLabels = cashSales.map(s => new Date(s.created_at).toLocaleDateString());

        new Chart(ctxCash, {
            type: 'line',
            data: {
                labels: cashLabels,
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

    // Grafico POS (Lineare)
    const ctxPOS = document.getElementById('posChart');
    if (ctxPOS) {
        let accPOS = 0;
        const posSales = hasData ? sales.filter(s => s.payment_method === 'pos') : [];
        const posData = posSales.map(s => { accPOS += s.total_amount; return accPOS; });
        const posLabels = posSales.map(s => new Date(s.created_at).toLocaleDateString());

        new Chart(ctxPOS, {
            type: 'line',
            data: {
                labels: posLabels,
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

    // Grafico Prodotti
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
                indexAxis: 'y',
                plugins: { legend: { display: false } }
            }
        });
    }
});