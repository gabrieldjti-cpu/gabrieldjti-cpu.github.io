// ==========================================
// NOVO-PRODUTO.JS
// Comércio da Cidade
// ==========================================

let lojaId = null;

let novaImagem = null;

let categoriasProdutos = [];


// ==========================================
// INICIAR PÁGINA
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        console.log(
            "Novo produto iniciado."
        );


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


            return;

        }


        // ==================================
        // USUÁRIO / LOJA
        // ==================================

        const autenticado =
            await verificarUsuario();


        if (!autenticado) {

            return;

        }


        // ==================================
        // CATEGORIAS
        // ==================================

        await carregarCategorias();


        // ==================================
        // IMAGEM
        // ==================================

        const inputImagem =
            document.getElementById(
                "imagem"
            );


        if (inputImagem) {

            inputImagem.addEventListener(
                "change",
                mostrarPreview
            );

        }


        // ==================================
        // FORMULÁRIO
        // ==================================

        const form =
            document.getElementById(
                "form-produto"
            );


        if (form) {

            form.addEventListener(
                "submit",
                salvarProduto
            );

        }

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
            await window.db
                .auth
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


        // ==================================
        // NÃO LOGADO
        // ==================================

        if (!sessaoData.session) {

            notificar(
                "Entre na sua conta para cadastrar produtos.",
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


        const usuario =
            sessaoData.session.user;


        // ==================================
        // BUSCAR LOJA
        // ==================================

        const {
            data: loja,
            error: erroLoja
        } =
            await window.db

                .from(
                    "lojas"
                )

                .select(
                    "id,nome"
                )

                .eq(
                    "proprietario_id",
                    usuario.id
                )

                .maybeSingle();


        if (erroLoja) {

            console.error(
                "Erro ao buscar loja:",
                erroLoja
            );


            notificar(
                "Não foi possível carregar sua loja.",
                "erro",
                "Erro ao carregar loja"
            );


            return false;

        }


        // ==================================
        // SEM LOJA
        // ==================================

        if (!loja) {

            notificar(
                "Você precisa possuir uma loja cadastrada antes de adicionar produtos.",
                "aviso",
                "Loja não encontrada",
                3500
            );


            setTimeout(
                () => {

                    window.location.href =
                        "painel-loja.html";

                },
                1200
            );


            return false;

        }


        lojaId =
            loja.id;


        const nomeLoja =
            document.getElementById(
                "nomeLoja"
            );


        if (nomeLoja) {

            nomeLoja.value =
                loja.nome ||
                "";

        }


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
// CARREGAR CATEGORIAS
// ==========================================

async function carregarCategorias() {

    const select =
        document.getElementById(
            "categoria"
        );


    if (!select) {

        console.error(
            "#categoria não encontrado."
        );


        return;

    }


    select.disabled =
        true;


    select.innerHTML = `

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
                    "categorias_produtos"
                )

                .select(
                    "id,nome,categoria_pai_id"
                )

                .eq(
                    "ativa",
                    true
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


        categoriasProdutos =
            Array.isArray(data)
                ? data
                : [];


        const categorias =
            categoriasProdutos.filter(
                categoria =>
                    categoria.categoria_pai_id === null
            );


        if (
            categorias.length === 0
        ) {

            select.innerHTML = `

                <option value="">

                    Nenhuma categoria disponível

                </option>

            `;


            notificar(
                "Nenhuma categoria de produto está disponível no momento.",
                "aviso",
                "Categorias indisponíveis"
            );


            return;

        }


        select.innerHTML = `

            <option value="">

                Selecione uma categoria

            </option>

        `;


        categorias.forEach(
            (categoria) => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    categoria.id;


                option.textContent =
                    categoria.nome;


                select.appendChild(
                    option
                );

            }
        );


        select.disabled =
            false;


        select.addEventListener(
            "change",
            () => carregarSubcategorias(
                select.value
            )
        );


        carregarSubcategorias(
            ""
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar categorias:",
            erro
        );


        select.innerHTML = `

            <option value="">

                Erro ao carregar categorias

            </option>

        `;


        select.disabled =
            true;


        notificar(
            "Não foi possível carregar as categorias dos produtos.",
            "erro",
            "Erro ao carregar categorias"
        );

    }

}


// ==========================================
// CARREGAR SUBCATEGORIAS
// ==========================================

function carregarSubcategorias(
    categoriaId,
    subcategoriaSelecionada = ""
) {

    const select =
        document.getElementById(
            "subcategoria"
        );


    if (!select) {

        return;

    }


    const paiId =
        Number(
            categoriaId
        );


    const subcategorias =
        Number.isSafeInteger(
            paiId
        )
        && paiId > 0
            ? categoriasProdutos.filter(
                categoria =>
                    Number(
                        categoria.categoria_pai_id
                    ) === paiId
            )
            : [];


    select.innerHTML = `

        <option value="">

            ${subcategorias.length > 0
                ? "Sem subcategoria"
                : "Nenhuma subcategoria disponível"}

        </option>

    `;


    subcategorias.forEach(
        subcategoria => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                subcategoria.id;


            option.textContent =
                subcategoria.nome;


            select.appendChild(
                option
            );

        }
    );


    select.disabled =
        subcategorias.length === 0;


    select.value =
        String(
            subcategoriaSelecionada || ""
        );

}


// ==========================================
// PREVIEW DA IMAGEM
// ==========================================

function mostrarPreview(
    event
) {

    const arquivo =
        event.target
            .files?.[0];


    if (!arquivo) {

        novaImagem =
            null;


        limparPreview();


        return;

    }


    // ==================================
    // FORMATO
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


        event.target.value =
            "";


        novaImagem =
            null;


        limparPreview();


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
            "A imagem do produto deve possuir no máximo 5 MB.",
            "aviso",
            "Imagem muito grande"
        );


        event.target.value =
            "";


        novaImagem =
            null;


        limparPreview();


        return;

    }


    // ==================================
    // GUARDAR IMAGEM
    // ==================================

    novaImagem =
        arquivo;


    // ==================================
    // PREVIEW
    // ==================================

    const leitor =
        new FileReader();


    leitor.onload =
        function (
            evento
        ) {

            const preview =
                document.getElementById(
                    "preview"
                );


            if (preview) {

                preview.src =
                    evento.target.result;


                preview.style.display =
                    "block";

            }

        };


    leitor.onerror =
        function () {

            notificar(
                "Não foi possível visualizar a imagem selecionada.",
                "erro",
                "Erro na imagem"
            );


            novaImagem =
                null;


            event.target.value =
                "";


            limparPreview();

        };


    leitor.readAsDataURL(
        arquivo
    );


    notificar(
        "A imagem foi selecionada e será enviada quando o produto for cadastrado.",
        "info",
        "Imagem selecionada",
        3000
    );

}


// ==========================================
// LIMPAR PREVIEW
// ==========================================

function limparPreview() {

    const preview =
        document.getElementById(
            "preview"
        );


    if (!preview) {

        return;

    }


    preview.removeAttribute(
        "src"
    );


    preview.style.display =
        "none";

}


// ==========================================
// SALVAR PRODUTO
// ==========================================

async function salvarProduto(
    event
) {

    event.preventDefault();


    // ==================================
    // LOJA
    // ==================================

    if (!lojaId) {

        notificar(
            "Não foi possível identificar sua loja.",
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


    const descricao =
        valorCampo(
            "descricao"
        );


    const categoria =
        valorCampo(
            "categoria"
        );


    const subcategoria =
        valorCampo(
            "subcategoria"
        );


    const precoTexto =
        valorCampo(
            "preco"
        );


    const promocaoTexto =
        valorCampo(
            "preco-promocao"
        );


    const estoqueTexto =
        valorCampo(
            "estoque"
        );


    const preco =
        Number(
            precoTexto
        );


    const precoPromocional =
        promocaoTexto
            ? Number(
                promocaoTexto
            )
            : null;


    const estoque =
        estoqueTexto === ""
            ? 0
            : Number(
                estoqueTexto
            );


    const ativo =
        document
            .getElementById(
                "ativo"
            )
            ?.checked
        ??
        false;


    const destaque =
        document
            .getElementById(
                "destaque"
            )
            ?.checked
        ??
        false;


    // ==================================
    // NOME
    // ==================================

    if (!nome) {

        notificar(
            "Digite o nome do produto.",
            "aviso",
            "Nome obrigatório"
        );


        focarCampo(
            "nome"
        );


        return;

    }


    if (
        nome.length < 2
    ) {

        notificar(
            "Digite um nome válido para o produto.",
            "aviso",
            "Nome inválido"
        );


        focarCampo(
            "nome"
        );


        return;

    }


    // ==================================
    // CATEGORIA
    // ==================================

    if (!categoria) {

        notificar(
            "Selecione a categoria do produto.",
            "aviso",
            "Categoria obrigatória"
        );


        focarCampo(
            "categoria"
        );


        return;

    }


    const categoriaProdutoId =
        subcategoria ||
        categoria;


    if (
        subcategoria
        && !categoriasProdutos.some(
            item =>
                String(item.id) === String(subcategoria)
                && String(item.categoria_pai_id) === String(categoria)
        )
    ) {

        notificar(
            "Selecione uma subcategoria válida para a categoria escolhida.",
            "aviso",
            "Subcategoria inválida"
        );


        focarCampo(
            "subcategoria"
        );


        return;

    }


    // ==================================
    // PREÇO
    // ==================================

    if (
        !Number.isFinite(
            preco
        )
        ||
        preco <= 0
    ) {

        notificar(
            "Informe um preço maior que zero.",
            "aviso",
            "Preço inválido"
        );


        focarCampo(
            "preco"
        );


        return;

    }


    // ==================================
    // PREÇO PROMOCIONAL
    // ==================================

    if (
        precoPromocional !== null
    ) {

        if (
            !Number.isFinite(
                precoPromocional
            )
            ||
            precoPromocional <= 0
        ) {

            notificar(
                "Informe um preço promocional válido.",
                "aviso",
                "Promoção inválida"
            );


            focarCampo(
                "preco-promocao"
            );


            return;

        }


        if (
            precoPromocional >=
            preco
        ) {

            notificar(
                "O preço promocional precisa ser menor que o preço normal.",
                "aviso",
                "Promoção inválida"
            );


            focarCampo(
                "preco-promocao"
            );


            return;

        }

    }


    // ==================================
    // ESTOQUE
    // ==================================

    if (
        !Number.isFinite(
            estoque
        )
        ||
        estoque < 0
        ||
        !Number.isInteger(
            estoque
        )
    ) {

        notificar(
            "Informe uma quantidade válida de estoque usando números inteiros a partir de zero.",
            "aviso",
            "Estoque inválido"
        );


        focarCampo(
            "estoque"
        );


        return;

    }


    // ==================================
    // BOTÃO
    // ==================================

    const botao =
        document.querySelector(
            '#form-produto button[type="submit"]'
        );


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


    let cadastroConcluido =
        false;


    try {

        let imagemUrl =
            "";


        // ==================================
        // UPLOAD DA IMAGEM
        // ==================================

        if (novaImagem) {

            if (botao) {

                botao.innerHTML = `

                    <i class="fa-solid fa-spinner fa-spin"></i>

                    Enviando imagem...

                `;

            }


            imagemUrl =
                await enviarImagemProduto(
                    novaImagem
                );

        }


        // ==================================
        // SALVAR PRODUTO
        // ==================================

        if (botao) {

            botao.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Salvando produto...

            `;

        }


        const dadosProduto = {

            loja_id:
                lojaId,

            categoria_id:
                Number(
                    categoriaProdutoId
                ),

            nome,

            descricao,

            preco,

            preco_promocional:
                precoPromocional,

            estoque,

            imagem_url:
                imagemUrl ||
                null,

            ativo,

            destaque

        };


        console.log(
            "Salvando produto:",
            dadosProduto
        );


        const {
            data,
            error
        } =
            await window.db

                .from(
                    "produtos"
                )

                .insert([
                    dadosProduto
                ])

                .select()

                .single();


        if (error) {

            throw error;

        }


        if (!data) {

            throw new Error(
                "O produto não foi retornado após o cadastro."
            );

        }


        // ==================================
        // SUCESSO
        // ==================================

        cadastroConcluido =
            true;


        if (botao) {

            botao.innerHTML = `

                <i class="fa-solid fa-circle-check"></i>

                Produto cadastrado

            `;

        }


        notificar(
            `"${data.nome}" foi cadastrado com sucesso.`,
            "sucesso",
            "Produto cadastrado!",
            3000
        );


        setTimeout(
            () => {

                window.location.href =
                    "produtos.html";

            },
            1200
        );


    } catch (erro) {

        console.error(
            "Erro ao cadastrar produto:",
            erro
        );


        notificar(
            tratarErroProduto(
                erro
            ),
            "erro",
            "Não foi possível cadastrar",
            5500
        );


    } finally {

        if (
            !cadastroConcluido &&
            botao
        ) {

            botao.disabled =
                false;


            botao.innerHTML =
                conteudoOriginal ||
                `

                    <i class="fa-solid fa-floppy-disk"></i>

                    Cadastrar Produto

                `;

        }

    }

}


