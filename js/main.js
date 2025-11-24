// js/main.js

// Recupera le chiavi
const SUPABASE_URL = window.env ? window.env.SUPABASE_URL : '';
const SUPABASE_KEY = window.env ? window.env.SUPABASE_KEY : '';

window.supabaseClient = null;

// Funzione che prova a connettersi finché non ci riesce o da errore
async function initSupabase() {
    if (window.supabaseClient) return window.supabaseClient;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error("❌ ERRORE CRITICO: Chiavi mancanti in js/env.js");
        return null;
    }

    // Controlla se la libreria è caricata
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.warn("⏳ Libreria Supabase non ancora caricata, attendo...");
        return null; 
    }

    try {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log("✅ Database connesso con successo!");
        return window.supabaseClient;
    } catch (e) {
        console.error("❌ Errore durante l'inizializzazione del client:", e);
        return null;
    }
}

// Tenta l'inizializzazione subito
initSupabase();

// Funzione Menu (interfaccia)
function toggleMenu() {
    const nav = document.querySelector('.nav-links');
    if(nav) nav.classList.toggle('active');
}