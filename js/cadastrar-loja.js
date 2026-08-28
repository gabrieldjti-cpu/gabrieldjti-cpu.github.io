// ==========================================
// CADASTRAR-LOJA.JS
// Comércio da Cidade
// ==========================================

const form = document.getElementById("formLoja");

const mensagem = document.getElementById("mensagem");

const categoria = document.getElementById("categoria");

const inputLogo = document.getElementById("logo");

const previewLogo = document.getElementById(
    "preview-logo"
);

const previewLogoPlaceholder =
    document.getElementById(
        "preview-logo-placeholder"
    );

const botao =
    form?.querySelector(
        'button[type="submit"]'
    ) ||
    document.querySelector(".btn");


let usuario = null;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

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

                botao.disabled = true;

            }

            return;
        }


        const autenticado =
            await verificarUsuario();


        if (!autenticado) {

            return;

        }


        const possuiLoja =
            await verificarLojaExistente();


        if (possuiLoja) {

            return;

        }


        await carregarCategorias();

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


        if (!data.session) {

            notificar(
                "Entre na sua conta para cadastrar uma loja.",
                "info",
                "Login necessário",
                2200
            );


            setTimeout(
                () => {

                    window.location.href =
                        "login.html";

                },
                800
            );


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
        } =
            await window.db

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


        if (!lojaExistente) {

            return false;

        }


        // ==================================
        // JÁ POSSUI LOJA
        // ==================================

        localStorage.setItem(
            "loja_id",
            lojaExistente.id
        );


        if (lojaExistente.nome) {

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


        atualizarMensagem("");


        form
            ?.querySelectorAll(
                "input, select, textarea, button"
            )
            .forEach(
                (elemento) => {

                    elemento.disabled = true;

                }
            );


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


    categoria.disabled = true;


    categoria.innerHTML = `
        <option value="">
            Carregando categorias...
        </option>
    `;


    try {

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "categorias"
                )

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


        const categorias =
            Array.isArray(data)
                ? data
                : [];


        categoria.innerHTML = `
            <option value="">
                Selecione uma categoria
            </option>
        `;


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
            categorias.length === 0;


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

                limparPreviewLogo();

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
                (event) => {

                    if (!previewLogo) {

                        return;

                    }


                    previewLogo.src =
                        event.target.result;


                    previewLogo.hidden =
                        false;


                    previewLogo.style.display =
                        "block";


                    if (
                        previewLogoPlaceholder
                    ) {

                        previewLogoPlaceholder
                            .style
                            .display =
                                "none";

                    }

                };


            leitor.onerror =
                () => {

                    notificar(
                        "Não foi possível visualizar a imagem selecionada.",
                        "erro",
                        "Erro na imagem"
                    );


                    inputLogo.value =
                        "";


                    limparPreviewLogo();

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

    if (previewLogo) {

        previewLogo.removeAttribute(
            "src"
        );


        previewLogo.style.display =
            "none";


        previewLogo.hidden =
            true;

    }


    if (
        previewLogoPlaceholder
    ) {

        previewLogoPlaceholder
            .style
            .display =
                "flex";

    }

}


// ==========================================
// UPLOAD DA LOGO
// ==========================================

async function enviarLogo() {

    if (
        !inputLogo?.files?.length
    ) {

        return null;

    }


    const arquivo =
        inputLogo.files[0];


    const extensao =
        arquivo.name

            .split(".")

            .pop()

            .toLowerCase();


    const nomeArquivo =
        `${Date.now()}.${extensao}`;


    const caminho =
        `lojas/${usuario.id}/${nomeArquivo}`;


    console.log(
        "Enviando logo:",
        caminho
    );


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


            const taxaEntrega =
                Number(
                    obterValor(
                        "taxa-entrega"
                    )
                );


            if (
                !Number.isFinite(taxaEntrega) ||
                taxaEntrega < 0 ||
                taxaEntrega > 9999.99
            ) {

                notificar(
                    "Informe uma taxa de entrega entre R$ 0,00 e R$ 9.999,99.",
                    "aviso",
                    "Taxa de entrega inválida"
                );


                focarCampo(
                    "taxa-entrega"
                );


                return;

            }


            // ==================================
            // VALIDAÇÃO DO NOME
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


            // ==================================
            // CATEGORIA
            // ==================================

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
            // TELEFONE
            // ==================================

            if (
                telefone &&
                somenteNumeros(
                    telefone
                ).length < 10
            ) {

                notificar(
                    "Informe um telefone válido com DDD.",
                    "aviso",
                    "Telefone inválido"
                );


                focarCampo(
                    "telefone"
                );


                return;

            }


            // ==================================
            // WHATSAPP
            // ==================================

            if (
                whatsapp &&
                somenteNumeros(
                    whatsapp
                ).length < 10
            ) {

                notificar(
                    "Informe um WhatsApp válido com DDD.",
                    "aviso",
                    "WhatsApp inválido"
                );


                focarCampo(
                    "whatsapp"
                );


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


            atualizarMensagem("");


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

                    taxa_entrega:
                        Math.round(
                            taxaEntrega * 100
                        ) / 100,

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
                } =
                    await window.db

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
                    data.nome ||
                    nome
                );


                // ==================================
                // SUCESSO
                // ==================================

                atualizarMensagem(
                    ""
                );


                notificar(
                    "Sua loja foi cadastrada com sucesso.",
                    "sucesso",
                    "Loja cadastrada!",
                    3500
                );


                if (botao) {

                    botao.innerHTML = `

                        <i class="fa-solid fa-circle-check"></i>

                        Loja cadastrada!

                    `;

                }


                setTimeout(
                    () => {

                        window.location.href =
                            "painel-loja.html";

                    },
                    1200
                );


            } catch (erro) {

                console.error(
                    "Erro ao cadastrar loja:",
                    erro
                );


                atualizarMensagem(
                    ""
                );


                notificar(
                    tratarErroCadastro(
                        erro
                    ),
                    "erro",
                    "Não foi possível cadastrar a loja",
                    5500
                );


            } finally {

                if (
                    botao &&
                    !cadastroConcluido
                ) {

                    botao.disabled =
                        false;


                    botao.innerHTML =
                        conteudoOriginal ||
                        "Cadastrar Loja";

                }

            }

        }
    );

}


