// CONFIGURAZIONE: SOLO 2 MIELI
const HONEY_TYPES = ['Acacia', 'Millefiori'];

document.addEventListener('DOMContentLoaded', () => {
    loadHoneyCosts();
    loadHiddenProducts();
});

// --- UTILITY ---
function extractGrams(text) {
    const match = text.match(/(\d+)\s*(g|kg)/i);
    if (!match) return 0;
    let value = parseFloat(match[1]);
    let unit = match[2].toLowerCase();
    if (unit === 'kg') return value * 1000;
    return value;
}

// 1. CARICA COSTI
async function loadHoneyCosts() {
    if (!window.supabaseClient) {
        if(window.initSupabase) await window.initSupabase();
        if (!window.supabaseClient) return;
    }

    const container = document.getElementById('honey-banners-container');
    const { data, error } = await window.supabaseClient.from('honey_costs').select('*').order('id');
    
    if (error) { container.innerHTML = `<p style="color:red">Errore: ${error.message}</p>`; return; }

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

// 2. SALVA COSTI
window.salvaCostiGlobali = async function() {
    if (!confirm("⚠️ Confermi l'aggiornamento dei costi al KG?")) return;

    const inputs = document.querySelectorAll('.honey-cost-input');
    const newCostsPerKg = {}; 
    inputs.forEach(inp => newCostsPerKg[inp.dataset.type] = parseFloat(inp.value));

    const btn = document.querySelector('.btn-global-save');
    btn.textContent = "Ricalcolo..."; btn.disabled = true;

    try {
        for (const [name, cost] of Object.entries(newCostsPerKg)) {
            await window.supabaseClient.from('honey_costs').upsert({ name: name, cost: cost }, { onConflict: 'name' });
        }
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
        alert("✅ Aggiornato!"); location.reload(); 
    } catch (err) { alert("Errore: " + err.message); btn.disabled = false; btn.textContent = "💾 AGGIORNA COSTI AL KG"; }
}

// 3. NUOVO PRODOTTO (MULTI-GUSTO E PREZZI DIVERSI)
async function inviaProdotto(event) {
    event.preventDefault();
    if (!window.supabaseClient) return;

    const nomeBase = document.getElementById('nome-prodotto').value.trim();
    const grams = parseInt(document.getElementById('peso-prodotto').value);
    const mode = document.getElementById('mode-inserimento').value; // 'both', 'Acacia', 'Millefiori'
    const file = document.getElementById('file-foto').files[0];
    const btn = document.getElementById('btn-add-prod');

    // Recupero Prezzi specifici
    const priceAcacia = parseFloat(document.getElementById('price-acacia').value);
    const priceMille = parseFloat(document.getElementById('price-millefiori').value);

    // Validazione Prezzi
    if ((mode === 'both' || mode === 'Acacia') && (!priceAcacia || priceAcacia <= 0)) {
        alert("Inserisci un prezzo valido per Acacia!"); return;
    }
    if ((mode === 'both' || mode === 'Millefiori') && (!priceMille || priceMille <= 0)) {
        alert("Inserisci un prezzo valido per Millefiori!"); return;
    }

    // Nome Generico (Es. "Vasetto Cuore 50g")
    let suffix = grams === 1000 ? '1kg' : `${grams}g`;
    const fullName = `${nomeBase} ${suffix}`;

    if (!file) { alert("Carica una foto!"); return; }

    try {
        btn.textContent = "Elaborazione..."; btn.disabled = true;

        // A. Upload Foto
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const { error: upErr } = await window.supabaseClient.storage.from('product-images').upload(fileName, file);
        if (upErr) throw upErr;
        const { data: urlData } = window.supabaseClient.storage.from('product-images').getPublicUrl(fileName);

        // B. Gestione Prodotto Padre (Crea o Recupera)
        let productId = null;
        const { data: existingProducts } = await window.supabaseClient.from('products').select('id').eq('name', fullName).limit(1);

        if (existingProducts && existingProducts.length > 0) {
            productId = existingProducts[0].id;
            // Aggiorna foto se prodotto esiste
            await window.supabaseClient.from('products').update({ image_url: urlData.publicUrl, visible: true }).eq('id', productId);
        } else {
            const { data: prodData, error: inErr } = await window.supabaseClient
                .from('products')
                .insert({ name: fullName, description: '', price: 0, image_url: urlData.publicUrl, visible: true })
                .select();
            if (inErr) throw inErr;
            productId = prodData[0].id;
        }

        // C. Calcolo Costi e Preparazione Varianti
        const { data: honeyData } = await window.supabaseClient.from('honey_costs').select('*');
        const pricePerKgMap = {};
        if(honeyData) honeyData.forEach(h => pricePerKgMap[h.name] = h.cost);

        const variantsToUpsert = [];

        // Prepara Acacia se richiesto
        if (mode === 'both' || mode === 'Acacia') {
            const cost = (grams / 1000) * (pricePerKgMap['Acacia'] || 0);
            variantsToUpsert.push({
                product_id: productId,
                name: 'Acacia',
                cost: cost,
                price: priceAcacia
            });
        }

        // Prepara Millefiori se richiesto
        if (mode === 'both' || mode === 'Millefiori') {
            const cost = (grams / 1000) * (pricePerKgMap['Millefiori'] || 0);
            variantsToUpsert.push({
                product_id: productId,
                name: 'Millefiori',
                cost: cost,
                price: priceMille
            });
        }

        // D. Invio al DB (Upsert gestisce aggiornamenti o nuovi inserimenti)
        const { error: vErr } = await window.supabaseClient.from('product_variants')
            .upsert(variantsToUpsert, { onConflict: 'product_id, name' });

        if (vErr) throw vErr;

        alert(`✅ Prodotto Salvato: ${fullName}\nVarianti aggiornate: ${variantsToUpsert.length}`);
        window.location.href = "index.html";

    } catch (err) {
        alert("Errore: " + err.message);
        btn.textContent = "➕ Aggiungi al Catalogo";
        btn.disabled = false;
    }
}

// 4. CESTINO
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