// ==========================================
// ENVIAR IMAGEM DO PRODUTO
// ==========================================

async function enviarImagemProduto(
    arquivo
) {

    // ==================================
    // NOME SEGURO
    // ==================================

    const nomeOriginal =
        arquivo.name ||
        "produto.jpg";


    const extensao =
        nomeOriginal

            .split(".")

            .pop()

            .toLowerCase();


    const nomeBase =
        nomeOriginal

            .replace(
                /\.[^/.]+$/,
                ""
            )

            .replace(
                /[^a-zA-Z0-9_-]/g,
                "_"
            )

            .substring(
                0,
                50
            );


    // Mantém o bucket atual "produtos".
    // Organiza os arquivos por loja.

    const nomeArquivo =
        `${lojaId}/${Date.now()}_${nomeBase}.${extensao}`;


    // ==================================
    // UPLOAD
    // ==================================

    const {
        error: erroUpload
    } =
        await window.db
            .storage

            .from(
                "produtos"
            )

            .upload(
                nomeArquivo,
                arquivo,
                {

                    cacheControl:
                        "3600",

                    upsert:
                        false

                }
            );


    if (erroUpload) {

        console.error(
            "Erro no upload:",
            erroUpload
        );


        throw new Error(
            "Não foi possível enviar a imagem do produto."
        );

    }


    // ==================================
    // URL PÚBLICA
    // ==================================

    const {
        data
    } =
        window.db
            .storage

            .from(
                "produtos"
            )

            .getPublicUrl(
                nomeArquivo
            );


    if (
        !data?.publicUrl
    ) {

        throw new Error(
            "Não foi possível obter a URL da imagem do produto."
        );

    }


    return data.publicUrl;

}


