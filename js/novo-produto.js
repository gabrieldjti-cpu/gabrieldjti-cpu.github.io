const db = window.db;

let lojaId = null;

// =========================
// INICIAR PÁGINA
// =========================
document.addEventListener("DOMContentLoaded", async () => {

    await verificarUsuario();
    await carregarCategorias();

    const campoImagem = document.getElementById("imagem_url");

if (campoImagem) {
    campoImagem.addEventListener("input", mostrarPreview);
}

const form = document.getElementById("formProduto");

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
function mostrarPreview() {

    const preview = document.getElementById("preview");

    const url = document.getElementById("imagem_url").value.trim();

    if (!preview) return;

    if (url !== "") {
        preview.src = url;
    } else {
        preview.src = "img/sem-imagem.png";
    }

}

// =========================
// SALVAR PRODUTO
// =========================
async function salvarProduto(e) {

    e.preventDefault();

    try {

        if (!lojaId) {
            alert("Loja não encontrada.");
            return;
        }

        const nome = document.getElementById("nome").value.trim();
        const descricao = document.getElementById("descricao").value.trim();
        const categoria = document.getElementById("categoria").value;
        const preco = parseFloat(document.getElementById("preco").value);
        const estoque = parseInt(document.getElementById("estoque").value) || 0;

        const precoPromocionalCampo = document.getElementById("preco-promocao");
        const precoPromocional = precoPromocionalCampo
            ? parseFloat(precoPromocionalCampo.value) || null
            : null;

        const ativoCampo = document.getElementById("ativo");
        const ativo = ativoCampo
            ? ativoCampo.value === "true"
            : true;

        const destaqueCampo = document.getElementById("destaque");
        const destaque = destaqueCampo
            ? destaqueCampo.checked
            : false;

        if (!nome) {
            alert("Informe o nome do produto.");
            return;
        }

        if (!categoria) {
            alert("Selecione uma categoria.");
            return;
        }

        if (isNaN(preco)) {
            alert("Informe um preço válido.");
            return;
        }

        let imagemUrl = "";

        // =========================
        // Upload da imagem
        // =========================

        const inputImagem = document.getElementById("imagem");

        if (inputImagem && inputImagem.files.length > 0) {

            const arquivo = inputImagem.files[0];

            const extensao = arquivo.name.split(".").pop();

            const nomeArquivo =
                `${Date.now()}_${Math.random().toString(36).substring(2)}.${extensao}`;

            const { error: erroUpload } = await db.storage
                .from("produtos")
                .upload(nomeArquivo, arquivo);

            if (erroUpload) throw erroUpload;

            const { data } = db.storage
                .from("produtos")
                .getPublicUrl(nomeArquivo);

            imagemUrl = data.publicUrl;
        }

        console.log({
            loja_id: lojaId,
            categoria_id: categoria,
            nome,
            descricao,
            preco,
            preco_promocional: precoPromocional,
            estoque,
            imagem_url: imagemUrl,
            ativo,
            destaque
        });

        // =========================
        // Salvar no banco
        // =========================

        const { error } = await db
            .from("produtos")
            .insert([{
                loja_id: lojaId,
                categoria_id: Number(categoria),
                nome,
                descricao,
                preco,
                preco_promocional: precoPromocional,
                estoque,
                imagem_url: imagemUrl,
                ativo,
                destaque
            }]);

        if (error) throw error;

        alert("Produto cadastrado com sucesso!");

        window.location.href = "produtos.html";

    } catch (erro) {

        console.error("Erro:", erro);

        alert("Erro ao cadastrar o produto:\n\n" + erro.message);

    }

}

// =========================
// LOGOUT
// =========================
async function fazerLogout() {

    await db.auth.signOut();

    window.location.href = "login.html";

}