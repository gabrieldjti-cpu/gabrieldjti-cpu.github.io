// =======================================
// CADASTRAR LOJA
// =======================================

// =======================================
// ELEMENTOS
// =======================================

const form = document.getElementById("formLoja");
const mensagem = document.getElementById("mensagem");
const categoria = document.getElementById("categoria");

const inputLogo = document.getElementById("logo");
const previewLogo = document.getElementById("preview-logo");

let usuario = null;


// =======================================
// INICIAR
// =======================================

document.addEventListener("DOMContentLoaded", async () => {

    if (!window.db) {

        alert("Erro ao conectar com o Supabase.");

        return;

    }


    // ===============================
    // VERIFICAR USUÁRIO
    // ===============================

    const {
        data,
        error
    } = await window.db.auth.getUser();


    if (error || !data.user) {

        window.location.href = "login.html";

        return;

    }


    usuario = data.user;


    // ===============================
    // VERIFICAR SE JÁ POSSUI LOJA
    // ===============================

    const {
        data: lojaExistente,
        error: erroLoja
    } = await window.db

        .from("lojas")

        .select("id")

        .eq("proprietario_id", usuario.id)

        .maybeSingle();


    if (erroLoja) {

        console.error(erroLoja);

    }


    if (lojaExistente) {

        mensagem.style.color = "#198754";

        mensagem.innerHTML = `
        
            Você já possui uma loja cadastrada.
            
            <br><br>

            Redirecionando para o painel...

        `;


        setTimeout(() => {

            window.location.href = "painel-loja.html";

        }, 2000);


        return;

    }


    // ===============================
    // CARREGAR CATEGORIAS
    // ===============================

    await carregarCategorias();


    // ===============================
    // CONFIGURAR PREVIEW DA LOGO
    // ===============================

    configurarPreviewLogo();

});


// =======================================
// CARREGAR CATEGORIAS
// =======================================

async function carregarCategorias() {

    categoria.innerHTML = `

        <option value="">
            Carregando categorias...
        </option>

    `;


    const {
        data,
        error
    } = await window.db

        .from("categorias")

        .select("id,nome")

        .order("nome");


    if (error) {

        console.error(error);

        mensagem.style.color = "red";

        mensagem.textContent =
            "Erro ao carregar categorias: " +
            error.message;

        return;

    }


    categoria.innerHTML = `

        <option value="">
            Selecione uma categoria
        </option>

    `;


    data.forEach(cat => {

        const option =
            document.createElement("option");

        option.value = cat.id;

        option.textContent = cat.nome;

        categoria.appendChild(option);

    });

}


// =======================================
// PREVIEW DA LOGO
// =======================================

function configurarPreviewLogo() {

    if (!inputLogo) return;

    inputLogo.addEventListener("change", () => {

        const arquivo =
            inputLogo.files[0];


        if (!arquivo) {

            return;

        }


        // ===============================
        // VERIFICAR TIPO
        // ===============================

        const tiposPermitidos = [

            "image/jpeg",
            "image/png",
            "image/webp"

        ];


        if (!tiposPermitidos.includes(arquivo.type)) {

            alert(
                "Formato de imagem inválido.\n\n" +
                "Escolha JPG, PNG ou WEBP."
            );

            inputLogo.value = "";

            return;

        }


        // ===============================
        // LIMITE DE TAMANHO
        // ===============================

        const tamanhoMaximo =
            5 * 1024 * 1024;


        if (arquivo.size > tamanhoMaximo) {

            alert(
                "A imagem é muito grande.\n\n" +
                "O tamanho máximo é 5 MB."
            );

            inputLogo.value = "";

            return;

        }


        // ===============================
        // MOSTRAR PREVIEW
        // ===============================

        const leitor =
            new FileReader();


        leitor.onload = function(event) {

            if (previewLogo) {

                previewLogo.src =
                    event.target.result;

            }

        };


        leitor.readAsDataURL(arquivo);

    });

}


// =======================================
// UPLOAD DA LOGO
// =======================================

