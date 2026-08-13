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

        console.log(
            "Perfil iniciado."
        );


        // ==================================
        // SUPABASE
        // ==================================

        if (!window.db) {

            console.error(
                "Perfil: Supabase não inicializado."
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
        // VERIFICAR SESSÃO
        // ==================================

        const autenticado =
            await verificarUsuario();


        if (!autenticado) {

            return;

        }


        // ==================================
        // CARREGAR DADOS
        // ==================================

        await carregarPerfil();

        await carregarHistoricoCompras();


        // ==================================
        // CONFIGURAR MODAL
        // ==================================

        configurarModalPerfil();

    }
);


// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {

    try {

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


        if (
            !sessaoData.session
        ) {

            notificar(
                "Entre na sua conta para acessar seu perfil.",
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


        usuario =
            sessaoData.session.user;


        console.log(
            "Usuário logado:",
            usuario.id
        );


        return true;


    } catch (erro) {

        console.error(
            "Erro inesperado ao verificar usuário:",
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
// CARREGAR PERFIL
// ==========================================

async function carregarPerfil() {

    if (!usuario) {

        return;

    }


    try {

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "profiles"
                )

                .select(
                    "*"
                )

                .eq(
                    "id",
                    usuario.id
                )

                .maybeSingle();


        if (error) {

            throw error;

        }


        if (!data) {

            notificar(
                "Não foi possível localizar os dados do seu perfil.",
                "erro",
                "Perfil não encontrado"
            );


            return;

        }


        // ==================================
        // NOME
        // ==================================

        definirTexto(
            "perf-nome",
            data.nome ||
            "Sem nome"
        );


        // ==================================
        // EMAIL
        // ==================================

        definirTexto(
            "perf-email",
            usuario.email ||
            ""
        );


        // ==================================
        // TELEFONE
        // ==================================

        definirTexto(
            "perf-telefone",
            data.telefone ||
            "Não informado"
        );


        // ==================================
        // ENDEREÇO
        // ==================================

        const endereco =
            document.getElementById(
                "perf-endereco-resumo"
            );


        if (endereco) {

            if (data.rua) {

                const partes = [];


                let linhaRua =
                    escaparHTML(
                        data.rua
                    );


                if (data.numero) {

                    linhaRua +=
                        `, ${escaparHTML(
                            data.numero
                        )}`;

                }


                partes.push(
                    linhaRua
                );


                if (data.bairro) {

                    partes.push(
                        escaparHTML(
                            data.bairro
                        )
                    );

                }


                if (data.cidade) {

                    partes.push(
                        escaparHTML(
                            data.cidade
                        )
                    );

                }


                endereco.innerHTML =
                    partes.join(
                        "<br>"
                    );


            } else {

                endereco.textContent =
                    "Não informado";

            }

        }


        // ==================================
        // MINHA LOJA
        // ==================================

        await carregarMinhaLoja();


    } catch (erro) {

        console.error(
            "Erro ao carregar perfil:",
            erro
        );


        notificar(
            tratarErroPerfil(
                erro
            ),
            "erro",
            "Erro ao carregar perfil",
            5000
        );

    }

}


// ==========================================
// DEFINIR TEXTO
// ==========================================

function definirTexto(
    id,
    texto
) {

    const elemento =
        document.getElementById(
            id
        );


    if (elemento) {

        elemento.textContent =
            texto;

    }

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


    try {

        const {
            data: loja,
            error
        } =
            await window.db

                .from(
                    "lojas"
                )

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

            throw error;

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
            loja.nome ||
            ""
        );


        // ==================================
        // MOSTRAR LOJA
        // ==================================

        div.innerHTML = `

            <div class="loja-card">

                <h3>
                    ${escaparHTML(
                        loja.nome ||
                        "Loja"
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
                        loja.whatsapp ||
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


    } catch (erro) {

        console.error(
            "Erro ao carregar loja:",
            erro
        );


        div.innerHTML = `

            <div class="sem-loja">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <p>
                    Não foi possível carregar
                    os dados da sua loja.
                </p>

            </div>

        `;

    }

}
// ==========================================
// HISTÓRICO DE COMPRAS
// ==========================================

async function carregarHistoricoCompras() {

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
            "Container do histórico não encontrado."
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
        } =
            await window.db

                .from(
                    "pedidos"
                )

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
                        ascending:
                            false
                    }
                )

                .limit(
                    3
                );


        if (error) {

            throw error;

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
            "Erro ao carregar histórico:",
            erro
        );


        div.innerHTML = `

            <div class="historico-vazio">

                <i class="fa-solid fa-triangle-exclamation"></i>

                <p>
                    Não foi possível carregar
                    seu histórico de compras.
                </p>

                <button
                    type="button"
                    class="btn verde"
                    onclick="carregarHistoricoCompras()"
                >

                    <i class="fa-solid fa-rotate-right"></i>

                    Tentar novamente

                </button>

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
        !Array.isArray(
            itens
        )
    ) {

        return 0;

    }


    return itens.reduce(
        (
            total,
            item
        ) => {

            const quantidade =
                Number(
                    item.quantidade ||
                    0
                );


            return (
                total +
                (
                    Number.isFinite(
                        quantidade
                    )
                        ? quantidade
                        : 0
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
        status ===
        "pendente"
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
        status === "finalizada" ||
        status === "concluido" ||
        status === "concluida" ||
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
        status === "cancelado" ||
        status === "cancelada"
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
            pagamento ||
            ""
        )
            .toLowerCase()
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

            return (
                pagamento ||
                "Não informado"
            );

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


    return String(
        id
    )

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
        valor ||
        0
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
        valor ||
        ""
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
// ABRIR MODAL DE EDIÇÃO
// ==========================================

async function abrirModalEditar() {

    const modal =
        document.getElementById(
            "modal-editar-perfil"
        );


    if (!modal) {

        console.error(
            "#modal-editar-perfil não encontrado."
        );


        return;

    }


    try {

        const {
            data,
            error
        } =
            await window.db

                .from(
                    "profiles"
                )

                .select(
                    "*"
                )

                .eq(
                    "id",
                    usuario.id
                )

                .maybeSingle();


        if (
            error ||
            !data
        ) {

            if (error) {

                throw error;

            }


            throw new Error(
                "Perfil não encontrado."
            );

        }


        // ==================================
        // PREENCHER CAMPOS
        // ==================================

        definirValor(
            "edit-nome",
            data.nome
        );


        definirValor(
            "edit-telefone",
            data.telefone
        );


        definirValor(
            "edit-rua",
            data.rua
        );


        definirValor(
            "edit-numero",
            data.numero
        );


        definirValor(
            "edit-bairro",
            data.bairro
        );


        definirValor(
            "edit-cidade",
            data.cidade
        );


        // ==================================
        // ABRIR
        // ==================================

        modal.style.display =
            "flex";


        modal.classList.add(
            "aberto"
        );


        document.body.style.overflow =
            "hidden";


    } catch (erro) {

        console.error(
            "Erro ao carregar dados de edição:",
            erro
        );


        notificar(
            "Não foi possível carregar os dados para edição.",
            "erro",
            "Erro ao abrir perfil"
        );

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


    if (elemento) {

        elemento.value =
            valor ||
            "";

    }

}


// ==========================================
// FECHAR MODAL
// ==========================================

function fecharModalEditar() {

    const modal =
        document.getElementById(
            "modal-editar-perfil"
        );


    if (!modal) {

        return;

    }


    modal.style.display =
        "none";


    modal.classList.remove(
        "aberto"
    );


    document.body.style.overflow =
        "";

}


// ==========================================
// CONFIGURAR MODAL
// ==========================================

function configurarModalPerfil() {

    const modal =
        document.getElementById(
            "modal-editar-perfil"
        );


    if (!modal) {

        return;

    }


    // ==================================
    // ESC
    // ==================================

    document.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key ===
                    "Escape"
                &&
                (
                    modal.classList.contains(
                        "aberto"
                    )
                    ||
                    modal.style.display ===
                        "flex"
                )
            ) {

                fecharModalEditar();

            }

        }
    );


    // ==================================
    // CLICAR FORA DO CONTEÚDO
    // ==================================

    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                modal
            ) {

                fecharModalEditar();

            }

        }
    );

}


// ==========================================
// SALVAR PERFIL
// ==========================================

async function salvarEdicaoPerfil() {

    if (!usuario) {

        notificar(
            "Não foi possível identificar sua conta.",
            "erro",
            "Usuário não encontrado"
        );


        return;

    }


    const nome =
        valorCampo(
            "edit-nome"
        );


    const telefone =
        valorCampo(
            "edit-telefone"
        );


    const rua =
        valorCampo(
            "edit-rua"
        );


    const numero =
        valorCampo(
            "edit-numero"
        );


    const bairro =
        valorCampo(
            "edit-bairro"
        );


    const cidade =
        valorCampo(
            "edit-cidade"
        );


    // ==================================
    // VALIDAR NOME
    // ==================================

    if (!nome) {

        notificar(
            "Informe seu nome.",
            "aviso",
            "Nome obrigatório"
        );


        focarCampo(
            "edit-nome"
        );


        return;

    }


    if (
        nome.length < 3
    ) {

        notificar(
            "Seu nome deve possuir pelo menos 3 caracteres.",
            "aviso",
            "Nome inválido"
        );


        focarCampo(
            "edit-nome"
        );


        return;

    }


    // ==================================
    // VALIDAR TELEFONE
    // ==================================

    if (telefone) {

        const numeros =
            telefone.replace(
                /\D/g,
                ""
            );


        if (
            numeros.length < 10 ||
            numeros.length > 11
        ) {

            notificar(
                "Digite um telefone válido com DDD.",
                "aviso",
                "Telefone inválido"
            );


            focarCampo(
                "edit-telefone"
            );


            return;

        }

    }


    // ==================================
    // BOTÃO SALVAR
    // ==================================

    const botao =
        document.getElementById(
            "btn-salvar-perfil"
        )
        ||
        document.querySelector(
            "#modal-editar-perfil button[onclick*='salvarEdicaoPerfil']"
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


    let salvamentoConcluido =
        false;


    try {

        const {
            error
        } =
            await window.db

                .from(
                    "profiles"
                )

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

            throw error;

        }


        salvamentoConcluido =
            true;


        // ==================================
        // ATUALIZAR METADATA
        // ==================================

        const {
            error: erroMetadata
        } =
            await window.db
                .auth
                .updateUser({

                    data: {

                        display_name:
                            nome,

                        nome:
                            nome

                    }

                });


        if (erroMetadata) {

            console.warn(
                "Perfil salvo, mas metadata não foi atualizada:",
                erroMetadata
            );

        }


        // ==================================
        // FECHAR MODAL
        // ==================================

        fecharModalEditar();


        // ==================================
        // ATUALIZAR TELA
        // ==================================

        await carregarPerfil();


        if (
            typeof window.atualizarHeader ===
            "function"
        ) {

            await window.atualizarHeader();

        }


        // ==================================
        // SUCESSO
        // ==================================

        notificar(
            "Seus dados foram atualizados com sucesso.",
            "sucesso",
            "Perfil atualizado!",
            3000
        );


    } catch (erro) {

        console.error(
            "Erro ao salvar perfil:",
            erro
        );


        notificar(
            tratarErroPerfil(
                erro
            ),
            "erro",
            "Não foi possível salvar",
            5000
        );


    } finally {

        if (botao) {

            botao.disabled =
                false;


            botao.innerHTML =
                conteudoOriginal ||
                `

                    <i class="fa-solid fa-floppy-disk"></i>

                    Salvar

                `;

        }

    }

}
// ==========================================
// VALOR DO CAMPO
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
// TRATAR ERROS
// ==========================================

function tratarErroPerfil(
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
            "Sua conta não possui permissão para realizar esta alteração."
        );

    }


    // ==================================
    // SESSÃO
    // ==================================

    if (
        texto.includes(
            "jwt"
        )
        ||
        texto.includes(
            "session"
        )
        ||
        texto.includes(
            "auth"
        )
    ) {

        return (
            "Sua sessão expirou. Entre novamente na sua conta."
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
        "Ocorreu um erro. Tente novamente."
    );

}


// ==========================================
// LOGOUT
// ==========================================

async function fazerLogout() {

    let confirmou =
        false;


    // ==================================
    // MODAL PERSONALIZADO
    // ==================================

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


    } else {

        console.warn(
            "feedback.js não foi carregado."
        );


        return;

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
// ESCAPAR HTML
// ==========================================

function escaparHTML(
    valor
) {

    return String(
        valor ??
        ""
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
// FUNÇÕES GLOBAIS
// Usadas por onclick no HTML
// ==========================================

window.abrirModalEditar =
    abrirModalEditar;


window.fecharModalEditar =
    fecharModalEditar;


window.salvarEdicaoPerfil =
    salvarEdicaoPerfil;


window.fazerLogout =
    fazerLogout;


window.carregarHistoricoCompras =
    carregarHistoricoCompras;