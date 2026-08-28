// ==========================================
// ADMIN-CATEGORIAS.JS
// Comércio da Cidade
// RF-24 — Categorias e subcategorias
// ==========================================

(() => {
    "use strict";

    let categoriasAdmin = [];
    let produtosPorCategoria = new Map();
    let timerBuscaCategorias = null;
    let focoAntesDoModal = null;

    document.addEventListener("DOMContentLoaded", iniciarCategoriasAdmin);

    async function iniciarCategoriasAdmin() {
        if (!window.db) {
            mostrarEstadoCategorias(
                "fa-triangle-exclamation",
                "Não foi possível conectar",
                "Atualize a página e tente novamente."
            );
            avisarCategoria("Não foi possível conectar ao sistema.", "erro", "Erro de conexão");
            return;
        }

        const { data: sessaoData, error: sessaoError } = await window.db.auth.getSession();

        if (sessaoError || !sessaoData?.session) {
            window.location.href = "login.html";
            return;
        }

        const { data: admin, error: adminError } = await window.db.rpc("sou_admin");

        if (adminError || admin !== true) {
            mostrarEstadoCategorias(
                "fa-lock",
                "Acesso restrito",
                "Esta área é exclusiva para administradores da plataforma."
            );
            avisarCategoria(
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

        configurarEventosCategorias();
        await carregarCategoriasAdmin();
    }

    function configurarEventosCategorias() {
        const busca = document.getElementById("buscaCategoriasAdmin");
        const tipo = document.getElementById("filtroTipoCategoria");
        const status = document.getElementById("filtroStatusCategoria");
        const atualizar = document.getElementById("btnAtualizarCategorias");
        const nova = document.getElementById("btnNovaCategoria");
        const sair = document.getElementById("btnSairAdmin");
        const form = document.getElementById("formCategoriaAdmin");
        const tipoForm = document.getElementById("tipoCategoriaAdmin");
        const ativa = document.getElementById("categoriaAdminAtiva");
        const destaque = document.getElementById("categoriaAdminDestaque");

        busca?.addEventListener("input", () => {
            clearTimeout(timerBuscaCategorias);
            timerBuscaCategorias = setTimeout(renderizarCategoriasAdmin, 220);
        });

        tipo?.addEventListener("change", renderizarCategoriasAdmin);
        status?.addEventListener("change", renderizarCategoriasAdmin);

        atualizar?.addEventListener("click", async () => {
            await executarComBotao(
                atualizar,
                '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando',
                carregarCategoriasAdmin
            );
        });

        nova?.addEventListener("click", () => abrirModalCategoria());
        sair?.addEventListener("click", sairDoAdminCategorias);
        form?.addEventListener("submit", salvarCategoriaAdmin);
        tipoForm?.addEventListener("change", atualizarCamposModalCategoria);
        ativa?.addEventListener("change", atualizarCamposModalCategoria);
        destaque?.addEventListener("change", atualizarCamposModalCategoria);

        document.querySelectorAll("[data-fechar-modal-categoria]").forEach(elemento => {
            elemento.addEventListener("click", fecharModalCategoria);
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") fecharModalCategoria();
        });
    }

    async function carregarCategoriasAdmin() {
        const lista = document.getElementById("listaCategoriasAdmin");
        if (lista) {
            lista.setAttribute("aria-busy", "true");
            lista.innerHTML = `
                <div class="estado-admin">
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    <h3>Carregando categorias...</h3>
                </div>
            `;
        }

        try {
            const [categoriasResultado, produtosResultado] = await Promise.all([
                window.db
                    .from("categorias_produtos")
                    .select("id,nome,ativa,criado_em,categoria_pai_id,icone,destaque,ordem_destaque")
                    .order("nome", { ascending: true }),
                window.db
                    .from("produtos")
                    .select("id,categoria_id")
            ]);

            if (categoriasResultado.error) throw categoriasResultado.error;
            if (produtosResultado.error) throw produtosResultado.error;

            categoriasAdmin = Array.isArray(categoriasResultado.data)
                ? categoriasResultado.data
                : [];

            produtosPorCategoria = contarProdutosPorCategoria(produtosResultado.data);
            atualizarResumoCategorias();
            preencherPaisCategoria();
            renderizarCategoriasAdmin();
        } catch (erro) {
            console.error("Erro ao carregar categorias administrativas:", erro);
            mostrarEstadoCategorias(
                "fa-triangle-exclamation",
                "Não foi possível carregar as categorias",
                "Tente atualizar o painel."
            );
            avisarCategoria(
                "Não foi possível carregar as categorias.",
                "erro",
                "Erro ao carregar"
            );
        } finally {
            lista?.setAttribute("aria-busy", "false");
        }
    }

    function contarProdutosPorCategoria(produtos) {
        const contagem = new Map();

        (Array.isArray(produtos) ? produtos : []).forEach(produto => {
            const categoriaId = Number(produto.categoria_id);
            if (!Number.isSafeInteger(categoriaId)) return;
            contagem.set(categoriaId, (contagem.get(categoriaId) || 0) + 1);
        });

        return contagem;
    }

    function atualizarResumoCategorias() {
        definirTexto("metricaCategoriasRaiz", categoriasAdmin.filter(ehCategoriaRaiz).length);
        definirTexto("metricaSubcategorias", categoriasAdmin.filter(c => !ehCategoriaRaiz(c)).length);
        definirTexto("metricaCategoriasAtivas", categoriasAdmin.filter(c => c.ativa === true).length);
        definirTexto("metricaDestaques", categoriasAdmin.filter(c => c.destaque === true).length);
    }

    function renderizarCategoriasAdmin() {
        const lista = document.getElementById("listaCategoriasAdmin");
        const textoResultado = document.getElementById("textoResultadoCategorias");
        if (!lista) return;

        const categorias = filtrarCategoriasAdmin();

        if (textoResultado) {
            textoResultado.textContent = categorias.length === 1
                ? "1 item encontrado"
                : `${categorias.length} itens encontrados`;
        }

        if (categorias.length === 0) {
            mostrarEstadoCategorias(
                "fa-folder-open",
                "Nenhuma categoria encontrada",
                "Altere os filtros ou crie uma nova categoria."
            );
            return;
        }

        lista.innerHTML = categorias.map(criarCardCategoriaAdmin).join("");
    }

    function filtrarCategoriasAdmin() {
        const termo = normalizarBusca(
            document.getElementById("buscaCategoriasAdmin")?.value || ""
        );
        const tipo = document.getElementById("filtroTipoCategoria")?.value || "";
        const status = document.getElementById("filtroStatusCategoria")?.value || "";
        const porId = new Map(categoriasAdmin.map(categoria => [Number(categoria.id), categoria]));

        return [...categoriasAdmin]
            .filter(categoria => {
                const raiz = ehCategoriaRaiz(categoria);
                const pai = raiz ? null : porId.get(Number(categoria.categoria_pai_id));
                const texto = normalizarBusca(`${categoria.nome} ${pai?.nome || ""}`);

                if (termo && !texto.includes(termo)) return false;
                if (tipo === "raiz" && !raiz) return false;
                if (tipo === "subcategoria" && raiz) return false;
                if (status === "ativa" && categoria.ativa !== true) return false;
                if (status === "inativa" && categoria.ativa === true) return false;
                if (status === "destaque" && categoria.destaque !== true) return false;
                return true;
            })
            .sort((a, b) => ordenarCategoriasAdmin(a, b, porId));
    }

    function ordenarCategoriasAdmin(a, b, porId) {
        const paiA = ehCategoriaRaiz(a) ? a : porId.get(Number(a.categoria_pai_id));
        const paiB = ehCategoriaRaiz(b) ? b : porId.get(Number(b.categoria_pai_id));
        const nomePaiA = paiA?.nome || a.nome || "";
        const nomePaiB = paiB?.nome || b.nome || "";
        const ordemPai = nomePaiA.localeCompare(nomePaiB, "pt-BR", { sensitivity: "base" });

        if (ordemPai !== 0) return ordemPai;
        if (ehCategoriaRaiz(a) !== ehCategoriaRaiz(b)) return ehCategoriaRaiz(a) ? -1 : 1;
        return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
            sensitivity: "base"
        });
    }

    function criarCardCategoriaAdmin(categoria) {
        const id = Number(categoria.id);
        const raiz = ehCategoriaRaiz(categoria);
        const pai = raiz
            ? null
            : categoriasAdmin.find(item => Number(item.id) === Number(categoria.categoria_pai_id));
        const subcategorias = categoriasAdmin.filter(
            item => Number(item.categoria_pai_id) === id
        );
        const produtosDiretos = produtosPorCategoria.get(id) || 0;
        const produtosFilhos = subcategorias.reduce(
            (total, item) => total + (produtosPorCategoria.get(Number(item.id)) || 0),
            0
        );
        const totalProdutos = produtosDiretos + produtosFilhos;
        const podeExcluir = totalProdutos === 0 && subcategorias.length === 0;
        const ativa = categoria.ativa === true;
        const destaque = categoria.destaque === true;
        const icone = raiz
            ? escaparHTML(categoria.icone || "📁")
            : '<i class="fa-solid fa-turn-up fa-rotate-90"></i>';

        return `
            <article class="categoria-admin-card ${raiz ? "raiz" : "subcategoria"} ${ativa ? "" : "inativa"}" data-categoria-id="${id}">
                <div class="categoria-admin-topo">
                    <div class="categoria-admin-identidade">
                        <span class="categoria-admin-icone" aria-hidden="true">${icone}</span>
                        <div>
                            <h3>${escaparHTML(categoria.nome || "Categoria")}</h3>
                            <p>${raiz ? "Categoria principal" : `Subcategoria de ${escaparHTML(pai?.nome || "categoria não encontrada")}`}</p>
                        </div>
                    </div>

                    <div class="categoria-admin-badges">
                        <span class="categoria-badge ${ativa ? "ativa" : "inativa"}">
                            <i class="fa-solid ${ativa ? "fa-circle-check" : "fa-circle-pause"}"></i>
                            ${ativa ? "Ativa" : "Inativa"}
                        </span>
                        ${destaque ? `
                            <span class="categoria-badge destaque">
                                <i class="fa-solid fa-star"></i>
                                Home · ${Number(categoria.ordem_destaque) || 99}º
                            </span>
                        ` : ""}
                    </div>
                </div>

                <div class="categoria-admin-dados">
                    <div class="categoria-admin-dado">
                        <small>Produtos</small>
                        <strong>${totalProdutos}</strong>
                    </div>
                    <div class="categoria-admin-dado">
                        <small>Subcategorias</small>
                        <strong>${raiz ? subcategorias.length : "—"}</strong>
                    </div>
                    <div class="categoria-admin-dado">
                        <small>Criada em</small>
                        <strong>${formatarData(categoria.criado_em)}</strong>
                    </div>
                </div>

                <div class="categoria-admin-acoes">
                    <button type="button" class="btn-admin btn-claro" onclick="editarCategoriaAdmin(${id})">
                        <i class="fa-solid fa-pen"></i>
                        Editar
                    </button>
                    <button type="button" class="btn-admin ${ativa ? "btn-aviso" : "btn-sucesso-suave"}" onclick="alternarCategoriaAdmin(${id})">
                        <i class="fa-solid ${ativa ? "fa-pause" : "fa-play"}"></i>
                        ${ativa ? "Desativar" : "Ativar"}
                    </button>
                    ${raiz && ativa ? `
                        <button type="button" class="btn-admin ${destaque ? "btn-claro" : "btn-destaque"}" onclick="alternarDestaqueCategoriaAdmin(${id})">
                            <i class="${destaque ? "fa-regular" : "fa-solid"} fa-star"></i>
                            ${destaque ? "Remover destaque" : "Destacar"}
                        </button>
                    ` : ""}
                    <button
                        type="button"
                        class="btn-admin btn-perigo ${podeExcluir ? "" : "bloqueado"}"
                        onclick="excluirCategoriaAdmin(${id})"
                        ${podeExcluir ? "" : "disabled"}
                        title="${podeExcluir ? "Excluir categoria" : "Remova os produtos e subcategorias antes de excluir"}"
                    >
                        <i class="fa-solid fa-trash"></i>
                        Excluir
                    </button>
                </div>
            </article>
        `;
    }

    function abrirModalCategoria(categoria = null) {
        const modal = document.getElementById("modalCategoriaAdmin");
        const form = document.getElementById("formCategoriaAdmin");
        if (!modal || !form) return;

        focoAntesDoModal = document.activeElement;
        form.reset();

        definirValor("categoriaAdminId", categoria?.id || "");
        definirValor("tipoCategoriaAdmin", categoria && !ehCategoriaRaiz(categoria) ? "subcategoria" : "raiz");
        definirValor("paiCategoriaAdmin", categoria?.categoria_pai_id || "");
        definirValor("nomeCategoriaAdmin", categoria?.nome || "");
        definirValor("iconeCategoriaAdmin", categoria?.icone || "");
        definirValor("ordemDestaqueCategoria", categoria?.ordem_destaque || 99);

        const ativa = document.getElementById("categoriaAdminAtiva");
        const destaque = document.getElementById("categoriaAdminDestaque");
        if (ativa) ativa.checked = categoria ? categoria.ativa === true : true;
        if (destaque) destaque.checked = categoria?.destaque === true;

        definirTexto(
            "tituloModalCategoria",
            categoria ? "Editar categoria" : "Nova categoria"
        );
        definirTexto(
            "descricaoModalCategoria",
            categoria
                ? "Atualize a organização e a visibilidade desta categoria."
                : "Organize os produtos do marketplace."
        );

        preencherPaisCategoria(categoria?.id || null);
        atualizarCamposModalCategoria();
        modal.hidden = false;
        document.body.style.overflow = "hidden";

        setTimeout(() => document.getElementById("nomeCategoriaAdmin")?.focus(), 20);
    }

    function fecharModalCategoria() {
        const modal = document.getElementById("modalCategoriaAdmin");
        if (!modal || modal.hidden) return;
        modal.hidden = true;
        document.body.style.overflow = "";
        if (focoAntesDoModal instanceof HTMLElement) focoAntesDoModal.focus();
    }

    function atualizarCamposModalCategoria() {
        const tipo = document.getElementById("tipoCategoriaAdmin")?.value || "raiz";
        const ativa = document.getElementById("categoriaAdminAtiva")?.checked === true;
        const destaque = document.getElementById("categoriaAdminDestaque");
        const pai = document.getElementById("paiCategoriaAdmin");
        const campoPai = document.getElementById("campoPaiCategoria");
        const campoIcone = document.getElementById("campoIconeCategoria");
        const opcaoDestaque = document.getElementById("opcaoDestaqueCategoria");
        const campoOrdem = document.getElementById("campoOrdemDestaque");
        const subcategoria = tipo === "subcategoria";

        if (campoPai) campoPai.hidden = !subcategoria;
        if (pai) pai.required = subcategoria;
        if (campoIcone) campoIcone.hidden = subcategoria;
        if (opcaoDestaque) opcaoDestaque.hidden = subcategoria || !ativa;

        if (subcategoria || !ativa) {
            if (destaque) destaque.checked = false;
        }

        if (campoOrdem) {
            campoOrdem.hidden = !(destaque?.checked && !subcategoria && ativa);
        }
    }

    function preencherPaisCategoria(excluirId = null) {
        const select = document.getElementById("paiCategoriaAdmin");
        if (!select) return;

        const valorAtual = select.value;
        const raizes = categoriasAdmin
            .filter(categoria => ehCategoriaRaiz(categoria) && Number(categoria.id) !== Number(excluirId))
            .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" }));

        select.innerHTML = '<option value="">Selecione</option>' + raizes.map(categoria => `
            <option value="${Number(categoria.id)}" ${categoria.ativa ? "" : "disabled"}>
                ${escaparHTML(categoria.nome)}${categoria.ativa ? "" : " (inativa)"}
            </option>
        `).join("");

        select.value = valorAtual;
    }

    async function salvarCategoriaAdmin(event) {
        event.preventDefault();

        const id = numeroOuNulo(document.getElementById("categoriaAdminId")?.value);
        const tipo = document.getElementById("tipoCategoriaAdmin")?.value || "raiz";
        const nome = String(document.getElementById("nomeCategoriaAdmin")?.value || "").trim();
        const ativa = document.getElementById("categoriaAdminAtiva")?.checked === true;
        const destaqueMarcado = document.getElementById("categoriaAdminDestaque")?.checked === true;
        const paiId = tipo === "subcategoria"
            ? numeroOuNulo(document.getElementById("paiCategoriaAdmin")?.value)
            : null;
        const icone = tipo === "raiz"
            ? String(document.getElementById("iconeCategoriaAdmin")?.value || "").trim() || null
            : null;
        const destaque = tipo === "raiz" && ativa && destaqueMarcado;
        const ordem = destaque
            ? numeroOuNulo(document.getElementById("ordemDestaqueCategoria")?.value)
            : null;

        if (nome.length < 2) {
            avisarCategoria("Informe um nome com pelo menos 2 caracteres.", "aviso", "Nome inválido");
            document.getElementById("nomeCategoriaAdmin")?.focus();
            return;
        }

        if (tipo === "subcategoria" && !paiId) {
            avisarCategoria("Selecione a categoria principal.", "aviso", "Categoria obrigatória");
            document.getElementById("paiCategoriaAdmin")?.focus();
            return;
        }

        if (destaque && (!ordem || ordem < 1 || ordem > 99)) {
            avisarCategoria("Informe uma ordem de destaque entre 1 e 99.", "aviso", "Ordem inválida");
            document.getElementById("ordemDestaqueCategoria")?.focus();
            return;
        }

        const payload = {
            nome,
            ativa,
            categoria_pai_id: paiId,
            icone,
            destaque,
            ordem_destaque: ordem
        };
        const botao = document.getElementById("btnSalvarCategoria");

        await executarComBotao(
            botao,
            '<i class="fa-solid fa-spinner fa-spin"></i> Salvando',
            async () => {
                const consulta = id
                    ? window.db.from("categorias_produtos").update(payload).eq("id", id)
                    : window.db.from("categorias_produtos").insert(payload);
                const { error } = await consulta.select("id").single();
                if (error) throw error;

                fecharModalCategoria();
                avisarCategoria(
                    id ? "Categoria atualizada com sucesso." : "Categoria criada com sucesso.",
                    "sucesso"
                );
                await carregarCategoriasAdmin();
            },
            tratarErroCategoria
        );
    }

    async function editarCategoriaAdmin(id) {
        const categoria = localizarCategoria(id);
        if (!categoria) return;
        abrirModalCategoria(categoria);
    }

    async function alternarCategoriaAdmin(id) {
        const categoria = localizarCategoria(id);
        if (!categoria) return;

        const ativar = categoria.ativa !== true;
        const filhasAtivas = categoriasAdmin.filter(
            item => Number(item.categoria_pai_id) === Number(id) && item.ativa === true
        ).length;

        if (ativar && !ehCategoriaRaiz(categoria)) {
            const pai = localizarCategoria(categoria.categoria_pai_id);
            if (!pai?.ativa) {
                avisarCategoria(
                    "Ative primeiro a categoria principal desta subcategoria.",
                    "aviso",
                    "Categoria principal inativa"
                );
                return;
            }
        }

        const confirmar = await confirmarCategoria({
            titulo: ativar ? "Ativar categoria" : "Desativar categoria",
            mensagem: !ativar && filhasAtivas > 0
                ? `Ao desativar ${categoria.nome}, ${filhasAtivas} subcategoria(s) também serão desativadas. Deseja continuar?`
                : `${ativar ? "Ativar" : "Desativar"} a categoria ${categoria.nome}?`,
            textoConfirmar: ativar ? "Ativar" : "Desativar",
            perigo: !ativar
        });
        if (!confirmar) return;

        try {
            const { error } = await window.db
                .from("categorias_produtos")
                .update({
                    ativa: ativar,
                    destaque: ativar ? categoria.destaque === true : false,
                    ordem_destaque: ativar ? categoria.ordem_destaque : null
                })
                .eq("id", Number(id));

            if (error) throw error;
            avisarCategoria(`Categoria ${ativar ? "ativada" : "desativada"} com sucesso.`, "sucesso");
            await carregarCategoriasAdmin();
        } catch (erro) {
            tratarErroCategoria(erro);
        }
    }

    async function alternarDestaqueCategoriaAdmin(id) {
        const categoria = localizarCategoria(id);
        if (!categoria || !ehCategoriaRaiz(categoria) || categoria.ativa !== true) return;

        const destacar = categoria.destaque !== true;
        const proximaOrdem = Math.min(
            99,
            Math.max(
                0,
                ...categoriasAdmin
                    .filter(item => item.destaque === true)
                    .map(item => Number(item.ordem_destaque) || 0)
            ) + 1
        );

        try {
            const { error } = await window.db
                .from("categorias_produtos")
                .update({
                    destaque: destacar,
                    ordem_destaque: destacar ? proximaOrdem : null
                })
                .eq("id", Number(id));

            if (error) throw error;
            avisarCategoria(
                destacar
                    ? "Categoria adicionada aos destaques da página inicial."
                    : "Categoria removida dos destaques da página inicial.",
                "sucesso"
            );
            await carregarCategoriasAdmin();
        } catch (erro) {
            tratarErroCategoria(erro);
        }
    }

    async function excluirCategoriaAdmin(id) {
        const categoria = localizarCategoria(id);
        if (!categoria) return;

        const possuiFilhas = categoriasAdmin.some(
            item => Number(item.categoria_pai_id) === Number(id)
        );
        const possuiProdutos = (produtosPorCategoria.get(Number(id)) || 0) > 0;

        if (possuiFilhas || possuiProdutos) {
            avisarCategoria(
                "Essa categoria possui produtos ou subcategorias e não pode ser excluída. Você pode desativá-la.",
                "aviso",
                "Categoria em uso"
            );
            return;
        }

        const confirmar = await confirmarCategoria({
            titulo: "Excluir categoria",
            mensagem: `Excluir definitivamente a categoria ${categoria.nome}? Esta ação não pode ser desfeita.`,
            textoConfirmar: "Excluir",
            perigo: true
        });
        if (!confirmar) return;

        try {
            const { error } = await window.db
                .from("categorias_produtos")
                .delete()
                .eq("id", Number(id));

            if (error) throw error;
            avisarCategoria("Categoria excluída com sucesso.", "sucesso");
            await carregarCategoriasAdmin();
        } catch (erro) {
            tratarErroCategoria(erro);
        }
    }

    async function sairDoAdminCategorias() {
        try {
            await window.db.auth.signOut();
        } catch (erro) {
            console.warn("Não foi possível encerrar a sessão:", erro);
        }
        window.location.href = "login.html";
    }

    async function executarComBotao(botao, textoCarregando, acao, aoFalhar = null) {
        if (!botao) {
            try {
                await acao();
            } catch (erro) {
                if (aoFalhar) aoFalhar(erro);
                else console.error(erro);
            }
            return;
        }

        const original = botao.innerHTML;
        botao.disabled = true;
        botao.innerHTML = textoCarregando;

        try {
            await acao();
        } catch (erro) {
            if (aoFalhar) aoFalhar(erro);
            else console.error(erro);
        } finally {
            botao.disabled = false;
            botao.innerHTML = original;
        }
    }

    function tratarErroCategoria(erro) {
        console.error("Erro ao gerenciar categoria:", erro);
        const codigo = String(erro?.code || "");
        const mensagem = String(erro?.message || "").toLowerCase();

        if (codigo === "23505") {
            avisarCategoria(
                "Já existe uma categoria com esse nome no mesmo nível.",
                "aviso",
                "Nome já utilizado"
            );
            return;
        }

        if (codigo === "23503" || mensagem.includes("foreign key")) {
            avisarCategoria(
                "A categoria está em uso por produtos ou subcategorias e não pode ser excluída.",
                "aviso",
                "Categoria em uso"
            );
            return;
        }

        if (codigo === "42501" || mensagem.includes("row-level security")) {
            avisarCategoria(
                "Sua sessão não possui permissão para executar esta ação.",
                "erro",
                "Permissão negada"
            );
            return;
        }

        if (codigo === "23514") {
            avisarCategoria(
                erro?.message || "A alteração não respeita a hierarquia das categorias.",
                "aviso",
                "Alteração inválida"
            );
            return;
        }

        avisarCategoria(
            "Não foi possível salvar a alteração. Tente novamente.",
            "erro",
            "Erro ao salvar"
        );
    }

    function mostrarEstadoCategorias(icone, titulo, descricao) {
        const lista = document.getElementById("listaCategoriasAdmin");
        if (!lista) return;
        lista.innerHTML = `
            <div class="estado-admin">
                <i class="fa-solid ${escaparAtributo(icone)}"></i>
                <h3>${escaparHTML(titulo)}</h3>
                <p>${escaparHTML(descricao)}</p>
            </div>
        `;
    }

    function localizarCategoria(id) {
        return categoriasAdmin.find(categoria => Number(categoria.id) === Number(id));
    }

    function ehCategoriaRaiz(categoria) {
        return categoria?.categoria_pai_id === null || categoria?.categoria_pai_id === undefined;
    }

    function numeroOuNulo(valor) {
        if (valor === null || valor === undefined || String(valor).trim() === "") return null;
        const numero = Number(valor);
        return Number.isSafeInteger(numero) ? numero : null;
    }

    function normalizarBusca(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLocaleLowerCase("pt-BR")
            .trim();
    }

    function formatarData(valor) {
        if (!valor) return "—";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return "—";
        return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(data);
    }

    function definirTexto(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.textContent = String(valor ?? "");
    }

    function definirValor(id, valor) {
        const elemento = document.getElementById(id);
        if (elemento) elemento.value = String(valor ?? "");
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

    function avisarCategoria(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo);
            return;
        }
        console.log(`${titulo || tipo}: ${mensagem}`);
    }

    function confirmarCategoria(opcoes) {
        if (typeof window.confirmarAcao === "function") {
            return window.confirmarAcao(opcoes);
        }
        return Promise.resolve(window.confirm(opcoes?.mensagem || "Deseja continuar?"));
    }

    window.editarCategoriaAdmin = editarCategoriaAdmin;
    window.alternarCategoriaAdmin = alternarCategoriaAdmin;
    window.alternarDestaqueCategoriaAdmin = alternarDestaqueCategoriaAdmin;
    window.excluirCategoriaAdmin = excluirCategoriaAdmin;
})();
