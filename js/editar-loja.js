// =======================================
// EDITAR LOJA
// =======================================

const db = window.db;

let usuario = null;
let loja = null;
let novaLogo = null;


// =======================================
// ELEMENTOS
// =======================================

const form = document.getElementById("formEditarLoja");
const mensagem = document.getElementById("mensagem");

const inputLogo = document.getElementById("logo");
const previewLogo = document.getElementById("preview-logo");

const categoria = document.getElementById("categoria");
const btnSalvar = document.getElementById("btnSalvar");


// =======================================
// INICIAR
// =======================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Editar loja iniciado.");

    if (!db) {

        console.error("Supabase não encontrado.");

        mostrarMensagem(
            "Erro ao conectar com o Supabase.",
            "erro"
        );

        return;
    }


    // ===================================
    // VERIFICAR USUÁRIO
    // ===================================

    const {
        data,
        error
    } = await db.auth.getUser();


    console.log("Usuário:", data?.user);


    if (error) {

        console.error(
            "Erro ao verificar usuário:",
            error
        );

        window.location.href = "login.html";

        return;
    }


    if (!data.user) {

        window.location.href = "login.html";

        return;
    }


    usuario = data.user;


    // ===================================
    // PEGAR ID DA LOJA DA URL
    // ===================================

    const params =
        new URLSearchParams(
            window.location.search
        );

    const lojaId =
        params.get("id");


    console.log(
        "ID da loja na URL:",
        lojaId
    );


    // ===================================
    // CARREGAR LOJA
    // ===================================

    await carregarLoja(lojaId);


    if (!loja) {

        return;
    }


    // ===================================
    // CARREGAR CATEGORIAS
    // ===================================

    await carregarCategorias();


    // ===================================
    // SELECIONAR CATEGORIA DA LOJA
    // ===================================

    if (loja.categoria_id) {

        categoria.value =
            String(loja.categoria_id);

    }


    // ===================================
    // LOGO
    // ===================================

    inputLogo?.addEventListener(
        "change",
        visualizarNovaLogo
    );


    // ===================================
    // FORMULÁRIO
    // ===================================

    form?.addEventListener(
        "submit",
        salvarAlteracoes
    );

});


// =======================================
// CARREGAR LOJA
// =======================================

async function carregarLoja(lojaId) {

    console.log(
        "Carregando loja..."
    );


    let consulta;


    // ===================================
    // SE VEIO ID PELA URL
    // ===================================

    if (lojaId) {

        consulta = await db
            .from("lojas")
            .select("*")
            .eq("id", lojaId)
            .eq(
                "proprietario_id",
                usuario.id
            )
            .maybeSingle();

    } else {

        // ===================================
        // CASO NÃO TENHA ID
        // ===================================

        consulta = await db
            .from("lojas")
            .select("*")
            .eq(
                "proprietario_id",
                usuario.id
            )
            .maybeSingle();

    }


    const {
        data,
        error
    } = consulta;


    console.log(
        "Loja encontrada:",
        data
    );


    if (error) {

        console.error(
            "Erro ao carregar loja:",
            error
        );

        mostrarMensagem(
            "Erro ao carregar os dados da loja: " +
            error.message,
            "erro"
        );

        return;
    }


    if (!data) {

        console.error(
            "Nenhuma loja encontrada."
        );

        mostrarMensagem(
            "Nenhuma loja encontrada para este usuário.",
            "erro"
        );

        return;
    }


    loja = data;


    preencherFormulario(loja);

}


// =======================================
// PREENCHER FORMULÁRIO
// =======================================

