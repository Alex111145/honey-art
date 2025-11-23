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

        // 1. Upload
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '-')}`;
        const { data: uploadData, error: uploadError } = await window.supabaseClient.storage
            .from('product-images')
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        // 2. URL
        const { data: publicUrlData } = window.supabaseClient.storage
            .from('product-images')
            .getPublicUrl(fileName);
        const publicUrl = publicUrlData.publicUrl;

        // 3. Insert
        const { error: insertError } = await window.supabaseClient
            .from('products')
            .insert({
                name: nome,
                description: '',
                price: parseFloat(prezzo),
                image_url: publicUrl
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