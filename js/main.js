// js/main.js

// Recupera le chiavi da env.js
const SUPABASE_URL = window.env ? window.env.SUPABASE_URL : '';
const SUPABASE_KEY = window.env ? window.env.SUPABASE_KEY : '';

// Variabile Globale per il Database
window.supabaseClient = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("ERRORE: Chiavi mancanti in env.js");
} else {
    // Verifica se la libreria è caricata
    if (window.supabase && window.supabase.createClient) {
        try {
            // Inizializza il client usando la libreria globale 'supabase'
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("✅ Database connesso!");
        } catch (e) {
            console.error("Errore inizializzazione:", e);
        }
    } else {
        console.error("❌ Errore: Libreria Supabase non trovata. Controlla l'HTML.");
    }
}

// Funzione Menu
function toggleMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}