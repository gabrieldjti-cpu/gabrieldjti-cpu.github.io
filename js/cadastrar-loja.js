// =======================================
// ELEMENTOS
// =======================================

const form = document.getElementById("formLoja");
const mensagem = document.getElementById("mensagem");
const categoria = document.getElementById("categoria");

let usuario = null;

// =======================================
// INICIAR
// =======================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Página carregar-loja iniciada.");

    if (!window.db) {

        alert("Erro: Supabase não foi inicializado.");
        console.error("window.db não encontrado.");
        return;

    }

    console.log("Supabase conectado:", window.db);

    // Verifica usuário

    const { data, error } = await window.db.auth.getUser();

    console.log("Usuário:", data);
    console.log("Erro usuário:", error);

    if (error || !data.user) {

        alert("Usuário não está logado.");

        window.location.href = "login.html";

        return;

    }

    usuario = data.user;

    console.log("ID do usuário:", usuario.id);

    carregarCategorias();

});

// =======================================
// CARREGAR CATEGORIAS
// =======================================

async function carregarCategorias() {

    console.log("Buscando categorias...");

    const { data: sessao } = await window.db.auth.getSession();
    console.log("Sessão:", sessao);

    const { data, error, status } = await window.db
        .from("categorias")
        .select("id, nome");

    console.log("Status:", status);
    console.log("Categorias:", data);
    console.log("Erro:", error);

    if (error) {
        mensagem.textContent = error.message;
        return;
    }

    categoria.innerHTML = '<option value="">Selecione uma categoria</option>';

    data.forEach(cat => {
        categoria.innerHTML += `<option value="${cat.id}">${cat.nome}</option>`;
    });

}

// =======================================
// CADASTRAR LOJA
// =======================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    mensagem.textContent = "";
    mensagem.style.color = "red";

    const botao = document.querySelector(".btn");

    botao.disabled = true;

    botao.innerHTML = "Salvando...";

    try {

        console.log("Cadastrando loja...");

        const dadosLoja = {

            proprietario_id: usuario.id,

            nome: document.getElementById("nome").value.trim(),

            categoria_id: Number(categoria.value),

            telefone: document.getElementById("telefone").value.trim(),

            whatsapp: document.getElementById("whatsapp").value.trim(),

            descricao: document.getElementById("descricao").value.trim(),

            endereco: document.getElementById("endereco").value.trim(),

            cidade: document.getElementById("cidade").value.trim(),

            horario_abertura: document.getElementById("abertura").value,

            horario_fechamento: document.getElementById("fechamento").value

        };

        console.log("Dados enviados:", dadosLoja);

        const { data, error } = await window.db
            .from("lojas")
            .insert(dadosLoja)
            .select();

        console.log("Resposta:", data);
        console.log("Erro:", error);

        if (error) throw error;

        mensagem.style.color = "green";
        mensagem.textContent = "Loja cadastrada com sucesso!";

        setTimeout(() => {

            window.location.href = "perfil.html";

        }, 2000);

    } catch (erro) {

        console.error("Erro ao cadastrar:", erro);

        mensagem.style.color = "red";
        mensagem.textContent = erro.message;

    } finally {

        botao.disabled = false;

        botao.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Cadastrar Loja';

    }

});