// ==========================================
// TRATAR ERROS
// ==========================================

function tratarErroProduto(
    erro
) {

    const texto =
        String(
            erro?.message ||
            ""
        )
            .toLowerCase();


    // ==================================
    // RLS
    // ==================================

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
            "Sua conta não possui permissão para cadastrar produtos nesta loja."
        );

    }


    // ==================================
    // STORAGE
    // ==================================

    if (
        texto.includes(
            "storage"
        )
        ||
        texto.includes(
            "upload"
        )
        ||
        texto.includes(
            "imagem"
        )
    ) {

        return (
            erro?.message ||
            "Não foi possível enviar a imagem do produto."
        );

    }


    // ==================================
    // REDE
    // ==================================

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


    // ==================================
    // PADRÃO
    // ==================================

    return (
        erro?.message ||
        "Ocorreu um erro ao cadastrar o produto."
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


// ==========================================
// LOGOUT
// ==========================================

async function fazerLogout() {

    let confirmou =
        true;


    if (
        typeof window.confirmarAcao ===
        "function"
    ) {

        confirmou =
            await window.confirmarAcao({

                titulo:
                    "Sair da conta?",

                mensagem:
                    "Deseja realmente sair da sua conta?",

                textoConfirmar:
                    "Sim, sair",

                textoCancelar:
                    "Cancelar",

                perigo:
                    true

            });

    }


    if (!confirmou) {

        return;

    }


    try {

        const {
            error
        } =
            await window.db
                .auth
                .signOut();


        if (error) {

            throw error;

        }


        localStorage.removeItem(
            "loja_id"
        );


        localStorage.removeItem(
            "nome_loja"
        );


        window.location.href =
            "login.html";


    } catch (erro) {

        console.error(
            "Erro ao sair:",
            erro
        );


        notificar(
            "Não foi possível sair da sua conta.",
            "erro",
            "Erro ao sair"
        );

    }

}


// ==========================================
// GLOBAL
// ==========================================

window.fazerLogout =
    fazerLogout;
