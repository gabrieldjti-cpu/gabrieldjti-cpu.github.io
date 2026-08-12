// ======================================
// PAINEL DA LOJA
// ======================================

let usuario = null;
let loja = null;


// ======================================
// INICIAR
// ======================================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Painel da loja iniciado.");

    try {

        if (!window.db) {

            console.error("Supabase não encontrado.");

            alert("Erro ao conectar ao Supabase.");

            return;
        }


        // ==================================
        // VERIFICAR USUÁRIO
        // ==================================

        const {
            data,
            error
        } = await window.db.auth.getUser();


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


        usuario = data.user;


        console.log(
            "Usuário conectado:",
            usuario.id
        );


        await carregarLoja();


    } catch (erro) {

        console.error(
            "Erro ao iniciar painel:",
            erro
        );

        alert(
            "Erro ao carregar o painel."
        );

    }

});


// ======================================
// CARREGAR LOJA
// ======================================

async function carregarLoja() {

    try {

        console.log(
            "Buscando loja do usuário..."
        );


        const {
            data,
            error
        } = await window.db

            .from("lojas")

            .select(`
                *,
                categorias!categoria_id(
                    nome
                )
            `)

            .eq(
                "proprietario_id",
                usuario.id
            )

            .maybeSingle();


        console.log(
            "Loja encontrada:",
            data
        );


        if (error) {

            console.error(
                "Erro ao carregar loja:",
                error
            );

            throw error;
        }


        // ==================================
        // NÃO POSSUI LOJA
        // ==================================

        if (!data) {

            window.location.href =
                "cadastrar-loja.html";

            return;
        }


        loja = data;


        // ==================================
        // LOGO
        // ==================================

        carregarLogoLoja();


        // ==================================
        // NOME
        // ==================================

        const nomeLoja =
            document.getElementById(
                "nome-loja"
            );


        if (nomeLoja) {

            nomeLoja.textContent =
                loja.nome || "-";

        }


        // ==================================
        // CATEGORIA
        // ==================================

        const categoriaLoja =
            document.getElementById(
                "categoria-loja"
            );


        if (categoriaLoja) {

            categoriaLoja.textContent =
                loja.categorias?.nome ||
                "Sem categoria";

        }


        // ==================================
        // CIDADE
        // ==================================

        const cidadeLoja =
            document.getElementById(
                "cidade-loja"
            );


        if (cidadeLoja) {

            cidadeLoja.textContent =
                loja.cidade || "-";

        }


        // ==================================
        // TELEFONE
        // ==================================

        const telefoneLoja =
            document.getElementById(
                "telefone-loja"
            );


        if (telefoneLoja) {

            telefoneLoja.textContent =
                loja.telefone || "-";

        }


        // ==================================
        // STATUS
        // ==================================

        const statusLoja =
            document.getElementById(
                "status-loja"
            );


        if (statusLoja) {

            statusLoja.textContent =
                loja.ativa
                    ? "🟢 Ativa"
                    : "🔴 Inativa";

        }


        // ==================================
        // BOTÃO EDITAR
        // ==================================

        configurarBotaoEditar();


        // ==================================
        // PRODUTOS
        // ==================================

        await carregarProdutos();


        // ==================================
        // ESTATÍSTICAS
        // ==================================

        await carregarEstatisticas();


        // ==================================
        // PEDIDOS
        // ==================================

        await carregarPedidos();


    } catch (erro) {

        console.error(
            "Erro ao carregar loja:",
            erro
        );

        alert(
            "Erro ao carregar os dados da loja."
        );

    }

}


// ======================================
// CARREGAR LOGO DA LOJA
// ======================================

function carregarLogoLoja() {

    const imagem =
        document.getElementById(
            "logo-loja"
        );


    const placeholder =
        document.getElementById(
            "logo-loja-placeholder"
        );


    if (!imagem || !placeholder) {

        console.warn(
            "Elementos da logo não encontrados."
        );

        return;
    }


    // ==================================
    // POSSUI LOGO
    // ==================================

    if (loja?.logo_url) {

        imagem.src =
            loja.logo_url;


        imagem.hidden =
            false;


        placeholder.style.display =
            "none";


        imagem.onerror = () => {

            console.warn(
                "Erro ao carregar logo da loja."
            );


            imagem.hidden =
                true;


            imagem.removeAttribute(
                "src"
            );


            placeholder.style.display =
                "flex";

        };


        return;
    }


    // ==================================
    // NÃO POSSUI LOGO
    // ==================================

    imagem.hidden =
        true;


    imagem.removeAttribute(
        "src"
    );


    placeholder.style.display =
        "flex";

}


