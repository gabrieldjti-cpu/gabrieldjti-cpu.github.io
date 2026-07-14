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

    if (!window.db) {
        alert("Erro ao conectar com o Supabase.");
        return;
    }

    // Verifica usuário logado
    const { data, error } = await window.db.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    usuario = data.user;

    // Verifica se já possui loja
    const { data: lojaExistente } = await window.db
        .from("lojas")
        .select("id")
        .eq("proprietario_id", usuario.id)
        .maybeSingle();

    if (lojaExistente) {

        mensagem.style.color = "#198754";
        mensagem.innerHTML = `
            Você já possui uma loja cadastrada.<br><br>
            Redirecionando para o painel...
        `;

        setTimeout(() => {
            window.location.href = "painel-loja.html";
        }, 2000);

        return;
    }

    await carregarCategorias();

});

// =======================================
// CARREGAR CATEGORIAS
// =======================================

async function carregarCategorias() {

    const { data, error } = await window.db
        .from("categorias")
        .select("id,nome")
        .order("nome");

    if (error) {
        mensagem.textContent = error.message;
        return;
    }

    categoria.innerHTML =
        '<option value="">Selecione uma categoria</option>';

    data.forEach(cat => {

        categoria.innerHTML += `
            <option value="${cat.id}">
                ${cat.nome}
            </option>
        `;

    });

}

// =======================================
// CADASTRAR LOJA
// =======================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    mensagem.textContent = "";

    const botao = document.querySelector(".btn");

    botao.disabled = true;
    botao.innerHTML = "Salvando...";

    try {

        const nome = document.getElementById("nome").value.trim();
        const telefone = document.getElementById("telefone").value.trim();
        const whatsapp = document.getElementById("whatsapp").value.trim();
        const descricao = document.getElementById("descricao").value.trim();
        const endereco = document.getElementById("endereco").value.trim();
        const cidade = document.getElementById("cidade").value.trim();
        const abertura = document.getElementById("abertura").value;
        const fechamento = document.getElementById("fechamento").value;

        if (!nome) {
            throw new Error("Informe o nome da loja.");
        }

        if (!categoria.value) {
            throw new Error("Selecione uma categoria.");
        }

        const dadosLoja = {

            proprietario_id: usuario.id,

            categoria_id: Number(categoria.value),

            nome,

            descricao,

            telefone,

            whatsapp,

            endereco,

            cidade,

            horario_abertura: abertura,

            horario_fechamento: fechamento,

            ativa: true

        };

        console.log("Enviando:", dadosLoja);

        const { error } = await window.db
            .from("lojas")
            .insert([dadosLoja]);

        if (error) throw error;

        mensagem.style.color = "green";
        mensagem.innerHTML = "Loja cadastrada com sucesso!";

        setTimeout(() => {

            window.location.href = "painel-loja.html";

        }, 1500);

    } catch (erro) {

        console.error(erro);

        mensagem.style.color = "red";
        mensagem.textContent = erro.message;

    } finally {

        botao.disabled = false;

        botao.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Cadastrar Loja';

    }

});