function preencherFormulario(dados) {

    console.log(
        "Preenchendo formulário:",
        dados
    );


    // ===================================
    // NOME
    // ===================================

    const nome =
        document.getElementById("nome");

    if (nome) {

        nome.value =
            dados.nome || "";

    }


    // ===================================
    // TELEFONE
    // ===================================

    const telefone =
        document.getElementById("telefone");

    if (telefone) {

        telefone.value =
            dados.telefone || "";

    }


    // ===================================
    // WHATSAPP
    // ===================================

    const whatsapp =
        document.getElementById("whatsapp");

    if (whatsapp) {

        whatsapp.value =
            dados.whatsapp || "";

    }


    // ===================================
    // DESCRIÇÃO
    // ===================================

    const descricao =
        document.getElementById("descricao");

    if (descricao) {

        descricao.value =
            dados.descricao || "";

    }


    // ===================================
    // ENDEREÇO
    // ===================================

    const endereco =
        document.getElementById("endereco");

    if (endereco) {

        endereco.value =
            dados.endereco || "";

    }


    // ===================================
    // CIDADE
    // ===================================

    const cidade =
        document.getElementById("cidade");

    if (cidade) {

        cidade.value =
            dados.cidade || "";

    }


    // ===================================
    // ABERTURA
    // ===================================

    const abertura =
        document.getElementById("abertura");

    if (abertura) {

        abertura.value =
            dados.horario_abertura || "";

    }


    // ===================================
    // FECHAMENTO
    // ===================================

    const fechamento =
        document.getElementById("fechamento");

    if (fechamento) {

        fechamento.value =
            dados.horario_fechamento || "";

    }


    // ===================================
    // STATUS
    // ===================================

    const ativa =
        document.getElementById("ativa");

    if (ativa) {

        ativa.value =
            dados.ativa === false
                ? "false"
                : "true";

    }


    // ===================================
    // LOGO
    // ===================================

    if (previewLogo) {

        previewLogo.src =
            dados.logo_url ||
            "img/loja.png";

    }

}


// =======================================
// CARREGAR CATEGORIAS
// =======================================

async function carregarCategorias() {

    console.log(
        "Carregando categorias..."
    );


    categoria.innerHTML = `
        <option value="">
            Carregando categorias...
        </option>
    `;


    const {
        data,
        error
    } = await db
        .from("categorias")
        .select("id,nome")
        .order("nome");


    console.log(
        "Categorias:",
        data
    );


    if (error) {

        console.error(
            "Erro ao carregar categorias:",
            error
        );

        categoria.innerHTML = `
            <option value="">
                Erro ao carregar categorias
            </option>
        `;

        mostrarMensagem(
            "Erro ao carregar categorias: " +
            error.message,
            "erro"
        );

        return;
    }


    if (!data || data.length === 0) {

        categoria.innerHTML = `
            <option value="">
                Nenhuma categoria cadastrada
            </option>
        `;

        return;
    }


    categoria.innerHTML = `
        <option value="">
            Selecione uma categoria
        </option>
    `;


    data.forEach(cat => {

        categoria.innerHTML += `
            <option value="${cat.id}">
                ${cat.nome}
            </option>
        `;

    });

}


// =======================================
// PREVISUALIZAR LOGO
// =======================================

function visualizarNovaLogo(event) {

    const arquivo =
        event.target.files[0];


    if (!arquivo) {

        novaLogo = null;

        return;
    }


    const tiposPermitidos = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];


    if (
        !tiposPermitidos.includes(
            arquivo.type
        )
    ) {

        mostrarMensagem(
            "Use uma imagem JPG, PNG ou WEBP.",
            "erro"
        );

        inputLogo.value = "";

        novaLogo = null;

        return;
    }


    if (
        arquivo.size >
        5 * 1024 * 1024
    ) {

        mostrarMensagem(
            "A imagem deve ter no máximo 5 MB.",
            "erro"
        );

        inputLogo.value = "";

        novaLogo = null;

        return;
    }


    novaLogo = arquivo;


    const url =
        URL.createObjectURL(
            arquivo
        );


    previewLogo.src = url;


    mostrarMensagem(
        "Nova logo selecionada.",
        "sucesso"
    );

}


// =======================================
// ENVIAR LOGO
// =======================================

