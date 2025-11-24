// CONFIGURAZIONE: SOLO 2 MIELI
const HONEY_TYPES = ['Acacia', 'Millefiori'];

document.addEventListener('DOMContentLoaded', () => {
    loadHoneyCosts();
    loadHiddenProducts();
});

// 1. CARICA I COSTI E GENERA LE CARD (NUOVO DESIGN)
async function loadHoneyCosts() {
    // Attesa attiva del client
    if (!window.supabaseClient) {
        if(window.initSupabase) await window.initSupabase();
        if (!window.supabaseClient) return;
    }

    const container = document.getElementById('honey-banners-container');
    
    const { data, error } = await window.supabaseClient
        .from('honey_costs')
        .select('*')
        .order('id');
    
    if (error) { 
        console.error(error); 
        container.innerHTML = `<p style="color:red">Errore caricamento: ${error.message}</p>`;
        return; 
    }

    container.innerHTML = '';
    const costsMap = {};
    if (data) data.forEach(row => costsMap[row.name] = row.cost);

    HONEY_TYPES.forEach(type => {
        const cost = costsMap[type] || 0;
        
        // Creazione Card
        const card = document.createElement('div');
        // Aggiunge classe dinamica 'type-Acacia' o 'type-Millefiori' per il colore
        card.className = `honey-card type-${type}`; 
        
        card.innerHTML = `
            <span class="honey-icon">🍯</span>
            <div class="honey-title">${type}</div>
            <div class="honey-input-wrapper">
                <span>€</span>
                <input type="number" step="0.01" class="honey-cost-input" data-type="${type}" value="${cost.toFixed(2)}">
            </div>
            <p style="font-size:0.8em; color:#888; margin-top:10px;">Costo Debito / pz</p>
        `;
        container.appendChild(card);
    });
}

// 2. SALVA COSTI E AGGIORNA TUTTO IL DB
window.salvaCostiGlobali = async function() {
    if (!confirm("Confermi l'aggiornamento dei costi?\nQuesto ricalcolerà i prezzi di vendita di TUTTI i prodotti nel catalogo mantenendo il tuo margine di guadagno.")) return;

    const inputs = document.querySelectorAll('.honey-cost-input');
    const newCosts = [];
    inputs.forEach(inp => {
        newCosts.push({ name: inp.dataset.type, cost: parseFloat(inp.value) });
    });

    const btn = document.querySelector('.btn-global-save');
    btn.textContent = "Aggiornamento in corso..."; btn.disabled = true;

    try {
        // A. Aggiorna tabella honey_costs
        for (const item of newCosts) {
            await window.supabaseClient
                .from('honey_costs')
                .upsert({ name: item.name, cost: item.cost }, { onConflict: 'name' });
        }

        // B. Aggiorna tutti i prodotti
        // Logica: Mantiene il margine invariato aggiornando il prezzo finale
        for (const item of newCosts) {
            const { data: variants } = await window.supabaseClient
                .from('product_variants')
                .select('*')
                .eq('name', item.name);
            
            if (variants) {
                for (const v of variants) {
                    const oldCost = v.cost;
                    const oldPrice = v.price;
                    const margin = oldPrice - oldCost; 
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
        btn.disabled = false;
        btn.textContent = "💾 AGGIORNA LISTINO E STATISTICHE";
    }
}

// 3. CREA PRODOTTO (LOGICA PREZZO FISSO)
async function inviaProdotto(event) {
    event.preventDefault();
    if (!window.supabaseClient) return;

    const nome = document.getElementById('nome-prodotto').value.trim();
    // ORA LEGGE IL PREZZO FINALE, NON L'UTILE
    const prezzo = parseFloat(document.getElementById('prezzo-prodotto').value);
    const file = document.getElementById('file-foto').files[0];
    const btn = document.getElementById('btn-add-prod');

    if (!file) { alert("Devi caricare una foto!"); return; }

    try {
        btn.textContent = "Caricamento in corso..."; btn.disabled = true;

        // 1. Upload Foto
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const { error: upErr } = await window.supabaseClient.storage.from('product-images').upload(fileName, file);
        if (upErr) throw upErr;
        
        const { data: urlData } = window.supabaseClient.storage.from('product-images').getPublicUrl(fileName);

        // 2. Crea Prodotto (Padre)
        const { data: prodData, error: inErr } = await window.supabaseClient
            .from('products')
            .insert({ name: nome, description: '', price: 0, image_url: urlData.publicUrl, visible: true })
            .select();
        if (inErr) throw inErr;

        // 3. Recupera costi attuali
        const { data: honeyData } = await window.supabaseClient.from('honey_costs').select('*');
        const honeyMap = {};
        if(honeyData) honeyData.forEach(h => honeyMap[h.name] = h.cost);

        // 4. Genera Varianti (Acacia e Millefiori)
        const variants = HONEY_TYPES.map(type => {
            const costo = honeyMap[type] || 0;
            return {
                product_id: prodData[0].id,
                name: type,
                cost: costo,
                price: prezzo // Applica lo stesso prezzo finale a entrambe le varianti
            };
        });

        const { error: vErr } = await window.supabaseClient.from('product_variants').insert(variants);
        if (vErr) throw vErr;

        alert("✅ Prodotto creato!");
        window.location.href = "index.html";

    } catch (err) {
        alert("Errore: " + err.message);
        btn.textContent = "➕ Crea Listino Automatico";
        btn.disabled = false;
    }
}

// 4. ALTRE FUNZIONI
async function loadHiddenProducts() {
    if (!window.supabaseClient) { if(window.initSupabase) await window.initSupabase(); if(!window.supabaseClient) return; }
    
    const { data } = await window.supabaseClient.from('products').select('*').eq('visible', false);
    const el = document.getElementById('restore-content');
    if (!el) return;
    
    if (!data || data.length === 0) { el.innerHTML = '<p style="text-align:center; color:#888">Cestino vuoto.</p>'; return; }
    
    let html = '<ul class="restore-list">';
    data.forEach(p => html += `<li class="restore-item"><span>${p.name}</span> <button class="btn-restore" onclick="ripristina(${p.id})">Ripristina</button></li>`);
    el.innerHTML = html + '</ul>';
}

window.ripristina = async function(id) {
    await window.supabaseClient.from('products').update({ visible: true }).eq('id', id);
    loadHiddenProducts();
    alert("Prodotto ripristinato nel catalogo!");
}