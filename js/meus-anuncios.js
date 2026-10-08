// ==========================================
// MEUS-ANUNCIOS.JS
// Área do usuário comum (plano gratuito): lista os anúncios e permite
// marcar como indisponível ou excluir. Editar não é permitido neste
// plano, e o banco recusa a alteração mesmo que alguém tente.
// ==========================================

(() => {
    "use strict";

    const estado = {
        perfil: null,
        anuncios: []
    };

    const el = id => document.getElementById(id);

    function escapar(valor) {
        return String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatarData(valor) {
        const data = new Date(valor);
        return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
    }

    function avisar(mensagem, tipo, titulo) {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 4500);
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

    function situacao(anuncio) {
        if (anuncio.moderado_em) {
            return { classe: "moderado", rotulo: "Removido pela moderação", icone: "fa-shield-halved" };
        }
        if (!anuncio.ativo) {
            return { classe: "excluido", rotulo: "Excluído", icone: "fa-trash-can" };
        }
        if (anuncio.status_aprovacao === "pendente") {
            return { classe: "indisponivel", rotulo: "Aguardando aprovação", icone: "fa-hourglass-half" };
        }
        if (anuncio.status_aprovacao === "rejeitado") {
            return { classe: "moderado", rotulo: "Rejeitado", icone: "fa-circle-xmark" };
        }
        if (Number(anuncio.estoque) > 0) {
            return { classe: "disponivel", rotulo: "Disponível", icone: "fa-circle-check" };
        }
        return { classe: "indisponivel", rotulo: "Indisponível", icone: "fa-circle-pause" };
    }

    function criarItem(anuncio) {
        const info = situacao(anuncio);
        const id = escapar(anuncio.id);
        const nome = escapar(anuncio.nome || "Anúncio");
        const preco = anuncio.preco_promocional
            ? formatarMoeda(anuncio.preco_promocional)
            : formatarMoeda(anuncio.preco);

        const imagem = anuncio.imagem_url
            ? `<img src="${escapar(anuncio.imagem_url)}" alt="" loading="lazy">`
            : '<i class="fa-solid fa-image" aria-hidden="true"></i>';

        const ativo = anuncio.ativo && !anuncio.moderado_em;
        const disponivel = Number(anuncio.estoque) > 0;
        const aprovado = anuncio.status_aprovacao === "aprovado";

        const acoes = ativo
            ? `
                <a href="produto.html?id=${encodeURIComponent(anuncio.id)}">
                    <i class="fa-solid fa-eye" aria-hidden="true"></i> Ver anúncio
                </a>
                ${aprovado ? `
                <button type="button" data-acao="disponibilidade" data-id="${id}">
                    <i class="fa-solid ${disponivel ? "fa-circle-pause" : "fa-circle-check"}" aria-hidden="true"></i>
                    ${disponivel ? "Marcar como indisponível" : "Marcar como disponível"}
                </button>` : ""}
                <button type="button" class="perigo" data-acao="excluir" data-id="${id}">
                    <i class="fa-solid fa-trash-can" aria-hidden="true"></i> Excluir
                </button>
            `
            : "";

        return `
            <article class="anuncio-item ${ativo ? "" : "excluido"}" data-anuncio="${id}">
                <div class="anuncio-item-imagem">${imagem}</div>
                <div>
                    <h3>${nome}</h3>
                    <p class="anuncio-item-preco">${preco}</p>
                    <div class="anuncio-item-meta">
                        <span class="anuncio-selo ${info.classe}">
                            <i class="fa-solid ${info.icone}" aria-hidden="true"></i> ${info.rotulo}
                        </span>
                        <span>Enviado em ${escapar(formatarData(anuncio.criado_em))}</span>
                    </div>
                    ${anuncio.ativo && anuncio.status_aprovacao === "rejeitado" && anuncio.motivo_rejeicao
                        ? `<p class="anuncio-item-motivo"><strong>Motivo:</strong> ${escapar(anuncio.motivo_rejeicao)}</p>`
                        : ""}
                </div>
                <div class="anuncio-item-acoes">${acoes}</div>
            </article>
        `;
    }

    function renderizar() {
        const lista = el("listaMeusAnuncios");
        const resumo = el("resumoMeusAnuncios");
        if (!lista) return;

        const ativos = estado.anuncios.filter(a =>
            a.ativo && !a.moderado_em && a.status_aprovacao === "aprovado"
        ).length;

        if (resumo) {
            resumo.textContent = estado.anuncios.length === 0
                ? "Você ainda não publicou nenhum anúncio."
                : `${ativos} ${ativos === 1 ? "anúncio no ar" : "anúncios no ar"} de ${estado.anuncios.length} enviados.`;
        }

        if (estado.anuncios.length === 0) {
            lista.innerHTML = `
                <div class="anuncios-vazio">
                    <i class="fa-solid fa-bullhorn" aria-hidden="true"></i>
                    <p>Publique seu primeiro anúncio. É grátis.</p>
                </div>
            `;
            return;
        }

        lista.innerHTML = estado.anuncios.map(criarItem).join("");
    }

    async function carregarAnuncios() {
        const { data, error } = await window.db
            .from("produtos")
            .select("id,nome,preco,preco_promocional,estoque,imagem_url,ativo,criado_em,moderado_em,status_aprovacao,motivo_rejeicao")
            .eq("loja_id", estado.perfil.id)
            .order("criado_em", { ascending: false });

        if (error) throw error;

        estado.anuncios = data || [];
        renderizar();
    }

    async function alterar(id, campos, mensagemSucesso) {
        const { data, error } = await window.db
            .from("produtos")
            .update(campos)
            .eq("id", id)
            .eq("loja_id", estado.perfil.id)
            .select("id");

        if (error) throw error;
        if (!data || data.length === 0) {
            throw new Error("O anúncio não pôde ser alterado.");
        }

        avisar(mensagemSucesso, "sucesso", "Anúncio atualizado");
        await carregarAnuncios();
    }

    async function tratarClique(event) {
        const botao = event.target.closest?.("[data-acao]");
        if (!botao || botao.disabled) return;

        const anuncio = estado.anuncios.find(item => item.id === botao.dataset.id);
        if (!anuncio) return;

        botao.disabled = true;

        try {
            if (botao.dataset.acao === "disponibilidade") {
                const disponivel = Number(anuncio.estoque) > 0;
                await alterar(
                    anuncio.id,
                    { estoque: disponivel ? 0 : 1 },
                    disponivel
                        ? "O anúncio agora aparece como indisponível."
                        : "O anúncio voltou a ficar disponível."
                );
                return;
            }

            if (botao.dataset.acao === "excluir") {
                const confirmou = await confirmar(
                    "Excluir este anúncio?",
                    "Ele sai do ar e não pode ser recuperado. A vaga usada neste ciclo de 30 dias não volta.",
                    "Excluir"
                );
                if (!confirmou) return;

                await alterar(anuncio.id, { ativo: false }, "O anúncio foi excluído.");
            }
        } catch (erro) {
            console.error("Erro ao alterar o anúncio:", erro);
            avisar(
                erro?.message || "Não foi possível alterar o anúncio.",
                "erro",
                "Erro no anúncio"
            );
        } finally {
            if (botao.isConnected) botao.disabled = false;
        }
    }

    async function iniciar() {
        const resumo = el("resumoMeusAnuncios");
        if (!window.db) return;

        try {
            const { data: sessao } = await window.db.auth.getSession();
            const usuario = sessao?.session?.user;

            if (!usuario) {
                window.location.replace("login.html");
                return;
            }

            const { data: perfil, error } = await window.db
                .from("lojas")
                .select("id,nome,tipo")
                .eq("proprietario_id", usuario.id)
                .maybeSingle();

            if (error) throw error;

            if (!perfil) {
                window.location.replace("anunciar.html");
                return;
            }

            // Lojista usa o painel da loja.
            if (perfil.tipo !== "pessoal") {
                window.location.replace("painel-loja.html");
                return;
            }

            estado.perfil = perfil;

            const publico = el("btnPerfilPublico");
            if (publico) {
                publico.href = `loja.html?id=${encodeURIComponent(perfil.id)}`;
                publico.hidden = false;
            }

            el("listaMeusAnuncios")?.addEventListener("click", tratarClique);
            await carregarAnuncios();
        } catch (erro) {
            console.error("Erro ao carregar seus anúncios:", erro);
            if (resumo) {
                resumo.textContent = "Não foi possível carregar seus anúncios. Atualize a página para tentar de novo.";
            }
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