async function enviarLogo() {

    if (!novaLogo) {

        return loja.logo_url || null;

    }


    const extensao =
        novaLogo.name
            .split(".")
            .pop()
            .toLowerCase();


    const nomeArquivo =
        `${Date.now()}.${extensao}`;


    const caminho =
        `lojas/${usuario.id}/${nomeArquivo}`;


    console.log(
        "Upload:",
        caminho
    );


    const {
        error
    } = await db.storage
        .from("logos-lojas")
        .upload(
            caminho,
            novaLogo,
            {
                cacheControl: "3600",
                upsert: false
            }
        );


    if (error) {

        console.error(
            "Erro no upload:",
            error
        );

        throw new Error(
            "Erro ao enviar a logo: " +
            error.message
        );

    }


    const {
        data
    } = db.storage
        .from("logos-lojas")
        .getPublicUrl(caminho);


    return data.publicUrl;

}


// =======================================
// SALVAR
// =======================================

async function salvarAlteracoes(event) {

    event.preventDefault();


    if (!loja) {

        mostrarMensagem(
            "Loja não encontrada.",
            "erro"
        );

        return;
    }


    btnSalvar.disabled = true;


    btnSalvar.innerHTML = `
        <i class="fa-solid fa-spinner fa-spin"></i>
        Salvando...
    `;


    try {

        const nome =
            document
                .getElementById("nome")
                .value
                .trim();


        const categoriaId =
            categoria.value;


        const telefone =
            document
                .getElementById("telefone")
                .value
                .trim();


        const whatsapp =
            document
                .getElementById("whatsapp")
                .value
                .trim();


        const descricao =
            document
                .getElementById("descricao")
                .value
                .trim();


        const endereco =
            document
                .getElementById("endereco")
                .value
                .trim();


        const cidade =
            document
                .getElementById("cidade")
                .value
                .trim();


        const abertura =
            document
                .getElementById("abertura")
                .value;


        const fechamento =
            document
                .getElementById("fechamento")
                .value;


        const ativa =
            document
                .getElementById("ativa")
                .value === "true";


        // ===================================
        // VALIDAÇÃO
        // ===================================

        if (!nome) {

            throw new Error(
                "Informe o nome da loja."
            );

        }


        if (!categoriaId) {

            throw new Error(
                "Selecione uma categoria."
            );

        }


        // ===================================
        // LOGO
        // ===================================

        let logoUrl =
            loja.logo_url || null;


        if (novaLogo) {

            logoUrl =
                await enviarLogo();

        }


        // ===================================
        // DADOS
        // ===================================

        const dadosAtualizados = {

            nome,

            categoria_id:
                Number(categoriaId),

            telefone,

            whatsapp,

            descricao,

            endereco,

            cidade,

            horario_abertura:
                abertura || null,

            horario_fechamento:
                fechamento || null,

            ativa,

            logo_url:
                logoUrl

        };


        console.log(
            "Dados para atualizar:",
            dadosAtualizados
        );


        // ===================================
        // UPDATE
        // ===================================

        const {
            error
        } = await db
            .from("lojas")
            .update(dadosAtualizados)
            .eq("id", loja.id)
            .eq(
                "proprietario_id",
                usuario.id
            );


        if (error) {

            console.error(
                "Erro no UPDATE:",
                error
            );

            throw new Error(
                "Erro ao atualizar loja: " +
                error.message
            );

        }


        // ===================================
        // SUCESSO
        // ===================================

        mostrarMensagem(
            "Loja atualizada com sucesso!",
            "sucesso"
        );


        setTimeout(() => {

            window.location.href =
                "painel-loja.html";

        }, 1500);


    } catch (erro) {

        console.error(
            "Erro ao salvar:",
            erro
        );


        mostrarMensagem(
            erro.message ||
            "Erro ao salvar alterações.",
            "erro"
        );


    } finally {

        btnSalvar.disabled = false;


        btnSalvar.innerHTML = `
            <i class="fa-solid fa-floppy-disk"></i>
            Salvar Alterações
        `;

    }

}


// =======================================
// MENSAGEM
// =======================================

function mostrarMensagem(texto, tipo) {

    if (!mensagem) return;


    mensagem.textContent =
        texto;


    mensagem.style.color =
        tipo === "sucesso"
            ? "#198754"
            : "#dc3545";

}