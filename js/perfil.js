// ==========================================
// PERFIL.JS
// Comércio da Cidade
// ==========================================

let usuario = null;


// ==========================================
// INICIAR
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        if (!window.db) {

            alert(
                "Erro ao conectar com o banco."
            );

            return;

        }


        // ==================================
        // VERIFICAR SESSÃO
        // ==================================

        const {
            data: sessaoData,
            error: sessaoError
        } = await window.db.auth.getSession();


        if (
            sessaoError ||
            !sessaoData.session
        ) {

            window.location.href =
                "login.html";

            return;

        }


        usuario =
            sessaoData.session.user;


        console.log(
            "Usuário logado:",
            usuario.id
        );


        // ==================================
        // CARREGAR DADOS
        // ==================================

        await carregarPerfil();

        await carregarHistoricoCompras();

    }
);


// ==========================================
// CARREGAR PERFIL
// ==========================================

async function carregarPerfil() {

    const {
        data,
        error
    } = await window.db
        .from("profiles")
        .select("*")
        .eq(
            "id",
            usuario.id
        )
        .single();


    if (error) {

        console.error(
            "Erro ao carregar perfil:",
            error
        );

        alert(
            "Erro ao carregar perfil."
        );

        return;

    }


    // ==================================
    // NOME
    // ==================================

    const nome =
        document.getElementById(
            "perf-nome"
        );


    if (nome) {

        nome.textContent =
            data.nome ||
            "Sem nome";

    }


    // ==================================
    // EMAIL
    // ==================================

    const email =
        document.getElementById(
            "perf-email"
        );


    if (email) {

        email.textContent =
            usuario.email ||
            "";

    }


    // ==================================
    // TELEFONE
    // ==================================

    const telefone =
        document.getElementById(
            "perf-telefone"
        );


    if (telefone) {

        telefone.textContent =
            data.telefone ||
            "Não informado";

    }


    // ==================================
    // ENDEREÇO
    // ==================================

    const endereco =
        document.getElementById(
            "perf-endereco-resumo"
        );


    if (endereco) {

        if (data.rua) {

            endereco.innerHTML = `

                ${escaparHTML(
                    data.rua
                )},

                ${escaparHTML(
                    data.numero || ""
                )}

                <br>

                ${escaparHTML(
                    data.bairro || ""
                )}

                <br>

                ${escaparHTML(
                    data.cidade || ""
                )}

            `;

        } else {

            endereco.textContent =
                "Não informado";

        }

    }


    await carregarMinhaLoja();

}


// ==========================================
// CARREGAR MINHA LOJA
// ==========================================

async function carregarMinhaLoja() {

    const div =
        document.getElementById(
            "minha-loja"
        );


    if (!div) {

        return;

    }


    const {
        data: loja,
        error
    } = await window.db
        .from("lojas")
        .select(`
            *,
            categorias (
                nome
            )
        `)
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

        return;

    }


    // ==================================
    // NÃO POSSUI LOJA
    // ==================================

    if (!loja) {

        localStorage.removeItem(
            "loja_id"
        );

        localStorage.removeItem(
            "nome_loja"
        );


        div.innerHTML = `

            <div class="sem-loja">

                <i class="fa-solid fa-store-slash"></i>

                <h3>
                    Você ainda não possui uma loja.
                </h3>

                <p>
                    Cadastre sua loja gratuitamente
                    e comece a vender.
                </p>

                <a
                    href="cadastrar-loja.html"
                    class="btn verde"
                >

                    <i class="fa-solid fa-plus"></i>

                    Cadastrar Loja

                </a>

            </div>

        `;


        return;

    }


    // ==================================
    // GUARDAR LOJA
    // ==================================

    localStorage.setItem(
        "loja_id",
        loja.id
    );

    localStorage.setItem(
        "nome_loja",
        loja.nome
    );


    // ==================================
    // MOSTRAR LOJA
    // ==================================

    div.innerHTML = `

        <div class="loja-card">

            <h3>
                ${escaparHTML(
                    loja.nome
                )}
            </h3>


            <p>

                <strong>
                    Categoria:
                </strong>

                ${escaparHTML(
                    loja.categorias?.nome ||
                    "Sem categoria"
                )}

            </p>


            <p>

                <strong>
                    Descrição:
                </strong>

                ${escaparHTML(
                    loja.descricao ||
                    "-"
                )}

            </p>


            <p>

                <strong>
                    Telefone:
                </strong>

                ${escaparHTML(
                    loja.telefone ||
                    "-"
                )}

            </p>


            <p>

                <strong>
                    Cidade:
                </strong>

                ${escaparHTML(
                    loja.cidade ||
                    "-"
                )}

            </p>


            <p>

                <strong>
                    Status:
                </strong>

                ${
                    loja.ativa
                        ? "🟢 Ativa"
                        : "🔴 Inativa"
                }

            </p>


            <br>


            <a
                href="painel-loja.html"
                class="btn verde"
            >

                <i class="fa-solid fa-store"></i>

                Entrar no Painel

            </a>

        </div>

    `;

}