async function enviarLogo() {

    if (!inputLogo || !inputLogo.files.length) {

        return null;

    }


    const arquivo =
        inputLogo.files[0];


    // ===============================
    // GERAR NOME ÚNICO
    // ===============================

    const extensao =
        arquivo.name
            .split(".")
            .pop()
            .toLowerCase();


    const nomeArquivo =

        `${usuario.id}_${Date.now()}.${extensao}`;


    // ===============================
    // CAMINHO
    // ===============================

    const caminho =

        `lojas/${usuario.id}/${nomeArquivo}`;


    console.log(
        "Enviando logo:",
        caminho
    );


    // ===============================
    // UPLOAD
    // ===============================

    const {
        data,
        error
    } = await window.db.storage

        .from("logos-lojas")

        .upload(
            caminho,
            arquivo,
            {
                cacheControl: "3600",
                upsert: true
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


    console.log(
        "Upload realizado:",
        data
    );


    // ===============================
    // PEGAR URL PÚBLICA
    // ===============================

    const {
        data: urlData
    } = window.db.storage

        .from("logos-lojas")

        .getPublicUrl(caminho);


    if (!urlData || !urlData.publicUrl) {

        throw new Error(
            "Não foi possível obter a URL da logo."
        );

    }


    console.log(
        "URL da logo:",
        urlData.publicUrl
    );


    return urlData.publicUrl;

}


// =======================================
// CADASTRAR LOJA
// =======================================

form.addEventListener("submit", async (e) => {

    e.preventDefault();


    mensagem.textContent = "";


    const botao =
        document.querySelector(".btn");


    botao.disabled = true;


    botao.innerHTML = `

        <i class="fa-solid fa-spinner fa-spin"></i>

        Salvando...

    `;


    try {


        // ===============================
        // PEGAR DADOS
        // ===============================

        const nome =
            document
                .getElementById("nome")
                .value
                .trim();


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


        // ===============================
        // VALIDAÇÕES
        // ===============================

        if (!nome) {

            throw new Error(
                "Informe o nome da loja."
            );

        }


        if (!categoria.value) {

            throw new Error(
                "Selecione uma categoria."
            );

        }


        // ===============================
        // UPLOAD DA LOGO
        // ===============================

        mensagem.style.color = "#666";

        mensagem.textContent =
            "Enviando logo da loja...";


        const logoUrl =
            await enviarLogo();


        // ===============================
        // DADOS DA LOJA
        // ===============================

        const dadosLoja = {

            proprietario_id:
                usuario.id,

            categoria_id:
                Number(categoria.value),

            nome:

                nome,

            descricao:

                descricao,

            telefone:

                telefone,

            whatsapp:

                whatsapp,

            endereco:

                endereco,

            cidade:

                cidade,

            horario_abertura:

                abertura || null,

            horario_fechamento:

                fechamento || null,

            logo_url:

                logoUrl,

            ativa:

                true

        };


        console.log(
            "Dados da loja:",
            dadosLoja
        );


        // ===============================
        // INSERT
        // ===============================

        const {
            data,
            error
        } = await window.db

            .from("lojas")

            .insert([dadosLoja])

            .select()
            .single();


        if (error) {

            console.error(
                "Erro ao cadastrar:",
                error
            );

            throw error;

        }


        console.log(
            "Loja cadastrada:",
            data
        );


        // ===============================
        // SUCESSO
        // ===============================

        mensagem.style.color =
            "#198754";


        mensagem.innerHTML = `

            <i class="fa-solid fa-circle-check"></i>

            Loja cadastrada com sucesso!

            <br>

            Redirecionando...

        `;


        // Salvar informações básicas
        // para uso no projeto

        localStorage.setItem(
            "loja_id",
            data.id
        );


        localStorage.setItem(
            "nome_loja",
            data.nome
        );


        // ===============================
        // REDIRECIONAR
        // ===============================

        setTimeout(() => {

            window.location.href =
                "painel-loja.html";

        }, 1500);


    } catch (erro) {


        console.error(
            "Erro:",
            erro
        );


        mensagem.style.color =
            "#dc3545";


        mensagem.innerHTML = `

            <i class="fa-solid fa-circle-exclamation"></i>

            ${erro.message}

        `;


    } finally {


        botao.disabled = false;


        botao.innerHTML = `

            <i class="fa-solid fa-floppy-disk"></i>

            Cadastrar Loja

        `;

    }

});