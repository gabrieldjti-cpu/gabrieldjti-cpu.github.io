// =======================================
// SUPABASE
// =======================================

// Verifica se a biblioteca do Supabase carregou
if (!window.supabase) {

    console.error(
        "Erro: biblioteca do Supabase não foi carregada."
    );

} else {

    // Evita criar o cliente mais de uma vez
    if (!window.db) {

        window.db = window.supabase.createClient(
            "https://ikrsxmjrdnhyecjchjju.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrcnN4bWpyZG5oeWVjamNoamp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxMDE5MjAsImV4cCI6MjA5MzY3NzkyMH0.7Pm_MR0nPwVhed0xV5ndvZX91EX-NS7DWZq5-5vF1Hg"
        );

    }

    console.log("Supabase conectado!");
    console.log(window.db);

}