// ======================================
// BOTÃO EDITAR LOJA
// ======================================

function configurarBotaoEditar() {

    const botao =
        document.getElementById(
            "btnEditarLoja"
        );


    if (!botao) {

        return;
    }


    if (!loja?.id) {

        return;
    }


    botao.onclick = () => {

        window.location.href =
            `editar-loja.html?id=${loja.id}`;

    };

}


// ======================================
// CARREGAR PRODUTOS
// ======================================

async function carregarProdutos() {

    try {

        const {
            data,
            error
        } = await window.db

            .from("produtos")

            .select(`
                *,
                categorias_produtos!categoria_id(
                    nome
                )
            `)

            .eq(
                "loja_id",
                loja.id
            )

            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Erro ao carregar produtos:",
                error
            );

            throw error;

        }


        const produtos =
            data || [];


        // ==================================
        // TOTAL
        // ==================================

        const totalProdutos =
            document.getElementById(
                "total-produtos"
            );


        if (totalProdutos) {

            totalProdutos.textContent =
                produtos.length;

        }


        // ==================================
        // LISTA
        // ==================================

        const lista =
            document.getElementById(
                "lista-produtos"
            );


        if (!lista) {

            return;

        }


        lista.innerHTML = "";


        // ==================================
        // SEM PRODUTOS
        // ==================================

        if (produtos.length === 0) {

            lista.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-box-open"></i>

                    <h3>
                        Nenhum produto cadastrado
                    </h3>

                    <p>
                        Clique em
                        <strong>Novo Produto</strong>
                        para cadastrar seu primeiro produto.
                    </p>

                    <a
                        href="novo-produto.html"
                        class="btn"
                    >

                        <i class="fa-solid fa-plus"></i>

                        Novo Produto

                    </a>

                </div>

            `;

            return;

        }


        // ==================================
        // MOSTRAR PRODUTOS
        // ==================================

        produtos.forEach(produto => {

            const preco =
                Number(
                    produto.preco || 0
                );


            const temPromocao =
                produto.preco_promocional !== null &&
                produto.preco_promocional !== undefined &&
                Number(
                    produto.preco_promocional
                ) > 0;


            const imagemProduto =
                produto.imagem_url || "";


            lista.innerHTML += `

                <div class="produto-card">


                    ${
                        imagemProduto
                            ? `
                                <img
                                    src="${imagemProduto}"
                                    alt="${produto.nome || "Produto"}"
                                    class="foto-produto"
                                >
                              `
                            : `
                                <div
                                    class="foto-produto"
                                    style="
                                        display:flex;
                                        align-items:center;
                                        justify-content:center;
                                        font-size:45px;
                                        color:#198754;
                                    "
                                >

                                    <i class="fa-solid fa-box"></i>

                                </div>
                              `
                    }


                    <div class="produto-info">


                        <span class="categoria">

                            ${
                                produto
                                    .categorias_produtos
                                    ?.nome ||
                                "Sem categoria"
                            }

                        </span>


                        <h3>

                            ${
                                produto.nome ||
                                "Produto"
                            }

                        </h3>


                        <p class="descricao">

                            ${
                                produto.descricao ||
                                "Sem descrição."
                            }

                        </p>


                        <div class="precos">


                            ${
                                temPromocao
                                    ? `

                                        <span class="promo">

                                            De R$
                                            ${preco.toFixed(2)}

                                        </span>


                                        <strong class="preco">

                                            R$
                                            ${Number(
                                                produto.preco_promocional
                                            ).toFixed(2)}

                                        </strong>

                                      `
                                    : `

                                        <strong class="preco">

                                            R$
                                            ${preco.toFixed(2)}

                                        </strong>

                                      `
                            }


                        </div>


                        <p>

                            <strong>
                                Estoque:
                            </strong>

                            ${
                                produto.estoque ?? 0
                            }

                        </p>


                        <p>

                            ${
                                produto.ativo
                                    ? `
                                        <span class="status ativo">
                                            🟢 Ativo
                                        </span>
                                      `
                                    : `
                                        <span class="status inativo">
                                            🔴 Inativo
                                        </span>
                                      `
                            }

                        </p>


                    </div>


                    <div class="acoes">


                        <button
                            type="button"
                            class="btn-editar"
                            onclick="editarProduto('${produto.id}')"
                        >

                            <i class="fa-solid fa-pen"></i>

                            Editar

                        </button>


                        <button
                            type="button"
                            class="btn-excluir"
                            onclick="excluirProduto('${produto.id}')"
                        >

                            <i class="fa-solid fa-trash"></i>

                            Excluir

                        </button>


                    </div>

                </div>

            `;

        });


    } catch (erro) {

        console.error(
            "Erro ao carregar produtos:",
            erro
        );


        const lista =
            document.getElementById(
                "lista-produtos"
            );


        if (lista) {

            lista.innerHTML = `

                <div class="sem-produtos">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <h3>
                        Erro ao carregar produtos
                    </h3>

                    <p>
                        Tente atualizar a página.
                    </p>

                </div>

            `;

        }

    }

}


// ======================================
// EDITAR PRODUTO
// ======================================

function editarProduto(id) {

    if (!id) {

        alert(
            "Produto não encontrado."
        );

        return;
    }


    window.location.href =
        `editar-produto.html?id=${id}`;

}


// ======================================
// EXCLUIR PRODUTO
// ======================================

async function excluirProduto(id) {

    if (!id) {

        alert(
            "Produto não encontrado."
        );

        return;
    }


    if (!loja?.id) {

        alert(
            "Loja não encontrada."
        );

        return;
    }


    const confirmar =
        confirm(
            "Deseja realmente excluir este produto?"
        );


    if (!confirmar) {

        return;

    }


    try {

        const {
            error
        } = await window.db

            .from("produtos")

            .delete()

            .eq(
                "id",
                id
            )

            .eq(
                "loja_id",
                loja.id
            );


        if (error) {

            throw error;

        }


        alert(
            "Produto excluído com sucesso!"
        );


        await carregarProdutos();

        await carregarEstatisticas();


    } catch (erro) {

        console.error(
            "Erro ao excluir produto:",
            erro
        );


        alert(
            "Erro ao excluir produto."
        );

    }

}


// ======================================
// CARREGAR ESTATÍSTICAS
// ======================================

async function carregarEstatisticas() {

    try {

        if (!loja?.id) {

            return;
        }


        // ==================================
        // TOTAL DE PRODUTOS
        // ==================================

        const {
            count: quantidadeProdutos,
            error: erroProdutos
        } = await window.db

            .from("produtos")

            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )

            .eq(
                "loja_id",
                loja.id
            );


        if (erroProdutos) {

            console.error(
                "Erro ao contar produtos:",
                erroProdutos
            );

        }


        const totalProdutos =
            document.getElementById(
                "total-produtos"
            );


        if (totalProdutos) {

            totalProdutos.textContent =
                quantidadeProdutos || 0;

        }


        // ==================================
        // TOTAL DE PEDIDOS
        // ==================================

        const totalPedidos =
            document.getElementById(
                "total-pedidos"
            );


        if (totalPedidos) {

            totalPedidos.textContent =
                "0";

        }


        // ==================================
        // TOTAL DE VENDAS
        // ==================================

        const totalVendas =
            document.getElementById(
                "total-vendas"
            );


        if (totalVendas) {

            totalVendas.textContent =
                "R$ 0,00";

        }


    } catch (erro) {

        console.error(
            "Erro ao carregar estatísticas:",
            erro
        );

    }

}


// ======================================
// CARREGAR PEDIDOS
// ======================================

async function carregarPedidos() {

    const lista =
        document.getElementById(
            "lista-pedidos"
        );


    if (!lista) {

        return;
    }


    lista.innerHTML = `

        <div class="sem-pedidos">

            <i class="fa-solid fa-cart-shopping"></i>

            <h3>
                Nenhum pedido recebido
            </h3>

            <p>

                Quando algum cliente fizer
                um pedido, ele aparecerá aqui.

            </p>

        </div>

    `;

}