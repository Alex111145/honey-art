function inviaProdotto(event) {
    event.preventDefault();
    
    const nome = document.getElementById('nome-prodotto').value.trim();
    // Descrizione rimossa: usiamo una stringa vuota o generica per compatibilità
    const descrizione = ""; 
    const prezzo = document.getElementById('prezzo-prodotto').value;
    const fileInput = document.getElementById('file-foto');
    const file = fileInput.files[0];

    if (!file) {
        alert("Attenzione: La foto del prodotto è obbligatoria!");
        return;
    }

    const reader = new FileReader();

    reader.onloadend = function() {
        const base64Img = reader.result;

        const storedProducts = localStorage.getItem('honeyArtProducts');
        let products = storedProducts ? JSON.parse(storedProducts) : [];
        
        const maxId = products.length > 0 ? Math.max(...products.map(p => p.id)) : 0;
        const newId = maxId + 1;

        const newProduct = {
            id: newId,
            name: nome,
            description: descrizione, // Salva vuoto
            price: parseFloat(prezzo),
            img: base64Img
        };
        
        products.push(newProduct);
        localStorage.setItem('honeyArtProducts', JSON.stringify(products));

        alert(`Prodotto "${nome}" aggiunto con successo!`);
        window.location.href = "index.html";
    }

    reader.readAsDataURL(file);
}

function inviaSpesa(event) {
    event.preventDefault();
    
    const data = document.getElementById('data-spesa').value;
    const importo = parseFloat(document.getElementById('importo-spesa').value);
    const motivo = document.getElementById('descrizione-spesa').value.trim();
    // Categoria rimossa: usiamo "Generale" come default
    const categoria = "Generale"; 

    const storedExpenses = localStorage.getItem('honeyArtExpenses');
    let expenses = storedExpenses ? JSON.parse(storedExpenses) : [];

    const newExpense = {
        id: Date.now(),
        date: data,
        amount: -Math.abs(importo),
        description: motivo,
        category: categoria
    };
    
    expenses.push(newExpense);
    localStorage.setItem('honeyArtExpenses', JSON.stringify(expenses));

    alert(`Spesa di €${importo.toFixed(2)} registrata correttamente.`);
    document.getElementById('spesaForm').reset();
}