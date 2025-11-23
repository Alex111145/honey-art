// Dati Iniziali (Fallback)
const initialProducts = [
    { id: 1, name: 'Vasetto Lavanda Elegance', description: 'Miele di lavanda con decorazione lilla.', price: 4.50, img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop' },
    { id: 2, name: 'Miele Nocciola Gourmet', description: 'Miele millefiori con nocciole tostate.', price: 5.20, img: 'https://images.unsplash.com/photo-1593560704563-f176a2eb61db?w=400&h=400&fit=crop' },
    { id: 3, name: 'Classico Millefiori (300g)', description: 'Il classico miele non trattato.', price: 3.90, img: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop' },
    { id: 4, name: 'Barattolo Tè e Miele', description: 'Un vasetto perfetto con infusione al Tè.', price: 4.80, img: 'https://images.unsplash.com/photo-1580959375944-0b94e7db3a69?w=400&h=400&fit=crop' },
    { id: 5, name: 'Mini Vasetti Set 3 pezzi', description: 'Set di tre piccoli vasetti regalo.', price: 6.50, img: 'https://images.unsplash.com/photo-1518013431117-eb1465fa2c59?w=400&h=400&fit=crop' }
];

let products = [];
let quantities = {};

function initializeProducts() {
    const storedProducts = localStorage.getItem('honeyArtProducts');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    } else {
        products = initialProducts;
        localStorage.setItem('honeyArtProducts', JSON.stringify(products));
    }
    products.forEach(p => quantities[p.id] = 0);
}

function renderProducts() {
    const productGrid = document.getElementById('product-list');
    const catalogoTitle = document.getElementById('catalogo-title');
    if (!productGrid) return;
    
    productGrid.innerHTML = ''; 
    catalogoTitle.textContent = `Bomboniere (${products.length} articoli)`;

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-id', p.id);
        
        // AGGIUNTA SELECT "CONTANTI / POS" SOTTO LA QUANTITÀ
        card.innerHTML = `
            <img src="${p.img}" alt="${p.name}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
                <div class="price">€${p.price.toFixed(2).replace('.', ',')}</div>
                <div class="quantity-control">
                    <button onclick="updateQuantity(${p.id}, -1)">-</button>
                    <span id="qty-${p.id}" class="quantity-display">0</span>
                    <button onclick="updateQuantity(${p.id}, 1)">+</button>
                </div>
                <div class="payment-selector">
                    <label>Paga con:</label>
                    <select id="pay-method-${p.id}">
                        <option value="contanti">Contanti 💶</option>
                        <option value="pos">POS 💳</option>
                    </select>
                </div>
            </div>
        `;
        productGrid.appendChild(card);
    });
    calculateTotal(); 
}

window.calculateTotal = function() {
    let total = 0;
    products.forEach(p => { total += (quantities[p.id] || 0) * p.price; });
    document.getElementById('total-price').textContent = total.toFixed(2).replace('.', ',');
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

// INVIA ORDINE AGGIORNATO: RAGGRUPPA PER METODO
window.inviaOrdine = function() {
    const total = calculateTotal();
    const items = products.filter(p => quantities[p.id] > 0);
    
    if (items.length === 0) {
        alert("Nessun prodotto selezionato.");
        return;
    }
    
    // Raccogliamo gli item divisi per metodo di pagamento scelto sulla card
    let itemsCash = [];
    let itemsPOS = [];
    let totalCash = 0;
    let totalPOS = 0;

    items.forEach(item => {
        const method = document.getElementById(`pay-method-${item.id}`).value;
        const itemTotal = item.price * quantities[item.id];
        
        const orderItem = {
            id: item.id,
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

    const storedSales = localStorage.getItem('honeyArtSales');
    let sales = storedSales ? JSON.parse(storedSales) : [];
    const timestamp = new Date().toISOString();

    // Salviamo ordine Contanti (se ce ne sono)
    if (itemsCash.length > 0) {
        sales.push({
            id: Date.now(), // ID univoco
            date: timestamp,
            amount: totalCash,
            method: 'contanti',
            items: itemsCash
        });
    }

    // Salviamo ordine POS (se ce ne sono)
    if (itemsPOS.length > 0) {
        sales.push({
            id: Date.now() + 1, // ID univoco diverso
            date: timestamp,
            amount: totalPOS,
            method: 'pos',
            items: itemsPOS
        });
    }
    
    localStorage.setItem('honeyArtSales', JSON.stringify(sales));

    let msg = "Ordine registrato!\n";
    if(itemsCash.length > 0) msg += `- Contanti: €${totalCash.toFixed(2)}\n`;
    if(itemsPOS.length > 0) msg += `- POS: €${totalPOS.toFixed(2)}\n`;
    
    alert(msg);
    
    // Reset
    products.forEach(p => {
        quantities[p.id] = 0;
        const qtyDisplay = document.getElementById(`qty-${p.id}`);
        if (qtyDisplay) qtyDisplay.textContent = 0;
    });
    calculateTotal();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeProducts();
    renderProducts();
});