document.addEventListener('DOMContentLoaded', async function() {
    
    // 1. CONNESSIONE DB
    if (!window.supabaseClient) {
        if(window.initSupabase) await window.initSupabase();
        if(!window.supabaseClient) {
            console.warn("Database non pronto, riprovo...");
            setTimeout(() => location.reload(), 1000);
            return;
        }
    }

    let sales = [], expenses = [];
    
    try {
        // Scarica Vendite e Spese
        const { data: s, error: errS } = await window.supabaseClient.from('sales').select('*').order('created_at', {ascending:true});
        if(errS) throw errS;
        sales = s || [];

        const { data: e, error: errE } = await window.supabaseClient.from('expenses').select('*').order('created_at', {ascending:true});
        if(errE) throw errE;
        expenses = e || [];

    } catch (err) { 
        console.error("Errore caricamento dati:", err);
        alert("Errore caricamento dati dashboard: " + err.message);
        return; 
    }

    // --- 2. CALCOLI ---
    let totRev = 0;        // Ricavi Totali
    let totExp = 0;        // Spese Extra Totali
    let totDebt = 0;       // Debito Totale (POS intero + Costo Vivo Contanti)

    // Per il grafico temporale
    const transactions = [];

    sales.forEach(s => {
        totRev += s.total_amount;
        
        let transactionProfit = 0;

        if (s.payment_method === 'pos') {
            // POS: Tutto a debito, Utile Cassa = 0
            totDebt += s.total_amount;
            transactionProfit = 0; 
        } else {
            // CONTANTI: Debito = Solo costo vivo
            let cost = 0;
            if (s.items) {
                s.items.forEach(i => {
                    const c = i.cost || 0;
                    const q = i.quantity || 1;
                    cost += (c * q);
                });
            }
            totDebt += cost;
            // Utile Cassa = Incasso - Costo Vivo
            transactionProfit = s.total_amount - cost;
        }
        
        transactions.push({ 
            date: new Date(s.created_at), 
            amount: transactionProfit,
            type: 'vendita'
        });
    });

    expenses.forEach(e => {
        const amount = Math.abs(e.amount);
        totExp += amount;
        transactions.push({ 
            date: new Date(e.created_at), 
            amount: -amount, // La spesa è negativa sul grafico utile
            type: 'spesa'
        });
    });
    
    // Saldo Utile Netto (Cassa)
    const saldo = totRev - totDebt - totExp;

    // --- 3. AGGIORNAMENTO CARTELLINI ---
    if(document.getElementById('saldo-totale')) {
        document.getElementById('saldo-totale').textContent = `€${saldo.toFixed(2).replace('.', ',')}`;
        document.getElementById('guadagno-totale').textContent = `€${totRev.toFixed(2).replace('.', ',')}`;
        document.getElementById('debito-totale').textContent = `-€${totDebt.toFixed(2).replace('.', ',')}`;
    }

    // --- 4. COSTRUZIONE GRAFICO ---
    const ctxSaldo = document.getElementById('liquidazioneChart');
    if (ctxSaldo) {
        // Ordina per data
        transactions.sort((a, b) => a.date - b.date);

        // Aggiungi punto iniziale zero (per estetica se vuoto)
        const labels = []; // Date
        const dataPoints = []; // Valore progressivo
        
        if (transactions.length === 0) {
            // Grafico vuoto
            labels.push('Oggi');
            dataPoints.push(0);
        } else {
            let currentBalance = 0;
            transactions.forEach(t => {
                currentBalance += t.amount;
                
                // Formatta data (es. 24/11)
                const day = t.date.getDate().toString().padStart(2, '0');
                const month = (t.date.getMonth() + 1).toString().padStart(2, '0');
                const hour = t.date.getHours().toString().padStart(2, '0');
                const min = t.date.getMinutes().toString().padStart(2, '0');
                
                labels.push(`${day}/${month} ${hour}:${min}`);
                dataPoints.push(currentBalance);
            });
        }

        // Distruggi vecchio grafico se esiste (per sicurezza)
        if (window.myChartInstance) {
            window.myChartInstance.destroy();
        }

        window.myChartInstance = new Chart(ctxSaldo, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Andamento Utile Cassa (€)',
                    data: dataPoints,
                    borderColor: '#C19F29', // Oro
                    backgroundColor: 'rgba(193, 159, 41, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3 // Linea morbida
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' }
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return '€ ' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                }
            }
        });
    }

    // --- 5. GRAFICO PRODOTTI TOP ---
    const ctxTop = document.getElementById('topProductsChart');
    if (ctxTop && sales.length > 0) {
        let productCounts = {};
        sales.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    // Usa il nome completo (es. Vasetto (Acacia))
                    const name = item.name || "Prodotto";
                    productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
                });
            }
        });

        // Ordina e prendi i top 10
        const sortedProducts = Object.entries(productCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        new Chart(ctxTop, {
            type: 'bar',
            data: {
                labels: sortedProducts.map(([k]) => k),
                datasets: [{
                    label: 'Pezzi Venduti',
                    data: sortedProducts.map(([,v]) => v),
                    backgroundColor: '#C19F29',
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                plugins: { legend: { display: false } }
            }
        });
    }
});