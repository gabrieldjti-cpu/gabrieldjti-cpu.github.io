// ==========================================
// EDITAR-LOJA.JS
// Comércio da Cidade
// ==========================================

let db = null;

let usuario = null;

let loja = null;

let novaLogo = null;

let previewTemporario = null;


// ==========================================
// ELEMENTOS
// ==========================================

let form = null;

let mensagem = null;

let inputLogo = null;

let previewLogo = null;

let placeholderLogo = null;

let categoria = null;

let btnSalvar = null;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Editar loja iniciado."
        );


        // ==================================
        // ELEMENTOS
        // ==================================

        form =
            document.getElementById(
                "formEditarLoja"
            );


        mensagem =
            document.getElementById(
                "mensagem"
            );


        inputLogo =
            document.getElementById(
                "logo"
            );


        previewLogo =
            document.getElementById(
                "preview-logo"
            );


        placeholderLogo =
            document.getElementById(
                "preview-logo-placeholder"
            );


        categoria =
            document.getElementById(
                "categoria"
            );


        btnSalvar =
            document.getElementById(
                "btnSalvar"
            );


        // ==================================
        // VERIFICAR ELEMENTOS
        // ==================================

        if (!form) {

            console.error(
                "#formEditarLoja não encontrado."
            );


            notificar(
                "Não foi possível carregar o formulário de edição.",
                "erro",
                "Erro na página"
            );


            return;

        }


        if (!categoria) {

            console.error(
                "#categoria não encontrado."
            );


            notificar(
                "O campo de categoria não foi encontrado.",
                "erro",
                "Erro na página"
            );


            return;

        }


        // ==================================
        // SUPABASE
        // ==================================

        db =
            window.db;


        if (!db) {

            console.error(
                "window.db não encontrado."
            );


            notificar(
                "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
                "erro",
                "Erro de conexão",
                6000
            );


            if (btnSalvar) {

                btnSalvar.disabled =
                    true;

            }


            return;

        }


        // ==================================
        // USUÁRIO
        // ==================================

        const autenticado =
            await verificarUsuario();


        if (!autenticado) {

            return;

        }


        // ==================================
        // ID DA LOJA
        // ==================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        const lojaId =
            params.get(
                "id"
            );


        console.log(
            "ID da loja:",
            lojaId
        );


        if (!lojaId) {

            notificar(
                "Não foi possível identificar qual loja deve ser editada.",
                "erro",
                "Loja não identificada"
            );


            if (btnSalvar) {

                btnSalvar.disabled =
                    true;

            }


            return;

        }


        // ==================================
        // CARREGAR LOJA
        // ==================================

        const carregou =
            await carregarLoja(
                lojaId
            );


        if (!carregou) {

            return;

        }


        // ==================================
        // CATEGORIAS
        // ==================================

        await carregarCategorias();


        // ==================================
        // EVENTO DA LOGO
        // ==================================

        if (inputLogo) {

            inputLogo.addEventListener(
                "change",
                visualizarNovaLogo
            );

        }


        // ==================================
        // FORMULÁRIO
        // ==================================

        form.addEventListener(
            "submit",
            salvarAlteracoes
        );


        console.log(
            "Editar loja pronto."
        );

    }
);


// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    try {

        // ==================================
        // SESSÃO
        // ==================================

        const {
            data: sessaoData,
            error: sessaoError
        } =
            await db.auth
                .getSession();


        if (sessaoError) {

            console.error(
                "Erro ao verificar sessão:",
                sessaoError
            );


            notificar(
                "Não foi possível verificar sua sessão.",
                "erro",
                "Erro de autenticação"
            );


            return false;

        }


        if (
            !sessaoData.session
        ) {

            notificar(
                "Entre na sua conta para editar sua loja.",
                "info",
                "Login necessário",
                2500
            );


            setTimeout(
                () => {

                    window.location.href =
                        "login.html";

                },
                900
            );


            return false;

        }


        // ==================================
        // USUÁRIO
        // ==================================

        const {
            data,
            error
        } =
            await db.auth
                .getUser();


        if (
            error ||
            !data.user
        ) {

            console.error(
                "Erro ao verificar usuário:",
                error
            );


            notificar(
                "Sua sessão não pôde ser validada. Entre novamente.",
                "erro",
                "Sessão inválida"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "login.html";

                },
                1000
            );


            return false;

        }


        usuario =
            data.user;


        console.log(
            "Usuário conectado:",
            usuario.id
        );


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
// CARREGAR LOJA
// ==========================================