// ==========================================
// TRATAR ERROS
// ==========================================

function tratarErroCadastro(
    erro
) {

    const texto =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    // ==================================
    // RLS / PERMISSÃO
    // ==================================

    if (
        texto.includes(
            "row-level security"
        ) ||
        texto.includes(
            "rls"
        ) ||
        texto.includes(
            "permission denied"
        )
    ) {

        return (
            "Sua conta não possui permissão para cadastrar esta loja."
        );

    }


    // ==================================
    // DUPLICIDADE
    // ==================================

    if (
        texto.includes(
            "duplicate"
        ) ||
        texto.includes(
            "unique"
        )
    ) {

        return (
            "Já existe um registro com esses dados."
        );

    }


    // ==================================
    // REDE
    // ==================================

    if (
        texto.includes(
            "failed to fetch"
        ) ||
        texto.includes(
            "network"
        )
    ) {

        return (
            "Não foi possível conectar ao servidor. Verifique sua internet."
        );

    }


    // ==================================
    // STORAGE
    // ==================================

    if (
        texto.includes(
            "storage"
        ) ||
        texto.includes(
            "bucket"
        )
    ) {

        return (
            "Não foi possível enviar a logo da loja. Verifique as permissões do armazenamento."
        );

    }


    // ==================================
    // PADRÃO
    // ==================================

    return (
        erro?.message ||
        "Ocorreu um erro ao cadastrar a loja. Tente novamente."
    );

}


// ==========================================
// ATUALIZAR MENSAGEM
// ==========================================

function atualizarMensagem(
    texto = ""
) {

    if (!mensagem) {

        return;

    }


    mensagem.textContent =
        texto;

}


// ==========================================
// OBTER VALOR
// ==========================================

function obterValor(
    id
) {

    const elemento =
        document.getElementById(
            id
        );


    return String(
        elemento?.value ||
        ""
    )
        .trim();

}


// ==========================================
// SOMENTE NÚMEROS
// ==========================================

function somenteNumeros(
    valor
) {

    return String(
        valor ||
        ""
    )
        .replace(
            /\D/g,
            ""
        );

}


// ==========================================
// FOCAR CAMPO
// ==========================================

function focarCampo(
    id
) {

    const elemento =
        document.getElementById(
            id
        );


    if (!elemento) {

        return;

    }


    elemento.focus();


    elemento.scrollIntoView({

        behavior:
            "smooth",

        block:
            "center"

    });

}


// ==========================================
// FEEDBACK
// ==========================================

function notificar(
    texto,
    tipo = "info",
    titulo = null,
    duracao = 4000
) {

    if (
        typeof window.mostrarAlerta ===
        "function"
    ) {

        window.mostrarAlerta(
            texto,
            tipo,
            titulo,
            duracao
        );


        return;

    }


    console.warn(
        `[${tipo}] ${titulo || ""}`,
        texto
    );

}
