// ==========================================
// EDITAR-PRODUTO.JS
// Comércio da Cidade
// ==========================================

let lojaId = null;

let produtoId = null;

let imagemAtual = "";

let novaImagem = null;

let categoriasProdutos = [];


// ==========================================
// INICIAR PÁGINA
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


            return;

        }


        // ==================================
        // ID DO PRODUTO
        // ==================================

        const params =
            new URLSearchParams(
                window.location.search
            );


        produtoId =
            params.get(
                "id"
            );


        if (!produtoId) {

            notificar(
                "Não foi possível identificar o produto que deve ser editado.",
                "erro",
                "Produto não informado"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "produtos.html";

                },
                1000
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

        const categoriasCarregadas =
            await carregarCategorias();


        if (!categoriasCarregadas) {

            return;

        }


        // ==================================
        // PRODUTO
        // ==================================

        const produtoCarregado =
            await carregarProduto();


        if (!produtoCarregado) {

            return;

        }


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
                atualizarProduto
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


        if (!sessaoData.session) {

            notificar(
                "Entre na sua conta para editar produtos.",
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
            data: auth,
            error
        } =
            await window.db
                .auth
                .getUser();


        if (
            error ||
            !auth.user
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


        const usuario =
            auth.user;


        // ==================================
        // LOJA DO USUÁRIO
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
                "Erro ao carregar loja:",
                erroLoja
            );


            notificar(
                "Não foi possível carregar sua loja.",
                "erro",
                "Erro ao carregar loja"
            );


            return false;

        }


        if (!loja) {

            notificar(
                "Nenhuma loja foi encontrada para sua conta.",
                "erro",
                "Loja não encontrada"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "painel-loja.html";

                },
                1000
            );


            return false;

        }


        lojaId =
            loja.id;


        const campoNomeLoja =
            document.getElementById(
                "nomeLoja"
            );


        if (campoNomeLoja) {

            campoNomeLoja.value =
                loja.nome || "";

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


        return false;

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
                "Nenhuma categoria de produto está disponível.",
                "aviso",
                "Categorias indisponíveis"
            );


            return false;

        }


        select.innerHTML = `

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


        return true;


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


        return false;

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


function selecionarCategoriaProduto(
    categoriaProdutoId
) {

    const categoriaSelecionada =
        categoriasProdutos.find(
            categoria =>
                String(categoria.id) ===
                String(categoriaProdutoId)
        );


    if (!categoriaSelecionada) {

        definirValor(
            "categoria",
            categoriaProdutoId
        );


        carregarSubcategorias(
            categoriaProdutoId
        );


        return;

    }


    const categoriaPaiId =
        categoriaSelecionada.categoria_pai_id ||
        categoriaSelecionada.id;


    definirValor(
        "categoria",
        categoriaPaiId
    );


    carregarSubcategorias(
        categoriaPaiId,
        categoriaSelecionada.categoria_pai_id
            ? categoriaSelecionada.id
            : ""
    );

}


// ==========================================
// CARREGAR PRODUTO
// ==========================================

async function carregarProduto() {

    try {

        const {
            data: produto,
            error
        } =
            await window.db

                .from(
                    "produtos"
                )

                .select(
                    "*"
                )

                .eq(
                    "id",
                    produtoId
                )

                .maybeSingle();


        if (error) {

            throw error;

        }


        if (!produto) {

            notificar(
                "O produto não foi encontrado.",
                "erro",
                "Produto não encontrado"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "produtos.html";

                },
                1000
            );


            return false;

        }


        // ==================================
        // VERIFICAR PROPRIETÁRIO
        // ==================================

        if (
            String(produto.loja_id) !==
            String(lojaId)
        ) {

            notificar(
                "Este produto pertence a outra loja e não pode ser editado por esta conta.",
                "erro",
                "Acesso não permitido"
            );


            setTimeout(
                () => {

                    window.location.href =
                        "produtos.html";

                },
                1200
            );


            return false;

        }


        // ==================================
        // IMAGEM ATUAL
        // ==================================

        imagemAtual =
            produto.imagem_url ||
            "";


        // ==================================
        // PREENCHER CAMPOS
        // ==================================

        definirValor(
            "nome",
            produto.nome
        );


        definirValor(
            "descricao",
            produto.descricao
        );


        selecionarCategoriaProduto(
            produto.categoria_id
        );


        definirValor(
            "preco",
            produto.preco
        );


        definirValor(
            "preco-promocao",
            produto.preco_promocional
        );


        definirValor(
            "estoque",
            produto.estoque
        );


        // ==================================
        // CHECKBOXES
        // ==================================

        const ativo =
            document.getElementById(
                "ativo"
            );


        const destaque =
            document.getElementById(
                "destaque"
            );


        if (ativo) {

            ativo.checked =
                produto.ativo !== false;

        }


        if (destaque) {

            destaque.checked =
                produto.destaque === true;

        }


        // ==================================
        // PREVIEW
        // ==================================

        atualizarPreview(
            imagemAtual
        );


        return true;


    } catch (erro) {

        console.error(
            "Erro ao carregar produto:",
            erro
        );


        notificar(
            "Não foi possível carregar os dados do produto.",
            "erro",
            "Erro ao carregar produto"
        );


        return false;

    }

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


    if (!elemento) {

        return;

    }


    elemento.value =
        valor ?? "";

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


        atualizarPreview(
            imagemAtual
        );


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


        atualizarPreview(
            imagemAtual
        );


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


        atualizarPreview(
            imagemAtual
        );


        return;

    }


    novaImagem =
        arquivo;


    // ==================================
    // PREVIEW LOCAL
    // ==================================

    const reader =
        new FileReader();


    reader.onload =
        function (
            eventReader
        ) {

            atualizarPreview(
                eventReader.target.result
            );

        };


    reader.onerror =
        function () {

            notificar(
                "Não foi possível visualizar a imagem selecionada.",
                "erro",
                "Erro na imagem"
            );


            novaImagem =
                null;

        };


    reader.readAsDataURL(
        arquivo
    );


    notificar(
        "A nova imagem foi selecionada. Salve as alterações para confirmar.",
        "info",
        "Nova imagem selecionada",
        3000
    );

}


// ==========================================
// ATUALIZAR PREVIEW
// ==========================================

function atualizarPreview(
    url
) {

    const preview =
        document.getElementById(
            "preview"
        );


    if (!preview) {

        return;

    }


    if (url) {

        preview.src =
            url;


        preview.style.display =
            "block";


        preview.onerror =
            () => {

                preview.removeAttribute(
                    "src"
                );


                preview.style.display =
                    "none";

            };


        return;

    }


    preview.removeAttribute(
        "src"
    );


    preview.style.display =
        "none";

}


// ==========================================
// ATUALIZAR PRODUTO
// ==========================================

async function atualizarProduto(
    event
) {

    event.preventDefault();


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
        Number(
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
    // VALIDAR NOME
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
        !Number.isFinite(preco) ||
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
        !Number.isFinite(estoque) ||
        estoque < 0 ||
        !Number.isInteger(estoque)
    ) {

        notificar(
            "Informe uma quantidade de estoque válida. Use apenas números inteiros a partir de zero.",
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

            Salvando...

        `;

    }


    let atualizacaoConcluida =
        false;


    try {

        let imagemUrl =
            imagemAtual;


        // ==================================
        // NOVA IMAGEM
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
        // SALVANDO
        // ==================================

        if (botao) {

            botao.innerHTML = `

                <i class="fa-solid fa-spinner fa-spin"></i>

                Salvando produto...

            `;

        }


        const {
            data,
            error
        } =
            await window.db

                .from(
                    "produtos"
                )

                .update({

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

                })

                .eq(
                    "id",
                    produtoId
                )

                .eq(
                    "loja_id",
                    lojaId
                )

                .select()

                .single();


        if (error) {

            throw error;

        }


        if (!data) {

            throw new Error(
                "O produto não foi retornado após a atualização."
            );

        }


        // ==================================
        // SUCESSO
        // ==================================

        atualizacaoConcluida =
            true;


        imagemAtual =
            data.imagem_url ||
            "";


        novaImagem =
            null;


        if (botao) {

            botao.innerHTML = `

                <i class="fa-solid fa-circle-check"></i>

                Produto atualizado

            `;

        }


        notificar(
            `"${data.nome}" foi atualizado com sucesso.`,
            "sucesso",
            "Produto atualizado!",
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
            "Erro ao atualizar produto:",
            erro
        );


        notificar(
            tratarErroProduto(
                erro
            ),
            "erro",
            "Não foi possível atualizar",
            5500
        );


    } finally {

        if (
            !atualizacaoConcluida &&
            botao
        ) {

            botao.disabled =
                false;


            botao.innerHTML =
                conteudoOriginal ||
                `

                    <i class="fa-solid fa-floppy-disk"></i>

                    Salvar Alterações

                `;

        }

    }

}


// ==========================================
// ENVIAR IMAGEM
// ==========================================

async function enviarImagemProduto(
    arquivo
) {

    const extensao =
        arquivo.name
            .split(".")
            .pop()
            .toLowerCase();


    const nomeSeguro =
        arquivo.name

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


    const nomeArquivo =
        `${lojaId}/${Date.now()}_${nomeSeguro}.${extensao}`;


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
            "Não foi possível obter a URL da imagem."
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
            "Sua conta não possui permissão para alterar este produto."
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
            "storage"
        )
        ||
        texto.includes(
            "imagem"
        )
        ||
        texto.includes(
            "upload"
        )
    ) {

        return (
            erro?.message ||
            "Não foi possível enviar a imagem do produto."
        );

    }


    return (
        erro?.message ||
        "Ocorreu um erro ao atualizar o produto."
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