async function carregarLoja(
    lojaId
) {

    atualizarMensagemInterna(
        "Carregando dados da loja..."
    );


    try {

        const {
            data,
            error
        } =
            await db

                .from(
                    "lojas"
                )

                .select(`
                    *,
                    categorias!categoria_id(
                        id,
                        nome
                    )
                `)

                .eq(
                    "id",
                    lojaId
                )

                .eq(
                    "proprietario_id",
                    usuario.id
                )

                .maybeSingle();


        if (error) {

            console.error(
                "Erro ao carregar loja:",
                error
            );


            limparMensagemInterna();


            notificar(
                "Não foi possível carregar os dados da loja.",
                "erro",
                "Erro ao carregar loja"
            );


            return false;

        }


        if (!data) {

            limparMensagemInterna();


            notificar(
                "A loja não foi encontrada ou você não possui permissão para editá-la.",
                "erro",
                "Loja não encontrada",
                5500
            );


            return false;

        }


        loja =
            data;


        preencherFormulario(
            loja
        );


        limparMensagemInterna();


        return true;


    } catch (erro) {

        console.error(
            "Erro ao buscar loja:",
            erro
        );


        limparMensagemInterna();


        notificar(
            "Ocorreu um erro ao carregar os dados da loja.",
            "erro",
            "Erro ao carregar"
        );


        return false;

    }

}


// ==========================================
// PREENCHER FORMULÁRIO
// ==========================================

function preencherFormulario(
    dados
) {

    definirValor(
        "nome",
        dados.nome
    );


    definirValor(
        "telefone",
        dados.telefone
    );


    definirValor(
        "whatsapp",
        dados.whatsapp
    );


    definirValor(
        "descricao",
        dados.descricao
    );


    definirValor(
        "endereco",
        dados.endereco
    );


    definirValor(
        "cidade",
        dados.cidade
    );


    definirValor(
        "abertura",
        formatarHora(
            dados.horario_abertura
        )
    );


    definirValor(
        "fechamento",
        formatarHora(
            dados.horario_fechamento
        )
    );


    definirValor(
        "taxa-entrega",
        Number(
            dados.taxa_entrega ||
            0
        ).toFixed(2)
    );


    // ==================================
    // STATUS
    // ==================================

    const ativa =
        document.getElementById(
            "ativa"
        );


    if (ativa) {

        ativa.value =
            dados.ativa === false
                ? "false"
                : "true";

    }


    // ==================================
    // LOGO
    // ==================================

    atualizarPreviewLogo(
        dados.logo_url
    );

}


// ==========================================
// DEFINIR VALOR
// ==========================================

function definirValor(
    id,
    valor
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.value =
            valor ?? "";

    }

}


// ==========================================
// ATUALIZAR PREVIEW DA LOGO
// ==========================================

function atualizarPreviewLogo(
    url
) {

    if (!previewLogo) {

        return;

    }


    if (url) {

        previewLogo.src =
            url;


        previewLogo.hidden =
            false;


        previewLogo.style.display =
            "block";


        if (placeholderLogo) {

            placeholderLogo.style.display =
                "none";

        }


        previewLogo.onerror =
            () => {

                console.warn(
                    "Não foi possível carregar a logo."
                );


                previewLogo.hidden =
                    true;


                previewLogo.style.display =
                    "none";


                previewLogo.removeAttribute(
                    "src"
                );


                if (placeholderLogo) {

                    placeholderLogo.style.display =
                        "flex";

                }

            };


        return;

    }


    previewLogo.hidden =
        true;


    previewLogo.style.display =
        "none";


    previewLogo.removeAttribute(
        "src"
    );


    if (placeholderLogo) {

        placeholderLogo.style.display =
            "flex";

    }

}


