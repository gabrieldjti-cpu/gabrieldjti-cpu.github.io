// ==========================================
// ADMIN MODERAÇÃO — RF-26
// ==========================================

(() => {
    "use strict";

    const STATUS_VALIDOS = new Set(["", "pendente", "procedente", "improcedente"]);
    const TIPOS_VALIDOS = new Set(["", "produto", "avaliacao"]);
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    const estado = {
        denuncias: new Map(),
        pagina: 1,
        porPagina: 12,
        total: 0,
        status: "",
        tipo: "",
        busca: "",
        denunciaId: null,
        timerBusca: null,
        requisicao: 0,
        denunciaAtual: null,
        decisaoAtual: null,
        focoAnterior: null
    };

    const ROTULOS_STATUS = {
        pendente: { rotulo: "Pendente", classe: "status-pendente", icone: "fa-clock" },
        procedente: { rotulo: "Procedente", classe: "status-procedente", icone: "fa-circle-check" },
        improcedente: { rotulo: "Improcedente", classe: "status-improcedente", icone: "fa-circle-xmark" }
    };

    const ROTULOS_MOTIVO = {
        conteudo_improprio: "Conteúdo impróprio ou enganoso",
        categoria_incorreta: "Categoria incorreta",
        preco_abusivo: "Preço possivelmente abusivo",
        produto_proibido: "Produto proibido ou ilegal",
        spam: "Spam ou propaganda",
        ofensa: "Ofensa ou linguagem imprópria",
        conteudo_falso: "Conteúdo possivelmente falso",
        outro: "Outro motivo"
    };

    document.addEventListener("DOMContentLoaded", iniciarModeracaoAdmin);

    async function iniciarModeracaoAdmin() {
        if (!window.db) {
            mostrarEstado("fa-triangle-exclamation", "Não foi possível conectar", "Atualize a página e tente novamente.");
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

            const { data: admin, error: adminError } = await window.db.rpc("sou_admin");
            if (adminError || admin !== true) {
                mostrarEstado("fa-lock", "Acesso restrito", "Esta área é exclusiva para a conta administrativa principal.");
                avisar(
                    adminError ? "Não foi possível validar sua permissão." : "Esta área é exclusiva para administradores.",
                    adminError ? "erro" : "aviso",
                    adminError ? "Erro de permissão" : "Acesso restrito"
                );
                if (!adminError) setTimeout(() => { window.location.href = "perfil.html"; }, 1600);
                return;
            }

            configurarEventos();
            await atualizarModeracao();
        } catch (erro) {
            console.error("Erro ao iniciar moderação:", erro);
            mostrarEstado("fa-triangle-exclamation", "Não foi possível carregar a moderação", "Atualize a página e tente novamente.");
        }
    }

    function configurarEventos() {
        const busca = document.getElementById("buscaModeracao");
        const status = document.getElementById("filtroStatusModeracao");
        const tipo = document.getElementById("filtroTipoModeracao");
        const lista = document.getElementById("listaModeracao");
        const justificativa = document.getElementById("justificativaModeracao");

        document.getElementById("formFiltrosModeracao")?.addEventListener("submit", event => {
            event.preventDefault();
            alterarFiltro("busca", busca?.value || "");
        });

        busca?.addEventListener("input", () => {
            clearTimeout(estado.timerBusca);
            estado.timerBusca = setTimeout(() => alterarFiltro("busca", busca.value), 350);
        });
        status?.addEventListener("change", () => alterarFiltro("status", status.value));
        tipo?.addEventListener("change", () => alterarFiltro("tipo", tipo.value));

        document.getElementById("btnLimparFiltrosModeracao")?.addEventListener("click", limparFiltros);
        document.getElementById("btnAtualizarModeracao")?.addEventListener("click", event => executarComBotao(
            event.currentTarget,
            '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando',
            atualizarModeracao
        ));
        document.getElementById("btnSairAdmin")?.addEventListener("click", sair);
        document.getElementById("paginaAnteriorModeracao")?.addEventListener("click", () => mudarPagina(-1));
        document.getElementById("proximaPaginaModeracao")?.addEventListener("click", () => mudarPagina(1));
        document.getElementById("formDecisaoModeracao")?.addEventListener("submit", confirmarDecisao);

        justificativa?.addEventListener("input", () => {
            definirTexto("contadorJustificativaModeracao", justificativa.value.length);
        });

        lista?.addEventListener("click", event => {
            const decidir = event.target.closest("[data-decisao-moderacao]");
            const historico = event.target.closest("[data-historico-moderacao]");
            const recarregar = event.target.closest("[data-recarregar-moderacao]");

            if (decidir) {
                abrirModalDecisao(
                    decidir.dataset.denunciaId,
                    decidir.dataset.decisaoModeracao,
                    decidir
                );
            } else if (historico) {
                abrirHistorico(historico.dataset.historicoModeracao, historico);
            } else if (recarregar) {
                atualizarModeracao();
            }
        });

        document.querySelectorAll("[data-fechar-modal-moderacao]").forEach(elemento => {
            elemento.addEventListener("click", () => fecharModal(elemento.dataset.fecharModalModeracao));
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                fecharModal("decisao");
                fecharModal("historico");
            }
        });
    }

    async function atualizarModeracao() {
        await Promise.all([carregarResumo(), carregarDenuncias()]);
    }

    async function carregarResumo() {
        try {
            const { data, error } = await window.db.rpc("resumo_moderacao_admin");
            if (error) throw error;
            const resumo = Array.isArray(data) ? data[0] : data;
            definirTexto("metricaTotalDenuncias", formatarInteiro(resumo?.total_denuncias));
            definirTexto("metricaDenunciasPendentes", formatarInteiro(resumo?.pendentes));
            definirTexto("metricaDenunciasProcedentes", formatarInteiro(resumo?.procedentes));
            definirTexto("metricaConteudosOcultados", formatarInteiro(resumo?.conteudos_ocultados));
        } catch (erro) {
            console.error("Erro ao carregar resumo da moderação:", erro);
            ["metricaTotalDenuncias", "metricaDenunciasPendentes", "metricaDenunciasProcedentes", "metricaConteudosOcultados"]
                .forEach(id => definirTexto(id, "—"));
        }
    }

    async function carregarDenuncias() {
        const requisicao = ++estado.requisicao;
        const lista = document.getElementById("listaModeracao");
        const offset = (estado.pagina - 1) * estado.porPagina;
        lista?.setAttribute("aria-busy", "true");
        if (lista) lista.innerHTML = '<div class="estado-admin"><i class="fa-solid fa-spinner fa-spin"></i><h3>Carregando denúncias...</h3></div>';

        try {
            const { data, error } = await window.db.rpc("listar_denuncias_admin", {
                p_status: estado.status,
                p_tipo: estado.tipo,
                p_busca: estado.busca,
                p_limite: estado.porPagina,
                p_offset: offset,
                p_denuncia_id: estado.denunciaId
            });
            if (requisicao !== estado.requisicao) return;
            if (error) throw error;

            const denuncias = Array.isArray(data) ? data : [];
            estado.total = Number(denuncias[0]?.total_registros || 0);
            estado.denuncias = new Map(denuncias.map(item => [String(item.denuncia_id), item]));

            const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));
            if (estado.pagina > totalPaginas) {
                estado.pagina = totalPaginas;
                atualizarUrl();
                await carregarDenuncias();
                return;
            }

            renderizarDenuncias(denuncias);
            atualizarPaginacao();
            atualizarTextoResultado();
        } catch (erro) {
            console.error("Erro ao carregar denúncias:", erro);
            mostrarEstado("fa-triangle-exclamation", "Não foi possível carregar as denúncias", "Confira a conexão e tente novamente.", true);
            avisar("Não foi possível carregar a fila de moderação.", "erro", "Erro ao carregar");
        } finally {
            lista?.setAttribute("aria-busy", "false");
        }
    }

    function renderizarDenuncias(denuncias) {
        const lista = document.getElementById("listaModeracao");
        if (!lista) return;

        if (!denuncias.length) {
            const filtrado = Boolean(estado.status || estado.tipo || estado.busca);
            lista.innerHTML = `
                <div class="estado-admin estado-moderacao-vazio">
                    <i class="fa-solid ${filtrado ? "fa-filter-circle-xmark" : "fa-shield-heart"}"></i>
                    <h3>${filtrado ? "Nenhuma denúncia neste filtro" : "Nenhuma denúncia pendente"}</h3>
                    <p>${filtrado ? "Altere os filtros para consultar outros registros." : "Quando um conteúdo for denunciado, ele aparecerá nesta fila."}</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = denuncias.map(criarCardDenuncia).join("");
    }

    function criarCardDenuncia(item) {
        const status = ROTULOS_STATUS[item.status] || ROTULOS_STATUS.pendente;
        const tipoProduto = item.tipo_conteudo === "produto";
        const link = `produto.html?id=${encodeURIComponent(item.produto_id || "")}${tipoProduto ? "" : "#avaliacoesProduto"}`;
        const pendente = item.status === "pendente";
        const resumo = String(item.conteudo_resumo || "").trim();
        const acaoConteudo = item.conteudo_ativo ? `
            <a class="btn-admin btn-claro" href="${escaparAtributo(link)}" target="_blank" rel="noopener noreferrer">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                Ver conteúdo
            </a>
        ` : `
            <span class="btn-admin btn-conteudo-indisponivel" aria-label="Conteúdo não está mais disponível publicamente">
                <i class="fa-solid fa-eye-slash"></i>
                Indisponível
            </span>
        `;

        return `
            <article class="denuncia-card ${pendente ? "denuncia-pendente" : ""}" data-denuncia-card="${escaparAtributo(item.denuncia_id)}">
                <div class="denuncia-card-topo">
                    <div class="denuncia-identidade">
                        <span class="denuncia-tipo ${tipoProduto ? "tipo-produto" : "tipo-avaliacao"}">
                            <i class="fa-solid ${tipoProduto ? "fa-box" : "fa-star"}"></i>
                            ${tipoProduto ? "Produto" : "Avaliação"}
                        </span>
                        <span class="status-moderacao ${status.classe}">
                            <i class="fa-solid ${status.icone}"></i>
                            ${status.rotulo}
                        </span>
                    </div>
                    <time datetime="${escaparAtributo(item.criado_em || "")}">${formatarDataHora(item.criado_em)}</time>
                </div>

                <div class="denuncia-conteudo">
                    <div>
                        <span class="denuncia-eyebrow">Conteúdo denunciado</span>
                        <h2>${escaparHTML(item.conteudo_titulo || "Conteúdo")}</h2>
                        <p class="denuncia-loja"><i class="fa-solid fa-store"></i> ${escaparHTML(item.loja_nome || "Loja")}</p>
                    </div>
                    ${acaoConteudo}
                </div>

                ${resumo ? `<blockquote>${escaparHTML(resumo)}</blockquote>` : ""}

                <div class="denuncia-dados">
                    <div>
                        <span>Motivo informado</span>
                        <strong>${escaparHTML(ROTULOS_MOTIVO[item.motivo] || item.motivo || "Não informado")}</strong>
                    </div>
                    <div>
                        <span>Denunciante</span>
                        <strong>${escaparHTML(item.denunciante_nome || "Usuário")}</strong>
                    </div>
                </div>

                ${item.detalhes ? `<div class="denuncia-detalhes"><strong>Detalhes:</strong> ${escaparHTML(item.detalhes)}</div>` : ""}

                ${pendente ? `
                    <div class="denuncia-acoes">
                        <button type="button" class="btn-admin btn-claro" data-historico-moderacao="${escaparAtributo(item.denuncia_id)}">
                            <i class="fa-solid fa-clock-rotate-left"></i> Histórico
                        </button>
                        <button type="button" class="btn-admin btn-arquivar" data-decisao-moderacao="improcedente" data-denuncia-id="${escaparAtributo(item.denuncia_id)}">
                            <i class="fa-solid fa-box-archive"></i> Não confirmar
                        </button>
                        <button type="button" class="btn-admin btn-perigo" data-decisao-moderacao="procedente" data-denuncia-id="${escaparAtributo(item.denuncia_id)}">
                            <i class="fa-solid fa-eye-slash"></i> Confirmar violação
                        </button>
                    </div>
                ` : `
                    <div class="decisao-registrada">
                        <div>
                            <span>Decisão registrada por ${escaparHTML(item.analisado_por_nome || "Administrador")} · ${formatarDataHora(item.analisado_em)}</span>
                            <p>${escaparHTML(item.justificativa_admin || "Justificativa não informada")}</p>
                        </div>
                        <button type="button" class="btn-admin btn-claro" data-historico-moderacao="${escaparAtributo(item.denuncia_id)}">
                            <i class="fa-solid fa-clock-rotate-left"></i> Ver histórico
                        </button>
                    </div>
                `}
            </article>
        `;
    }

    function abrirModalDecisao(denunciaId, decisao, botaoOrigem) {
        const denuncia = estado.denuncias.get(String(denunciaId));
        const modal = document.getElementById("modalDecisaoModeracao");
        if (!denuncia || !modal || denuncia.status !== "pendente") return;
        if (!["procedente", "improcedente"].includes(decisao)) return;

        estado.denunciaAtual = denuncia;
        estado.decisaoAtual = decisao;
        estado.focoAnterior = botaoOrigem || document.activeElement;

        const confirmar = document.getElementById("btnConfirmarDecisaoModeracao");
        const icone = document.getElementById("iconeModalDecisaoModeracao");
        const alerta = document.getElementById("alertaModalDecisaoModeracao");
        const justificativa = document.getElementById("justificativaModeracao");
        justificativa.value = "";
        definirTexto("contadorJustificativaModeracao", 0);
        alerta.hidden = true;
        alerta.textContent = "";

        if (decisao === "procedente") {
            definirTexto("tituloModalDecisaoModeracao", "Confirmar violação");
            definirTexto("descricaoModalDecisaoModeracao", `${denuncia.conteudo_titulo} será ocultado imediatamente do conteúdo público.`);
            confirmar.className = "btn-admin btn-perigo";
            confirmar.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Ocultar conteúdo';
            icone.className = "modal-icone-moderacao icone-procedente";
            icone.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
            alerta.hidden = false;
            alerta.textContent = denuncia.tipo_conteudo === "produto"
                ? "O lojista não poderá reativar este produto diretamente. O histórico de pedidos será preservado."
                : "A avaliação deixará de aparecer publicamente e será retirada da média do produto.";
        } else {
            definirTexto("tituloModalDecisaoModeracao", "Não confirmar denúncia");
            definirTexto("descricaoModalDecisaoModeracao", `${denuncia.conteudo_titulo} continuará disponível e a denúncia será arquivada.`);
            confirmar.className = "btn-admin btn-primario";
            confirmar.innerHTML = '<i class="fa-solid fa-box-archive"></i> Arquivar denúncia';
            icone.className = "modal-icone-moderacao icone-improcedente";
            icone.innerHTML = '<i class="fa-solid fa-box-archive"></i>';
        }

        modal.hidden = false;
        document.body.classList.add("modal-aberto");
        setTimeout(() => justificativa.focus(), 0);
    }

    async function confirmarDecisao(event) {
        event.preventDefault();
        const denuncia = estado.denunciaAtual;
        const decisao = estado.decisaoAtual;
        const justificativa = document.getElementById("justificativaModeracao")?.value?.trim() || "";
        const botao = document.getElementById("btnConfirmarDecisaoModeracao");

        if (!denuncia || !decisao || !botao) return;
        if (justificativa.length < 5) {
            avisar("Informe uma justificativa com pelo menos 5 caracteres.", "aviso", "Justificativa obrigatória");
            document.getElementById("justificativaModeracao")?.focus();
            return;
        }

        const original = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando';

        try {
            const { data, error } = await window.db.rpc("resolver_denuncia_conteudo", {
                p_denuncia_id: denuncia.denuncia_id,
                p_decisao: decisao,
                p_justificativa: justificativa
            });
            if (error) throw error;
            if (data?.sucesso !== true) throw new Error("A decisão não foi confirmada pelo servidor.");

            fecharModal("decisao");
            avisar(
                decisao === "procedente"
                    ? "Violação confirmada e conteúdo moderado."
                    : "Denúncia analisada e arquivada.",
                "sucesso",
                "Decisão registrada"
            );
            await atualizarModeracao();
        } catch (erro) {
            console.error("Erro ao resolver denúncia:", erro);
            avisar(erro?.message || "Não foi possível registrar a decisão.", "erro", "Decisão não realizada");
        } finally {
            botao.disabled = false;
            botao.innerHTML = original;
        }
    }

    async function abrirHistorico(denunciaId, botaoOrigem) {
        const denuncia = estado.denuncias.get(String(denunciaId));
        const modal = document.getElementById("modalHistoricoModeracao");
        const lista = document.getElementById("listaHistoricoModeracao");
        if (!denuncia || !modal || !lista) return;

        estado.denunciaAtual = denuncia;
        estado.focoAnterior = botaoOrigem || document.activeElement;
        definirTexto("descricaoHistoricoModeracao", `Eventos registrados para “${denuncia.conteudo_titulo}”.`);
        lista.innerHTML = '<div class="estado-admin"><i class="fa-solid fa-spinner fa-spin"></i><h3>Carregando histórico...</h3></div>';
        modal.hidden = false;
        document.body.classList.add("modal-aberto");
        modal.querySelector(".modal-fechar")?.focus();

        try {
            const { data, error } = await window.db.rpc("listar_historico_moderacao_admin", {
                p_denuncia_id: denuncia.denuncia_id
            });
            if (error) throw error;
            const itens = Array.isArray(data) ? data : [];
            lista.innerHTML = itens.length
                ? itens.map(criarItemHistorico).join("")
                : '<div class="estado-admin"><i class="fa-solid fa-clock"></i><h3>Nenhum evento registrado</h3></div>';
        } catch (erro) {
            console.error("Erro ao carregar histórico da moderação:", erro);
            lista.innerHTML = '<div class="estado-admin"><i class="fa-solid fa-triangle-exclamation"></i><h3>Histórico indisponível</h3><p>Tente novamente em alguns instantes.</p></div>';
        }
    }

    function criarItemHistorico(item) {
        const acoes = {
            denuncia_criada: ["Denúncia recebida", "fa-flag"],
            conteudo_ocultado: ["Conteúdo ocultado", "fa-eye-slash"],
            violacao_confirmada: ["Violação confirmada", "fa-circle-check"],
            denuncia_arquivada: ["Denúncia arquivada", "fa-box-archive"]
        };
        const [rotulo, icone] = acoes[item.acao] || ["Ação registrada", "fa-shield-halved"];

        return `
            <article class="historico-moderacao-item">
                <div class="historico-moderacao-topo">
                    <strong><i class="fa-solid ${icone}"></i> ${rotulo}</strong>
                    <time datetime="${escaparAtributo(item.criado_em || "")}">${formatarDataHora(item.criado_em)}</time>
                </div>
                <p>${escaparHTML(item.motivo || "Motivo não informado")}</p>
                <span>Por ${escaparHTML(item.alterado_por_nome || "Sistema")}</span>
            </article>
        `;
    }

    function fecharModal(tipo) {
        const id = tipo === "decisao" ? "modalDecisaoModeracao" : "modalHistoricoModeracao";
        const modal = document.getElementById(id);
        if (!modal || modal.hidden) return;
        modal.hidden = true;

        const outro = document.getElementById(tipo === "decisao" ? "modalHistoricoModeracao" : "modalDecisaoModeracao");
        if (!outro || outro.hidden) document.body.classList.remove("modal-aberto");

        estado.denunciaAtual = null;
        estado.decisaoAtual = null;
        if (estado.focoAnterior && typeof estado.focoAnterior.focus === "function") estado.focoAnterior.focus();
        estado.focoAnterior = null;
    }

    function alterarFiltro(campo, valor) {
        estado.denunciaId = null;
        if (campo === "status") estado.status = STATUS_VALIDOS.has(valor) ? valor : "";
        if (campo === "tipo") estado.tipo = TIPOS_VALIDOS.has(valor) ? valor : "";
        if (campo === "busca") estado.busca = String(valor || "").trim().slice(0, 100);
        estado.pagina = 1;
        atualizarUrl();
        carregarDenuncias();
    }

    function limparFiltros() {
        estado.denunciaId = null;
        estado.status = "";
        estado.tipo = "";
        estado.busca = "";
        estado.pagina = 1;
        preencherFiltros();
        atualizarUrl();
        carregarDenuncias();
    }

    function mudarPagina(direcao) {
        const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));
        const pagina = Math.min(totalPaginas, Math.max(1, estado.pagina + direcao));
        if (pagina === estado.pagina) return;
        estado.pagina = pagina;
        atualizarUrl();
        carregarDenuncias();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function atualizarPaginacao() {
        const paginacao = document.getElementById("paginacaoModeracao");
        const totalPaginas = Math.max(1, Math.ceil(estado.total / estado.porPagina));
        const inicio = estado.total ? (estado.pagina - 1) * estado.porPagina + 1 : 0;
        const fim = Math.min(estado.total, estado.pagina * estado.porPagina);
        if (!paginacao) return;

        paginacao.hidden = estado.total <= estado.porPagina;
        document.getElementById("paginaAnteriorModeracao").disabled = estado.pagina <= 1;
        document.getElementById("proximaPaginaModeracao").disabled = estado.pagina >= totalPaginas;
        definirTexto("paginaAtualModeracao", `Página ${estado.pagina} de ${totalPaginas}`);
        document.getElementById("resumoPaginacaoModeracao").innerHTML = `Mostrando <strong>${inicio}–${fim}</strong> de <strong>${estado.total}</strong> denúncias`;
    }

    function atualizarTextoResultado() {
        definirTexto(
            "textoResultadoModeracao",
            estado.total === 1 ? "1 denúncia encontrada" : `${estado.total} denúncias encontradas`
        );
    }

    function lerFiltrosUrl() {
        const parametros = new URLSearchParams(window.location.search);
        const denuncia = String(parametros.get("denuncia") || "").trim();
        estado.status = STATUS_VALIDOS.has(parametros.get("status")) ? parametros.get("status") : "";
        estado.tipo = TIPOS_VALIDOS.has(parametros.get("tipo")) ? parametros.get("tipo") : "";
        estado.denunciaId = UUID.test(denuncia) ? denuncia : null;
        estado.busca = String(parametros.get("busca") || "").trim().slice(0, 100);
        estado.pagina = Math.max(1, Number.parseInt(parametros.get("pagina"), 10) || 1);
    }

    function preencherFiltros() {
        const busca = document.getElementById("buscaModeracao");
        const status = document.getElementById("filtroStatusModeracao");
        const tipo = document.getElementById("filtroTipoModeracao");
        if (busca) busca.value = estado.busca;
        if (status) status.value = estado.status;
        if (tipo) tipo.value = estado.tipo;
    }

    function atualizarUrl() {
        const parametros = new URLSearchParams();
        if (estado.denunciaId) parametros.set("denuncia", estado.denunciaId);
        if (estado.busca) parametros.set("busca", estado.busca);
        if (estado.status) parametros.set("status", estado.status);
        if (estado.tipo) parametros.set("tipo", estado.tipo);
        if (estado.pagina > 1) parametros.set("pagina", String(estado.pagina));
        const query = parametros.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    }

    function mostrarEstado(icone, titulo, mensagem, recarregar = false) {
        const lista = document.getElementById("listaModeracao");
        if (!lista) return;
        lista.innerHTML = `
            <div class="estado-admin">
                <i class="fa-solid ${escaparAtributo(icone)}"></i>
                <h3>${escaparHTML(titulo)}</h3>
                <p>${escaparHTML(mensagem)}</p>
                ${recarregar ? '<button type="button" class="btn-admin btn-primario" data-recarregar-moderacao>Tentar novamente</button>' : ""}
            </div>
        `;
    }

    async function executarComBotao(botao, carregando, callback) {
        if (!botao) return;
        const original = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = carregando;
        try { await callback(); } finally {
            botao.disabled = false;
            botao.innerHTML = original;
        }
    }

    async function sair() {
        try { await window.db.auth.signOut(); } finally { window.location.href = "login.html"; }
    }

    function formatarInteiro(valor) {
        return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(valor || 0));
    }

    function formatarDataHora(valor) {
        if (!valor) return "—";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return "—";
        return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(data);
    }

    function definirTexto(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = String(valor ?? "");
    }

    function avisar(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") window.mostrarAlerta(mensagem, tipo, titulo);
    }

    function escaparHTML(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function escaparAtributo(valor) {
        return escaparHTML(valor).replaceAll("`", "&#096;");
    }

    window.AdminModeracaoTestes = Object.freeze({
        ROTULOS_STATUS,
        ROTULOS_MOTIVO,
        escaparHTML
    });
})();
