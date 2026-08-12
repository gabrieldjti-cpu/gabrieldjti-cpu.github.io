// =======================================
// EDITAR LOJA
// =======================================

let db = null;

let usuario = null;

let loja = null;

let novaLogo = null;


// =======================================
// ELEMENTOS
// =======================================

let form = null;

let mensagem = null;

let inputLogo = null;

let previewLogo = null;

let placeholderLogo = null;

let categoria = null;

let btnSalvar = null;


// =======================================
// INICIAR
// =======================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "================================="
        );

        console.log(
            "EDITAR LOJA INICIADO"
        );

        console.log(
            "================================="
        );


        // ===================================
        // ELEMENTOS
        // ===================================

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


        // ===================================
        // VERIFICAR FORMULÁRIO
        // ===================================

        if (!form) {

            console.error(
                "ERRO: #formEditarLoja não encontrado."
            );

            return;

        }


        if (!categoria) {

            console.error(
                "ERRO: #categoria não encontrado."
            );

            return;

        }


        // ===================================
        // SUPABASE
        // ===================================

        db = window.db;


        if (!db) {

            mostrarMensagem(
                "Erro ao conectar com o Supabase.",
                "erro"
            );


            console.error(
                "window.db não encontrado."
            );


            return;

        }


        // ===================================
        // VERIFICAR USUÁRIO
        // ===================================

        try {

            const {
                data,
                error
            } = await db.auth.getUser();


            if (error) {

                console.error(
                    "Erro ao verificar usuário:",
                    error
                );


                window.location.href =
                    "login.html";


                return;

            }


            if (!data.user) {

                window.location.href =
                    "login.html";


                return;

            }


            usuario =
                data.user;


            console.log(
                "Usuário conectado:",
                usuario.id
            );


            // ===================================
            // PEGAR ID DA URL
            // ===================================

            const params =
                new URLSearchParams(
                    window.location.search
                );


            const lojaId =
                params.get("id");


            console.log(
                "ID recebido pela URL:",
                lojaId
            );


            if (!lojaId) {

                mostrarMensagem(
                    "ID da loja não encontrado.",
                    "erro"
                );


                console.error(
                    "A URL não possui o parâmetro ?id="
                );


                return;

            }


            // ===================================
            // CARREGAR LOJA
            // ===================================

            const carregou =
                await carregarLoja(
                    lojaId
                );


            if (!carregou) {

                return;

            }


            // ===================================
            // CARREGAR CATEGORIAS
            // ===================================

            await carregarCategorias();


            // ===================================
            // SELECIONAR CATEGORIA ATUAL
            // ===================================

            if (
                loja &&
                loja.categoria_id
            ) {

                categoria.value =
                    String(
                        loja.categoria_id
                    );

            }


            // ===================================
            // EVENTO DA LOGO
            // ===================================

            if (inputLogo) {

                inputLogo.addEventListener(
                    "change",
                    visualizarNovaLogo
                );

            }


            // ===================================
            // EVENTO DO FORMULÁRIO
            // ===================================

            form.addEventListener(
                "submit",
                salvarAlteracoes
            );


            console.log(
                "Editar loja pronto."
            );


        } catch (erro) {

            console.error(
                "Erro ao iniciar página:",
                erro
            );


            mostrarMensagem(
                "Erro ao carregar a página.",
                "erro"
            );

        }

    }
);


// =======================================
// CARREGAR LOJA
// =======================================

async function carregarLoja(
    lojaId
) {

    console.log(
        "Buscando loja:",
        lojaId
    );


    try {

        const {
            data,
            error
        } = await db

            .from("lojas")

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


        console.log(
            "Resultado da loja:",
            data
        );


        if (error) {

            console.error(
                "Erro Supabase:",
                error
            );


            mostrarMensagem(
                "Erro ao carregar a loja: " +
                error.message,
                "erro"
            );


            return false;

        }


        if (!data) {

            console.error(
                "Nenhuma loja encontrada."
            );


            mostrarMensagem(
                "Loja não encontrada ou você não possui permissão para editá-la.",
                "erro"
            );


            return false;

        }


        loja =
            data;


        console.log(
            "LOJA CARREGADA:",
            loja
        );


        preencherFormulario(
            loja
        );


        return true;


    } catch (erro) {

        console.error(
            "Erro ao buscar loja:",
            erro
        );


        mostrarMensagem(
            "Erro ao carregar os dados da loja.",
            "erro"
        );


        return false;

    }

}


// =======================================
// PREENCHER FORMULÁRIO
// =======================================

