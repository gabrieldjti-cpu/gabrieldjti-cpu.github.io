// ==========================================
// CADASTRAR-LOJA.JS
// Comércio da Cidade
// ==========================================


// ==========================================
// ELEMENTOS
// ==========================================

const form =
    document.getElementById(
        "formLoja"
    );

const mensagem =
    document.getElementById(
        "mensagem"
    );

const categoria =
    document.getElementById(
        "categoria"
    );

const inputLogo =
    document.getElementById(
        "logo"
    );

const previewLogo =
    document.getElementById(
        "preview-logo"
    );

const botao =
    form?.querySelector(
        'button[type="submit"]'
    )
    ||
    document.querySelector(
        ".btn"
    );


let usuario = null;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // ==================================
        // SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Supabase não foi inicializado."
            );


            notificar(
                "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
                "erro",
                "Erro de conexão",
                6000
            );


            if (botao) {

                botao.disabled =
                    true;

            }


            return;

        }


        // ==================================
        // VERIFICAR SESSÃO
        // ==================================

        const autenticado =
            await verificarUsuario();


        if (!autenticado) {

            return;

        }


        // ==================================
        // VERIFICAR LOJA EXISTENTE
        // ==================================

        const possuiLoja =
            await verificarLojaExistente();


        if (possuiLoja) {

            return;

        }


        // ==================================
        // CATEGORIAS
        // ==================================

        await carregarCategorias();


        // ==================================
        // PREVIEW
        // ==================================

        configurarPreviewLogo();

    }
);


// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    try {

        const {
            data,
            error
        } =
            await window.db
                .auth
                .getSession();


        if (error) {

            console.error(
                "Erro ao verificar sessão:",
                error
            );


            notificar(
                "Não foi possível verificar sua sessão.",
                "erro",
                "Erro de autenticação"
            );


            return false;

        }


        if (
            !data.session
        ) {

            window.location.href =
                "login.html";


            return false;

        }


        usuario =
            data.session.user;


        return true;


    } catch (erro) {

        console.error(
            "Erro ao verificar usuário:",
            erro
        );


        notificar(
            "Ocorreu um erro ao verificar sua conta.",
            "erro",
            "Erro de autenticação"
        );


        return false;

    }

}


// ==========================================
// VERIFICAR LOJA EXISTENTE
// ==========================================

async function verificarLojaExistente() {

    try {

        const {
            data: lojaExistente,
            error
        } = await window.db

            .from("lojas")

            .select(
                "id,nome"
            )

            .eq(
                "proprietario_id",
                usuario.id
            )

            .maybeSingle();


        if (error) {

            console.error(
                "Erro ao verificar loja:",
                error
            );


            notificar(
                "Não foi possível verificar se você já possui uma loja.",
                "erro",
                "Erro ao verificar loja"
            );


            return false;

        }


        if (
            !lojaExistente
        ) {

            return false;

        }


        // ==================================
        // JÁ POSSUI LOJA
        // ==================================

        localStorage.setItem(
            "loja_id",
            lojaExistente.id
        );


        if (
            lojaExistente.nome
        ) {

            localStorage.setItem(
                "nome_loja",
                lojaExistente.nome
            );

        }


        notificar(
            "Você já possui uma loja cadastrada. Abrindo seu painel...",
            "info",
            "Loja já cadastrada",
            2500
        );


        if (mensagem) {

            mensagem.textContent =
                "";

        }


        if (form) {

            form
                .querySelectorAll(
                    "input, select, textarea, button"
                )
                .forEach(
                    (elemento) => {

                        elemento.disabled =
                            true;

                    }
                );

        }


        setTimeout(
            () => {

                window.location.href =
                    "painel-loja.html";

            },
            1400
        );


        return true;


    } catch (erro) {

        console.error(
            "Erro inesperado ao verificar loja:",
            erro
        );


        return false;

    }

}


// ==========================================
// CARREGAR CATEGORIAS
// ==========================================

