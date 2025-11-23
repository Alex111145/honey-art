// CARICA PRODOTTO
async function inviaProdotto(event) {
    event.preventDefault();
    
    if (!window.supabaseClient) { alert("Database non connesso!"); return; }

    const nome = document.getElementById('nome-prodotto').value.trim();
    const prezzo = document.getElementById('prezzo-prodotto').value;
    const fileInput = document.getElementById('file-foto');
    const file = fileInput.files[0];
    const btn = document.getElementById('btn-add-prod');

    if (!file) { alert("Foto obbligatoria!"); return; }

    try {
        btn.textContent = "Caricamento...";
        btn.disabled = true;

        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('product-images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = window.supabaseClient.storage
            .from('product-images')
            .getPublicUrl(fileName);
        const publicUrl = publicUrlData.publicUrl;

        const { error: insertError } = await window.supabaseClient
            .from('products')
            .insert({
                name: nome,
                description: '',
                price: parseFloat(prezzo),
                image_url: publicUrl,
                visible: true
            });

        if (insertError) throw insertError;

        alert("✅ Prodotto aggiunto!");
        window.location.href = "index.html";

    } catch (err) {
        console.error("Errore:", err);
        alert("Errore: " + err.message);
        btn.textContent = "➕ Aggiungi al Catalogo";
        btn.disabled = false;
    }
}

// SPESA
async function inviaSpesa(event) {
    event.preventDefault();
    if (!window.supabaseClient) return;

    const dataSpesa = document.getElementById('data-spesa').value;
    const importo = parseFloat(document.getElementById('importo-spesa').value);
    const motivo = document.getElementById('descrizione-spesa').value.trim();

    try {
        const { error } = await window.supabaseClient
            .from('expenses')
            .insert({
                created_at: new Date(dataSpesa).toISOString(), 
                amount: -Math.abs(importo),
                description: motivo,
                category: 'Generale'
            });

        if (error) throw error;

        alert("✅ Spesa registrata!");
        document.getElementById('spesaForm').reset();

    } catch (err) {
        console.error("Errore:", err);
        alert("Errore: " + err.message);
    }
}

// --- RIPRISTINO PRODOTTI ---
async function loadHiddenProducts() {
    if (!window.supabaseClient) { setTimeout(loadHiddenProducts, 1000); return; }

    try {
        // Prendi prodotti nascosti
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('visible', false)
            .order('name');

        if (error) throw error;

        const container = document.getElementById('restore-content');
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888;">Nessun prodotto nascosto.</p>';
            return;
        }

        // Genera HTML Lista
        let html = '<ul class="restore-list">';
        data.forEach(p => {
            html += `
                <li class="restore-item">
                    <img src="${p.image_url}" alt="${p.name}" class="restore-img" onerror="this.src='https://via.placeholder.com/50'">
                    <div class="restore-info">
                        <span class="r-name">${p.name}</span>
                        <span class="r-price">€${p.price.toFixed(2)}</span>
                    </div>
                    <button class="btn-restore" onclick="ripristinaProdotto(${p.id})">Ripristina</button>
                </li>
            `;
        });
        html += '</ul>';
        container.innerHTML = html;

    } catch (err) {
        console.error("Errore caricamento nascosti:", err);
    }
}

window.ripristinaProdotto = async function(id) {
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({ visible: true })
            .eq('id', id);

        if (error) throw error;

        alert("Prodotto ripristinato nel catalogo!");
        loadHiddenProducts(); 

    } catch (err) {
        alert("Errore: " + err.message);
    }
}

document.addEventListener('DOMContentLoaded', loadHiddenProducts);