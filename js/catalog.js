let products = [];
let cartQuantities = {}; 

// Funzione principale di avvio
async function initializeProducts() {
    // 1. Prova a ottenere il client (riprova se non è pronto)
    if (!window.supabaseClient) {
        // Tenta di inizializzarlo se main.js non l'ha fatto in tempo
        if(window.initSupabase) await window.initSupabase();
        
        if (!window.supabaseClient) {
            console.log("In attesa del database...");
            setTimeout(initializeProducts, 500);
            return;
        }
    }
    
    const productList = document.getElementById('product-list');

    try {
        // 2. Scarica i prodotti
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*, product_variants(*)')
            .eq('visible', true) 
            .order('name'); 
        
        // 3. Gestione Errori Esplicita
        if (error) {
            throw new Error(`Errore Database: ${error.message} (Codice: ${error.code})`);
        }
        
        products = data;
        
        if (!products || products.length === 0) {
            if(productList) productList.innerHTML = '<p style="text-align:center; padding:20px;">Il catalogo è vuoto.<br>Vai in Admin per aggiungere prodotti.</p>';
            return;
        }

        // 4. Inizializza carrello
        cartQuantities = {};
        products.forEach(p => {
            if (p.product_variants) {
                p.product_variants.forEach(v => {
                    cartQuantities[v.id] = 0;
                });
            }
        });
        
        renderProducts();
        
    } catch (err) {
        console.error("ERRORE CATALOGO:", err);
        if(productList) {
            productList.innerHTML = `
                <div style="background:#fff0f0; color:#d8000c; border:1px solid #d8000c; padding:20px; border-radius:5px; text-align:center; margin:20px;">
                    <h3>⚠️ Errore di Connessione</h3>
                    <p><strong>${err.message}</strong></p>
                    <hr style="margin:10px 0; border:0; border-top:1px solid #ffcccc;">
                    <p style="font-size:0.9em; text-align:left;">
                        Possibili cause:<br>
                        1. <strong>Database in Pausa:</strong> Vai su Supabase e riattivalo.<br>
                        2. <strong>Tabelle Mancanti:</strong> Hai eseguito lo script SQL di ripopolamento?<br>
                        3. <strong>Offline:</strong> Controlla la tua connessione internet.
                    </p>
                </div>
            `;
        }
    }
}

function renderProducts() {
    const grid = document.getElementById('product-list');
    const title = document.getElementById('catalogo-title');
    if (!grid) return;
    
    grid.innerHTML = ''; 
    if(title) title.textContent = `Bomboniere (${products.length} articoli)`;

    products.forEach(p => {
        // Filtra e ordina le varianti (Acacia/Millefiori)
        const variants = p.product_variants ? p.product_variants.sort((a,b) => a.price - b.price) : [];
        
        if (variants.length === 0) return; 

        const card = document.createElement('div');
        card.className = 'product-card';
        
        // Creazione Tendina/Selezione Variante
        let selectHTML = '';
        if (variants.length > 1) {
            selectHTML = `
                <select id="var-select-${p.id}" onchange="changeVar(${p.id})" class="variant-select">
                    ${variants.map(v => `<option value="${v.id}" data-price="${v.price}">Gusto: ${v.name} - €${v.price.toFixed(2)}</option>`).join('')}
                </select>
            `;
        } else {
            selectHTML = `
                <input type="hidden" id="var-select-${p.id}" value="${variants[0].id}">
                <div class="single-variant-label">${variants[0].name}</div>
            `;
        }

        // Prezzo iniziale
        const initialPrice = variants[0].price.toFixed(2).replace('.', ',');

        card.innerHTML = `
            <img src="${p.image_url}" onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
            <div class="product-info">
                <h3>${p.name}</h3>
                ${selectHTML}
                
                <div class="price" id="price-${p.id}">€${initialPrice}</div>
                
                <div class="quantity-control">
                    <button onclick="updQty(${p.id}, -1)">-</button>
                    <span id="qty-${p.id}" class="quantity-display">0</span>
                    <button onclick="updQty(${p.id}, 1)">+</button>
                </div>

                <div class="payment-selector">
                    <label>Pagamento:</label>
                    <select id="pay-${p.id}">
                        <option value="contanti">💶 Contanti</option>
                        <option value="pos">💳 POS / Carta</option>
                    </select>
                </div>

                <button class="btn-delete" onclick="nascondi(${p.id})">Rimuovi</button>
            </div>
        `;
        grid.appendChild(card);
    });
    calcTot(); 
}

