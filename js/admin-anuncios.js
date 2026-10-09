// ==========================================
// ADMIN-ANUNCIOS.JS
// Fila de aprovação: anúncios novos e edições de lojista.
// As decisões passam pelas funções decidir_*_admin, que conferem
// no banco se quem chama é administrador.
// ==========================================

(() => {
    "use strict";

    let fila = [];

    const el = id => document.getElementById(id);

    function escapar(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function moeda(valor) {
        if (valor === null || valor === undefined || valor === "") return "";
        return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    function dataHora(valor) {
        const data = new Date(valor);
        return Number.isNaN(data.getTime())
            ? ""
            : data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    }

    function avisar(mensagem, tipo, titulo) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 4500);
            return;
        }
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, 4500);
            return;
        }
        window.alert(`${titulo}\n\n${mensagem}`);
    }

    async function confirmar(titulo, mensagem, textoConfirmar) {
        if (typeof window.confirmarAcao === "function") {
            return window.confirmarAcao({
                titulo,
                mensagem,
                textoConfirmar,
                textoCancelar: "Cancelar",
                tipo: "aviso"
            });
        }
        return window.confirm(`${titulo}\n\n${mensagem}`);
    }

    function chave(item) {
        return `${item.tipo_item}:${item.produto_id}`;
    }

    function rotuloCondicao(valor) {
        if (valor === "novo") return "Novo";
        if (valor === "usado") return "Usado";
        return "";
    }

    // Em uma edição, mostra lado a lado só o que mudou.
    function criarComparacao(item) {
        const novos = item.dados_novos || {};
        const campos = [
            ["Título", item.nome, novos.nome],
            ["Preço", moeda(item.preco), moeda(novos.preco)],
            ["Preço promocional", moeda(item.preco_promocional), moeda(novos.preco_promocional)],
            ["Categoria", item.categoria, novos.categoria],
            ["Descrição", item.descricao, novos.descricao]
        ];

        // Edições antigas não traziam a condição.
        if (Object.prototype.hasOwnProperty.call(novos, "condicao")) {
            campos.push([
                "Condição",
                rotuloCondicao(novos.condicao_atual),
                rotuloCondicao(novos.condicao)
            ]);
        }

        const linhas = campos
            .filter(([, antes, depois]) => String(antes ?? "") !== String(depois ?? ""))
            .map(([rotulo, antes, depois]) => `
                <tr>
                    <th scope="row">${rotulo}</th>
                    <td>${escapar(antes) || "<em>vazio</em>"}</td>
                    <td>${escapar(depois) || "<em>vazio</em>"}</td>
                </tr>
            `);

        const fotoMudou = String(item.imagem_url ?? "") !== String(novos.imagem_url ?? "");
        if (fotoMudou) {
            linhas.push(`
                <tr>
                    <th scope="row">Foto</th>
                    <td>${item.imagem_url ? `<img src="${escapar(item.imagem_url)}" alt="Foto atual">` : "<em>sem foto</em>"}</td>
                    <td>${novos.imagem_url ? `<img src="${escapar(novos.imagem_url)}" alt="Foto nova">` : "<em>sem foto</em>"}</td>
                </tr>
            `);
        }

        if (linhas.length === 0) return "";

        return `
            <table class="fila-anuncio-comparacao">
                <thead>
                    <tr><th scope="col">Campo</th><th scope="col">No ar hoje</th><th scope="col">Edição pedida</th></tr>
                </thead>
                <tbody>${linhas.join("")}</tbody>
            </table>
        `;
    }

    function criarCard(item) {
        const edicao = item.tipo_item === "edicao";
        const id = escapar(chave(item));
        const imagem = item.imagem_url
            ? `<img src="${escapar(item.imagem_url)}" alt="" loading="lazy">`
            : '<i class="fa-solid fa-image"></i>';
        const preco = item.preco_promocional ? moeda(item.preco_promocional) : moeda(item.preco);
        const anunciante = item.loja_tipo === "pessoal" ? "Usuário comum" : "Loja";

        return `
            <article class="fila-anuncio" data-item="${id}">
                <div class="fila-anuncio-imagem">${imagem}</div>
                <div class="fila-anuncio-corpo">
                    <div class="fila-anuncio-topo">
                        <span class="fila-anuncio-tipo ${edicao ? "edicao" : "novo"}">
                            <i class="fa-solid ${edicao ? "fa-pen-to-square" : "fa-plus"}"></i>
                            ${edicao ? "Edição" : "Anúncio novo"}
                        </span>
                        <small>${escapar(anunciante)}: ${escapar(item.loja_nome || "")} · enviado em ${escapar(dataHora(item.enviado_em))}</small>
                    </div>
                    <h3>${escapar(item.nome || "Anúncio")}</h3>
                    <p class="fila-anuncio-preco">${escapar(preco)}${item.categoria ? ` · ${escapar(item.categoria)}` : ""}${!edicao && rotuloCondicao(item.dados_novos?.condicao_atual) ? ` · ${rotuloCondicao(item.dados_novos.condicao_atual)}` : ""}</p>
                    ${edicao ? criarComparacao(item) : `<p class="fila-anuncio-descricao">${escapar(item.descricao || "Sem descrição.")}</p>`}

                    <div class="fila-anuncio-rejeicao" hidden>
                        <label>
                            Motivo da rejeição (o anunciante recebe este texto)
                            <textarea maxlength="500" rows="2" placeholder="Explique o que precisa ser corrigido"></textarea>
                        </label>
                        <div class="fila-anuncio-botoes">
                            <button type="button" class="btn-admin btn-perigo" data-acao="confirmar-rejeicao" data-item="${id}">
                                Confirmar rejeição
                            </button>
                            <button type="button" class="btn-admin btn-claro" data-acao="cancelar-rejeicao" data-item="${id}">
                                Cancelar
                            </button>
                        </div>
                    </div>

                    <div class="fila-anuncio-botoes fila-anuncio-decisao">
                        <button type="button" class="btn-admin btn-primario" data-acao="aprovar" data-item="${id}">
                            <i class="fa-solid fa-check"></i> Aprovar
                        </button>
                        <button type="button" class="btn-admin btn-perigo" data-acao="rejeitar" data-item="${id}">
                            <i class="fa-solid fa-xmark"></i> Rejeitar
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    function renderizar() {
        const lista = el("listaFilaAnuncios");
        const resumo = el("resumoFilaAnuncios");
        const aprovarTodos = el("btnAprovarTodosAnuncios");
        if (!lista) return;

        const novos = fila.filter(item => item.tipo_item === "novo").length;
        const edicoes = fila.length - novos;

        if (resumo) {
            resumo.textContent = fila.length === 0
                ? "Nenhum anúncio aguardando aprovação."
                : `${fila.length} na fila: ${novos} ${novos === 1 ? "anúncio novo" : "anúncios novos"} e ${edicoes} ${edicoes === 1 ? "edição" : "edições"}.`;
        }

        if (aprovarTodos) aprovarTodos.hidden = fila.length < 2;

        lista.innerHTML = fila.map(criarCard).join("");
    }

    async function carregar() {
        const resumo = el("resumoFilaAnuncios");

        try {
            const { data, error } = await window.db.rpc("listar_fila_anuncios_admin");
            if (error) throw error;

            fila = data || [];
            renderizar();
        } catch (erro) {
            console.error("Erro ao carregar a fila de anúncios:", erro);
            if (resumo) {
                resumo.textContent = erro?.message || "Não foi possível carregar a fila.";
            }
        }
    }

    async function decidir(item, aprovar, motivo = null) {
        const funcao = item.tipo_item === "edicao"
            ? "decidir_edicao_anuncio_admin"
            : "decidir_anuncio_admin";

        const { error } = await window.db.rpc(funcao, {
            p_produto_id: item.produto_id,
            p_aprovar: aprovar,
            p_motivo: motivo
        });

        if (error) throw error;
    }

    async function tratarClique(event) {
        const botao = event.target.closest?.("[data-acao]");
        if (!botao || botao.disabled) return;

        const item = fila.find(registro => chave(registro) === botao.dataset.item);
        const card = botao.closest(".fila-anuncio");
        if (!item || !card) return;

        const caixa = card.querySelector(".fila-anuncio-rejeicao");
        const decisao = card.querySelector(".fila-anuncio-decisao");
        const acao = botao.dataset.acao;

        if (acao === "rejeitar") {
            caixa.hidden = false;
            decisao.hidden = true;
            caixa.querySelector("textarea")?.focus();
            return;
        }

        if (acao === "cancelar-rejeicao") {
            caixa.hidden = true;
            decisao.hidden = false;
            return;
        }

        let motivo = null;

        if (acao === "confirmar-rejeicao") {
            motivo = caixa.querySelector("textarea")?.value.trim() || "";
            if (motivo.length < 5) {
                avisar("Escreva o motivo com pelo menos 5 caracteres.", "aviso", "Motivo obrigatório");
                return;
            }
        }

        botao.disabled = true;

        try {
            await decidir(item, acao === "aprovar", motivo);
            avisar(
                acao === "aprovar"
                    ? (item.tipo_item === "edicao" ? "A edição já está no ar." : "O anúncio já está no ar.")
                    : "O anunciante foi avisado do motivo.",
                "sucesso",
                acao === "aprovar" ? "Aprovado" : "Rejeitado"
            );
        } catch (erro) {
            console.error("Erro ao decidir o anúncio:", erro);
            avisar(erro?.message || "Não foi possível registrar a decisão.", "erro", "Erro");
        }

        await carregar();
    }

    async function aprovarTodos() {
        const total = fila.length;
        if (total === 0) return;

        const confirmou = await confirmar(
            `Aprovar os ${total} itens da fila?`,
            "Confira os anúncios antes: todos vão ao ar imediatamente.",
            "Aprovar todos"
        );
        if (!confirmou) return;

        const botao = el("btnAprovarTodosAnuncios");
        if (botao) botao.disabled = true;

        let aprovados = 0;
        let falhas = 0;

        for (const item of [...fila]) {
            try {
                await decidir(item, true);
                aprovados += 1;
            } catch (erro) {
                console.error("Erro ao aprovar em lote:", erro);
                falhas += 1;
            }
        }

        if (botao) botao.disabled = false;

        avisar(
            falhas === 0
                ? `${aprovados} ${aprovados === 1 ? "item aprovado" : "itens aprovados"}.`
                : `${aprovados} aprovados e ${falhas} com erro. Os que falharam continuam na fila.`,
            falhas === 0 ? "sucesso" : "aviso",
            "Aprovação em lote"
        );

        await carregar();
    }

    async function sair() {
        try {
            await window.db.auth.signOut();
        } finally {
            window.location.href = "login.html";
        }
    }

    async function iniciar() {
        if (!window.db) return;

        const { data: sessao } = await window.db.auth.getSession();
        if (!sessao?.session) {
            window.location.replace("login.html");
            return;
        }

        const { data: admin, error } = await window.db.rpc("sou_admin");
        if (error || admin !== true) {
            window.location.replace("index.html");
            return;
        }

        el("listaFilaAnuncios")?.addEventListener("click", tratarClique);
        el("btnAtualizarFilaAnuncios")?.addEventListener("click", carregar);
        el("btnAprovarTodosAnuncios")?.addEventListener("click", aprovarTodos);
        el("btnSairAdmin")?.addEventListener("click", sair);

        await carregar();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
