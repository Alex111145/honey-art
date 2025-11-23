let products = [];
let quantities = {};

// 1. SCARICA PRODOTTI (SOLO QUELLI VISIBILI)
async function initializeProducts() {
    if (!window.supabaseClient) {
        setTimeout(initializeProducts, 500);
        return;
    }
    
    try {
        // Filtra per visible = true
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('visible', true) 
            .order('name'); 
        
        if (error) throw error;
        
        products = data;
        products.forEach(p => quantities[p.id] = 0);
        renderProducts();
        
    } catch (err) {
        console.error("Errore DB:", err);
        const list = document.getElementById('product-list');
        if(list) list.innerHTML = '<p style="color:red; text-align:center;">Errore connessione database.</p>';
    }
}

// 2. MOSTRA PRODOTTI
function renderProducts() {
    const productGrid = document.getElementById('product-list');
    const catalogoTitle = document.getElementById('catalogo-title');
    if (!productGrid) return;
    
    if (products.length === 0) {
        productGrid.innerHTML = '<p style="text-align:center;">Nessun prodotto visibile nel catalogo.</p>';
        return;
    }

    productGrid.innerHTML = ''; 
    if(catalogoTitle) catalogoTitle.textContent = `Bomboniere (${products.length} articoli)`;

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-id', p.id);
        
        card.innerHTML = `
            <img src="${p.image_url}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/400?text=No+Image'">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.description || ''}</p>
                <div class="price">€${p.price.toFixed(2).replace('.', ',')}</div>
                
                <div class="quantity-control">
                    <button onclick="updateQuantity(${p.id}, -1)">-</button>
                    <span id="qty-${p.id}" class="quantity-display">0</span>
                    <button onclick="updateQuantity(${p.id}, 1)">+</button>
                </div>

                <div class="payment-selector">
                    <label>Metodo Pagamento:</label>
                    <select id="pay-method-${p.id}">
                        <option value="contanti">💶 Contanti</option>
                        <option value="pos">💳 POS / Carta</option>
                    </select>
                </div>

                <button class="btn-delete" onclick="nascondiProdotto(${p.id}, '${p.name.replace(/'/g, "\\'")}')">🗑️ Rimuovi dal Catalogo</button>
            </div>
        `;
        productGrid.appendChild(card);
    });
    calculateTotal(); 
}

// NUOVA FUNZIONE: Nasconde il prodotto (Soft Delete)
window.nascondiProdotto = async function(id, name) {
    if (!confirm(`Sei sicuro di voler rimuovere "${name}" dal catalogo? \n(Non verrà eliminato dalle statistiche)`)) {
        return;
    }

    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({ visible: false })
            .eq('id', id);

        if (error) throw error;

        alert("Prodotto rimosso dal catalogo!");
        initializeProducts(); // Ricarica la lista

    } catch (err) {
        alert("Errore durante la rimozione: " + err.message);
    }
}

window.calculateTotal = function() {
    let total = 0;
    products.forEach(p => { total += (quantities[p.id] || 0) * p.price; });
    
    // FIX ERRORE: Controlla se l'elemento esiste prima di aggiornarlo
    const totalEl = document.getElementById('total-price');
    if (totalEl) {
        totalEl.textContent = total.toFixed(2).replace('.', ',');
    }
    return total;
}

window.updateQuantity = function(id, delta) {
    let currentQty = quantities[id] || 0;
    let newQty = currentQty + delta;
    if (newQty < 0) newQty = 0; 
    quantities[id] = newQty;
    
    const qtyDisplay = document.getElementById(`qty-${id}`);
    if (qtyDisplay) qtyDisplay.textContent = newQty;
    
    calculateTotal();
}

window.inviaOrdine = async function() {
    const items = products.filter(p => quantities[p.id] > 0);
    
    if (items.length === 0) {
        alert("Nessun prodotto selezionato.");
        return;
    }
    
    let itemsCash = [];
    let itemsPOS = [];
    let totalCash = 0;
    let totalPOS = 0;

    items.forEach(item => {
        const method = document.getElementById(`pay-method-${item.id}`).value;
        const itemTotal = item.price * quantities[item.id];
        
        const orderItem = {
            name: item.name,
            quantity: quantities[item.id],
            price: item.price
        };

        if (method === 'contanti') {
            itemsCash.push(orderItem);
            totalCash += itemTotal;
        } else {
            itemsPOS.push(orderItem);
            totalPOS += itemTotal;
        }
    });

    const btn = document.querySelector('.invia-btn');
    const originalText = btn ? btn.innerHTML : "INVIA";
    if(btn) {
        btn.textContent = "Invio...";
        btn.disabled = true;
    }

    try {
        if (itemsCash.length > 0) {
            const { error } = await window.supabaseClient.from('sales').insert({
                total_amount: totalCash,
                payment_method: 'contanti',
                items: itemsCash
            });
            if (error) throw error;
        }

        if (itemsPOS.length > 0) {
            const { error } = await window.supabaseClient.from('sales').insert({
                total_amount: totalPOS,
                payment_method: 'pos',
                items: itemsPOS
            });
            if (error) throw error;
        }

        alert("✅ Ordine salvato!");
        
        products.forEach(p => {
            quantities[p.id] = 0;
            const el = document.getElementById(`qty-${p.id}`);
            if(el) el.textContent = 0;
        });
        calculateTotal();

    } catch (err) {
        console.error("Errore salvataggio:", err);
        alert("Errore: " + err.message);
    } finally {
        if(btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
});