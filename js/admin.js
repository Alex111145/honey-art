// CONFIGURAZIONE: SOLO 2 MIELI
const HONEY_TYPES = ['Acacia', 'Millefiori'];

document.addEventListener('DOMContentLoaded', () => {
    loadHoneyCosts();
    loadHiddenProducts();
});

// 1. CARICA I COSTI NEI BANNER
async function loadHoneyCosts() {
    if (!window.supabaseClient) return;
    const container = document.getElementById('honey-banners-container');
    
    // Carica dal DB
    const { data, error } = await window.supabaseClient
        .from('honey_costs')
        .select('*')
        .order('id'); // Ordine di inserimento o alfabetico
    
    if (error) { console.error(error); return; }

    container.innerHTML = '';
    
    const costsMap = {};
    if (data) data.forEach(row => costsMap[row.name] = row.cost);

    // Genera solo i banner per i tipi definiti
    HONEY_TYPES.forEach(type => {
        const cost = costsMap[type] || 0;
        const div = document.createElement('div');
        div.className = 'honey-banner-card';
        div.innerHTML = `
            <span class="h-label">${type}</span>
            <div class="h-input-group">
                <span>Costo: €</span>
                <input type="number" step="0.01" class="honey-cost-input" data-type="${type}" value="${cost.toFixed(2)}">
            </div>
        `;
        container.appendChild(div);
    });
}

// 2. SALVA COSTI E AGGIORNA TUTTO IL DB
window.salvaCostiGlobali = async function() {
    if (!confirm("Aggiornare il costo del miele? \nQuesto ricalcolerà i prezzi di vendita di TUTTI i prodotti.")) return;

    const inputs = document.querySelectorAll('.honey-cost-input');
    const newCosts = [];
    inputs.forEach(inp => {
        newCosts.push({ name: inp.dataset.type, cost: parseFloat(inp.value) });
    });

    try {
        const btn = document.querySelector('.btn-global-save');
        btn.textContent = "Aggiornamento in corso..."; btn.disabled = true;

        // A. Aggiorna tabella honey_costs (i valori di riferimento)
        for (const item of newCosts) {
            const { error } = await window.supabaseClient
                .from('honey_costs')
                .upsert({ name: item.name, cost: item.cost }, { onConflict: 'name' });
            if (error) throw error;
        }

        // B. AGGIORNAMENTO MASSIVO SUI PRODOTTI
        // Per ogni tipo di miele modificato, aggiorniamo le varianti corrispondenti
        for (const item of newCosts) {
            // 1. Trova tutte le varianti di questo miele
            const { data: variants } = await window.supabaseClient
                .from('product_variants')
                .select('*')
                .eq('name', item.name);
            
            if (variants && variants.length > 0) {
                for (const v of variants) {
                    const oldCost = v.cost;
                    const oldPrice = v.price;
                    
                    // Calcolo Utile Attuale = Prezzo Vecchio - Costo Vecchio
                    const margin = oldPrice - oldCost; 
                    
                    // Nuovo Prezzo = Utile Invariato + Nuovo Costo
                    const newPrice = margin + item.cost;
                    
                    await window.supabaseClient
                        .from('product_variants')
                        .update({ cost: item.cost, price: newPrice })
                        .eq('id', v.id);
                }
            }
        }

        alert("✅ Listino aggiornato con successo!");
        location.reload(); 

    } catch (err) {
        alert("Errore aggiornamento: " + err.message);
        document.querySelector('.btn-global-save').disabled = false;
    }
}

// 3. CREA PRODOTTO AUTOMATICO (Genera 2 varianti)
async function inviaProdotto(event) {
    event.preventDefault();
    if (!window.supabaseClient) return;

    const nome = document.getElementById('nome-prodotto').value.trim();
    const utile = parseFloat(document.getElementById('utile-prodotto').value);
    const file = document.getElementById('file-foto').files[0];
    const btn = document.getElementById('btn-add-prod');

    if (!file) { alert("Manca la foto!"); return; }

    try {
        btn.textContent = "Generazione..."; btn.disabled = true;

        // Upload Foto
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const { error: uploadError } = await window.supabaseClient.storage.from('product-images').upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = window.supabaseClient.storage.from('product-images').getPublicUrl(fileName);

        // Crea Prodotto Padre
        const { data: prodData, error: insertError } = await window.supabaseClient
            .from('products')
            .insert({
                name: nome,
                description: '',
                price: 0, // Prezzo dummy, contano le varianti
                image_url: publicUrlData.publicUrl,
                visible: true
            })
            .select();

        if (insertError) throw insertError;
        const newProdId = prodData[0].id;

        // Recupera i costi attuali del miele per calcolare i prezzi
        const { data: honeyData } = await window.supabaseClient.from('honey_costs').select('*');
        const honeyMap = {};
        honeyData.forEach(h => honeyMap[h.name] = h.cost);

        // Genera le 2 Varianti
        const variantsPayload = HONEY_TYPES.map(type => {
            const costoMiele = honeyMap[type] || 0;
            return {
                product_id: newProdId,
                name: type,
                cost: costoMiele,
                price: utile + costoMiele
            };
        });

        const { error: varError } = await window.supabaseClient
            .from('product_variants')
            .insert(variantsPayload);

        if (varError) throw varError;

        alert("✅ Prodotto creato con varianti Acacia e Millefiori!");
        window.location.href = "index.html";

    } catch (err) {
        console.error(err);
        alert("Errore: " + err.message);
        btn.textContent = "➕ Crea Listino Automatico";
        btn.disabled = false;
    }
}

// SPESA & RIPRISTINO (Standard)
async function inviaSpesa(event) {
    event.preventDefault();
    const dataSpesa = document.getElementById('data-spesa').value;
    const importo = parseFloat(document.getElementById('importo-spesa').value);
    const motivo = document.getElementById('descrizione-spesa').value.trim();
    
    const { error } = await window.supabaseClient.from('expenses').insert({
        created_at: new Date(dataSpesa).toISOString(), 
        amount: -Math.abs(importo), description: motivo, category: 'Generale'
    });
    if(!error) { alert("Spesa salvata"); document.getElementById('spesaForm').reset(); }
}

async function loadHiddenProducts() {
    if (!window.supabaseClient) return;
    const { data } = await window.supabaseClient.from('products').select('*').eq('visible', false);
    const container = document.getElementById('restore-content');
    if (!container) return;
    if (!data || data.length === 0) { container.innerHTML = '<p>Nessun prodotto nascosto.</p>'; return; }
    
    let html = '<ul class="restore-list">';
    data.forEach(p => {
        html += `<li class="restore-item"><span>${p.name}</span> <button onclick="ripristina(${p.id})">Ripristina</button></li>`;
    });
    container.innerHTML = html + '</ul>';
}

window.ripristina = async function(id) {
    await window.supabaseClient.from('products').update({ visible: true }).eq('id', id);
    alert("Ripristinato!"); loadHiddenProducts();
}