const db = window.db;

let lojaId = null;
let produtoId = null;
let imagemAtual = "";

// =========================
// INICIAR PÁGINA
// =========================

document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);

    produtoId = params.get("id");

    if (!produtoId) {

        alert("Produto não informado.");

        window.location.href = "produtos.html";

        return;

    }

    await verificarUsuario();

    await carregarCategorias();

    await carregarProduto();

    const inputImagem = document.getElementById("imagem");

    if (inputImagem) {

        inputImagem.addEventListener("change", mostrarPreview);

    }

    const form = document.getElementById("form-produto");

    if (form) {

        form.addEventListener("submit", atualizarProduto);

    }

});

// =========================
// VERIFICAR USUÁRIO
// =========================

async function verificarUsuario() {

    const { data: auth, error } = await db.auth.getUser();

    if (error || !auth.user) {

        window.location.href = "login.html";

        return;

    }

    const usuario = auth.user;

    const { data: loja, error: erroLoja } = await db
        .from("lojas")
        .select("*")
        .eq("proprietario_id", usuario.id)
        .single();

    if (erroLoja || !loja) {

        alert("Loja não encontrada.");

        window.location.href = "painel-loja.html";

        return;

    }

    lojaId = loja.id;

    document.getElementById("nomeLoja").value = loja.nome;

}

// =========================
// CARREGAR CATEGORIAS
// =========================

async function carregarCategorias() {

    const select = document.getElementById("categoria");

    select.innerHTML = "<option>Carregando...</option>";

    const { data, error } = await db
        .from("categorias_produtos")
        .select("*")
        .order("nome");

    if (error) {

        console.error(error);

        return;

    }

    select.innerHTML =
        "<option value=''>Selecione uma categoria</option>";

    data.forEach(cat => {

        select.innerHTML +=
            `<option value="${cat.id}">
                ${cat.nome}
            </option>`;

    });

}

// =========================
// CARREGAR PRODUTO
// =========================

async function carregarProduto() {

    const { data: produto, error } = await db
        .from("produtos")
        .select("*")
        .eq("id", produtoId)
        .single();

    if (error || !produto) {

        alert("Produto não encontrado.");

        window.location.href = "produtos.html";

        return;

    }

    if (produto.loja_id !== lojaId) {

        alert("Você não pode editar este produto.");

        window.location.href = "produtos.html";

        return;

    }

    imagemAtual = produto.imagem_url || "";

    document.getElementById("nome").value =
        produto.nome;

    document.getElementById("descricao").value =
        produto.descricao || "";

    document.getElementById("categoria").value =
        produto.categoria_id;

    document.getElementById("preco").value =
        produto.preco;

    document.getElementById("preco-promocao").value =
        produto.preco_promocional || "";

    document.getElementById("estoque").value =
        produto.estoque;

    document.getElementById("ativo").checked =
        produto.ativo;

    document.getElementById("destaque").checked =
        produto.destaque;

    if (produto.imagem_url) {

        document.getElementById("preview").src =
            produto.imagem_url;

    }

}

// =========================
// PREVIEW
// =========================

function mostrarPreview(event) {

    const arquivo = event.target.files[0];

    if (!arquivo) return;

    const reader = new FileReader();

    reader.onload = function(e) {

        document.getElementById("preview").src =
            e.target.result;

    };

    reader.readAsDataURL(arquivo);

}
// =========================
// ATUALIZAR PRODUTO
// =========================

async function atualizarProduto(e) {

    e.preventDefault();

    try {

        const nome = document.getElementById("nome").value.trim();
        const descricao = document.getElementById("descricao").value.trim();
        const categoria = document.getElementById("categoria").value;
        const preco = parseFloat(document.getElementById("preco").value);
        const estoque = parseInt(document.getElementById("estoque").value) || 0;

        const precoPromocional =
            document.getElementById("preco-promocao").value
                ? parseFloat(document.getElementById("preco-promocao").value)
                : null;

        const ativo = document.getElementById("ativo").checked;
        const destaque = document.getElementById("destaque").checked;

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

        let imagemUrl = imagemAtual;

        // =========================
        // NOVA IMAGEM
        // =========================

        const inputImagem = document.getElementById("imagem");

        if (inputImagem.files.length > 0) {

            const arquivo = inputImagem.files[0];

            const nomeArquivo =
                `${Date.now()}_${arquivo.name.replace(/\s/g, "_")}`;

            const { error: erroUpload } = await db.storage
                .from("produtos")
                .upload(nomeArquivo, arquivo, {
                    upsert: true
                });

            if (erroUpload) throw erroUpload;

            const { data } = db.storage
                .from("produtos")
                .getPublicUrl(nomeArquivo);

            imagemUrl = data.publicUrl;

        }

        const { error } = await db
            .from("produtos")
            .update({

                categoria_id: Number(categoria),

                nome: nome,

                descricao: descricao,

                preco: preco,

                preco_promocional: precoPromocional,

                estoque: estoque,

                imagem_url: imagemUrl,

                ativo: ativo,

                destaque: destaque

            })
            .eq("id", produtoId);

        if (error) throw error;

        alert("Produto atualizado com sucesso!");

        window.location.href = "produtos.html";

    } catch (erro) {

        console.error(erro);

        alert("Erro ao atualizar o produto:\n\n" + erro.message);

    }

}

// =========================
// LOGOUT
// =========================

async function fazerLogout() {

    await db.auth.signOut();

    window.location.href = "login.html";

}