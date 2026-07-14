const db = window.db;

let lojaId = null;

// =========================
// INICIAR PÁGINA
// =========================
document.addEventListener("DOMContentLoaded", async () => {

    await verificarUsuario();
    await carregarCategorias();

    const inputImagem = document.getElementById("imagem");

    if (inputImagem) {
        inputImagem.addEventListener("change", mostrarPreview);
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

        console.error(erroLoja);

        alert("Você ainda não possui uma loja cadastrada.");

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

    select.innerHTML = "<option value=''>Carregando...</option>";

    const { data, error } = await db
        .from("categorias_produtos")
        .select("*")
        .order("nome");

    if (error) {

        console.error(error);

        select.innerHTML =
            "<option value=''>Erro ao carregar categorias</option>";

        return;

    }

    select.innerHTML =
        "<option value=''>Selecione uma categoria</option>";

    data.forEach(categoria => {

        const option = document.createElement("option");

        option.value = categoria.id;
        option.textContent = categoria.nome;

        select.appendChild(option);

    });

}

// =========================
// PREVIEW DA IMAGEM
// =========================
function mostrarPreview(event) {

    const arquivo = event.target.files[0];

    if (!arquivo) return;

    const leitor = new FileReader();

    leitor.onload = function(e) {

        document.getElementById("preview").src = e.target.result;

    };

    leitor.readAsDataURL(arquivo);

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

        let imagemUrl = "";

        // =========================
        // Upload da imagem
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

        console.log("Salvando produto...");

        console.log({
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
        });

        const { data, error } = await db
            .from("produtos")
            .insert([{
                loja_id: lojaId,
                categoria_id: Number(categoria),
                nome: nome,
                descricao: descricao,
                preco: preco,
                preco_promocional: precoPromocional,
                estoque: estoque,
                imagem_url: imagemUrl,
                ativo: ativo,
                destaque: destaque
            }])
            .select();

        console.log("Resultado:", data);
        console.log("Erro:", error);

        if (error) throw error;

        alert("Produto cadastrado com sucesso!");

        window.location.href = "produtos.html";

    } catch (erro) {

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