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

        // ==================================
        // VERIFICAR SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Supabase não encontrado."
            );

            alert(
                "Erro ao conectar ao Supabase."
            );

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
            "Usuário:",
            usuario
        );


        // ==================================
        // CARREGAR LOJA
        // ==================================

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
// CARREGAR DADOS DA LOJA
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

        console.log(
            "Erro:",
            error
        );


        // ==================================
        // ERRO
        // ==================================

        if (error) {

            console.error(
                "Erro ao carregar loja:",
                error
            );

            throw error;
        }


        // ==================================
        // SEM LOJA
        // ==================================

        if (!data) {

            console.log(
                "Usuário não possui loja."
            );


            window.location.href =
                "cadastrar-loja.html";

            return;
        }


        // ==================================
        // GUARDAR LOJA
        // ==================================

        loja = data;


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

            statusLoja.innerHTML =
                loja.ativa

                    ? "🟢 Ativa"

                    : "🔴 Inativa";

        }


        // ==================================
        // BOTÃO EDITAR LOJA
        // ==================================

        configurarBotaoEditar();


        // ==================================
        // CARREGAR PRODUTOS
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
// CONFIGURAR BOTÃO EDITAR
// ======================================

function configurarBotaoEditar() {

    const botao =
        document.getElementById(
            "btnEditarLoja"
        );


    if (!botao) {

        console.warn(
            "Botão btnEditarLoja não encontrado."
        );

        return;
    }


    if (!loja?.id) {

        console.warn(
            "ID da loja não encontrado."
        );

        return;
    }


    botao.onclick = () => {

        console.log(
            "Abrindo edição da loja:",
            loja.id
        );


        window.location.href =
            `editar-loja.html?id=${loja.id}`;

    };

}


// ======================================
// CARREGAR PRODUTOS
// ======================================

async function carregarProdutos() {

    try {

        console.log(
            "Carregando produtos..."
        );


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


        console.log(
            "Produtos:",
            data
        );


        console.log(
            "Erro produtos:",
            error
        );


        if (error) {

            throw error;

        }


        // ==================================
        // ESTATÍSTICA DE PRODUTOS
        // ==================================

        const totalProdutos =
            document.getElementById(
                "total-produtos"
            );


        if (totalProdutos) {

            totalProdutos.textContent =
                data?.length || 0;

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
        // NENHUM PRODUTO
        // ==================================

        if (
            !data ||
            data.length === 0
        ) {

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

        data.forEach(produto => {

            lista.innerHTML += `

                <div class="produto-card">

                    <img
                        src="${
                            produto.imagem_url ||
                            "img/sem-imagem.png"
                        }"
                        alt="${produto.nome}"
                        class="foto-produto"
                    >


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

                            ${produto.nome}

                        </h3>


                        <p class="descricao">

                            ${
                                produto.descricao ||
                                "Sem descrição."
                            }

                        </p>


                        <div class="precos">

                            <strong class="preco">

                                R$
                                ${Number(
                                    produto.preco || 0
                                ).toFixed(2)}

                            </strong>


                            ${
                                produto.preco_promocional
                                    ? `

                                        <span class="promo">

                                            De R$
                                            ${Number(
                                                produto.preco
                                            ).toFixed(2)}

                                            por

                                            R$
                                            ${Number(
                                                produto.preco_promocional
                                            ).toFixed(2)}

                                        </span>

                                    `
                                    : ""
                            }

                        </div>


                        <p>

                            <strong>
                                Estoque:
                            </strong>

                            ${produto.estoque ?? 0}

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
                            class="btn-editar"
                            onclick="
                                editarProduto('${produto.id}')
                            "
                        >

                            <i class="fa-solid fa-pen"></i>

                            Editar

                        </button>


                        <button
                            class="btn-excluir"
                            onclick="
                                excluirProduto('${produto.id}')
                            "
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

        if (!loja) {

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
                "Erro estatística produtos:",
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
        // PEDIDOS
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
        // VENDAS
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

                Quando algum cliente comprar
                um produto, os pedidos
                aparecerão aqui.

            </p>

        </div>

    `;

}


// ======================================
// FAZER LOGOUT
// ======================================

async function fazerLogout() {

    const sair =
        confirm(
            "Deseja realmente sair da sua conta?"
        );


    if (!sair) {

        return;

    }


    try {

        await window.db.auth.signOut();

        localStorage.clear();

        sessionStorage.clear();

        window.location.href =
            "login.html";


    } catch (erro) {

        console.error(
            "Erro ao sair:",
            erro
        );

        alert(
            "Erro ao sair da conta."
        );

    }

}