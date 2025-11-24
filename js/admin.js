// CONFIGURAZIONE
const HONEY_TYPES = ['Acacia', 'Millefiori'];

document.addEventListener('DOMContentLoaded', () => {
    loadHoneyCosts();
    loadEditableProducts(); // Carica il listino completo
});

// UTILITY
function extractGrams(text) {
    const match = text.match(/(\d+)\s*(g|kg)/i);
    if (!match) return 0;
    let value = parseFloat(match[1]);
    let unit = match[2].toLowerCase();
    if (unit === 'kg') return value * 1000;
    return value;
}

// 1. CARICA COSTI MIELE
async function loadHoneyCosts() {
    if (!window.supabaseClient) {
        if(window.initSupabase) await window.initSupabase();
        if (!window.supabaseClient) return;
    }

    const container = document.getElementById('honey-banners-container');
    if(!container) return;

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
        `;
        container.appendChild(card);
    });
}

// 2. SALVA COSTI GLOBALI
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
    } catch (err) { alert("Errore: " + err.message); btn.disabled = false; btn.textContent = "💾 AGGIORNA COSTI"; }
}

// 3. NUOVO PRODOTTO
async function inviaProdotto(event) {
    event.preventDefault();
    if (!window.supabaseClient) return;

    const nomeBase = document.getElementById('nome-prodotto').value.trim();
    const grams = parseInt(document.getElementById('peso-prodotto').value);
    const mode = document.getElementById('mode-inserimento').value;
    const fileInput = document.getElementById('file-foto');
    const btn = document.getElementById('btn-add-prod');

    const priceAcacia = parseFloat(document.getElementById('price-acacia').value);
    const priceMille = parseFloat(document.getElementById('price-millefiori').value);

    if ((mode === 'both' || mode === 'Acacia') && (!priceAcacia || priceAcacia <= 0)) {
        alert("Inserisci prezzo Acacia!"); return;
    }
    if ((mode === 'both' || mode === 'Millefiori') && (!priceMille || priceMille <= 0)) {
        alert("Inserisci prezzo Millefiori!"); return;
    }
    if (fileInput.files.length === 0) { alert("Foto mancante!"); return; }

    const fullName = `${nomeBase} ${grams === 1000 ? '1kg' : `${grams}g`}`;

    try {
        btn.textContent = "Caricamento..."; btn.disabled = true;

        const uploadedImageUrls = [];
        for (let i = 0; i < fileInput.files.length; i++) {
            const file = fileInput.files[i];
            const fileName = `${Date.now()}_${i}_${file.name.replace(/\s+/g, '-')}`;
            const { error: upErr } = await window.supabaseClient.storage.from('product-images').upload(fileName, file);
            if (upErr) throw upErr;
            const { data: urlData } = window.supabaseClient.storage.from('product-images').getPublicUrl(fileName);
            uploadedImageUrls.push(urlData.publicUrl);
        }

        let productId = null;
        const { data: existingProducts } = await window.supabaseClient.from('products').select('id').eq('name', fullName).limit(1);

        if (existingProducts && existingProducts.length > 0) {
            productId = existingProducts[0].id;
            await window.supabaseClient.from('products').update({ visible: true }).eq('id', productId);
        } else {
            const { data: prodData, error: inErr } = await window.supabaseClient
                .from('products').insert({ name: fullName, description: '', price: 0, visible: true }).select();
            if (inErr) throw inErr;
            productId = prodData[0].id;
        }

        if (uploadedImageUrls.length > 0) {
            const imagesToInsert = uploadedImageUrls.map(url => ({ product_id: productId, image_url: url }));
            await window.supabaseClient.from('product_images').insert(imagesToInsert);
        }

        const { data: honeyData } = await window.supabaseClient.from('honey_costs').select('*');
        const pricePerKgMap = {};
        if(honeyData) honeyData.forEach(h => pricePerKgMap[h.name] = h.cost);

        const variantsToUpsert = [];
        if (mode === 'both' || mode === 'Acacia') {
            const cost = (grams / 1000) * (pricePerKgMap['Acacia'] || 0);
            variantsToUpsert.push({ product_id: productId, name: 'Acacia', cost: cost, price: priceAcacia });
        }
        if (mode === 'both' || mode === 'Millefiori') {
            const cost = (grams / 1000) * (pricePerKgMap['Millefiori'] || 0);
            variantsToUpsert.push({ product_id: productId, name: 'Millefiori', cost: cost, price: priceMille });
        }

        const { error: vErr } = await window.supabaseClient.from('product_variants')
            .upsert(variantsToUpsert, { onConflict: 'product_id, name' });
        if (vErr) throw vErr;

        alert("✅ Salvato!");
        location.reload();

    } catch (err) {
        alert("Errore: " + err.message);
        btn.textContent = "➕ Aggiungi";
        btn.disabled = false;
    }
}

// 4. CARICA LISTINO DI SEMPRE
async function loadEditableProducts() {
    if (!window.supabaseClient) { 
        if(window.initSupabase) await window.initSupabase();
        if(!window.supabaseClient) return; 
    }
    
    const container = document.getElementById('edit-products-list');
    if (!container) return;

    // Prendi TUTTI i prodotti (visibili e non)
    const { data: products, error } = await window.supabaseClient
        .from('products')
        .select('*, product_variants(*), product_images(*)')
        .order('name');

    if (error) { container.innerHTML = '<p>Errore caricamento.</p>'; return; }
    if (!products || products.length === 0) { container.innerHTML = '<p>Nessun prodotto.</p>'; return; }

    container.innerHTML = '';

    products.forEach(p => {
        const isHidden = !p.visible;
        const cardClass = isHidden ? 'edit-card is-hidden' : 'edit-card';
        const statusLabel = isHidden ? '<span style="color:#dc3545; font-size:0.8em; font-weight:bold; margin-left:5px;">(NASCOSTO)</span>' : '';
        
        const card = document.createElement('div');
        card.className = cardClass;
        
        let imgHtml = '';
        if (p.product_images && p.product_images.length > 0) {
            imgHtml = `<img src="${p.product_images[0].image_url}" class="img-preview-mini">`;
        }

        let variantsHtml = '';
        if (p.product_variants) {
            p.product_variants.sort((a,b) => a.name.localeCompare(b.name)).forEach(v => {
                variantsHtml += `
                    <div class="edit-row">
                        <label>${v.name} (€):</label>
                        <input type="number" step="0.01" class="input-var-price" data-vid="${v.id}" value="${v.price.toFixed(2)}">
                    </div>
                `;
            });
        }

        // Bottoni Dinamici
        let visibilityBtn = '';
        if(isHidden) {
            visibilityBtn = `<button class="btn-success" onclick="toggleVisibility(${p.id}, true)">Rimetti a listino</button>`;
        } else {
            visibilityBtn = `<button class="btn-secondary" onclick="toggleVisibility(${p.id}, false)">Nascondi</button>`;
        }

        card.innerHTML = `
            <div style="display:flex; gap:10px; margin-bottom:10px; align-items:center;">
                ${imgHtml}
                <div style="flex:1;">
                    <div style="margin-bottom:5px;">${statusLabel}</div>
                    <input type="text" class="input-prod-name" value="${p.name}" style="width:100%; font-weight:bold;">
                </div>
            </div>
            ${variantsHtml}
            <button class="btn-save-item" onclick="saveProductChanges(${p.id}, this)">Salva Modifiche</button>
            <div class="actions-row">
                ${visibilityBtn}
                <button class="btn-danger" onclick="deleteProductPermanently(${p.id})">Elimina per sempre</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// 5. AZIONI PRODOTTO
window.saveProductChanges = async function(productId, btn) {
    const card = btn.closest('.edit-card');
    const newName = card.querySelector('.input-prod-name').value.trim();
    const varInputs = card.querySelectorAll('.input-var-price');
    
    if (!newName) { alert("Il nome non può essere vuoto"); return; }
    btn.textContent = "Salvataggio..."; btn.disabled = true;

    try {
        await window.supabaseClient.from('products').update({ name: newName }).eq('id', productId);
        for (const inp of varInputs) {
            const vid = inp.dataset.vid;
            const newPrice = parseFloat(inp.value);
            if (vid && newPrice >= 0) {
                await window.supabaseClient.from('product_variants').update({ price: newPrice }).eq('id', vid);
            }
        }
        alert("✅ Modifiche salvate!");
    } catch (err) { alert("Errore: " + err.message); } 
    finally { btn.textContent = "Salva Modifiche"; btn.disabled = false; }
}

window.toggleVisibility = async function(id, visible) {
    try {
        await window.supabaseClient.from('products').update({ visible: visible }).eq('id', id);
        loadEditableProducts(); // Ricarica la lista
    } catch(e) { alert("Errore: " + e.message); }
}

window.deleteProductPermanently = async function(id) {
    if(!confirm("⚠️ ATTENZIONE: Stai per eliminare DEFINITIVAMENTE questo prodotto e tutte le sue foto/varianti.\n\nNon potrai tornare indietro. Continuare?")) return;
    
    try {
        // Cancella varianti e immagini prima (per sicurezza, anche se cascade dovrebbe farlo)
        await window.supabaseClient.from('product_variants').delete().eq('product_id', id);
        await window.supabaseClient.from('product_images').delete().eq('product_id', id);
        await window.supabaseClient.from('products').delete().eq('id', id);
        
        loadEditableProducts();
        alert("Prodotto eliminato per sempre.");
    } catch(e) { alert("Errore eliminazione: " + e.message); }
}