function preencherFormulario(
    dados
) {

    console.log(
        "Preenchendo formulário:",
        dados
    );


    // ===================================
    // NOME
    // ===================================

    const nome =
        document.getElementById(
            "nome"
        );


    if (nome) {

        nome.value =
            dados.nome || "";

    }


    // ===================================
    // TELEFONE
    // ===================================

    const telefone =
        document.getElementById(
            "telefone"
        );


    if (telefone) {

        telefone.value =
            dados.telefone || "";

    }


    // ===================================
    // WHATSAPP
    // ===================================

    const whatsapp =
        document.getElementById(
            "whatsapp"
        );


    if (whatsapp) {

        whatsapp.value =
            dados.whatsapp || "";

    }


    // ===================================
    // DESCRIÇÃO
    // ===================================

    const descricao =
        document.getElementById(
            "descricao"
        );


    if (descricao) {

        descricao.value =
            dados.descricao || "";

    }


    // ===================================
    // ENDEREÇO
    // ===================================

    const endereco =
        document.getElementById(
            "endereco"
        );


    if (endereco) {

        endereco.value =
            dados.endereco || "";

    }


    // ===================================
    // CIDADE
    // ===================================

    const cidade =
        document.getElementById(
            "cidade"
        );


    if (cidade) {

        cidade.value =
            dados.cidade || "";

    }


    // ===================================
    // HORÁRIO ABERTURA
    // ===================================

    const abertura =
        document.getElementById(
            "abertura"
        );


    if (abertura) {

        abertura.value =
            formatarHora(
                dados.horario_abertura
            );

    }


    // ===================================
    // HORÁRIO FECHAMENTO
    // ===================================

    const fechamento =
        document.getElementById(
            "fechamento"
        );


    if (fechamento) {

        fechamento.value =
            formatarHora(
                dados.horario_fechamento
            );

    }


    // ===================================
    // STATUS
    // ===================================

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


    // ===================================
    // LOGO
    // ===================================

    atualizarPreviewLogo(
        dados.logo_url
    );

}


// =======================================
// ATUALIZAR PREVIEW DA LOGO
// =======================================

