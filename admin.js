// Função para verificar se é Admin
async function verificarAcessoAdmin() {
    const { data: { user } } = await _supabase.auth.getUser();

    // Verifica se o usuário existe e se tem a tag 'admin' no metadata
    if (!user || user.user_metadata.role !== 'admin') {
        alert("Acesso negado! Área restrita a administradores.");
        window.location.href = "index.html";
    } else {
        console.log("Bem-vindo, mestre!");
        // Aqui você chama as funções para carregar os pedidos dos clientes
    }
}