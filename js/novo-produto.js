const db = window.db;

let lojaId = null;

// =========================
// INICIAR PÁGINA
// =========================
document.addEventListener("DOMContentLoaded", async () => {

    await verificarUsuario();
    await carregarCategorias();

    const imagem = document.getElementById("imagem");

    if (imagem) {
        imagem.addEventListener("change", mostrarPreview);
    }

    const form = document.getElementById("form-produto");

    if (form) {
        form.addEventListener("submit", salvarProduto);
    }

});

// =========================
// VERIFICAR USUÁRIO
// =========================
async function verificarUsuario() {

    const { data, error } = await db.auth.getUser();

    if (error || !data.user) {

        window.location.href = "login.html";
        return;

    }

    const usuario = data.user;

    const { data: loja, error: erroLoja } = await db
        .from("lojas")
        .select("*")
        .eq("proprietario_id", usuario.id)
        .single();

    if (erroLoja || !loja) {

        console.log(erroLoja);

        alert("Você ainda não possui uma loja cadastrada.");

        window.location.href = "painel-loja.html";

        return;

    }

    lojaId = loja.id;

    const campoLoja = document.getElementById("nomeLoja");

    if (campoLoja) {
        campoLoja.value = loja.nome;
    }

}

// =========================
// CARREGAR CATEGORIAS
// =========================
async function carregarCategorias() {

    const select = document.getElementById("categoria");

    console.log("Select:", select);

    const { data, error } = await db
        .from("categorias_produtos")
        .select("*");

    console.log("Categorias:", data);
    console.log("Erro:", error);

    if (error) return;

    select.innerHTML = "";

    data.forEach(categoria => {

        select.innerHTML += `
            <option value="${categoria.id}">
                ${categoria.nome}
            </option>
        `;

    });

}
// =========================
// PREVIEW DA IMAGEM
// =========================
function mostrarPreview(event) {

    const arquivo = event.target.files[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = function (e) {

        const preview = document.getElementById("preview");

        if (preview) {
            preview.src = e.target.result;
        }

    };

    leitor.readAsDataURL(arquivo);

}

// =========================
// SALVAR PRODUTO
// =========================
async function salvarProduto(e) {

    e.preventDefault();

    try {

        const nome = document.getElementById("nome").value.trim();
        const descricao = document.getElementById("descricao").value.trim();
        const categoria = document.getElementById("categoria").value;
        const preco = Number(document.getElementById("preco").value);

        const precoPromocional = document.getElementById("preco-promocao")
            ? Number(document.getElementById("preco-promocao").value) || null
            : null;

        const estoque = Number(document.getElementById("estoque").value);

        const ativo = document.getElementById("ativo").value === "true";

        const destaque = document.getElementById("destaque")
            ? document.getElementById("destaque").checked
            : false;

        const arquivo = document.getElementById("imagem")?.files[0];

        let imagemUrl = "";

        // =========================
        // UPLOAD DA IMAGEM
        // =========================

        if (arquivo) {

            const extensao = arquivo.name.split(".").pop();

            const nomeArquivo = `${Date.now()}_${Math.random().toString(36).substring(2)}.${extensao}`;

            const { error: erroUpload } = await db.storage
                .from("produtos")
                .upload(nomeArquivo, arquivo);

            if (erroUpload) throw erroUpload;

            const { data } = db.storage
                .from("produtos")
                .getPublicUrl(nomeArquivo);

            imagemUrl = data.publicUrl;

        }

        // =========================
        // CADASTRAR PRODUTO
        // =========================

        const { error } = await db
            .from("produtos")
            .insert({

                loja_id: lojaId,

                categoria_id: categoria,

                nome: nome,

                descricao: descricao,

                preco: preco,

                preco_promocional: precoPromocional,

                estoque: estoque,

                imagem_url: imagemUrl,

                ativo: ativo,

                destaque: destaque

            });

        if (error) throw error;

        alert("Produto cadastrado com sucesso!");

        window.location.href = "produtos.html";

    }

    catch (erro) {

        console.error(erro);

        alert("Erro ao cadastrar:\n\n" + erro.message);

    }

}

// =========================
// LOGOUT
// =========================
async function fazerLogout() {

    await db.auth.signOut();

    window.location.href = "login.html";

}