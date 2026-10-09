// ==========================================
// INTERESSADOS.JS
// O vendedor (usuário comum ou lojista) vê quem clicou em "Tenho
// interesse" nos seus anúncios e confirma para quem vendeu. A
// confirmação libera a avaliação do comprador.
// ==========================================

(() => {
    "use strict";

    const $ = id => document.getElementById(id);

    function escapar(valor) {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function data(valor) {
        const d = new Date(valor);
        return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
    }

    function avisar(mensagem, tipo = "info", titulo = "Interessados") {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 4500);
        } else if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, 4500);
        }
    }

    function estrelas(nota) {
        const n = Math.max(0, Math.min(5, Number(nota) || 0));
        return Array.from({ length: 5 }, (_, i) =>
            `<i class="fa-${i < n ? "solid" : "regular"} fa-star" aria-hidden="true"></i>`
        ).join("");
    }

    function agrupar(linhas) {
        const mapa = new Map();
        linhas.forEach(linha => {
            if (!mapa.has(linha.produto_id)) {
                mapa.set(linha.produto_id, {
                    id: linha.produto_id,
                    nome: linha.produto_nome,
                    imagem: linha.produto_imagem_url,
                    disponivel: linha.produto_disponivel,
                    interessados: []
                });
            }
            mapa.get(linha.produto_id).interessados.push(linha);
        });
        return [...mapa.values()];
    }

    function criarInteressado(item) {
        const vendido = Boolean(item.venda_id);
        let situacao = "";

        if (vendido) {
            situacao = `
                <span class="anuncio-selo disponivel"><i class="fa-solid fa-handshake" aria-hidden="true"></i> Venda confirmada em ${escapar(data(item.venda_em))}</span>
                ${item.avaliacao_nota
                    ? `<span class="interessado-avaliacao" aria-label="${item.avaliacao_nota} de 5 estrelas">${estrelas(item.avaliacao_nota)}</span>`
                    : '<span class="interessado-aguardando">Aguardando a avaliação do comprador</span>'}
            `;
        } else if (item.confirmacao_pedida_em) {
            situacao = `<span class="anuncio-selo indisponivel"><i class="fa-solid fa-bell" aria-hidden="true"></i> Pediu a confirmação em ${escapar(data(item.confirmacao_pedida_em))}</span>`;
        }

        return `
            <li class="interessado-item" data-interesse="${escapar(item.interesse_id)}">
                <div class="interessado-dados">
                    <strong>${escapar(item.interessado_nome)}</strong>
                    <small>Interesse em ${escapar(data(item.interesse_em))}</small>
                    <div class="interessado-situacao">${situacao}</div>
                    ${item.avaliacao_comentario ? `<p class="interessado-comentario">“${escapar(item.avaliacao_comentario)}”</p>` : ""}
                </div>
                ${vendido ? "" : `
                    <div class="interessado-acoes">
                        <label class="interessado-indisponivel">
                            <input type="checkbox" data-indisponivel checked>
                            Marcar o anúncio como indisponível
                        </label>
                        <button type="button" class="institucional-btn" data-confirmar="${escapar(item.interesse_id)}">
                            <i class="fa-solid fa-check" aria-hidden="true"></i> Confirmar venda
                        </button>
                    </div>
                `}
            </li>
        `;
    }

    function renderizar(linhas) {
        const lista = $("listaInteressados");
        const resumo = $("resumoInteressados");
        const anuncios = agrupar(linhas);
        const pendentes = linhas.filter(l => !l.venda_id).length;

        if (resumo) {
            resumo.textContent = linhas.length
                ? `${linhas.length} ${linhas.length === 1 ? "interessado" : "interessados"} em ${anuncios.length} ${anuncios.length === 1 ? "anúncio" : "anúncios"}${pendentes ? `, ${pendentes} sem venda confirmada` : ""}.`
                : "Ninguém demonstrou interesse ainda.";
        }

        if (!lista) return;

        if (!anuncios.length) {
            lista.innerHTML = `
                <div class="anuncios-vazio">
                    <i class="fa-regular fa-hand" aria-hidden="true"></i>
                    <p>Quando alguém clicar em "Tenho interesse" em um anúncio seu, a pessoa aparece aqui.</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = anuncios.map(anuncio => `
            <article class="anuncios-card interessados-anuncio">
                <header class="interessados-anuncio-topo">
                    <div class="anuncio-item-imagem">
                        ${anuncio.imagem
                            ? `<img src="${escapar(anuncio.imagem)}" alt="" loading="lazy">`
                            : '<i class="fa-regular fa-image" aria-hidden="true"></i>'}
                    </div>
                    <div>
                        <h2><a href="produto.html?id=${encodeURIComponent(anuncio.id)}">${escapar(anuncio.nome)}</a></h2>
                        <span class="anuncio-selo ${anuncio.disponivel ? "disponivel" : "indisponivel"}">${anuncio.disponivel ? "Disponível" : "Indisponível"}</span>
                    </div>
                </header>
                <ul class="interessados-pessoas">
                    ${anuncio.interessados.map(criarInteressado).join("")}
                </ul>
            </article>
        `).join("");
    }

    async function carregar() {
        const { data: linhas, error } = await window.db.rpc("listar_interessados_anuncios");
        if (error) throw error;
        renderizar(linhas || []);
    }

    async function confirmar(botao) {
        const item = botao.closest(".interessado-item");
        const nome = item?.querySelector("strong")?.textContent || "esta pessoa";
        const indisponivel = item?.querySelector("[data-indisponivel]")?.checked === true;

        if (!window.confirm(`Confirmar que você vendeu para ${nome}? Depois disso a pessoa poderá avaliar você.`)) return;

        botao.disabled = true;
        try {
            const { error } = await window.db.rpc("confirmar_venda_anuncio", {
                p_interesse_id: botao.dataset.confirmar,
                p_marcar_indisponivel: indisponivel
            });
            if (error) throw error;
            avisar("Venda confirmada. O comprador foi avisado e já pode avaliar você.", "sucesso", "Venda confirmada");
            await carregar();
        } catch (erro) {
            console.error("Erro ao confirmar a venda:", erro);
            avisar(erro?.message || "Não foi possível confirmar a venda.", "erro", "Erro");
            botao.disabled = false;
        }
    }

    async function iniciar() {
        if (!window.db) return;

        try {
            const { data: sessao } = await window.db.auth.getSession();
            if (!sessao?.session) {
                window.location.replace("login.html");
                return;
            }

            const { data: lojas } = await window.db
                .from("lojas")
                .select("id,tipo")
                .eq("proprietario_id", sessao.session.user.id)
                .limit(1);

            const voltar = $("btnVoltarAnuncios");
            if (voltar && lojas?.[0]?.tipo === "loja") {
                voltar.href = "painel-loja.html";
                voltar.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Voltar ao painel';
            }

            $("listaInteressados")?.addEventListener("click", evento => {
                const botao = evento.target.closest("[data-confirmar]");
                if (botao) confirmar(botao);
            });

            await carregar();
        } catch (erro) {
            console.error("Erro ao carregar os interessados:", erro);
            const resumo = $("resumoInteressados");
            if (resumo) resumo.textContent = "Não foi possível carregar os interessados. Atualize a página.";
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
