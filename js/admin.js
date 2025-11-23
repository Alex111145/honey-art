function inviaProdotto(event) {
    event.preventDefault();
    
    // Recupera i valori dal form
    const nome = document.getElementById('nome-prodotto').value.trim();
    const descrizione = document.getElementById('descrizione-prodotto').value.trim();
    const prezzo = document.getElementById('prezzo-prodotto').value;
    const fileInput = document.getElementById('file-foto');
    const file = fileInput.files[0]; // Prende il file caricato

    if (!file) {
        alert("Attenzione: La foto del prodotto è obbligatoria!");
        return;
    }

    // Lettore per convertire l'immagine in un formato salvabile (Base64)
    const reader = new FileReader();

    reader.onloadend = function() {
        const base64Img = reader.result; // Questa è l'immagine convertita in stringa

        // Recupera prodotti esistenti o inizializza array vuoto
        const storedProducts = localStorage.getItem('honeyArtProducts');
        let products = storedProducts ? JSON.parse(storedProducts) : [];
        
        // Crea nuovo ID
        const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
        const newId = maxId + 1;

        const newProduct = {
            id: newId,
            name: nome,
            description: descrizione,
            price: parseFloat(prezzo),
            img: base64Img // Salviamo l'immagine caricata
        };
        
        products.push(newProduct);
        localStorage.setItem('honeyArtProducts', JSON.stringify(products));

        alert(`Prodotto "${nome}" aggiunto con successo!`);
        window.location.href = "index.html"; // Torna al catalogo
    }

    // Avvia la lettura del file
    reader.readAsDataURL(file);
}

function inviaSpesa(event) {
    event.preventDefault();
    
    const data = document.getElementById('data-spesa').value;
    const importo = parseFloat(document.getElementById('importo-spesa').value);
    const motivo = document.getElementById('descrizione-spesa').value.trim();
    const categoria = document.getElementById('categoria-spesa').value;

    // Recupera spese esistenti o crea nuova lista
    const storedExpenses = localStorage.getItem('honeyArtExpenses');
    let expenses = storedExpenses ? JSON.parse(storedExpenses) : [];

    const newExpense = {
        id: Date.now(), // ID univoco basato sull'orario
        date: data,
        amount: -Math.abs(importo), // Assicura che sia un valore negativo
        description: motivo,
        category: categoria
    };
    
    expenses.push(newExpense);
    localStorage.setItem('honeyArtExpenses', JSON.stringify(expenses));

    console.log("Spesa salvata:", newExpense);
    alert(`Spesa di €${importo.toFixed(2)} registrata correttamente.`);
    
    document.getElementById('spesaForm').reset();
}