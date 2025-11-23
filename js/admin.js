function inviaProdotto(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nome-prodotto').value.trim();
    const descrizione = document.getElementById('descrizione-prodotto').value.trim();
    const prezzo = document.getElementById('prezzo-prodotto').value;
    const linkFoto = document.getElementById('link-foto').value || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=400&fit=crop'; 

    const storedProducts = localStorage.getItem('honeyArtProducts');
    let products = storedProducts ? JSON.parse(storedProducts) : [];
    
    const maxId = products.reduce((max, p) => Math.max(max, p.id), 0);
    const newId = maxId + 1;

    const newProduct = {
        id: newId,
        name: nome,
        description: descrizione,
        price: parseFloat(prezzo),
        img: linkFoto 
    };
    
    products.push(newProduct);
    localStorage.setItem('honeyArtProducts', JSON.stringify(products));

    alert(`Prodotto "${nome}" (Prezzo: €${prezzo}) aggiunto con successo! Aggiornamento in corso...`);
    window.location.href = "index.html";
}

function inviaSpesa(event) {
    event.preventDefault();
    
    const importo = document.getElementById('importo-spesa').value;
    const payload = {
        timestamp: document.getElementById('data-spesa').value,
        importo: parseFloat(importo) * -1, 
        motivo: document.getElementById('descrizione-spesa').value,
        categoria: document.getElementById('categoria-spesa').value
    };
    
    console.log("Dati Spesa da inviare (simulati):", payload);
    alert(`Spesa di €${importo} registrata con successo e pronta per sottrarre dal budget totale. (Dati salvati solo in console).`);
    document.getElementById('spesaForm').reset();
}