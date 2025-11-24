// CONFIGURAZIONE: SOLO 2 MIELI (Per i banner dei costi)
const HONEY_TYPES = ['Acacia', 'Millefiori'];

document.addEventListener('DOMContentLoaded', () => {
    loadHoneyCosts();
    loadHiddenProducts();
});

// --- FUNZIONE DI UTILITÀ: ESTRAE I GRAMMI DAL NOME ---
function extractGrams(text) {
    const match = text.match(/(\d+)\s*(g|kg)/i);
    if (!match) return 0;
    
    let value = parseFloat(match[1]);
    let unit = match[2].toLowerCase();

    if (unit === 'kg') return value * 1000;
    return value;
}

// 1. CARICA I COSTI (AL KG)
async function loadHoneyCosts() {
    if (!window.supabaseClient) {
        if(window.initSupabase) await window.initSupabase();
        if (!window.supabaseClient) return;
    }

    const container = document.getElementById('honey-banners-container');
    
    const { data, error } = await window.supabaseClient.from('honey_costs').select('*').order('id');
    
    if (error) { 
        container.innerHTML = `<p style="color:red">Errore: ${error.message}</p>`; return; 
    }

    container.innerHTML = '';
    const costsMap = {};
    if (data) data.forEach(row => costsMap[row.name] = row.cost);

    HONEY_TYPES.forEach(type => {
        const costPerKg = costsMap[type] || 0;
        
        const card = document.createElement('div');
        card.className = `honey-card type-${type}`; 
        card.innerHTML = `
            <span class="honey-icon">🍯</span>
            <div class="honey-title">${type}</div>
            <div class="honey-input-wrapper">
                <span>€/Kg</span>
                <input type="number" step="0.01" class="honey-cost-input" data-type="${type}" value="${costPerKg.toFixed(2)}">
            </div>
            <p style="font-size:0.8em; color:#888; margin-top:10px;">Prezzo di mercato</p>
        `;
        container.appendChild(card);
    });
}

// 2. SALVA COSTI E RICALCOLA
window.salvaCostiGlobali = async function() {
    if (!confirm("⚠️ Confermi l'aggiornamento del prezzo di mercato?\nIl costo vivo dei vasetti verrà ricalcolato in base al loro peso.")) return;

    const inputs = document.querySelectorAll('.honey-cost-input');
    const newCostsPerKg = {}; 
    inputs.forEach(inp => newCostsPerKg[inp.dataset.type] = parseFloat(inp.value));

    const btn = document.querySelector('.btn-global-save');
    btn.textContent = "Ricalcolo in corso..."; btn.disabled = true;

    try {
        // A. Aggiorna DB Costi
        for (const [name, cost] of Object.entries(newCostsPerKg)) {
            await window.supabaseClient.from('honey_costs').upsert({ name: name, cost: cost }, { onConflict: 'name' });
        }

        // B. Ricalcola Varianti
        const { data: allVariants } = await window.supabaseClient.from('product_variants').select('*, products(name)');

        if (allVariants) {
            for (const v of allVariants) {
                const productName = v.products ? v.products.name : "";
                const grams = extractGrams(productName); 
                
                if (grams > 0) {
                    const pricePerKg = newCostsPerKg[v.name] || 0;
                    const newCostOfJar = (grams / 1000) * pricePerKg;

                    await window.supabaseClient.from('product_variants').update({ cost: newCostOfJar }).eq('id', v.id);
                }
            }
        }
        
        alert("✅ Listino aggiornato correttamente!");
        location.reload(); 
    } catch (err) {
        alert("Errore: " + err.message);
        btn.disabled = false;
        btn.textContent = "💾 AGGIORNA COSTI AL KG";
    }
}

// 3. NUOVO PRODOTTO (Singola Variante)
async function inviaProdotto(event) {
    event.preventDefault();
    if (!window.supabaseClient) return;

    // Recupera i valori
    const nomeBase = document.getElementById('nome-prodotto').value.trim();
    const grams = parseInt(document.getElementById('peso-prodotto').value);
    const tipoMiele = document.getElementById('tipo-miele').value; // 'Acacia' o 'Millefiori'
    const prezzoVendita = parseFloat(document.getElementById('prezzo-prodotto').value);
    const file = document.getElementById('file-foto').files[0];
    const btn = document.getElementById('btn-add-prod');

    // Costruzione nome (aggiunge anche il tipo di miele nel nome per chiarezza nel catalogo)
    let suffix = grams === 1000 ? '1kg' : `${grams}g`;
    const fullName = `${nomeBase} ${suffix} (${tipoMiele})`;

    if (!file) { alert("Devi caricare una foto!"); return; }

    try {
        btn.textContent = "Creazione in corso..."; btn.disabled = true;

        // 1. Upload Foto
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const { error: upErr } = await window.supabaseClient.storage.from('product-images').upload(fileName, file);
        if (upErr) throw upErr;
        const { data: urlData } = window.supabaseClient.storage.from('product-images').getPublicUrl(fileName);

        // 2. Crea Prodotto Padre
        const { data: prodData, error: inErr } = await window.supabaseClient
            .from('products')
            .insert({ name: fullName, description: '', price: 0, image_url: urlData.publicUrl, visible: true })
            .select();
        if (inErr) throw inErr;

        // 3. Recupera costi Kg
        const { data: honeyData } = await window.supabaseClient.from('honey_costs').select('*');
        const pricePerKgMap = {};
        if(honeyData) honeyData.forEach(h => pricePerKgMap[h.name] = h.cost);

        // 4. Calcola costo specifico
        const pricePerKg = pricePerKgMap[tipoMiele] || 0;
        const costOfJar = (grams / 1000) * pricePerKg; 

        // 5. Crea SINGOLA variante
        const variant = {
            product_id: prodData[0].id,
            name: tipoMiele,
            cost: costOfJar,
            price: prezzoVendita
        };

        const { error: vErr } = await window.supabaseClient.from('product_variants').insert([variant]);
        if (vErr) throw vErr;

        alert(`✅ Prodotto creato: "${fullName}"\nVariante: ${tipoMiele}`);
        window.location.href = "index.html";

    } catch (err) {
        alert("Errore: " + err.message);
        btn.textContent = "➕ Aggiungi al Catalogo";
        btn.disabled = false;
    }
}

// 4. GESTIONE CESTINO
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
    alert("Prodotto ripristinato!");
}