// ==========================================
// HISTÓRICO DE COMPRAS
// ==========================================

async function carregarHistoricoCompras() {

    // Tenta localizar o container usando
    // nomes comuns para não quebrar seu HTML atual.

    const div =
        document.getElementById(
            "historico-pedidos"
        )
        ||
        document.getElementById(
            "historico-compras"
        )
        ||
        document.getElementById(
            "lista-historico"
        )
        ||
        document.getElementById(
            "lista-pedidos"
        );


    if (!div) {

        console.warn(
            "Container do histórico de compras não encontrado."
        );

        return;

    }


    div.innerHTML = `

        <div class="historico-carregando">

            <i class="fa-solid fa-spinner fa-spin"></i>

            Carregando pedidos...

        </div>

    `;


    try {

        const {
            data,
            error
        } = await window.db
            .from("pedidos")
            .select(`
                id,
                loja_id,
                status,
                valor_total,
                forma_pagamento,
                created_at,

                lojas (
                    id,
                    nome
                ),

                itens_pedido (
                    id,
                    quantidade
                )
            `)
            .eq(
                "cliente_id",
                usuario.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(3);


        if (error) {

            console.error(
                "Erro ao carregar histórico:",
                error
            );


            div.innerHTML = `

                <div class="historico-vazio">

                    <i class="fa-solid fa-triangle-exclamation"></i>

                    <p>
                        Não foi possível carregar
                        seu histórico de compras.
                    </p>

                </div>

            `;


            return;

        }


        const pedidos =
            Array.isArray(data)
                ? data
                : [];


        // ==================================
        // SEM PEDIDOS
        // ==================================

        if (
            pedidos.length === 0
        ) {

            div.innerHTML = `

                <div class="historico-vazio">

                    <i class="fa-solid fa-bag-shopping"></i>

                    <p>
                        Você ainda não realizou nenhuma compra.
                    </p>

                    <a
                        href="index.html"
                        class="btn verde"
                    >

                        <i class="fa-solid fa-store"></i>

                        Explorar lojas

                    </a>

                </div>

            `;


            return;

        }


        // ==================================
        // MOSTRAR PEDIDOS
        // ==================================

        let html =
            "";


        pedidos.forEach(
            (pedido) => {

                const nomeLoja =
                    pedido.lojas?.nome ||
                    "Loja";


                const status =
                    obterStatusPedido(
                        pedido.status
                    );


                const quantidade =
                    calcularQuantidadeItens(
                        pedido.itens_pedido
                    );


                html += `

                    <div class="historico-pedido">


                        <div class="historico-pedido-topo">


                            <div class="historico-loja">

                                <i class="fa-solid fa-store"></i>

                                <strong>

                                    ${escaparHTML(
                                        nomeLoja
                                    )}

                                </strong>

                            </div>


                            <span
                                class="historico-status ${status.classe}"
                            >

                                ${status.icone}

                                ${status.texto}

                            </span>


                        </div>


                        <div class="historico-pedido-info">


                            <div>

                                <strong>

                                    Pedido
                                    #${formatarNumeroPedido(
                                        pedido.id
                                    )}

                                </strong>


                                <span>

                                    ${formatarData(
                                        pedido.created_at
                                    )}

                                </span>

                            </div>


                            <div class="historico-quantidade">

                                <i class="fa-solid fa-box"></i>

                                ${quantidade}

                                ${
                                    quantidade === 1
                                        ? "item"
                                        : "itens"
                                }

                            </div>


                        </div>


                        <div class="historico-pedido-rodape">


                            <span>

                                ${formatarPagamento(
                                    pedido.forma_pagamento
                                )}

                            </span>


                            <strong>

                                ${formatarMoeda(
                                    pedido.valor_total
                                )}

                            </strong>


                        </div>


                    </div>

                `;

            }
        );


        // ==================================
        // VER TODOS
        // ==================================

        html += `

            <a
                href="meus-pedidos.html"
                class="btn-ver-pedidos"
            >

                <i class="fa-solid fa-receipt"></i>

                Ver todos os pedidos

            </a>

        `;


        div.innerHTML =
            html;


    } catch (erro) {

        console.error(
            "Erro inesperado no histórico:",
            erro
        );


        div.innerHTML = `

            <div class="historico-vazio">

                <p>
                    Erro ao carregar pedidos.
                </p>

            </div>

        `;

    }

}


// ==========================================
// CALCULAR QUANTIDADE DE ITENS
// ==========================================

function calcularQuantidadeItens(
    itens
) {

    if (
        !Array.isArray(itens)
    ) {

        return 0;

    }


    return itens.reduce(
        (
            total,
            item
        ) => {

            return (
                total +
                Number(
                    item.quantidade || 0
                )
            );

        },
        0
    );

}


// ==========================================
// STATUS DO PEDIDO
// ==========================================

function obterStatusPedido(
    statusOriginal
) {

    const status =
        normalizarTexto(
            statusOriginal ||
            "pendente"
        );


    if (
        status === "pendente"
    ) {

        return {

            texto:
                "Pendente",

            classe:
                "pendente",

            icone:
                "🟡"

        };

    }


    if (
        status === "preparando" ||
        status === "em preparo" ||
        status === "em preparacao"
    ) {

        return {

            texto:
                "Preparando",

            classe:
                "preparando",

            icone:
                "🔵"

        };

    }


    if (
        status === "finalizado" ||
        status === "concluido" ||
        status === "entregue"
    ) {

        return {

            texto:
                "Finalizado",

            classe:
                "finalizado",

            icone:
                "🟢"

        };

    }


    if (
        status === "cancelado"
    ) {

        return {

            texto:
                "Cancelado",

            classe:
                "cancelado",

            icone:
                "🔴"

        };

    }


    return {

        texto:
            statusOriginal ||
            "Pendente",

        classe:
            "pendente",

        icone:
            "🟡"

    };

}


// ==========================================
// FORMATAR PAGAMENTO
// ==========================================

function formatarPagamento(
    pagamento
) {

    switch (
        String(
            pagamento || ""
        ).toLowerCase()
    ) {

        case "pix":

            return "PIX";


        case "credito":

            return "Cartão de Crédito";


        case "debito":

            return "Cartão de Débito";


        case "dinheiro":

            return "Dinheiro";


        default:

            return pagamento ||
                "Não informado";

    }

}


// ==========================================
// FORMATAR NÚMERO DO PEDIDO
// ==========================================

function formatarNumeroPedido(
    id
) {

    if (!id) {

        return "------";

    }


    return String(id)

        .replaceAll(
            "-",
            ""
        )

        .substring(
            0,
            8
        )

        .toUpperCase();

}


// ==========================================
// FORMATAR DATA
// ==========================================

function formatarData(
    data
) {

    if (!data) {

        return "";

    }


    const dataPedido =
        new Date(
            data
        );


    if (
        Number.isNaN(
            dataPedido.getTime()
        )
    ) {

        return "";

    }


    return dataPedido.toLocaleString(
        "pt-BR",
        {

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"

        }
    );

}


// ==========================================
// FORMATAR MOEDA
// ==========================================

function formatarMoeda(
    valor
) {

    return Number(
        valor || 0
    )
        .toLocaleString(
            "pt-BR",
            {

                style:
                    "currency",

                currency:
                    "BRL"

            }
        );

}


// ==========================================
// NORMALIZAR TEXTO
// ==========================================

function normalizarTexto(
    valor
) {

    return String(
        valor || ""
    )

        .normalize(
            "NFD"
        )

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

        .trim()

        .toLowerCase();

}


// ==========================================
// ESCAPAR HTML
// ==========================================

function escaparHTML(
    valor
) {

    return String(
        valor ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ==========================================
// ABRIR MODAL
// ==========================================

async function abrirModalEditar() {

    const modal =
        document.getElementById(
            "modal-editar-perfil"
        );


    if (!modal) {

        return;

    }


    modal.style.display =
        "flex";


    const {
        data,
        error
    } = await window.db
        .from("profiles")
        .select("*")
        .eq(
            "id",
            usuario.id
        )
        .single();


    if (
        error ||
        !data
    ) {

        console.error(
            "Erro ao carregar dados de edição:",
            error
        );

        return;

    }


    document.getElementById(
        "edit-nome"
    ).value =
        data.nome || "";


    document.getElementById(
        "edit-telefone"
    ).value =
        data.telefone || "";


    document.getElementById(
        "edit-rua"
    ).value =
        data.rua || "";


    document.getElementById(
        "edit-numero"
    ).value =
        data.numero || "";


    document.getElementById(
        "edit-bairro"
    ).value =
        data.bairro || "";


    document.getElementById(
        "edit-cidade"
    ).value =
        data.cidade || "";

}


// ==========================================
// FECHAR MODAL
// ==========================================

function fecharModalEditar() {

    const modal =
        document.getElementById(
            "modal-editar-perfil"
        );


    if (modal) {

        modal.style.display =
            "none";

    }

}


// ==========================================
// SALVAR PERFIL
// ==========================================

async function salvarEdicaoPerfil() {

    const nome =
        document.getElementById(
            "edit-nome"
        ).value.trim();


    const telefone =
        document.getElementById(
            "edit-telefone"
        ).value.trim();


    const rua =
        document.getElementById(
            "edit-rua"
        ).value.trim();


    const numero =
        document.getElementById(
            "edit-numero"
        ).value.trim();


    const bairro =
        document.getElementById(
            "edit-bairro"
        ).value.trim();


    const cidade =
        document.getElementById(
            "edit-cidade"
        ).value.trim();


    const {
        error
    } = await window.db
        .from("profiles")
        .update({

            nome,
            telefone,
            rua,
            numero,
            bairro,
            cidade

        })
        .eq(
            "id",
            usuario.id
        );


    if (error) {

        console.error(
            "Erro ao salvar perfil:",
            error
        );


        alert(
            "Erro ao salvar perfil."
        );


        return;

    }


    alert(
        "Perfil atualizado com sucesso!"
    );


    fecharModalEditar();


    await carregarPerfil();

}


// ==========================================
// LOGOUT
// ==========================================

async function fazerLogout() {

    if (
        !confirm(
            "Deseja realmente sair?"
        )
    ) {

        return;

    }


    await window.db.auth.signOut();


    localStorage.removeItem(
        "loja_id"
    );


    localStorage.removeItem(
        "nome_loja"
    );


    window.location.href =
        "login.html";

}