// ==========================================
// FORMATAR HORA
// ==========================================

function formatarHora(
    hora
) {

    if (!hora) {

        return "";

    }


    const texto =
        String(
            hora
        );


    if (
        texto.length >= 5
    ) {

        return texto.substring(
            0,
            5
        );

    }


    return texto;

}


// ==========================================
// CARREGAR CATEGORIAS
// ==========================================

async function carregarCategorias() {

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
        } =
            await db

                .from(
                    "categorias"
                )

                .select(
                    "id,nome"
                )

                .order(
                    "nome",
                    {
                        ascending:
                            true
                    }
                );


        if (error) {

            throw error;

        }


        const categorias =
            Array.isArray(data)
                ? data
                : [];


        if (
            categorias.length === 0
        ) {

            categoria.innerHTML = `

                <option value="">

                    Nenhuma categoria disponível

                </option>

            `;


            notificar(
                "Nenhuma categoria de loja está disponível no momento.",
                "aviso",
                "Categorias indisponíveis"
            );


            return;

        }


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
            false;


        // ==================================
        // CATEGORIA ATUAL
        // ==================================

        if (
            loja?.categoria_id
        ) {

            categoria.value =
                String(
                    loja.categoria_id
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
            "Não foi possível carregar as categorias.",
            "erro",
            "Erro ao carregar categorias"
        );

    }

}


// ==========================================
// VISUALIZAR NOVA LOGO
// ==========================================

function visualizarNovaLogo(
    event
) {

    const arquivo =
        event.target
            .files?.[0];


    if (!arquivo) {

        novaLogo =
            null;


        liberarPreviewTemporario();


        atualizarPreviewLogo(
            loja?.logo_url ||
            null
        );


        return;

    }


    // ==================================
    // TIPOS PERMITIDOS
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


        novaLogo =
            null;


        liberarPreviewTemporario();


        atualizarPreviewLogo(
            loja?.logo_url ||
            null
        );


        return;

    }


    // ==================================
    // TAMANHO MÁXIMO
    // ==================================

    const tamanhoMaximo =
        5 * 1024 * 1024;


    if (
        arquivo.size >
        tamanhoMaximo
    ) {

        notificar(
            "A logo deve possuir no máximo 5 MB.",
            "aviso",
            "Imagem muito grande"
        );


        inputLogo.value =
            "";


        novaLogo =
            null;


        liberarPreviewTemporario();


        atualizarPreviewLogo(
            loja?.logo_url ||
            null
        );


        return;

    }


    // ==================================
    // NOVA LOGO
    // ==================================

    novaLogo =
        arquivo;


    liberarPreviewTemporario();


    previewTemporario =
        URL.createObjectURL(
            arquivo
        );


    atualizarPreviewLogo(
        previewTemporario
    );


    notificar(
        "A nova logo foi selecionada. Clique em Salvar Alterações para confirmar.",
        "info",
        "Nova logo selecionada",
        3500
    );

}


// ==========================================
// LIBERAR PREVIEW TEMPORÁRIO
// ==========================================

function liberarPreviewTemporario() {

    if (
        previewTemporario
    ) {

        URL.revokeObjectURL(
            previewTemporario
        );


        previewTemporario =
            null;

    }

}


// ==========================================
// ENVIAR LOGO
// ==========================================

