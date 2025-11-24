let products = [];
let cartQuantities = {}; 
let carouselIndices = {};
let autoScrollIntervals = {}; 

async function initializeProducts() {
    if (!window.supabaseClient) {
        if(window.initSupabase) await window.initSupabase();
        if (!window.supabaseClient) { setTimeout(initializeProducts, 500); return; }
    }
    
    const productList = document.getElementById('product-list');

    try {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*, product_variants(*), product_images(*)')
            .eq('visible', true) 
            .order('name'); 
        
        if (error) throw new Error(error.message);
        
        products = data;
        
        if (!products || products.length === 0) {
            if(productList) productList.innerHTML = '<p style="text-align:center; padding:20px;">Il catalogo è vuoto.</p>';
            return;
        }

        cartQuantities = {};
        carouselIndices = {};
        
        // Pulisce vecchi intervalli se presenti
        for (const pid in autoScrollIntervals) {
            clearInterval(autoScrollIntervals[pid]);
        }
        autoScrollIntervals = {};

        products.forEach(p => {
            if (p.product_variants) {
                p.product_variants.forEach(v => { cartQuantities[v.id] = 0; });
            }
            carouselIndices[p.id] = 0;
        });
        
        renderProducts();
        
    } catch (err) {
        console.error("ERRORE CATALOGO:", err);
        if(productList) productList.innerHTML = `<p style="color:red; text-align:center">Errore: ${err.message}</p>`;
    }
}

function renderProducts() {
    const grid = document.getElementById('product-list');
    const title = document.getElementById('catalogo-title');
    if (!grid) return;
    
    grid.innerHTML = ''; 
    if(title) title.textContent = `Bomboniere (${products.length} articoli)`;

    products.forEach(p => {
        const variants = p.product_variants ? p.product_variants.sort((a,b) => a.price - b.price) : [];
        if (variants.length === 0) return; 

        const card = document.createElement('div');
        card.className = 'product-card';
        
        // --- GESTIONE IMMAGINI (AUTO SCROLL 5s) ---
        let imageHTML = '';
        const images = p.product_images || [];
        images.sort((a,b) => a.id - b.id);
        const placeholder = 'https://via.placeholder.com/400?text=No+Image';

        if (images.length > 1) {
            // Carosello automatico senza frecce
            imageHTML = `<div class="carousel-container" id="carousel-${p.id}">`;
            images.forEach((img, index) => {
                const activeClass = index === 0 ? 'active' : '';
                imageHTML += `<img src="${img.image_url}" class="carousel-slide ${activeClass}" onerror="this.src='${placeholder}'">`;
            });
            imageHTML += `</div>`;
            
            // Avvia il timer automatico per questo prodotto
            startAutoScroll(p.id);

        } else {
            let imgUrl = images.length > 0 ? images[0].image_url : placeholder;
            imageHTML = `<img src="${imgUrl}" class="product-main-img" onerror="this.src='${placeholder}'">`;
        }

        // TENDINA VARIANTI (MODIFICATA: Prezzo rimosso dal testo opzione)
        let selectHTML = '';
        if (variants.length > 1) {
            selectHTML = `
                <select id="var-select-${p.id}" onchange="changeVar(${p.id})" class="variant-select">
                    ${variants.map(v => `<option value="${v.id}" data-price="${v.price}">Gusto: ${v.name}</option>`).join('')}
                </select>
            `;
        } else {
            selectHTML = `
                <input type="hidden" id="var-select-${p.id}" value="${variants[0].id}">
                <div class="single-variant-label">${variants[0].name}</div>
            `;
        }

        const initialPrice = variants[0].price.toFixed(2).replace('.', ',');

        card.innerHTML = `
            ${imageHTML}
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

// --- LOGICA SCORRIMENTO AUTOMATICO ---
function startAutoScroll(productId) {
    // Pulisci per sicurezza
    if (autoScrollIntervals[productId]) clearInterval(autoScrollIntervals[productId]);
    
    // Imposta intervallo di 5 secondi (5000 ms)
    autoScrollIntervals[productId] = setInterval(() => {
        moveCarousel(productId, 1);
    }, 5000);
}

function moveCarousel(productId, direction) {
    const container = document.getElementById(`carousel-${productId}`);
    if (!container) return;
    
    const slides = container.querySelectorAll('.carousel-slide');
    if (slides.length < 2) return;

    let currentIndex = carouselIndices[productId] || 0;
    let newIndex = currentIndex + direction;
    
    if (newIndex >= slides.length) newIndex = 0;
    if (newIndex < 0) newIndex = slides.length - 1;
    
    carouselIndices[productId] = newIndex;
    
    slides.forEach((slide, idx) => {
        if (idx === newIndex) slide.classList.add('active');
        else slide.classList.remove('active');
    });
}

// ... ALTRE FUNZIONI UI ...
window.changeVar = function(pid) {
    const sel = document.getElementById(`var-select-${pid}`);
    const price = parseFloat(sel.options[sel.selectedIndex].dataset.price);
    document.getElementById(`price-${pid}`).textContent = `€${price.toFixed(2).replace('.', ',')}`;
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
    if(!confirm("Vuoi nascondere questo prodotto?")) return;
    try {
        await window.supabaseClient.from('products').update({visible:false}).eq('id', id);
        initializeProducts(); 
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
                const item = { product_id: p.id, variant_id: v.id, name: `${p.name} (${v.name})`, quantity: q, price: v.price, cost: v.cost };
                if(method === 'contanti') { itemsCash.push(item); totCash += v.price * q; }
                else { itemsPos.push(item); totPos += v.price * q; }
            }
        });
    });
    if(itemsCash.length === 0 && itemsPos.length === 0) { alert("Il carrello è vuoto!"); return; }
    
    const btn = document.querySelector('.invia-btn');
    if(btn) { btn.disabled = true; btn.textContent = "Invio in corso..."; }
    try {
        if(itemsCash.length > 0) await window.supabaseClient.from('sales').insert({ total_amount: totCash, payment_method: 'contanti', items: itemsCash });
        if(itemsPos.length > 0) await window.supabaseClient.from('sales').insert({ total_amount: totPos, payment_method: 'pos', items: itemsPos });
        alert("✅ Ordine registrato con successo!"); initializeProducts(); 
    } catch(e) { alert("Errore invio ordine: " + e.message); } 
    finally { if(btn) { btn.disabled = false; btn.innerHTML = `INVIA Ordine (Tot: €<span id="total-price">0,00</span>)`; } }
}

document.addEventListener('DOMContentLoaded', initializeProducts);