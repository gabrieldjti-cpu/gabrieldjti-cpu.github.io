// ==========================================
// ADMIN-USUARIOS.JS
// Comércio da Cidade — RF-22
// ==========================================

(() => {
    "use strict";

    const PAPEIS = new Set(["", "cliente", "lojista", "admin"]);
    const STATUS = new Set(["", "ativo", "bloqueado", "excluido"]);
    const ORDENACOES = new Set(["recentes", "antigos", "nome", "ultimo_acesso"]);

    const estado = {
        adminId: null,
        usuarios: new Map(),
        pagina: 1,
        porPagina: 12,
        total: 0,
        busca: "",
        papel: "",
        status: "",
        ordenacao: "recentes",
        requisicaoLista: 0,
        timerBusca: null,
        acaoAtual: null,
        usuarioAtual: null,
        focoAnterior: null,
        historicoPagina: 1,
        historicoPorPagina: 8,
        historicoTotal: 0,
        requisicaoHistorico: 0
    };

    document.addEventListener("DOMContentLoaded", iniciarGestaoUsuarios);

    async function iniciarGestaoUsuarios() {
        if (!window.db) {
            mostrarEstadoUsuarios(
                "fa-triangle-exclamation",
                "Não foi possível conectar",
                "Atualize a página e tente novamente."
            );
            avisarUsuarioAdmin("Não foi possível conectar ao sistema.", "erro", "Erro de conexão");
            return;
        }

        lerFiltrosUrl();
        preencherFiltros();

        try {
            const { data: sessaoData, error: sessaoError } = await window.db.auth.getSession();
            if (sessaoError || !sessaoData?.session) {
                window.location.href = "login.html";
                return;
            }

            const { data: usuarioData, error: usuarioError } = await window.db.auth.getUser();
            if (usuarioError || !usuarioData?.user) {
                window.location.href = "login.html";
                return;
            }

            estado.adminId = usuarioData.user.id;

            const { data: admin, error: adminError } = await window.db.rpc("sou_admin");
            if (adminError || admin !== true) {
                mostrarEstadoUsuarios(
                    "fa-lock",
                    "Acesso restrito",
                    "Esta área é exclusiva para administradores da plataforma."
                );
                avisarUsuarioAdmin(
                    adminError
                        ? "Não foi possível validar sua permissão administrativa."
                        : "Esta área é exclusiva para administradores.",
                    adminError ? "erro" : "aviso",
                    adminError ? "Erro de permissão" : "Acesso restrito"
                );

                if (!adminError) {
                    setTimeout(() => {
                        window.location.href = "perfil.html";
                    }, 1600);
                }
                return;
            }

            configurarEventosUsuarios();
            await atualizarGestaoUsuarios();
        } catch (erro) {
            console.error("Erro ao iniciar gestão de usuários:", erro);
            mostrarEstadoUsuarios(
                "fa-triangle-exclamation",
                "Não foi possível carregar a área",
                "Atualize a página e tente novamente."
            );
        }
    }

    function configurarEventosUsuarios() {
        const busca = document.getElementById("buscaUsuariosAdmin");
        const papel = document.getElementById("filtroPapelUsuario");
        const status = document.getElementById("filtroStatusUsuario");
        const ordenacao = document.getElementById("ordenacaoUsuariosAdmin");
        const formFiltros = document.getElementById("formFiltrosUsuarios");
        const atualizar = document.getElementById("btnAtualizarUsuarios");
        const limpar = document.getElementById("btnLimparFiltrosUsuarios");
        const lista = document.getElementById("listaUsuariosAdmin");
        const formAcao = document.getElementById("formAcaoUsuario");
        const motivo = document.getElementById("motivoAcaoUsuario");

        formFiltros?.addEventListener("submit", event => {
            event.preventDefault();
            aplicarBusca(busca?.value || "");
        });

        busca?.addEventListener("input", () => {
            clearTimeout(estado.timerBusca);
            estado.timerBusca = setTimeout(() => {
                aplicarBusca(busca.value);
            }, 350);
        });

        papel?.addEventListener("change", () => alterarFiltro("papel", papel.value));
        status?.addEventListener("change", () => alterarFiltro("status", status.value));
        ordenacao?.addEventListener("change", () => alterarFiltro("ordenacao", ordenacao.value));

        limpar?.addEventListener("click", limparFiltros);
        atualizar?.addEventListener("click", () => executarComBotaoUsuario(
            atualizar,
            '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando',
            atualizarGestaoUsuarios
        ));

        document.getElementById("btnSairAdmin")?.addEventListener("click", sairGestaoUsuarios);
        document.getElementById("paginaAnteriorUsuarios")?.addEventListener("click", () => mudarPaginaUsuarios(-1));
        document.getElementById("proximaPaginaUsuarios")?.addEventListener("click", () => mudarPaginaUsuarios(1));
        document.getElementById("historicoUsuarioAnterior")?.addEventListener("click", () => mudarPaginaHistorico(-1));
        document.getElementById("historicoUsuarioProximo")?.addEventListener("click", () => mudarPaginaHistorico(1));

        lista?.addEventListener("click", event => {
            const botaoAcao = event.target.closest("[data-acao-usuario]");
            const botaoHistorico = event.target.closest("[data-historico-usuario]");
            const botaoRecarregar = event.target.closest("[data-recarregar-usuarios]");

            if (botaoAcao) {
                abrirModalAcaoUsuario(
                    botaoAcao.dataset.usuarioId,
                    botaoAcao.dataset.acaoUsuario,
                    botaoAcao
                );
            } else if (botaoHistorico) {
                abrirHistoricoUsuario(botaoHistorico.dataset.historicoUsuario, botaoHistorico);
            } else if (botaoRecarregar) {
                atualizarGestaoUsuarios();
            }
        });

        formAcao?.addEventListener("submit", confirmarAcaoUsuario);

        motivo?.addEventListener("input", () => {
            definirTextoUsuario("contadorMotivoUsuario", motivo.value.length);
        });

        document.querySelectorAll("[data-fechar-modal-usuario]").forEach(elemento => {
            elemento.addEventListener("click", () => {
                fecharModalUsuario(elemento.dataset.fecharModalUsuario);
            });
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                fecharModalUsuario("acao");
                fecharModalUsuario("historico");
            }
        });
    }

    async function atualizarGestaoUsuarios() {
        await Promise.all([carregarResumoUsuarios(), carregarUsuarios()]);
    }

    async function carregarResumoUsuarios() {
        try {
            const { data, error } = await window.db.rpc("resumo_usuarios_admin");
            if (error) throw error;

            const resumo = data?.[0] || {};
            definirTextoUsuario("metricaTotalUsuarios", formatarInteiro(resumo.total_usuarios));
            definirTextoUsuario("metricaUsuariosAtivos", formatarInteiro(resumo.usuarios_ativos));
            definirTextoUsuario("metricaUsuariosBloqueados", formatarInteiro(resumo.usuarios_bloqueados));
            definirTextoUsuario("metricaUsuariosExcluidos", formatarInteiro(resumo.usuarios_excluidos));
            definirTextoUsuario(
                "resumoPapeisUsuarios",
                `${formatarInteiro(resumo.total_clientes)} clientes · ${formatarInteiro(resumo.total_lojistas)} lojistas · ${formatarInteiro(resumo.total_admins)} administradores`
            );
        } catch (erro) {
            console.error("Erro ao carregar resumo de usuários:", erro);
            [
                "metricaTotalUsuarios",
                "metricaUsuariosAtivos",
                "metricaUsuariosBloqueados",
                "metricaUsuariosExcluidos"
            ].forEach(id => definirTextoUsuario(id, "—"));
            definirTextoUsuario("resumoPapeisUsuarios", "Resumo de papéis indisponível.");
        }
    }

    async function carregarUsuarios() {
        const lista = document.getElementById("listaUsuariosAdmin");
        const requisicao = ++estado.requisicaoLista;
        const offset = (estado.pagina - 1) * estado.porPagina;

        if (lista) {
            lista.setAttribute("aria-busy", "true");
            lista.innerHTML = `
                <div class="estado-admin">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>Carregando usuários...</h3>
                </div>
            `;
        }
        ocultarPaginacaoUsuarios();

        try {
            const { data, error } = await window.db.rpc("listar_usuarios_admin", {
                p_busca: estado.busca,
                p_papel: estado.papel,
                p_status: estado.status,
                p_ordenacao: estado.ordenacao,
                p_limite: estado.porPagina,
                p_offset: offset
            });

            if (requisicao !== estado.requisicaoLista) return;
            if (error) throw error;

            const usuarios = Array.isArray(data) ? data : [];
            estado.total = Number(usuarios[0]?.total_registros || 0);

            const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));
            if (estado.total > 0 && estado.pagina > totalPaginas) {
                estado.pagina = totalPaginas;
                atualizarUrlUsuarios();
                await carregarUsuarios();
                return;
            }

            estado.usuarios = new Map(usuarios.map(usuario => [usuario.usuario_id, usuario]));
            renderizarUsuarios(usuarios);
            atualizarPaginacaoUsuarios();
            atualizarTextoResultado();
        } catch (erro) {
            if (requisicao !== estado.requisicaoLista) return;
            console.error("Erro ao listar usuários:", erro);
            mostrarEstadoUsuarios(
                "fa-triangle-exclamation",
                "Não foi possível carregar os usuários",
                "Tente atualizar o painel.",
                true
            );
            avisarUsuarioAdmin("Não foi possível carregar os usuários.", "erro", "Erro ao carregar");
        } finally {
            if (requisicao === estado.requisicaoLista) {
                lista?.setAttribute("aria-busy", "false");
            }
        }
    }

    function renderizarUsuarios(usuarios) {
        const lista = document.getElementById("listaUsuariosAdmin");
        if (!lista) return;

        if (!usuarios.length) {
            lista.innerHTML = `
                <div class="estado-admin">
                    <i class="fa-solid fa-user-slash"></i>
                    <h3>Nenhum usuário encontrado</h3>
                    <p>Altere os filtros para ampliar a busca.</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = usuarios.map(criarCardUsuario).join("");
    }

    function criarCardUsuario(usuario) {
        const id = escaparAtributoUsuario(usuario.usuario_id || "");
        const nome = escaparHTMLUsuario(usuario.nome || "Usuário");
        const email = escaparHTMLUsuario(usuario.email || "E-mail indisponível");
        const papel = obterPapelUsuario(usuario.tipo_usuario);
        const status = obterStatusUsuario(usuario.status_conta);
        const proprio = usuario.usuario_id === estado.adminId;
        const excluido = usuario.status_conta === "excluido";
        const bloqueado = usuario.status_conta === "bloqueado";
        const totalLojas = Number(usuario.total_lojas || 0);

        let acoes = "";

        if (proprio) {
            acoes = `
                <button type="button" class="btn-admin btn-papel" disabled title="Sua própria conta é protegida">
                    <i class="fa-solid fa-shield-halved"></i>
                    Conta protegida
                </button>
                <p class="usuario-protecao-admin">Para evitar perda de acesso, você não pode alterar o papel ou bloquear a própria conta.</p>
            `;
        } else if (excluido) {
            acoes = `
                <button type="button" class="btn-admin btn-claro" disabled>
                    <i class="fa-solid fa-user-slash"></i>
                    Conta excluída
                </button>
            `;
        } else {
            acoes = `
                <button type="button" class="btn-admin btn-papel" data-acao-usuario="alterar_papel" data-usuario-id="${id}" ${bloqueado ? "disabled title=\"Desbloqueie a conta antes de mudar o papel\"" : ""}>
                    <i class="fa-solid fa-user-tag"></i>
                    Alterar papel
                </button>
                <button type="button" class="btn-admin ${bloqueado ? "btn-desbloquear" : "btn-bloquear"}" data-acao-usuario="${bloqueado ? "desbloquear" : "bloquear"}" data-usuario-id="${id}">
                    <i class="fa-solid ${bloqueado ? "fa-user-check" : "fa-user-lock"}"></i>
                    ${bloqueado ? "Desbloquear" : "Bloquear"}
                </button>
            `;
        }

        return `
            <article class="usuario-admin-card ${proprio ? "usuario-atual" : ""}" data-usuario-card="${id}">
                <div class="usuario-card-topo">
                    <span class="usuario-avatar-admin" aria-hidden="true">${escaparHTMLUsuario(obterIniciaisUsuario(usuario.nome))}</span>
                    <div class="usuario-identidade-admin">
                        <h2 title="${nome}">${nome}</h2>
                        <p title="${email}">${email}</p>
                    </div>
                    <div class="usuario-selos-admin">
                        ${proprio ? '<span class="selo-usuario selo-proprio"><i class="fa-solid fa-user-shield"></i> Sua conta</span>' : ""}
                        <span class="selo-usuario ${papel.classe}"><i class="fa-solid ${papel.icone}"></i> ${papel.rotulo}</span>
                        <span class="selo-usuario ${status.classe}"><i class="fa-solid ${status.icone}"></i> ${status.rotulo}</span>
                    </div>
                </div>

                <div class="usuario-dados-admin">
                    <div class="usuario-dado-admin">
                        <span>Pedidos</span>
                        <strong>${formatarInteiro(usuario.total_pedidos)}</strong>
                    </div>
                    <div class="usuario-dado-admin">
                        <span>Total confirmado</span>
                        <strong>${formatarMoeda(usuario.total_compras)}</strong>
                    </div>
                    <div class="usuario-dado-admin">
                        <span>Lojas</span>
                        <strong>${formatarInteiro(totalLojas)}</strong>
                    </div>
                </div>

                <div class="usuario-detalhes-admin">
                    <div class="usuario-detalhe-admin">
                        <span>Cadastro</span>
                        <strong>${formatarData(usuario.criado_em)}</strong>
                    </div>
                    <div class="usuario-detalhe-admin">
                        <span>Último acesso</span>
                        <strong>${formatarDataHora(usuario.ultimo_acesso, "Nunca")}</strong>
                    </div>
                    <div class="usuario-detalhe-admin">
                        <span>E-mail</span>
                        <strong>${usuario.email_confirmado ? "Confirmado" : "Não confirmado"}</strong>
                    </div>
                </div>

                <div class="usuario-acoes-admin">
                    ${acoes}
                    <button type="button" class="btn-admin btn-claro" data-historico-usuario="${id}">
                        <i class="fa-solid fa-clock-rotate-left"></i>
                        Histórico
                    </button>
                </div>
            </article>
        `;
    }

    function aplicarBusca(valor) {
        estado.busca = String(valor || "").trim().slice(0, 100);
        estado.pagina = 1;
        atualizarUrlUsuarios();
        carregarUsuarios();
    }

    function alterarFiltro(tipo, valor) {
        if (tipo === "papel") estado.papel = PAPEIS.has(valor) ? valor : "";
        if (tipo === "status") estado.status = STATUS.has(valor) ? valor : "";
        if (tipo === "ordenacao") estado.ordenacao = ORDENACOES.has(valor) ? valor : "recentes";
        estado.pagina = 1;
        atualizarUrlUsuarios();
        carregarUsuarios();
    }

    async function limparFiltros() {
        clearTimeout(estado.timerBusca);
        estado.busca = "";
        estado.papel = "";
        estado.status = "";
        estado.ordenacao = "recentes";
        estado.pagina = 1;
        preencherFiltros();
        atualizarUrlUsuarios();
        await carregarUsuarios();
    }

    async function mudarPaginaUsuarios(direcao) {
        const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));
        const pagina = Math.min(totalPaginas, Math.max(1, estado.pagina + direcao));
        if (pagina === estado.pagina) return;

        estado.pagina = pagina;
        atualizarUrlUsuarios();
        await carregarUsuarios();
        document.getElementById("listaUsuariosAdmin")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function atualizarPaginacaoUsuarios() {
        const paginacao = document.getElementById("paginacaoUsuariosAdmin");
        const anterior = document.getElementById("paginaAnteriorUsuarios");
        const proxima = document.getElementById("proximaPaginaUsuarios");
        const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));
        const inicio = estado.total ? (estado.pagina - 1) * estado.porPagina + 1 : 0;
        const fim = Math.min(estado.pagina * estado.porPagina, estado.total);

        if (!paginacao) return;
        paginacao.hidden = estado.total <= estado.porPagina;
        if (anterior) anterior.disabled = estado.pagina <= 1;
        if (proxima) proxima.disabled = estado.pagina >= totalPaginas;
        definirTextoUsuario("paginaAtualUsuarios", `Página ${estado.pagina} de ${totalPaginas}`);

        const resumo = document.getElementById("resumoPaginacaoUsuarios");
        if (resumo) {
            resumo.innerHTML = `Mostrando <strong>${inicio}–${fim}</strong> de <strong>${estado.total}</strong> usuários`;
        }
    }

    function ocultarPaginacaoUsuarios() {
        const paginacao = document.getElementById("paginacaoUsuariosAdmin");
        if (paginacao) paginacao.hidden = true;
    }

    function atualizarTextoResultado() {
        const texto = estado.total === 1
            ? "1 usuário encontrado"
            : `${estado.total} usuários encontrados`;
        definirTextoUsuario("textoResultadoUsuarios", texto);
    }

    function abrirModalAcaoUsuario(usuarioId, acao, botaoOrigem) {
        const usuario = estado.usuarios.get(usuarioId);
        const modal = document.getElementById("modalAcaoUsuario");
        if (!usuario || !modal || usuario.usuario_id === estado.adminId) return;
        if (!["bloquear", "desbloquear", "alterar_papel"].includes(acao)) return;

        estado.usuarioAtual = usuario;
        estado.acaoAtual = acao;
        estado.focoAnterior = botaoOrigem || document.activeElement;

        const nome = usuario.nome || "Usuário";
        const campoPapel = document.getElementById("campoNovoPapelUsuario");
        const selectPapel = document.getElementById("novoPapelUsuario");
        const alerta = document.getElementById("alertaModalAcaoUsuario");
        const icone = document.getElementById("iconeModalAcaoUsuario");
        const confirmar = document.getElementById("btnConfirmarAcaoUsuario");
        const motivo = document.getElementById("motivoAcaoUsuario");

        campoPapel.hidden = acao !== "alterar_papel";
        alerta.hidden = true;
        alerta.textContent = "";
        icone.className = "modal-icone-usuario";
        motivo.value = "";
        definirTextoUsuario("contadorMotivoUsuario", 0);

        if (acao === "bloquear") {
            definirTextoUsuario("tituloModalAcaoUsuario", "Bloquear usuário");
            definirTextoUsuario("descricaoModalAcaoUsuario", `A conta de ${nome} não poderá entrar ou utilizar o marketplace.`);
            confirmar.innerHTML = '<i class="fa-solid fa-user-lock"></i> Bloquear conta';
            confirmar.className = "btn-admin btn-perigo";
            icone.classList.add("icone-bloquear");
            icone.innerHTML = '<i class="fa-solid fa-user-lock"></i>';

            if (Number(usuario.total_lojas || 0) > 0) {
                alerta.hidden = false;
                alerta.textContent = "As lojas deste usuário serão suspensas e não voltarão automaticamente quando a conta for desbloqueada.";
            }
        } else if (acao === "desbloquear") {
            definirTextoUsuario("tituloModalAcaoUsuario", "Desbloquear usuário");
            definirTextoUsuario("descricaoModalAcaoUsuario", `A conta de ${nome} poderá entrar novamente no marketplace.`);
            confirmar.innerHTML = '<i class="fa-solid fa-user-check"></i> Desbloquear conta';
            confirmar.className = "btn-admin btn-primario";
            icone.classList.add("icone-desbloquear");
            icone.innerHTML = '<i class="fa-solid fa-user-check"></i>';

            if (Number(usuario.total_lojas || 0) > 0) {
                alerta.hidden = false;
                alerta.textContent = "O desbloqueio não reativa lojas suspensas. Revise a loja separadamente antes de aprová-la novamente.";
            }
        } else {
            definirTextoUsuario("tituloModalAcaoUsuario", "Alterar papel do usuário");
            definirTextoUsuario("descricaoModalAcaoUsuario", `Escolha o novo nível de acesso de ${nome}.`);
            confirmar.innerHTML = '<i class="fa-solid fa-user-tag"></i> Alterar papel';
            confirmar.className = "btn-admin btn-primario";
            icone.innerHTML = '<i class="fa-solid fa-user-tag"></i>';

            if (selectPapel) {
                const proximo = ["cliente", "lojista"]
                    .find(papel => papel !== usuario.tipo_usuario) || "cliente";
                selectPapel.value = proximo;
            }

            if (Number(usuario.total_lojas || 0) > 0) {
                alerta.hidden = false;
                alerta.textContent = "Proprietários de loja não podem ser alterados para cliente enquanto a loja estiver vinculada à conta.";
            }
        }

        modal.hidden = false;
        document.body.classList.add("modal-aberto");
        setTimeout(() => motivo.focus(), 0);
    }

    async function confirmarAcaoUsuario(event) {
        event.preventDefault();

        const usuario = estado.usuarioAtual;
        const acao = estado.acaoAtual;
        const motivo = document.getElementById("motivoAcaoUsuario")?.value?.trim() || "";
        const novoPapel = document.getElementById("novoPapelUsuario")?.value || null;
        const botao = document.getElementById("btnConfirmarAcaoUsuario");

        if (!usuario || !acao || !botao) return;

        if (motivo.length < 5) {
            avisarUsuarioAdmin("Informe um motivo com pelo menos 5 caracteres.", "aviso", "Motivo obrigatório");
            document.getElementById("motivoAcaoUsuario")?.focus();
            return;
        }

        const original = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando';

        try {
            const { data, error } = await window.db.functions.invoke("admin-usuarios", {
                body: {
                    acao,
                    usuario_id: usuario.usuario_id,
                    novo_papel: acao === "alterar_papel" ? novoPapel : null,
                    motivo
                }
            });

            if (error) {
                throw new Error(await extrairMensagemErroFuncao(error));
            }

            if (data?.erro) throw new Error(data.erro);
            if (data?.sucesso !== true) throw new Error("A alteração não foi confirmada pelo servidor.");

            const mensagens = {
                bloquear: "Conta bloqueada com sucesso.",
                desbloquear: "Conta desbloqueada com sucesso.",
                alterar_papel: "Papel do usuário alterado com sucesso."
            };

            fecharModalUsuario("acao");
            avisarUsuarioAdmin(mensagens[acao], "sucesso", "Alteração concluída");
            await atualizarGestaoUsuarios();
        } catch (erro) {
            console.error("Erro ao administrar usuário:", erro);
            avisarUsuarioAdmin(
                erro?.message || "Não foi possível concluir a alteração.",
                "erro",
                "Alteração não realizada"
            );
        } finally {
            botao.disabled = false;
            botao.innerHTML = original;
        }
    }

    async function extrairMensagemErroFuncao(erro) {
        try {
            if (erro?.context && typeof erro.context.json === "function") {
                const corpo = await erro.context.json();
                if (corpo?.erro) return corpo.erro;
            }
        } catch (falha) {
            console.warn("Não foi possível interpretar o erro da função:", falha);
        }

        return erro?.message || "Não foi possível concluir a alteração.";
    }

    async function abrirHistoricoUsuario(usuarioId, botaoOrigem) {
        const usuario = estado.usuarios.get(usuarioId);
        const modal = document.getElementById("modalHistoricoUsuario");
        if (!usuario || !modal) return;

        estado.usuarioAtual = usuario;
        estado.historicoPagina = 1;
        estado.focoAnterior = botaoOrigem || document.activeElement;
        definirTextoUsuario("tituloHistoricoUsuario", "Histórico administrativo");
        definirTextoUsuario("descricaoHistoricoUsuario", `Alterações registradas para ${usuario.nome || "este usuário"}.`);

        modal.hidden = false;
        document.body.classList.add("modal-aberto");
        modal.querySelector(".modal-fechar")?.focus();
        await carregarHistoricoUsuario();
    }

    async function carregarHistoricoUsuario() {
        const usuario = estado.usuarioAtual;
        const lista = document.getElementById("listaHistoricoUsuario");
        if (!usuario || !lista) return;

        const requisicao = ++estado.requisicaoHistorico;
        const offset = (estado.historicoPagina - 1) * estado.historicoPorPagina;
        lista.innerHTML = `
            <div class="estado-admin">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h3>Carregando histórico...</h3>
            </div>
        `;
        document.getElementById("paginacaoHistoricoUsuario").hidden = true;

        try {
            const { data, error } = await window.db.rpc("listar_historico_usuario_admin", {
                p_usuario_id: usuario.usuario_id,
                p_limite: estado.historicoPorPagina,
                p_offset: offset
            });

            if (requisicao !== estado.requisicaoHistorico || !estado.usuarioAtual) return;
            if (error) throw error;

            const historico = Array.isArray(data) ? data : [];
            estado.historicoTotal = Number(historico[0]?.total_registros || 0);
            renderizarHistoricoUsuario(historico);
            atualizarPaginacaoHistorico();
        } catch (erro) {
            console.error("Erro ao carregar histórico de usuário:", erro);
            lista.innerHTML = `
                <div class="estado-admin">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>Histórico indisponível</h3>
                    <p>Tente novamente em alguns instantes.</p>
                </div>
            `;
        }
    }

    function renderizarHistoricoUsuario(historico) {
        const lista = document.getElementById("listaHistoricoUsuario");
        if (!lista) return;

        if (!historico.length) {
            lista.innerHTML = `
                <div class="estado-admin">
                    <i class="fa-solid fa-clock-rotate-left"></i>
                    <h3>Nenhuma alteração registrada</h3>
                    <p>As próximas ações administrativas aparecerão aqui.</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = historico.map(item => {
            const acao = obterAcaoHistorico(item.acao);
            let alteracao = "";

            if (item.acao === "alterar_papel") {
                alteracao = `${obterPapelUsuario(item.papel_anterior).rotulo} → ${obterPapelUsuario(item.papel_novo).rotulo}`;
            } else {
                alteracao = item.acao === "bloquear" ? "Conta ativa → bloqueada" : "Conta bloqueada → ativa";
            }

            return `
                <article class="historico-usuario-item">
                    <div class="historico-usuario-topo">
                        <strong><i class="fa-solid ${acao.icone}"></i> ${acao.rotulo}</strong>
                        <time datetime="${escaparAtributoUsuario(item.criado_em || "")}">${formatarDataHora(item.criado_em)}</time>
                    </div>
                    <p><strong>${escaparHTMLUsuario(alteracao)}</strong><br>${escaparHTMLUsuario(item.motivo || "Motivo não informado")}</p>
                    <div class="historico-usuario-meta">Por ${escaparHTMLUsuario(item.administrador_nome || "Administrador")}</div>
                </article>
            `;
        }).join("");
    }

    async function mudarPaginaHistorico(direcao) {
        const totalPaginas = Math.max(1, Math.ceil(estado.historicoTotal / estado.historicoPorPagina));
        const pagina = Math.min(totalPaginas, Math.max(1, estado.historicoPagina + direcao));
        if (pagina === estado.historicoPagina) return;

        estado.historicoPagina = pagina;
        await carregarHistoricoUsuario();
    }

    function atualizarPaginacaoHistorico() {
        const paginacao = document.getElementById("paginacaoHistoricoUsuario");
        const anterior = document.getElementById("historicoUsuarioAnterior");
        const proxima = document.getElementById("historicoUsuarioProximo");
        const totalPaginas = Math.max(1, Math.ceil(estado.historicoTotal / estado.historicoPorPagina));

        if (!paginacao) return;
        paginacao.hidden = estado.historicoTotal <= estado.historicoPorPagina;
        if (anterior) anterior.disabled = estado.historicoPagina <= 1;
        if (proxima) proxima.disabled = estado.historicoPagina >= totalPaginas;
        definirTextoUsuario("paginaHistoricoUsuario", `Página ${estado.historicoPagina} de ${totalPaginas}`);
    }

    function fecharModalUsuario(tipo) {
        const id = tipo === "acao" ? "modalAcaoUsuario" : "modalHistoricoUsuario";
        const modal = document.getElementById(id);
        if (!modal || modal.hidden) return;

        if (tipo === "historico") estado.requisicaoHistorico += 1;
        modal.hidden = true;

        const outroModal = tipo === "acao"
            ? document.getElementById("modalHistoricoUsuario")
            : document.getElementById("modalAcaoUsuario");
        if (!outroModal || outroModal.hidden) document.body.classList.remove("modal-aberto");

        estado.acaoAtual = null;
        estado.usuarioAtual = null;

        if (estado.focoAnterior && typeof estado.focoAnterior.focus === "function") {
            estado.focoAnterior.focus();
        }
        estado.focoAnterior = null;
    }

    function lerFiltrosUrl() {
        const parametros = new URLSearchParams(window.location.search);
        estado.busca = String(parametros.get("busca") || "").trim().slice(0, 100);
        estado.papel = PAPEIS.has(parametros.get("papel")) ? parametros.get("papel") : "";
        estado.status = STATUS.has(parametros.get("status")) ? parametros.get("status") : "";
        estado.ordenacao = ORDENACOES.has(parametros.get("ordem")) ? parametros.get("ordem") : "recentes";
        estado.pagina = Math.max(1, Number.parseInt(parametros.get("pagina"), 10) || 1);
    }

    function preencherFiltros() {
        const busca = document.getElementById("buscaUsuariosAdmin");
        const papel = document.getElementById("filtroPapelUsuario");
        const status = document.getElementById("filtroStatusUsuario");
        const ordem = document.getElementById("ordenacaoUsuariosAdmin");
        if (busca) busca.value = estado.busca;
        if (papel) papel.value = estado.papel;
        if (status) status.value = estado.status;
        if (ordem) ordem.value = estado.ordenacao;
    }

    function atualizarUrlUsuarios() {
        const parametros = new URLSearchParams();
        if (estado.busca) parametros.set("busca", estado.busca);
        if (estado.papel) parametros.set("papel", estado.papel);
        if (estado.status) parametros.set("status", estado.status);
        if (estado.ordenacao !== "recentes") parametros.set("ordem", estado.ordenacao);
        if (estado.pagina > 1) parametros.set("pagina", String(estado.pagina));
        const query = parametros.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }

    function obterPapelUsuario(papel) {
        const papeis = {
            cliente: { rotulo: "Cliente", classe: "papel-cliente", icone: "fa-user" },
            lojista: { rotulo: "Lojista", classe: "papel-lojista", icone: "fa-store" },
            admin: { rotulo: "Administrador", classe: "papel-admin", icone: "fa-user-shield" }
        };
        return papeis[papel] || papeis.cliente;
    }

    function obterStatusUsuario(status) {
        const statusMap = {
            ativo: { rotulo: "Ativa", classe: "status-usuario-ativo", icone: "fa-circle-check" },
            bloqueado: { rotulo: "Bloqueada", classe: "status-usuario-bloqueado", icone: "fa-lock" },
            excluido: { rotulo: "Excluída", classe: "status-usuario-excluido", icone: "fa-circle-xmark" }
        };
        return statusMap[status] || statusMap.ativo;
    }

    function obterAcaoHistorico(acao) {
        const acoes = {
            bloquear: { rotulo: "Conta bloqueada", icone: "fa-user-lock" },
            desbloquear: { rotulo: "Conta desbloqueada", icone: "fa-user-check" },
            alterar_papel: { rotulo: "Papel alterado", icone: "fa-user-tag" }
        };
        return acoes[acao] || { rotulo: "Alteração administrativa", icone: "fa-user-gear" };
    }

    function obterIniciaisUsuario(nome) {
        const partes = String(nome || "Usuário")
            .trim()
            .split(/\s+/)
            .filter(Boolean);
        if (!partes.length) return "US";
        if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
        return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
    }

    function formatarMoeda(valor) {
        const numero = Number(valor || 0);
        return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
            .format(Number.isFinite(numero) ? numero : 0);
    }

    function formatarInteiro(valor) {
        const numero = Number(valor || 0);
        return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 })
            .format(Number.isFinite(numero) ? numero : 0);
    }

    function formatarData(valor) {
        if (!valor) return "—";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return "—";
        return new Intl.DateTimeFormat("pt-BR").format(data);
    }

    function formatarDataHora(valor, fallback = "—") {
        if (!valor) return fallback;
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return fallback;
        return new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "short",
            timeStyle: "short"
        }).format(data);
    }

    function mostrarEstadoUsuarios(icone, titulo, mensagem, recarregar = false) {
        const lista = document.getElementById("listaUsuariosAdmin");
        if (!lista) return;
        lista.innerHTML = `
            <div class="estado-admin">
                <i class="fa-solid ${escaparAtributoUsuario(icone)}"></i>
                <h3>${escaparHTMLUsuario(titulo)}</h3>
                <p>${escaparHTMLUsuario(mensagem)}</p>
                ${recarregar ? '<button type="button" class="btn-admin btn-primario" data-recarregar-usuarios>Tentar novamente</button>' : ""}
            </div>
        `;
    }

    async function executarComBotaoUsuario(botao, carregando, callback) {
        if (!botao) return;
        const original = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = carregando;
        try {
            await callback();
        } finally {
            botao.disabled = false;
            botao.innerHTML = original;
        }
    }

    async function sairGestaoUsuarios() {
        try {
            await window.db.auth.signOut();
        } finally {
            window.location.href = "login.html";
        }
    }

    function definirTextoUsuario(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = String(valor ?? "");
    }

    function avisarUsuarioAdmin(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo);
        }
    }

    function escaparHTMLUsuario(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escaparAtributoUsuario(valor) {
        return escaparHTMLUsuario(valor).replaceAll("`", "&#096;");
    }

    window.AdminUsuariosTestes = Object.freeze({
        obterPapelUsuario,
        obterStatusUsuario,
        obterIniciaisUsuario,
        escaparHTMLUsuario
    });
})();