async function carregarCategorias() {

    if (!categoria) {

        console.error(
            "Campo categoria não encontrado."
        );


        return;

    }


    categoria.disabled =
        true;


    categoria.innerHTML = `

        <option value="">

            Carregando categorias...

        </option>

    `;


    try {

        const {
            data,
            error
        } = await window.db

            .from("categorias")

            .select(
                "id,nome"
            )

            .order(
                "nome",
                {
                    ascending: true
                }
            );


        if (error) {

            throw error;

        }


        categoria.innerHTML = `

            <option value="">

                Selecione uma categoria

            </option>

        `;


        const categorias =
            Array.isArray(data)
                ? data
                : [];


        categorias.forEach(
            (cat) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    cat.id;


                option.textContent =
                    cat.nome;


                categoria.appendChild(
                    option
                );

            }
        );


        categoria.disabled =
            false;


        if (
            categorias.length === 0
        ) {

            notificar(
                "Nenhuma categoria de loja está disponível no momento.",
                "aviso",
                "Categorias indisponíveis"
            );

        }


    } catch (erro) {

        console.error(
            "Erro ao carregar categorias:",
            erro
        );


        categoria.innerHTML = `

            <option value="">

                Erro ao carregar categorias

            </option>

        `;


        categoria.disabled =
            true;


        notificar(
            "Não foi possível carregar as categorias das lojas.",
            "erro",
            "Erro ao carregar categorias",
            5000
        );

    }

}


// ==========================================
// PREVIEW DA LOGO
// ==========================================

function configurarPreviewLogo() {

    if (!inputLogo) {

        return;

    }


    inputLogo.addEventListener(
        "change",
        () => {

            const arquivo =
                inputLogo.files?.[0];


            if (!arquivo) {

                return;

            }


            // ==================================
            // FORMATOS PERMITIDOS
            // ==================================

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

                notificar(
                    "Escolha uma imagem nos formatos JPG, PNG ou WEBP.",
                    "aviso",
                    "Formato de imagem inválido"
                );


                inputLogo.value =
                    "";


                limparPreviewLogo();


                return;

            }


            // ==================================
            // TAMANHO
            // ==================================

            const tamanhoMaximo =
                5 * 1024 * 1024;


            if (
                arquivo.size >
                tamanhoMaximo
            ) {

                notificar(
                    "A logo deve ter no máximo 5 MB.",
                    "aviso",
                    "Imagem muito grande"
                );


                inputLogo.value =
                    "";


                limparPreviewLogo();


                return;

            }


            // ==================================
            // PREVIEW
            // ==================================

            const leitor =
                new FileReader();


            leitor.onload =
                function (
                    event
                ) {

                    if (
                        previewLogo
                    ) {

                        previewLogo.src =
                            event
                                .target
                                .result;


                        previewLogo.style.display =
                            "block";


                        previewLogo.hidden =
                            false;

                    }

                };


            leitor.onerror =
                function () {

                    notificar(
                        "Não foi possível visualizar a imagem selecionada.",
                        "erro",
                        "Erro na imagem"
                    );


                    inputLogo.value =
                        "";

                };


            leitor.readAsDataURL(
                arquivo
            );

        }
    );

}


// ==========================================
// LIMPAR PREVIEW
// ==========================================

function limparPreviewLogo() {

    if (!previewLogo) {

        return;

    }


    previewLogo.removeAttribute(
        "src"
    );


    previewLogo.style.display =
        "none";


    previewLogo.hidden =
        true;

}


// ==========================================
// UPLOAD DA LOGO
// ==========================================

async function enviarLogo() {

    if (
        !inputLogo ||
        !inputLogo.files?.length
    ) {

        return null;

    }


    const arquivo =
        inputLogo.files[0];


    // ==================================
    // EXTENSÃO
    // ==================================

    const extensao =
        arquivo.name

            .split(".")

            .pop()

            .toLowerCase();


    // ==================================
    // NOME ÚNICO
    // ==================================

    const nomeArquivo =
        `${Date.now()}.${extensao}`;


    // ==================================
    // CAMINHO
    // ==================================

    const caminho =
        `lojas/${usuario.id}/${nomeArquivo}`;


    console.log(
        "Enviando logo:",
        caminho
    );


    // ==================================
    // UPLOAD
    // ==================================

    const {
        data,
        error
    } =
        await window.db
            .storage

            .from(
                "logos-lojas"
            )

            .upload(
                caminho,
                arquivo,
                {

                    cacheControl:
                        "3600",

                    upsert:
                        false

                }
            );


    if (error) {

        console.error(
            "Erro no upload:",
            error
        );


        throw new Error(
            "Não foi possível enviar a logo da loja."
        );

    }


    console.log(
        "Upload realizado:",
        data
    );


    // ==================================
    // URL PÚBLICA
    // ==================================

    const {
        data: urlData
    } =
        window.db
            .storage

            .from(
                "logos-lojas"
            )

            .getPublicUrl(
                caminho
            );


    if (
        !urlData?.publicUrl
    ) {

        throw new Error(
            "Não foi possível obter a URL da logo."
        );

    }


    return urlData.publicUrl;

}