// --- FUNZIONI DI SUPPORTO UI ---

window.changeVar = function(pid) {
    const sel = document.getElementById(`var-select-${pid}`);
    const price = parseFloat(sel.options[sel.selectedIndex].dataset.price);
    document.getElementById(`price-${pid}`).textContent = `€${price.toFixed(2).replace('.', ',')}`;
    
    // Aggiorna la quantità visualizzata per la variante selezionata
    const vid = parseInt(sel.value);
    document.getElementById(`qty-${pid}`).textContent = cartQuantities[vid] || 0;
    calcTot();
}

window.updQty = function(pid, d) {
    const sel = document.getElementById(`var-select-${pid}`);
    const vid = parseInt(sel.value);
    
    let q = (cartQuantities[vid] || 0) + d;
    if(q < 0) q = 0;
    
    cartQuantities[vid] = q;
    document.getElementById(`qty-${pid}`).textContent = q;
    calcTot();
}

window.calcTot = function() {
    let t = 0;
    products.forEach(p => {
        if(p.product_variants) {
            p.product_variants.forEach(v => {
                t += (cartQuantities[v.id] || 0) * v.price;
            });
        }
    });
    const el = document.getElementById('total-price');
    if(el) el.textContent = t.toFixed(2).replace('.', ',');
}

window.nascondi = async function(id) {
    if(!confirm("Vuoi nascondere questo prodotto dal catalogo?")) return;
    try {
        await window.supabaseClient.from('products').update({visible:false}).eq('id', id);
        initializeProducts(); // Ricarica
    } catch(e) { alert("Errore: " + e.message); }
}

window.inviaOrdine = async function() {
    let itemsCash = [], itemsPos = [];
    let totCash = 0, totPos = 0;

    products.forEach(p => {
        if(!p.product_variants) return;
        const method = document.getElementById(`pay-${p.id}`).value;
        
        p.product_variants.forEach(v => {
            const q = cartQuantities[v.id] || 0;
            if(q > 0) {
                const item = {
                    product_id: p.id,
                    variant_id: v.id,
                    name: `${p.name} (${v.name})`,
                    quantity: q,
                    price: v.price,
                    cost: v.cost
                };
                if(method === 'contanti') { itemsCash.push(item); totCash += v.price * q; }
                else { itemsPos.push(item); totPos += v.price * q; }
            }
        });
    });

    if(itemsCash.length === 0 && itemsPos.length === 0) {
        alert("Il carrello è vuoto!");
        return;
    }
    
    const btn = document.querySelector('.invia-btn');
    if(btn) { btn.disabled = true; btn.textContent = "Invio in corso..."; }

    try {
        if(itemsCash.length > 0) {
            await window.supabaseClient.from('sales').insert({
                total_amount: totCash, payment_method: 'contanti', items: itemsCash
            });
        }
        if(itemsPos.length > 0) {
            await window.supabaseClient.from('sales').insert({
                total_amount: totPos, payment_method: 'pos', items: itemsPos
            });
        }
        
        alert("✅ Ordine registrato con successo!");
        initializeProducts(); // Reset
    } catch(e) {
        alert("Errore invio ordine: " + e.message);
    } finally {
        if(btn) { btn.disabled = false; btn.innerHTML = `INVIA Ordine (Tot: €<span id="total-price">0,00</span>)`; }
    }
}

// Avvio
document.addEventListener('DOMContentLoaded', initializeProducts);