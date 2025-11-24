document.addEventListener('DOMContentLoaded', async function() {
    
    // Controllo connessione robusto
    if (!window.supabaseClient) {
        if(window.initSupabase) await window.initSupabase();
        if(!window.supabaseClient) {
            setTimeout(() => location.reload(), 2000); // Riprova ricaricando
            return;
        }
    }

    let sales = [], expenses = [];
    
    try {
        const { data: s } = await window.supabaseClient.from('sales').select('*').order('created_at', {ascending:true});
        sales = s || [];
        const { data: e } = await window.supabaseClient.from('expenses').select('*').order('created_at', {ascending:true});
        expenses = e || [];
    } catch (err) { console.error("Errore Dati Dashboard:", err); return; }

    // --- 1. CALCOLO TOTALI ---
    let totRev = 0;        // Ricavi totali (Incasso)
    let totExp = 0;        // Spese Extra
    let totDebt = 0;       // Totale Debito (Miele o Intero importo POS)

    sales.forEach(s => {
        totRev += s.total_amount;
        
        if (s.payment_method === 'pos') {
            // LOGICA: Se POS, tutto l'importo va a "Debito" (quindi Utile = 0 finché non incassi)
            totDebt += s.total_amount;
        } else {
            // LOGICA: Se CONTANTI, il debito è solo il costo vivo del miele
            if (s.items) {
                s.items.forEach(i => {
                    const cost = i.cost || 0;
                    const qty = i.quantity || 1;
                    totDebt += (cost * qty);
                });
            }
        }
    });

    expenses.forEach(e => totExp += Math.abs(e.amount));
    
    // Calcolo Saldo Utile (Le spese vengono sottratte qui)
    const saldo = totRev - totDebt - totExp;

    // --- 2. AGGIORNAMENTO UI ---
    if(document.getElementById('saldo-totale')) {
        document.getElementById('saldo-totale').textContent = `€${saldo.toFixed(2).replace('.', ',')}`;
        document.getElementById('guadagno-totale').textContent = `€${totRev.toFixed(2).replace('.', ',')}`;
        document.getElementById('debito-totale').textContent = `-€${totDebt.toFixed(2).replace('.', ',')}`;
        // Rimosso aggiornamento spesa-totale poiché l'elemento è stato eliminato
    }

    // --- 3. RENDER GRAFICI ---
    
    // A. Grafico Utile Netto (Liquidazione)
    const ctxSaldo = document.getElementById('liquidazioneChart');
    if(ctxSaldo && (sales.length > 0 || expenses.length > 0)) {
        const transactions = [];
        
        sales.forEach(s => {
            let effectiveProfit = 0;
            
            if (s.payment_method === 'pos') {
                // Vendita POS: Utile = 0 (Incasso - Tutto a Debito)
                effectiveProfit = 0;
            } else {
                // Vendita Contanti: Utile = Incasso - Costo Miele
                let cost = 0;
                if(s.items) s.items.forEach(i => cost += (i.cost||0)*(i.quantity||1));
                effectiveProfit = s.total_amount - cost;
            }
            
            transactions.push({ date: new Date(s.created_at), amount: effectiveProfit });
        });

        // Aggiungi le spese (sono valori negativi)
        expenses.forEach(e => transactions.push({ date: new Date(e.created_at), amount: e.amount })); 
        
        // Ordina cronologicamente
        transactions.sort((a, b) => a.date - b.date);
        
        // Calcola andamento cumulativo
        let bal = 0;
        const labels = [], data = [];
        transactions.forEach(t => { 
            bal += t.amount; 
            labels.push(t.date.toLocaleDateString('it-IT')); 
            data.push(bal); 
        });

        new Chart(ctxSaldo, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Utile Netto (Cassa)', data, borderColor: '#C19F29', fill:true, backgroundColor:'rgba(193,159,41,0.1)' }] },
            options: { responsive:true }
        });
    }

    // B. Grafico Prodotti Top (Invariato)
    const ctxTop = document.getElementById('topProductsChart');
    if (ctxTop) {
        let productCounts = {};
        sales.forEach(order => {
            if (order.items) {
                order.items.forEach(item => {
                    // Usa il nome completo (es. Vasetto (Acacia))
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
                    label: 'Qta Venduta',
                    data: sortedProducts.map(([,v]) => v),
                    backgroundColor: '#C19F29'
                }]
            },
            options: { indexAxis: 'y' }
        });
    }
});