let products = [];
let cartQuantities = {}; 

async function initializeProducts() {
    if (!window.supabaseClient) { setTimeout(initializeProducts, 500); return; }
    try {
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*, product_variants(*)')
            .eq('visible', true) 
            .order('name'); 
        if (error) throw error;
        products = data;
        cartQuantities = {};
        products.forEach(p => {
            if (p.product_variants) p.product_variants.forEach(v => cartQuantities[v.id] = 0);
        });
        renderProducts();
    } catch (err) { console.error(err); }
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
        
        let selectHTML = '';
        if (variants.length > 1) {
            selectHTML = `<select id="var-select-${p.id}" onchange="changeVar(${p.id})" class="variant-select">
                ${variants.map(v => `<option value="${v.id}" data-price="${v.price}">Gusto: ${v.name} - €${v.price.toFixed(2)}</option>`).join('')}
            </select>`;
        } else {
            selectHTML = `<input type="hidden" id="var-select-${p.id}" value="${variants[0].id}"><div class="single-variant-label">${variants[0].name}</div>`;
        }

        const price = variants[0].price.toFixed(2).replace('.', ',');

        card.innerHTML = `
            <img src="${p.image_url}" onerror="this.src='https://via.placeholder.com/400'">
            <div class="product-info">
                <h3>${p.name}</h3>
                ${selectHTML}
                <div class="price" id="price-${p.id}">€${price}</div>
                <div class="quantity-control">
                    <button onclick="updQty(${p.id}, -1)">-</button>
                    <span id="qty-${p.id}" class="quantity-display">0</span>
                    <button onclick="updQty(${p.id}, 1)">+</button>
                </div>
                <div class="payment-selector">
                    <label>Pagamento:</label>
                    <select id="pay-${p.id}"><option value="contanti">Contanti</option><option value="pos">POS</option></select>
                </div>
                <button class="btn-delete" onclick="nascondi(${p.id})">Rimuovi</button>
            </div>
        `;
        grid.appendChild(card);
    });
    calcTot(); 
}

window.changeVar = function(pid) {
    const sel = document.getElementById(`var-select-${pid}`);
    const price = parseFloat(sel.options[sel.selectedIndex].dataset.price);
    document.getElementById(`price-${pid}`).textContent = `€${price.toFixed(2).replace('.', ',')}`;
    const vid = parseInt(sel.value);
    document.getElementById(`qty-${pid}`).textContent = cartQuantities[vid] || 0;
}

window.updQty = function(pid, d) {
    const sel = document.getElementById(`var-select-${pid}`);
    const vid = parseInt(sel.value);
    let q = (cartQuantities[vid] || 0) + d;
    if(q<0) q=0;
    cartQuantities[vid] = q;
    document.getElementById(`qty-${pid}`).textContent = q;
    calcTot();
}

window.calcTot = function() {
    let t = 0;
    products.forEach(p => {
        if(p.product_variants) p.product_variants.forEach(v => t += (cartQuantities[v.id]||0) * v.price);
    });
    const el = document.getElementById('total-price');
    if(el) el.textContent = t.toFixed(2).replace('.', ',');
}

window.nascondi = async function(id) {
    if(!confirm("Rimuovere?")) return;
    await window.supabaseClient.from('products').update({visible:false}).eq('id', id);
    initializeProducts();
}

window.inviaOrdine = async function() {
    let itemsCash=[], itemsPos=[], totCash=0, totPos=0;
    products.forEach(p => {
        if(!p.product_variants) return;
        const method = document.getElementById(`pay-${p.id}`).value;
        p.product_variants.forEach(v => {
            const q = cartQuantities[v.id] || 0;
            if(q>0) {
                const item = { product_id: p.id, variant_id: v.id, name: `${p.name} (${v.name})`, quantity: q, price: v.price, cost: v.cost };
                if(method==='contanti') { itemsCash.push(item); totCash+=v.price*q; }
                else { itemsPos.push(item); totPos+=v.price*q; }
            }
        });
    });

    if(itemsCash.length===0 && itemsPos.length===0) { alert("Carrello vuoto"); return; }
    
    if(itemsCash.length>0) await window.supabaseClient.from('sales').insert({total_amount: totCash, payment_method: 'contanti', items: itemsCash});
    if(itemsPos.length>0) await window.supabaseClient.from('sales').insert({total_amount: totPos, payment_method: 'pos', items: itemsPos});
    
    alert("Ordine Inviato!");
    initializeProducts();
}

document.addEventListener('DOMContentLoaded', initializeProducts);