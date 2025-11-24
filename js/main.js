// js/main.js

const SUPABASE_URL = window.env ? window.env.SUPABASE_URL : '';
const SUPABASE_KEY = window.env ? window.env.SUPABASE_KEY : '';

window.supabaseClient = null;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ ERRORE: Chiavi mancanti in js/env.js");
} else {
    if (window.supabase && window.supabase.createClient) {
        try {
            window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log("✅ Database connesso!");
        } catch (e) {
            console.error("❌ Errore connessione:", e);
        }
    } else {
        console.error("❌ Libreria Supabase non trovata.");
    }
}

function toggleMenu() {
    const nav = document.querySelector('.nav-links');
    if(nav) nav.classList.toggle('active');
}