async function enviarLogo() {

    if (!novaLogo) {

        return (
            loja.logo_url ||
            null
        );

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
        "Enviando logo:",
        caminho
    );


    // ==================================
    // UPLOAD
    // ==================================

    const {
        error
    } =
        await db.storage

            .from(
                "logos-lojas"
            )

            .upload(
                caminho,
                novaLogo,
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
            "Não foi possível enviar a nova logo."
        );

    }


    // ==================================
    // URL PÚBLICA
    // ==================================

    const {
        data
    } =
        db.storage

            .from(
                "logos-lojas"
            )

            .getPublicUrl(
                caminho
            );


    if (
        !data?.publicUrl
    ) {

        throw new Error(
            "Não foi possível obter a URL da nova logo."
        );

    }


    return data.publicUrl;

}


// ==========================================
// SALVAR ALTERAÇÕES
// ==========================================

async function salvarAlteracoes(
    event
) {

    event.preventDefault();


    if (!loja) {

        notificar(
            "Não foi possível identificar a loja que está sendo editada.",
            "erro",
            "Loja não encontrada"
        );


        return;

    }


    // ==================================
    // CAMPOS
    // ==================================

    const nome =
        valorCampo(
            "nome"
        );


    const categoriaId =
        categoria?.value ||
        "";


    const telefone =
        valorCampo(
            "telefone"
        );


    const whatsapp =
        valorCampo(
            "whatsapp"
        );


    const descricao =
        valorCampo(
            "descricao"
        );


    const endereco =
        valorCampo(
            "endereco"
        );


    const cidade =
        valorCampo(
            "cidade"
        );


    const abertura =
        valorCampo(
            "abertura"
        );


    const fechamento =
        valorCampo(
            "fechamento"
        );


    const taxaEntrega =
        Number(
            valorCampo(
                "taxa-entrega"
            )
        );


    const ativaElemento =
        document.getElementById(
            "ativa"
        );


    const ativa =
        ativaElemento
            ? ativaElemento.value ===
              "true"
            : loja.ativa;


    // ==================================
    // VALIDAR NOME
    // ==================================

    if (!nome) {

        notificar(
            "Digite o nome da loja.",
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

    if (!categoriaId) {

        notificar(
            "Selecione uma categoria para a loja.",
            "aviso",
            "Categoria obrigatória"
        );


        categoria?.focus();


        return;

    }


    // ==================================
    // TAXA DE ENTREGA
    // ==================================

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
    // TELEFONE
    // ==================================

    if (telefone) {

        const numeros =
            telefone.replace(
                /\D/g,
                ""
            );


        if (
            numeros.length < 10
        ) {

            notificar(
                "Digite um telefone válido com DDD.",
                "aviso",
                "Telefone inválido"
            );


            focarCampo(
                "telefone"
            );


            return;

        }

    }


    // ==================================
    // WHATSAPP
    // ==================================

    if (whatsapp) {

        const numeros =
            whatsapp.replace(
                /\D/g,
                ""
            );


        if (
            numeros.length < 10
        ) {

            notificar(
                "Digite um número de WhatsApp válido com DDD.",
                "aviso",
                "WhatsApp inválido"
            );


            focarCampo(
                "whatsapp"
            );


            return;

        }

    }


    // ==================================
    // BOTÃO
    // ==================================

    const conteudoOriginal =
        btnSalvar?.innerHTML;


    if (btnSalvar) {

        btnSalvar.disabled =
            true;


        btnSalvar.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Salvando...

        `;

    }


    let salvamentoConcluido =
        false;


    try {

        // ==================================
        // LOGO
        // ==================================

        let logoUrl =
            loja.logo_url ||
            null;


        if (novaLogo) {

            atualizarMensagemInterna(
                "Enviando nova logo..."
            );


            logoUrl =
                await enviarLogo();

        }


        atualizarMensagemInterna(
            "Salvando alterações..."
        );


        // ==================================
        // DADOS
        // ==================================

        const dadosAtualizados = {

            nome,

            categoria_id:
                Number(
                    categoriaId
                ),

            telefone,

            whatsapp,

            descricao,

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

            ativa,

            logo_url:
                logoUrl

        };


        // ==================================
        // UPDATE
        // ==================================

        const {
            data,
            error
        } =
            await db

                .from(
                    "lojas"
                )

                .update(
                    dadosAtualizados
                )

                .eq(
                    "id",
                    loja.id
                )

                .eq(
                    "proprietario_id",
                    usuario.id
                )

                .select()

                .single();


        if (error) {

            console.error(
                "Erro ao atualizar loja:",
                error
            );


            throw error;

        }


        if (!data) {

            throw new Error(
                "A loja não foi retornada após a atualização."
            );

        }


        // ==================================
        // ATUALIZAR LOCAL
        // ==================================

        loja =
            data;


        novaLogo =
            null;


        liberarPreviewTemporario();


        atualizarPreviewLogo(
            loja.logo_url
        );


        localStorage.setItem(
            "loja_id",
            loja.id
        );


        localStorage.setItem(
            "nome_loja",
            loja.nome
        );


        salvamentoConcluido =
            true;


        limparMensagemInterna();


        // ==================================
        // SUCESSO
        // ==================================

        if (btnSalvar) {

            btnSalvar.innerHTML = `

                <i class="fa-solid fa-circle-check"></i>

                Alterações salvas

            `;

        }


        notificar(
            `"${loja.nome}" foi atualizada com sucesso.`,
            "sucesso",
            "Loja atualizada!",
            3000
        );


        // ==================================
        // REDIRECIONAR
        // ==================================

        setTimeout(
            () => {

                window.location.href =
                    "painel-loja.html";

            },
            1200
        );


    } catch (erro) {

        console.error(
            "Erro ao salvar:",
            erro
        );


        limparMensagemInterna();


        notificar(
            tratarErroEdicaoLoja(
                erro
            ),
            "erro",
            "Não foi possível salvar",
            5500
        );


    } finally {

        // Não restaura o botão quando
        // a alteração foi concluída.

        if (
            !salvamentoConcluido &&
            btnSalvar
        ) {

            btnSalvar.disabled =
                false;


            btnSalvar.innerHTML =
                conteudoOriginal ||
                `

                    <i class="fa-solid fa-floppy-disk"></i>

                    Salvar Alterações

                `;

        }

    }

}


// ==========================================
// TRATAR ERROS
// ==========================================

function tratarErroEdicaoLoja(
    erro
) {

    const texto =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    if (
        texto.includes(
            "row-level security"
        )
        ||
        texto.includes(
            "rls"
        )
    ) {

        return (
            "Sua conta não possui permissão para alterar essa loja."
        );

    }


    if (
        texto.includes(
            "failed to fetch"
        )
        ||
        texto.includes(
            "network"
        )
    ) {

        return (
            "Não foi possível conectar ao servidor. Verifique sua internet."
        );

    }


    if (
        texto.includes(
            "logo"
        )
        ||
        texto.includes(
            "storage"
        )
    ) {

        return (
            erro?.message ||
            "Não foi possível enviar a nova logo."
        );

    }


    return (
        erro?.message ||
        "Ocorreu um erro ao salvar as alterações."
    );

}


// ==========================================
// PEGAR VALOR
// ==========================================

function valorCampo(
    id
) {

    return document
        .getElementById(
            id
        )
        ?.value
        ?.trim()
        ||
        "";

}


// ==========================================
// FOCAR CAMPO
// ==========================================

function focarCampo(
    id
) {

    const campo =
        document.getElementById(
            id
        );


    if (!campo) {

        return;

    }


    campo.focus();


    campo.scrollIntoView(
        {
            behavior:
                "smooth",

            block:
                "center"
        }
    );

}


// ==========================================
// MENSAGEM INTERNA
// ==========================================

function atualizarMensagemInterna(
    texto
) {

    if (!mensagem) {

        return;

    }


    mensagem.textContent =
        texto;


    mensagem.style.color =
        "#6b7280";

}


function limparMensagemInterna() {

    if (!mensagem) {

        return;

    }


    mensagem.textContent =
        "";

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
