// CARICA PRODOTTO NUOVO
async function inviaProdotto(event) {
    event.preventDefault();
    
    if (!window.supabaseClient) { alert("Database non connesso!"); return; }

    const nome = document.getElementById('nome-prodotto').value.trim();
    const prezzo = document.getElementById('prezzo-prodotto').value;
    const fileInput = document.getElementById('file-foto');
    const file = fileInput.files[0];
    const btn = document.getElementById('btn-add-prod');

    if (!file) {
        alert("Foto obbligatoria!");
        return;
    }

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
                visible: true // Default visibile
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

// INSERISCI SPESA
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

// --- GESTIONE RIPRISTINO PRODOTTI ---
async function loadHiddenProducts() {
    if (!window.supabaseClient) { setTimeout(loadHiddenProducts, 1000); return; }

    try {
        // Cerca prodotti con visible = false
        const { data, error } = await window.supabaseClient
            .from('products')
            .select('*')
            .eq('visible', false)
            .order('name');

        if (error) throw error;

        const container = document.getElementById('restore-container');
        if (data.length === 0) {
            container.innerHTML = '<p>Nessun prodotto nascosto.</p>';
            return;
        }

        let html = '<ul class="restore-list">';
        data.forEach(p => {
            html += `
                <li class="restore-item">
                    <span><strong>${p.name}</strong> - €${p.price}</span>
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

// Funzione Globale per Ripristinare
window.ripristinaProdotto = async function(id) {
    try {
        const { error } = await window.supabaseClient
            .from('products')
            .update({ visible: true })
            .eq('id', id);

        if (error) throw error;

        alert("Prodotto ripristinato nel catalogo!");
        loadHiddenProducts(); // Aggiorna la lista

    } catch (err) {
        alert("Errore: " + err.message);
    }
}

// Carica la lista quando la pagina è pronta
document.addEventListener('DOMContentLoaded', loadHiddenProducts);