function atualizarPreviewLogo(
    url
) {

    if (!previewLogo) {

        return;

    }


    // ===================================
    // POSSUI LOGO
    // ===================================

    if (url) {

        previewLogo.src =
            url;


        previewLogo.hidden =
            false;


        if (placeholderLogo) {

            placeholderLogo.style.display =
                "none";

        }


        // ===================================
        // ERRO AO CARREGAR A IMAGEM
        // ===================================

        previewLogo.onerror =
            () => {

                console.warn(
                    "Não foi possível carregar a logo."
                );


                previewLogo.hidden =
                    true;


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


    // ===================================
    // NÃO POSSUI LOGO
    // ===================================

    previewLogo.hidden =
        true;


    previewLogo.removeAttribute(
        "src"
    );


    if (placeholderLogo) {

        placeholderLogo.style.display =
            "flex";

    }

}


// =======================================
// FORMATAR HORA
// =======================================

function formatarHora(
    hora
) {

    if (!hora) {

        return "";

    }


    if (
        hora.length >= 5
    ) {

        return hora.substring(
            0,
            5
        );

    }


    return hora;

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


    try {

        const {
            data,
            error
        } = await db

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

            console.error(
                "Erro categorias:",
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


        if (
            !data ||
            data.length === 0
        ) {

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


        data.forEach(
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


        // ===================================
        // SELECIONAR CATEGORIA ATUAL
        // ===================================

        if (
            loja &&
            loja.categoria_id
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

    }

}


// =======================================
// VISUALIZAR NOVA LOGO
// =======================================

function visualizarNovaLogo(
    event
) {

    const arquivo =
        event.target.files[0];


    if (!arquivo) {

        novaLogo =
            null;


        atualizarPreviewLogo(
            loja?.logo_url || null
        );


        return;

    }


    // ===================================
    // TIPOS PERMITIDOS
    // ===================================

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


        inputLogo.value =
            "";


        novaLogo =
            null;


        atualizarPreviewLogo(
            loja?.logo_url || null
        );


        return;

    }


    // ===================================
    // TAMANHO MÁXIMO
    // ===================================

    if (
        arquivo.size >
        5 * 1024 * 1024
    ) {

        mostrarMensagem(
            "A imagem deve ter no máximo 5 MB.",
            "erro"
        );


        inputLogo.value =
            "";


        novaLogo =
            null;


        atualizarPreviewLogo(
            loja?.logo_url || null
        );


        return;

    }


    // ===================================
    // SALVAR NOVA LOGO
    // ===================================

    novaLogo =
        arquivo;


    // ===================================
    // PREVIEW LOCAL
    // ===================================

    const url =
        URL.createObjectURL(
            arquivo
        );


    atualizarPreviewLogo(
        url
    );


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


    // ===================================
    // EXTENSÃO
    // ===================================

    const extensao =
        novaLogo.name
            .split(".")
            .pop()
            .toLowerCase();


    // ===================================
    // NOME DO ARQUIVO
    // ===================================

    const nomeArquivo =
        `${Date.now()}.${extensao}`;


    // ===================================
    // CAMINHO NO STORAGE
    // ===================================

    const caminho =
        `lojas/${usuario.id}/${nomeArquivo}`;


    console.log(
        "Enviando logo:",
        caminho
    );


    // ===================================
    // UPLOAD
    // ===================================

    const {
        error
    } = await db.storage

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
            "Erro upload:",
            error
        );


        throw new Error(
            "Erro ao enviar a logo: " +
            error.message
        );

    }


    // ===================================
    // PEGAR URL PÚBLICA
    // ===================================

    const {
        data
    } = db.storage

        .from(
            "logos-lojas"
        )

        .getPublicUrl(
            caminho
        );


    if (
        !data ||
        !data.publicUrl
    ) {

        throw new Error(
            "Não foi possível obter a URL da logo."
        );

    }


    return data.publicUrl;

}


// =======================================
// SALVAR ALTERAÇÕES
// =======================================

async function salvarAlteracoes(
    event
) {

    event.preventDefault();


    if (!loja) {

        mostrarMensagem(
            "Loja não encontrada.",
            "erro"
        );


        return;

    }


    // ===================================
    // DESABILITAR BOTÃO
    // ===================================

    if (btnSalvar) {

        btnSalvar.disabled =
            true;


        btnSalvar.innerHTML = `

            <i class="fa-solid fa-spinner fa-spin"></i>

            Salvando...

        `;

    }


    try {

        // ===================================
        // CAMPOS
        // ===================================

        const nome =
            document
                .getElementById(
                    "nome"
                )
                .value
                .trim();


        const categoriaId =
            categoria.value;


        const telefone =
            document
                .getElementById(
                    "telefone"
                )
                .value
                .trim();


        const whatsapp =
            document
                .getElementById(
                    "whatsapp"
                )
                .value
                .trim();


        const descricao =
            document
                .getElementById(
                    "descricao"
                )
                .value
                .trim();


        const endereco =
            document
                .getElementById(
                    "endereco"
                )
                .value
                .trim();


        const cidade =
            document
                .getElementById(
                    "cidade"
                )
                .value
                .trim();


        const abertura =
            document
                .getElementById(
                    "abertura"
                )
                .value;


        const fechamento =
            document
                .getElementById(
                    "fechamento"
                )
                .value;


        const ativaElemento =
            document.getElementById(
                "ativa"
            );


        const ativa =
            ativaElemento
                ? ativaElemento.value ===
                  "true"
                : loja.ativa;


        // ===================================
        // VALIDAÇÕES
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

            nome:
                nome,

            categoria_id:
                Number(
                    categoriaId
                ),

            telefone:
                telefone,

            whatsapp:
                whatsapp,

            descricao:
                descricao,

            endereco:
                endereco,

            cidade:
                cidade,

            horario_abertura:
                abertura || null,

            horario_fechamento:
                fechamento || null,

            ativa:
                ativa,

            logo_url:
                logoUrl

        };


        console.log(
            "Dados para atualização:",
            dadosAtualizados
        );


        // ===================================
        // ATUALIZAR NO SUPABASE
        // ===================================

        const {
            data,
            error
        } = await db

            .from("lojas")

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
                "Erro UPDATE:",
                error
            );


            throw new Error(
                "Erro ao atualizar loja: " +
                error.message
            );

        }


        // ===================================
        // ATUALIZAR OBJETO LOCAL
        // ===================================

        loja =
            data;


        novaLogo =
            null;


        // ===================================
        // ATUALIZAR PREVIEW
        // ===================================

        atualizarPreviewLogo(
            loja.logo_url
        );


        // ===================================
        // SUCESSO
        // ===================================

        mostrarMensagem(
            "Loja atualizada com sucesso!",
            "sucesso"
        );


        // ===================================
        // REDIRECIONAR
        // ===================================

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


        mostrarMensagem(
            erro.message ||
            "Erro ao salvar alterações.",
            "erro"
        );


    } finally {

        if (btnSalvar) {

            btnSalvar.disabled =
                false;


            btnSalvar.innerHTML = `

                <i class="fa-solid fa-floppy-disk"></i>

                Salvar Alterações

            `;

        }

    }

}


// =======================================
// MOSTRAR MENSAGEM
// =======================================

function mostrarMensagem(
    texto,
    tipo
) {

    if (!mensagem) {

        console.log(
            `[${tipo}] ${texto}`
        );


        return;

    }


    mensagem.textContent =
        texto;


    mensagem.style.color =
        tipo === "sucesso"
            ? "#198754"
            : "#dc3545";

}