// ==========================================
// FORMULÁRIO
// ==========================================

if (form) {

    form.addEventListener(
        "submit",
        async (
            event
        ) => {

            event.preventDefault();


            if (!usuario) {

                notificar(
                    "Sua sessão não foi encontrada. Entre novamente.",
                    "erro",
                    "Sessão expirada"
                );


                return;

            }


            // ==================================
            // PEGAR DADOS
            // ==================================

            const nome =
                obterValor(
                    "nome"
                );


            const telefone =
                obterValor(
                    "telefone"
                );


            const whatsapp =
                obterValor(
                    "whatsapp"
                );


            const descricao =
                obterValor(
                    "descricao"
                );


            const endereco =
                obterValor(
                    "endereco"
                );


            const cidade =
                obterValor(
                    "cidade"
                );


            const abertura =
                obterValor(
                    "abertura"
                );


            const fechamento =
                obterValor(
                    "fechamento"
                );


            // ==================================
            // VALIDAÇÃO
            // ==================================

            if (!nome) {

                notificar(
                    "Digite o nome da sua loja.",
                    "aviso",
                    "Nome obrigatório"
                );


                focarCampo(
                    "nome"
                );


                return;

            }


            if (
                nome.length < 3
            ) {

                notificar(
                    "O nome da loja deve possuir pelo menos 3 caracteres.",
                    "aviso",
                    "Nome muito curto"
                );


                focarCampo(
                    "nome"
                );


                return;

            }


            if (
                !categoria?.value
            ) {

                notificar(
                    "Escolha a categoria da sua loja.",
                    "aviso",
                    "Categoria obrigatória"
                );


                categoria?.focus();


                return;

            }


            // ==================================
            // BOTÃO
            // ==================================

            const conteudoOriginal =
                botao?.innerHTML;


            if (botao) {

                botao.disabled =
                    true;


                botao.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    Cadastrando...

                `;

            }


            if (mensagem) {

                mensagem.textContent =
                    "";

            }


            let cadastroConcluido =
                false;


            try {

                // ==================================
                // LOGO
                // ==================================

                let logoUrl =
                    null;


                if (
                    inputLogo?.files?.length
                ) {

                    atualizarMensagem(
                        "Enviando logo da loja..."
                    );


                    logoUrl =
                        await enviarLogo();

                }


                // ==================================
                // CRIANDO LOJA
                // ==================================

                atualizarMensagem(
                    "Criando sua loja..."
                );


                const dadosLoja = {

                    proprietario_id:
                        usuario.id,

                    categoria_id:
                        Number(
                            categoria.value
                        ),

                    nome,

                    descricao,

                    telefone,

                    whatsapp,

                    endereco,

                    cidade,

                    horario_abertura:
                        abertura ||
                        null,

                    horario_fechamento:
                        fechamento ||
                        null,

                    logo_url:
                        logoUrl,

                    ativa:
                        true

                };


                console.log(
                    "Dados da loja:",
                    dadosLoja
                );


                // ==================================
                // INSERT
                // ==================================

                const {
                    data,
                    error
                } = await window.db

                    .from(
                        "lojas"
                    )

                    .insert(
                        dadosLoja
                    )

                    .select()

                    .single();


                if (error) {

                    throw error;

                }


                if (!data) {

                    throw new Error(
                        "A loja não foi retornada após o cadastro."
                    );

                }


                console.log(
                    "Loja cadastrada:",
                    data
                );


                cadastroConcluido =
                    true;


                // ==================================
                // LOCAL STORAGE
                // ==================================

                localStorage.setItem(
                    "loja_id",
                    data.id
                );


                localStorage.setItem(
                    "nome_loja",
                    data.nome
                );


                // ==================================
                // SUCESSO
                // ==================================

                atualizarMensagem(
                    ""
 