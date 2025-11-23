// Dati iniziali presenti in 1.html
const initialProducts = [
    { id: 1, name: 'Vasetto Lavanda Elegance', description: 'Miele di lavanda con decorazione lilla.', price: 4.50, img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop' },
    { id: 2, name: 'Miele Nocciola Gourmet', description: 'Miele millefiori con nocciole tostate.', price: 5.20, img: 'https://images.unsplash.com/photo-1593560704563-f176a2eb61db?w=400&h=400&fit=crop' },
    { id: 3, name: 'Classico Millefiori (300g)', description: 'Il classico miele non trattato da fiori vari.', price: 3.90, img: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=400&fit=crop' },
    { id: 4, name: 'Barattolo Tè e Miele', description: 'Un vasetto perfetto con infusione al Tè.', price: 4.80, img: 'https://images.unsplash.com/photo-1580959375944-0b94e7db3a69?w=400&h=400&fit=crop' },
    { id: 5, name: 'Mini Vasetti Set 3 pezzi', description: 'Set di tre piccoli vasetti regalo.', price: 6.50, img: 'https://images.unsplash.com/photo-1518013431117-eb1465fa2c59?w=400&h=400&fit=crop' },
    // ... (Ho mantenuto la logica: se copi-incolli il resto dell'array originale qui funziona uguale)
    // Per brevità nella risposta ho messo i primi 5, ma nel file finale devi mettere tutto l'array che avevi in 1.html
];

let products = [];
let quantities = {};

function initializeProducts() {
    const storedProducts = localStorage.getItem('honeyArtProducts');
    if (storedProducts) {
        products = JSON.parse(storedProducts);
    } else {
        products = initialProducts; // Assicurati di copiare tutto l'array originale qui sopra
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
        
        card.innerHTML = `
            <img src="${p.img || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop'}" alt="${p.name}">
            <div class="product-info">
                <h3>${p.name}</h3>
                <p>${p.description}</p>
                <div class="price">€${p.price.toFixed(2).replace('.', ',')}</div>
                <div class="quantity-control">
                    <button onclick="updateQuantity(${p.id}, -1)">-</button>
                    <span id="qty-${p.id}" class="quantity-display">0</span>
                    <button onclick="updateQuantity(${p.id}, 1)">+</button>
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

window.inviaOrdine = function() {
    const total = calculateTotal();
    const items = products.filter(p => quantities[p.id] > 0);
    
    if (items.length === 0) {
        alert("Nessun prodotto selezionato. Aggiungi gli articoli all'ordine.");
        return;
    }

    console.log("Dati da inviare al database (API):", {
        timestamp: new Date().toISOString(),
        total_amount: total,
        items: items
    });
    
    alert(`Ordine inviato con successo! Totale: €${total.toFixed(2).replace('.', ',')}. \nI dati verranno registrati nel database.`);
    
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