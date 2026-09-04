// ==========================================
// PRODUTO.JS
// Página individual do produto
// ==========================================

(() => {
    "use strict";

    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const LIMITE_RELACIONADOS = 8;

    const estado = {
        produtoId: "",
        produto: null,
        loja: null,
        categoria: null,
        metricas: {
            avaliacao_media: 0,
            total_avaliacoes: 0,
            total_vendido: 0
        },
        resumoAvaliacoes: null,
        avaliacoes: [],
        imagens: [],
        quantidade: 1
    };

    const elementos = {};

    function mapearElementos() {
        [
            "estadoProduto",
            "conteudoProduto",
            "breadcrumbLojaLink",
            "breadcrumbProduto",
            "imagemProdutoPrincipal",
            "imagemProdutoPlaceholder",
            "seloOfertaProduto",
            "favoritarProduto",
            "miniaturasProduto",
            "categoriaProduto",
            "situacaoEstoque",
            "nomeProduto",
            "atalhoAvaliacoes",
            "estrelasProduto",
            "mediaProduto",
            "totalAvaliacoesProduto",
            "descricaoCurtaProduto",
            "precoAntigoProduto",
            "precoAtualProduto",
            "descontoProduto",
            "taxaEntregaProduto",
            "quantidadeProduto",
            "diminuirQuantidadeProduto",
            "aumentarQuantidadeProduto",
            "limiteQuantidadeProduto",
            "adicionarCarrinhoProduto",
            "comprarAgoraProduto",
            "compartilharProduto",
            "denunciarProduto",
            "logoLojaProduto",
            "logoLojaProdutoPlaceholder",
            "nomeLojaProduto",
            "localLojaProduto",
            "horarioLojaProduto",
            "enderecoLojaProduto",
            "verLojaProduto",
            "whatsappLojaProduto",
            "descricaoCompletaProduto",
            "detalheEstoqueProduto",
            "detalheCategoriaProduto",
            "detalheLojaProduto",
            "detalheVendasProduto",
            "avaliacoesProduto",
            "resumoAvaliacoesProduto",
            "listaAvaliacoesProduto",
            "verMaisRelacionados",
            "listaProdutosRelacionados",
            "produtoBarraMobile",
            "nomeProdutoMobile",
            "precoProdutoMobile",
            "adicionarCarrinhoProdutoMobile"
        ].forEach(id => {
            elementos[id] = document.getElementById(id);
        });
    }

    function obterRelacao(valor) {
        return Array.isArray(valor) ? valor[0] || null : valor || null;
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

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatarNumero(valor) {
        return Number(valor || 0).toLocaleString("pt-BR");
    }

    function formatarMedia(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        });
    }

    function notificar(mensagem, tipo = "info", titulo = null, duracao = 4000) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, duracao);
            return;
        }

        console.warn(`[${tipo}] ${titulo || ""}`, mensagem);
    }

    function obterProdutoIdDaURL() {
        return String(new URLSearchParams(window.location.search).get("id") || "").trim();
    }

    function criarURLProduto(produtoId = estado.produtoId) {
        const url = new URL("produto.html", window.location.href);
        url.search = "";
        url.hash = "";
        url.searchParams.set("id", produtoId);
        return url.toString();
    }

    function criarLinkProduto(produtoId) {
        return `produto.html?id=${encodeURIComponent(produtoId || "")}`;
    }

    function criarLinkLoja(lojaId = estado.loja?.id) {
        return `loja.html?id=${encodeURIComponent(lojaId || "")}`;
    }

    function criarNomeCategoria(categoria = estado.categoria) {
        if (!categoria) return "Sem categoria";

        const pai = obterRelacao(categoria.categoria_pai);
        return pai?.nome
            ? `${pai.nome} › ${categoria.nome || ""}`
            : categoria.nome || "Sem categoria";
    }

    async function carregarProduto() {
        const { data, error } = await window.db
            .from("produtos")
            .select(`
                id,
                loja_id,
                categoria_id,
                nome,
                descricao,
                preco,
                preco_promocional,
                estoque,
                imagem_url,
                destaque,
                ativo,
                criado_em,
                loja:lojas!produtos_loja_id_fkey(
                    id,
                    nome,
                    descricao,
                    telefone,
                    whatsapp,
                    endereco,
                    cidade,
                    estado,
                    horario_abertura,
                    horario_fechamento,
                    logo_url,
                    taxa_entrega,
                    ativa,
                    status_aprovacao
                ),
                categoria:categorias_produtos!produtos_categoria_id_fkey(
                    id,
                    nome,
                    categoria_pai_id
                )
            `)
            .eq("id", estado.produtoId)
            .eq("ativo", true)
            .maybeSingle();

        if (error) throw error;
        if (!data) return null;

        const loja = obterRelacao(data.loja);
        if (!loja || loja.ativa !== true || loja.status_aprovacao !== "aprovada") {
            return null;
        }

        estado.produto = data;
        estado.loja = loja;
        estado.categoria = obterRelacao(data.categoria);
        await carregarCategoriaPai();
        return data;
    }

    async function carregarCategoriaPai() {
        const categoriaPaiId = estado.categoria?.categoria_pai_id;
        if (!categoriaPaiId) return;

        try {
            const { data, error } = await window.db
                .from("categorias_produtos")
                .select("id,nome")
                .eq("id", categoriaPaiId)
                .maybeSingle();

            if (error) throw error;
            if (data) estado.categoria.categoria_pai = data;
        } catch (erro) {
            console.warn("Não foi possível carregar a categoria principal:", erro);
        }
    }

    async function carregarDadosComplementares() {
        const tarefas = [
            carregarMetricas(),
            carregarImagens(),
            carregarAvaliacoes()
        ];

        await Promise.all(tarefas);
    }

    async function carregarMetricas() {
        try {
            const { data, error } = await window.db
                .from("produto_metricas")
                .select("avaliacao_media,total_avaliacoes,total_vendido")
                .eq("produto_id", estado.produtoId)
                .maybeSingle();

            if (error) throw error;

            estado.metricas = {
                avaliacao_media: Math.min(5, Math.max(0, Number(data?.avaliacao_media || 0))),
                total_avaliacoes: Math.max(0, Number(data?.total_avaliacoes || 0)),
                total_vendido: Math.max(0, Number(data?.total_vendido || 0))
            };
        } catch (erro) {
            console.warn("Não foi possível carregar as métricas do produto:", erro);
        }
    }

    async function carregarImagens() {
        const imagens = [];
        const principal = String(estado.produto?.imagem_url || "").trim();
        if (principal) imagens.push(principal);

        try {
            const { data, error } = await window.db
                .from("produto_imagens")
                .select("imagem_url,ordem")
                .eq("produto_id", estado.produtoId)
                .order("ordem", { ascending: true });

            if (error) throw error;

            (data || []).forEach(item => {
                const url = String(item?.imagem_url || "").trim();
                if (url && !imagens.includes(url)) imagens.push(url);
            });
        } catch (erro) {
            console.warn("As imagens adicionais não puderam ser carregadas:", erro);
        }

        estado.imagens = imagens.slice(0, 8);
    }

    async function carregarAvaliacoes() {
        const resumoPadrao = {
            media: 0,
            total: 0,
            nota_5: 0,
            nota_4: 0,
            nota_3: 0,
            nota_2: 0,
            nota_1: 0
        };

        try {
            const [resultadoResumo, resultadoLista] = await Promise.all([
                window.db.rpc("obter_resumo_avaliacoes_produto", {
                    p_produto_id: estado.produtoId
                }),
                window.db.rpc("listar_avaliacoes_produto", {
                    p_produto_id: estado.produtoId
                })
            ]);

            if (resultadoResumo.error) throw resultadoResumo.error;
            if (resultadoLista.error) throw resultadoLista.error;

            const resumo = Array.isArray(resultadoResumo.data)
                ? resultadoResumo.data[0]
                : resultadoResumo.data;

            estado.resumoAvaliacoes = {
                ...resumoPadrao,
                ...(resumo || {})
            };
            estado.avaliacoes = Array.isArray(resultadoLista.data)
                ? resultadoLista.data
                : [];

            if (Number(estado.resumoAvaliacoes.total || 0) > 0) {
                estado.metricas.avaliacao_media = Number(
                    estado.resumoAvaliacoes.media || estado.metricas.avaliacao_media
                );
                estado.metricas.total_avaliacoes = Number(
                    estado.resumoAvaliacoes.total || estado.metricas.total_avaliacoes
                );
            }
        } catch (erro) {
            console.warn("Não foi possível carregar as avaliações:", erro);
            estado.resumoAvaliacoes = resumoPadrao;
            estado.avaliacoes = [];
        }
    }

    function renderizarProduto() {
        renderizarBreadcrumb();
        renderizarImagens();
        renderizarInformacoes();
        renderizarLoja();
        renderizarDescricao();
        renderizarAvaliacoes();
        atualizarMetadados();

        elementos.estadoProduto.hidden = true;
        elementos.conteudoProduto.hidden = false;
        elementos.produtoBarraMobile.hidden = false;
        window.Favoritos?.atualizarBotoes(document);
    }

    function renderizarBreadcrumb() {
        const nomeLoja = estado.loja?.nome || "Loja";
        const nomeProduto = estado.produto?.nome || "Produto";

        elementos.breadcrumbLojaLink.textContent = nomeLoja;
        elementos.breadcrumbLojaLink.href = criarLinkLoja();
        elementos.breadcrumbProduto.textContent = nomeProduto;
    }

    function renderizarImagens() {
        elementos.imagemProdutoPrincipal.addEventListener("error", () => {
            elementos.imagemProdutoPrincipal.hidden = true;
            elementos.imagemProdutoPrincipal.removeAttribute("src");
            elementos.imagemProdutoPlaceholder.hidden = false;
        });

        if (!estado.imagens.length) {
            elementos.imagemProdutoPrincipal.hidden = true;
            elementos.imagemProdutoPlaceholder.hidden = false;
            elementos.miniaturasProduto.hidden = true;
            return;
        }

        selecionarImagem(estado.imagens[0], 0);

        if (estado.imagens.length <= 1) {
            elementos.miniaturasProduto.hidden = true;
            return;
        }

        elementos.miniaturasProduto.innerHTML = estado.imagens.map((url, indice) => `
            <button
                type="button"
                class="produto-miniatura ${indice === 0 ? "ativa" : ""}"
                data-imagem-produto="${escaparAtributo(url)}"
                data-imagem-indice="${indice}"
                aria-label="Ver imagem ${indice + 1} do produto"
                aria-pressed="${indice === 0 ? "true" : "false"}"
            >
                <img src="${escaparAtributo(url)}" alt="" loading="lazy">
            </button>
        `).join("");
        elementos.miniaturasProduto.hidden = false;

        elementos.miniaturasProduto.querySelectorAll("img").forEach(imagem => {
            imagem.addEventListener("error", () => {
                imagem.closest(".produto-miniatura")?.remove();
            }, { once: true });
        });
    }

    function selecionarImagem(url, indice) {
        elementos.imagemProdutoPrincipal.src = url;
        elementos.imagemProdutoPrincipal.alt = estado.produto?.nome || "Produto";
        elementos.imagemProdutoPrincipal.hidden = false;
        elementos.imagemProdutoPlaceholder.hidden = true;

        elementos.miniaturasProduto
            ?.querySelectorAll(".produto-miniatura")
            .forEach(botao => {
                const ativa = Number(botao.dataset.imagemIndice) === Number(indice);
                botao.classList.toggle("ativa", ativa);
                botao.setAttribute("aria-pressed", String(ativa));
            });
    }

    function renderizarInformacoes() {
        const produto = estado.produto;
        const estoque = Math.max(0, Math.floor(Number(produto.estoque || 0)));
        const preco = Math.max(0, Number(produto.preco || 0));
        const promocional = Math.max(0, Number(produto.preco_promocional || 0));
        const temPromocao = promocional > 0 && promocional < preco;
        const precoAtual = temPromocao ? promocional : preco;
        const descricao = String(produto.descricao || "").trim();
        const categoria = criarNomeCategoria();
        const media = estado.metricas.avaliacao_media;
        const totalAvaliacoes = estado.metricas.total_avaliacoes;

        elementos.categoriaProduto.textContent = categoria;
        elementos.nomeProduto.textContent = produto.nome || "Produto";
        elementos.descricaoCurtaProduto.textContent = descricao
            ? resumirTexto(descricao, 190)
            : "Produto disponível em uma loja aprovada do comércio local.";
        elementos.descricaoCompletaProduto.textContent = descricao
            || "A loja ainda não adicionou uma descrição detalhada para este produto.";

        elementos.estrelasProduto.innerHTML = criarEstrelasHTML(media);
        elementos.mediaProduto.textContent = totalAvaliacoes > 0
            ? formatarMedia(media)
            : "—";
        elementos.totalAvaliacoesProduto.textContent = totalAvaliacoes > 0
            ? `${totalAvaliacoes} ${totalAvaliacoes === 1 ? "avaliação" : "avaliações"}`
            : "Sem avaliações";
        elementos.atalhoAvaliacoes.setAttribute(
            "aria-label",
            totalAvaliacoes > 0
                ? `Ver ${totalAvaliacoes} avaliações. Média ${formatarMedia(media)} de 5.`
                : "Este produto ainda não possui avaliações."
        );

        elementos.precoAtualProduto.textContent = formatarMoeda(precoAtual);
        elementos.precoProdutoMobile.textContent = formatarMoeda(precoAtual);
        elementos.nomeProdutoMobile.textContent = produto.nome || "Produto";

        elementos.precoAntigoProduto.hidden = !temPromocao;
        elementos.descontoProduto.hidden = !temPromocao;
        elementos.seloOfertaProduto.hidden = !temPromocao;

        if (temPromocao) {
            const desconto = Math.max(1, Math.round(((preco - promocional) / preco) * 100));
            elementos.precoAntigoProduto.textContent = `De ${formatarMoeda(preco)}`;
            elementos.descontoProduto.textContent = `${desconto}% de desconto`;
        }

        elementos.favoritarProduto.dataset.favoritoProduto = produto.id;
        elementos.favoritarProduto.dataset.favoritoNome = produto.nome || "Produto";
        elementos.denunciarProduto.dataset.conteudoId = produto.id;
        elementos.denunciarProduto.dataset.conteudoTitulo = produto.nome || "Produto";

        const emEstoque = estoque > 0;
        elementos.situacaoEstoque.classList.toggle("em-estoque", emEstoque);
        elementos.situacaoEstoque.classList.toggle("sem-estoque", !emEstoque);
        elementos.situacaoEstoque.innerHTML = emEstoque
            ? '<i class="fa-solid fa-circle-check" aria-hidden="true"></i> Em estoque'
            : '<i class="fa-solid fa-circle-xmark" aria-hidden="true"></i> Sem estoque';

        elementos.quantidadeProduto.max = String(Math.max(1, estoque));
        elementos.quantidadeProduto.disabled = !emEstoque;
        elementos.diminuirQuantidadeProduto.disabled = true;
        elementos.aumentarQuantidadeProduto.disabled = !emEstoque || estoque <= 1;
        elementos.limiteQuantidadeProduto.textContent = emEstoque
            ? `${estoque} ${estoque === 1 ? "unidade disponível" : "unidades disponíveis"}`
            : "Produto indisponível no momento";

        [
            elementos.adicionarCarrinhoProduto,
            elementos.comprarAgoraProduto,
            elementos.adicionarCarrinhoProdutoMobile
        ].forEach(botao => {
            botao.disabled = !emEstoque;
        });

        if (!emEstoque) {
            elementos.adicionarCarrinhoProduto.innerHTML =
                '<i class="fa-solid fa-ban" aria-hidden="true"></i> Produto sem estoque';
            elementos.comprarAgoraProduto.innerHTML =
                '<i class="fa-solid fa-ban" aria-hidden="true"></i> Indisponível';
            elementos.adicionarCarrinhoProdutoMobile.innerHTML =
                '<i class="fa-solid fa-ban" aria-hidden="true"></i> Sem estoque';
        }

        const taxaEntrega = Math.max(0, Number(estado.loja?.taxa_entrega || 0));
        elementos.taxaEntregaProduto.textContent = taxaEntrega > 0
            ? `${formatarMoeda(taxaEntrega)} por pedido`
            : "Grátis";

        elementos.detalheEstoqueProduto.textContent = emEstoque
            ? `${estoque} ${estoque === 1 ? "unidade" : "unidades"}`
            : "Sem estoque";
        elementos.detalheCategoriaProduto.textContent = categoria;
        elementos.detalheLojaProduto.textContent = estado.loja?.nome || "Loja";
        elementos.detalheVendasProduto.textContent = formatarNumero(
            estado.metricas.total_vendido
        );
    }

    function renderizarLoja() {
        const loja = estado.loja;
        const nome = loja.nome || "Loja";
        const cidade = String(loja.cidade || "").trim();
        const uf = String(loja.estado || "").trim();
        const local = cidade && uf ? `${cidade} - ${uf}` : cidade || uf || "Comércio local";

        elementos.nomeLojaProduto.textContent = nome;
        elementos.localLojaProduto.textContent = local;
        elementos.enderecoLojaProduto.textContent = loja.endereco || local;
        elementos.horarioLojaProduto.textContent = criarTextoHorario(loja);
        elementos.verLojaProduto.href = criarLinkLoja(loja.id);

        if (loja.logo_url) {
            elementos.logoLojaProduto.src = loja.logo_url;
            elementos.logoLojaProduto.alt = `Logo da ${nome}`;
            elementos.logoLojaProduto.hidden = false;
            elementos.logoLojaProdutoPlaceholder.hidden = true;
            elementos.logoLojaProduto.addEventListener("error", () => {
                elementos.logoLojaProduto.hidden = true;
                elementos.logoLojaProdutoPlaceholder.hidden = false;
            }, { once: true });
        }

        configurarWhatsapp(loja);

        const categoriaId = estado.categoria?.id || estado.produto?.categoria_id || "";
        elementos.verMaisRelacionados.href = categoriaId
            ? `index.html?categoria_produto=${encodeURIComponent(categoriaId)}#produtos-globais`
            : "index.html#produtos-globais";
    }

    function criarTextoHorario(loja) {
        const abertura = String(loja.horario_abertura || "").slice(0, 5);
        const fechamento = String(loja.horario_fechamento || "").slice(0, 5);

        if (!abertura || !fechamento) return "Horário não informado";

        const agora = new Date();
        const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
        const minutosAbertura = converterHorarioEmMinutos(abertura);
        const minutosFechamento = converterHorarioEmMinutos(fechamento);
        const aberta = minutosFechamento >= minutosAbertura
            ? minutosAgora >= minutosAbertura && minutosAgora < minutosFechamento
            : minutosAgora >= minutosAbertura || minutosAgora < minutosFechamento;

        return `${aberta ? "Aberta agora" : "Fechada agora"} · ${abertura} às ${fechamento}`;
    }

    function converterHorarioEmMinutos(horario) {
        const [horas, minutos] = horario.split(":").map(Number);
        return horas * 60 + minutos;
    }

    function configurarWhatsapp(loja) {
        let numero = String(loja.whatsapp || loja.telefone || "").replace(/\D/g, "");
        if (!numero) {
            elementos.whatsappLojaProduto.hidden = true;
            return;
        }

        if (!numero.startsWith("55")) numero = `55${numero}`;

        const mensagem = encodeURIComponent(
            `Olá! Vi o produto ${estado.produto?.nome || ""} no Comércio da Cidade. ${criarURLProduto()}`
        );

        elementos.whatsappLojaProduto.href = `https://wa.me/${numero}?text=${mensagem}`;
        elementos.whatsappLojaProduto.hidden = false;
    }

    function renderizarDescricao() {
        // O conteúdo principal e os detalhes são preenchidos em renderizarInformacoes.
    }

    function criarEstrelasHTML(media) {
        const valor = Math.min(5, Math.max(0, Number(media || 0)));
        let html = "";

        for (let estrela = 1; estrela <= 5; estrela += 1) {
            if (valor >= estrela) {
                html += '<i class="fa-solid fa-star" aria-hidden="true"></i>';
            } else if (valor >= estrela - 0.5) {
                html += '<i class="fa-solid fa-star-half-stroke" aria-hidden="true"></i>';
            } else {
                html += '<i class="fa-regular fa-star" aria-hidden="true"></i>';
            }
        }

        return html;
    }

    function renderizarAvaliacoes() {
        const resumo = estado.resumoAvaliacoes || {};
        const total = Math.max(0, Number(resumo.total || 0));
        const media = total > 0 ? Number(resumo.media || 0) : 0;

        elementos.resumoAvaliacoesProduto.innerHTML = `
            <div class="produto-nota-geral">
                <strong>${total > 0 ? formatarMedia(media) : "—"}</strong>
                <span class="produto-estrelas" aria-label="Média ${formatarMedia(media)} de 5 estrelas">
                    ${criarEstrelasHTML(media)}
                </span>
                <span>${total} ${total === 1 ? "avaliação" : "avaliações"}</span>
            </div>
            <div class="produto-distribuicao-notas">
                ${[5, 4, 3, 2, 1].map(nota => criarLinhaDistribuicao(nota, resumo, total)).join("")}
            </div>
        `;

        if (!estado.avaliacoes.length) {
            elementos.listaAvaliacoesProduto.innerHTML = `
                <div class="produto-avaliacoes-vazio">
                    <i class="fa-regular fa-star" aria-hidden="true"></i>
                    <h3>Este produto ainda não recebeu avaliações.</h3>
                    <p>Depois de uma compra entregue, o cliente poderá contar como foi a experiência.</p>
                </div>
            `;
            return;
        }

        elementos.listaAvaliacoesProduto.innerHTML = estado.avaliacoes
            .map(criarCardAvaliacao)
            .join("");
    }

    function criarLinhaDistribuicao(nota, resumo, total) {
        const quantidade = Math.max(0, Number(resumo?.[`nota_${nota}`] || 0));
        const percentual = total > 0 ? Math.min(100, (quantidade / total) * 100) : 0;

        return `
            <div class="produto-distribuicao-linha">
                <span>${nota} <i class="fa-solid fa-star" aria-hidden="true"></i></span>
                <div
                    class="produto-distribuicao-barra"
                    role="progressbar"
                    aria-label="${nota} estrelas"
                    aria-valuemin="0"
                    aria-valuemax="${total}"
                    aria-valuenow="${quantidade}"
                >
                    <span style="width:${percentual}%"></span>
                </div>
                <span>${quantidade}</span>
            </div>
        `;
    }

    function criarCardAvaliacao(avaliacao) {
        const nota = Math.min(5, Math.max(1, Number(avaliacao?.nota || 1)));
        const comentario = String(avaliacao?.comentario || "").trim();
        const resposta = String(avaliacao?.resposta_loja || "").trim();
        const data = formatarData(avaliacao?.criado_em);
        const avaliacaoId = String(avaliacao?.id || "");

        return `
            <article class="produto-avaliacao-card">
                <div class="produto-avaliacao-card-topo">
                    <div>
                        <span class="produto-estrelas" aria-label="${nota} de 5 estrelas">
                            ${criarEstrelasHTML(nota)}
                        </span>
                        <span class="produto-avaliacao-verificada">
                            <i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                            Compra verificada
                        </span>
                    </div>
                    ${data ? `<time datetime="${escaparAtributo(avaliacao.criado_em)}">${escaparHTML(data)}</time>` : ""}
                </div>
                <p class="${comentario ? "" : "sem-comentario"}">
                    ${comentario
                        ? escaparHTML(comentario)
                        : "O cliente avaliou este produto sem deixar comentário."}
                </p>
                ${resposta ? `
                    <div class="produto-resposta-loja">
                        <strong>
                            <i class="fa-solid fa-store" aria-hidden="true"></i>
                            Resposta da loja
                        </strong>
                        <p>${escaparHTML(resposta)}</p>
                    </div>
                ` : ""}
                ${avaliacaoId ? `
                    <button
                        type="button"
                        class="produto-denunciar-avaliacao"
                        data-denunciar-conteudo
                        data-tipo-conteudo="avaliacao"
                        data-conteudo-id="${escaparAtributo(avaliacaoId)}"
                        data-conteudo-titulo="Avaliação de ${escaparAtributo(estado.produto?.nome || "produto")}"
                    >
                        <i class="fa-regular fa-flag" aria-hidden="true"></i>
                        Denunciar avaliação
                    </button>
                ` : ""}
            </article>
        `;
    }

    function formatarData(valor) {
        if (!valor) return "";
        const data = new Date(valor);
        if (Number.isNaN(data.getTime())) return "";

        return data.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
    }

    async function carregarRelacionados() {
        elementos.listaProdutosRelacionados.innerHTML = `
            <div class="produto-relacionados-estado">
                <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
                <h3>Buscando produtos semelhantes...</h3>
            </div>
        `;

        try {
            let relacionados = await buscarRelacionados({
                categoriaId: estado.produto?.categoria_id || null,
                lojaId: null
            });

            relacionados = relacionados.filter(item =>
                String(item.id) !== String(estado.produtoId)
            );

            if (!relacionados.length) {
                relacionados = await buscarRelacionados({
                    categoriaId: null,
                    lojaId: estado.loja?.id || null
                });
                relacionados = relacionados.filter(item =>
                    String(item.id) !== String(estado.produtoId)
                );
            }

            renderizarRelacionados(relacionados.slice(0, 4));
        } catch (erro) {
            console.warn("Não foi possível carregar produtos relacionados:", erro);
            elementos.listaProdutosRelacionados.innerHTML = `
                <div class="produto-relacionados-estado">
                    <i class="fa-solid fa-box-open" aria-hidden="true"></i>
                    <h3>Os produtos relacionados estão indisponíveis agora.</h3>
                    <p>Você ainda pode explorar o catálogo completo na página inicial.</p>
                </div>
            `;
        }
    }

    async function buscarRelacionados({ categoriaId, lojaId }) {
        const { data, error } = await window.db.rpc("buscar_produtos_publicos", {
            p_termo: "",
            p_categoria_id: categoriaId ? Number(categoriaId) : null,
            p_loja_id: lojaId || null,
            p_categoria_loja_id: null,
            p_disponibilidade: "estoque",
            p_preco_min: null,
            p_preco_max: null,
            p_avaliacao_min: null,
            p_ordenacao: "destaques",
            p_limite: LIMITE_RELACIONADOS,
            p_offset: 0
        });

        if (error) throw error;
        return Array.isArray(data) ? data : [];
    }

    function renderizarRelacionados(produtos) {
        if (!produtos.length) {
            elementos.listaProdutosRelacionados.innerHTML = `
                <div class="produto-relacionados-estado">
                    <i class="fa-solid fa-box-open" aria-hidden="true"></i>
                    <h3>Ainda não há produtos semelhantes.</h3>
                    <p>Novos produtos aparecerão aqui conforme as lojas atualizarem seus catálogos.</p>
                </div>
            `;
            return;
        }

        elementos.listaProdutosRelacionados.innerHTML = produtos
            .map(criarCardRelacionado)
            .join("");

        elementos.listaProdutosRelacionados.querySelectorAll("img").forEach(imagem => {
            imagem.addEventListener("error", () => {
                const area = imagem.parentElement;
                imagem.remove();
                if (area) area.innerHTML = '<i class="fa-solid fa-box" aria-hidden="true"></i>';
            }, { once: true });
        });
    }

    function criarCardRelacionado(produto) {
        const nome = escaparHTML(produto.nome || "Produto");
        const nomeLoja = escaparHTML(produto.loja_nome || "Loja");
        const preco = Math.max(0, Number(produto.preco || 0));
        const promocional = Math.max(0, Number(produto.preco_promocional || 0));
        const temPromocao = promocional > 0 && promocional < preco;
        const precoAtual = temPromocao ? promocional : preco;
        const imagem = produto.imagem_url
            ? `<img src="${escaparAtributo(produto.imagem_url)}" alt="${nome}" loading="lazy">`
            : '<i class="fa-solid fa-box" aria-hidden="true"></i>';

        return `
            <a class="produto-relacionado-card" href="${criarLinkProduto(produto.id)}">
                <div class="produto-relacionado-imagem">${imagem}</div>
                <div class="produto-relacionado-conteudo">
                    <small>Vendido por ${nomeLoja}</small>
                    <h3>${nome}</h3>
                    <div class="produto-relacionado-rodape">
                        <div class="produto-relacionado-preco">
                            <strong>${formatarMoeda(precoAtual)}</strong>
                            ${temPromocao ? `<span>${formatarMoeda(preco)}</span>` : ""}
                        </div>
                        <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    </div>
                </div>
            </a>
        `;
    }

    function normalizarQuantidade(valor) {
        const estoque = Math.max(0, Math.floor(Number(estado.produto?.estoque || 0)));
        const numero = Math.floor(Number(valor || 1));
        if (estoque <= 0) return 1;
        if (!Number.isFinite(numero)) return 1;
        return Math.min(estoque, Math.max(1, numero));
    }

    function atualizarQuantidade(valor) {
        estado.quantidade = normalizarQuantidade(valor);
        elementos.quantidadeProduto.value = String(estado.quantidade);

        const estoque = Math.max(0, Math.floor(Number(estado.produto?.estoque || 0)));
        elementos.diminuirQuantidadeProduto.disabled = estado.quantidade <= 1 || estoque <= 0;
        elementos.aumentarQuantidadeProduto.disabled = estado.quantidade >= estoque || estoque <= 0;
    }

    async function adicionarAoCarrinho({ redirecionar = false, quantidade = estado.quantidade } = {}) {
        const produto = estado.produto;
        const estoque = Math.max(0, Math.floor(Number(produto?.estoque || 0)));
        const quantidadeAdicionar = normalizarQuantidade(quantidade);

        if (!produto || estoque <= 0) {
            notificar(
                "Este produto está sem estoque no momento.",
                "aviso",
                "Produto indisponível"
            );
            return false;
        }

        try {
            await window.CarrinhoSync?.iniciar();

            let carrinho = [];
            try {
                const salvo = JSON.parse(localStorage.getItem("carrinho"));
                carrinho = Array.isArray(salvo) ? salvo : [];
            } catch (erro) {
                console.warn("O carrinho salvo estava inválido e foi reiniciado:", erro);
            }

            const existente = carrinho.find(item =>
                String(item.id) === String(produto.id)
                && String(item.loja_id) === String(produto.loja_id)
            );

            if (existente) {
                const quantidadeAtual = Math.max(1, Number(existente.quantidade || 1));
                if (quantidadeAtual + quantidadeAdicionar > estoque) {
                    notificar(
                        `Você já possui ${quantidadeAtual} unidade(s) no carrinho. O estoque disponível é ${estoque}.`,
                        "aviso",
                        "Limite de estoque"
                    );
                    return false;
                }

                Object.assign(existente, criarItemCarrinho(produto, quantidadeAtual + quantidadeAdicionar));
            } else {
                carrinho.push(criarItemCarrinho(produto, quantidadeAdicionar));
            }

            localStorage.setItem("carrinho", JSON.stringify(carrinho));
            window.CarrinhoSync?.notificarAlteracao();
            window.atualizarContadorCarrinho?.();

            if (redirecionar) {
                window.location.href = "carrinho.html";
                return true;
            }

            notificar(
                quantidadeAdicionar === 1
                    ? `"${produto.nome}" foi adicionado ao seu carrinho.`
                    : `${quantidadeAdicionar} unidades de "${produto.nome}" foram adicionadas ao carrinho.`,
                "sucesso",
                "Produto adicionado",
                3000
            );

            return true;
        } catch (erro) {
            console.error("Não foi possível adicionar o produto ao carrinho:", erro);
            notificar(
                "Não foi possível atualizar o carrinho. Tente novamente.",
                "erro",
                "Erro no carrinho"
            );
            return false;
        }
    }

    function criarItemCarrinho(produto, quantidade) {
        return {
            id: produto.id,
            loja_id: produto.loja_id,
            nome_loja: estado.loja?.nome || "Loja",
            nome: produto.nome || "Produto",
            descricao: produto.descricao || "",
            preco: Number(produto.preco || 0),
            preco_promocional: produto.preco_promocional
                ? Number(produto.preco_promocional)
                : null,
            imagem_url: produto.imagem_url || null,
            estoque: Math.max(0, Math.floor(Number(produto.estoque || 0))),
            quantidade
        };
    }

    async function compartilharProduto() {
        const dados = {
            title: `${estado.produto?.nome || "Produto"} | Comércio da Cidade`,
            text: `${estado.produto?.nome || "Produto"} — vendido por ${estado.loja?.nome || "uma loja local"}`,
            url: criarURLProduto()
        };

        try {
            if (navigator.share) {
                await navigator.share(dados);
                return;
            }

            await navigator.clipboard.writeText(dados.url);
            notificar(
                "O link do produto foi copiado.",
                "sucesso",
                "Link copiado"
            );
        } catch (erro) {
            if (erro?.name === "AbortError") return;

            console.warn("Não foi possível compartilhar o produto:", erro);
            notificar(
                "Não foi possível compartilhar automaticamente. Copie o endereço desta página.",
                "aviso",
                "Compartilhamento indisponível"
            );
        }
    }

    function resumirTexto(texto, limite) {
        const valor = String(texto || "").replace(/\s+/g, " ").trim();
        if (valor.length <= limite) return valor;
        return `${valor.slice(0, limite - 1).trimEnd()}…`;
    }

    function atualizarMetadados() {
        const produto = estado.produto;
        const nome = produto.nome || "Produto";
        const descricao = resumirTexto(
            produto.descricao || `Compre ${nome} em uma loja local pelo Comércio da Cidade.`,
            155
        );
        const url = criarURLProduto();

        document.title = `${nome} | Comércio da Cidade`;
        document.getElementById("metaDescricaoProduto")?.setAttribute("content", descricao);
        document.getElementById("metaOgTituloProduto")?.setAttribute(
            "content",
            `${nome} | Comércio da Cidade`
        );
        document.getElementById("metaOgDescricaoProduto")?.setAttribute("content", descricao);
        document.getElementById("metaOgUrlProduto")?.setAttribute("content", url);

        if (produto.imagem_url) {
            document.getElementById("metaOgImagemProduto")?.setAttribute(
                "content",
                produto.imagem_url
            );
        }

        adicionarDadosEstruturados(url);
    }

    function adicionarDadosEstruturados(url) {
        const produto = estado.produto;
        const preco = Number(produto.preco_promocional || 0) > 0
            && Number(produto.preco_promocional) < Number(produto.preco || 0)
            ? Number(produto.preco_promocional)
            : Number(produto.preco || 0);
        const dados = {
            "@context": "https://schema.org",
            "@type": "Product",
            name: produto.nome || "Produto",
            description: produto.descricao || undefined,
            image: estado.imagens.length ? estado.imagens : undefined,
            url,
            offers: {
                "@type": "Offer",
                priceCurrency: "BRL",
                price: preco.toFixed(2),
                availability: Number(produto.estoque || 0) > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
                seller: {
                    "@type": "Organization",
                    name: estado.loja?.nome || "Loja local"
                }
            }
        };

        if (estado.metricas.total_avaliacoes > 0) {
            dados.aggregateRating = {
                "@type": "AggregateRating",
                ratingValue: Number(estado.metricas.avaliacao_media).toFixed(1),
                reviewCount: estado.metricas.total_avaliacoes,
                bestRating: 5,
                worstRating: 1
            };
        }

        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.id = "dadosEstruturadosProduto";
        script.textContent = JSON.stringify(dados);
        document.head.appendChild(script);
    }

    function mostrarErro({ titulo, mensagem, inexistente = false }) {
        elementos.conteudoProduto.hidden = true;
        elementos.produtoBarraMobile.hidden = true;
        elementos.estadoProduto.hidden = false;
        elementos.estadoProduto.innerHTML = `
            <i class="fa-solid ${inexistente ? "fa-box-open" : "fa-triangle-exclamation"}" aria-hidden="true"></i>
            <h1>${escaparHTML(titulo)}</h1>
            <p>${escaparHTML(mensagem)}</p>
            ${inexistente
                ? '<a href="index.html#produtos-globais"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i> Explorar outros produtos</a>'
                : '<button type="button" data-recarregar-produto><i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Tentar novamente</button>'}
        `;
    }

    function configurarEventos() {
        elementos.diminuirQuantidadeProduto.addEventListener("click", () => {
            atualizarQuantidade(estado.quantidade - 1);
        });

        elementos.aumentarQuantidadeProduto.addEventListener("click", () => {
            atualizarQuantidade(estado.quantidade + 1);
        });

        elementos.quantidadeProduto.addEventListener("change", event => {
            atualizarQuantidade(event.target.value);
        });

        elementos.quantidadeProduto.addEventListener("blur", event => {
            atualizarQuantidade(event.target.value);
        });

        elementos.adicionarCarrinhoProduto.addEventListener("click", () => {
            adicionarAoCarrinho();
        });

        elementos.adicionarCarrinhoProdutoMobile.addEventListener("click", () => {
            adicionarAoCarrinho({ quantidade: 1 });
        });

        elementos.comprarAgoraProduto.addEventListener("click", () => {
            adicionarAoCarrinho({ redirecionar: true });
        });

        elementos.compartilharProduto.addEventListener("click", compartilharProduto);

        elementos.atalhoAvaliacoes.addEventListener("click", () => {
            elementos.avaliacoesProduto.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                    ? "auto"
                    : "smooth",
                block: "start"
            });
        });

        elementos.miniaturasProduto.addEventListener("click", event => {
            const botao = event.target.closest("[data-imagem-produto]");
            if (!botao) return;

            selecionarImagem(
                botao.dataset.imagemProduto,
                Number(botao.dataset.imagemIndice)
            );
        });

        document.addEventListener("click", event => {
            if (event.target.closest("[data-recarregar-produto]")) {
                window.location.reload();
            }
        });
    }

    async function iniciar() {
        mapearElementos();
        configurarEventos();
        estado.produtoId = obterProdutoIdDaURL();

        if (!UUID.test(estado.produtoId)) {
            mostrarErro({
                titulo: "Produto não encontrado",
                mensagem: "O endereço deste produto é inválido ou está incompleto.",
                inexistente: true
            });
            return;
        }

        if (!window.db) {
            mostrarErro({
                titulo: "Não foi possível conectar",
                mensagem: "Atualize a página e tente novamente em alguns instantes."
            });
            return;
        }

        try {
            const produto = await carregarProduto();
            if (!produto) {
                mostrarErro({
                    titulo: "Produto indisponível",
                    mensagem: "Este produto foi removido, está inativo ou pertence a uma loja indisponível.",
                    inexistente: true
                });
                return;
            }

            await carregarDadosComplementares();
            renderizarProduto();
            carregarRelacionados();
        } catch (erro) {
            console.error("Erro ao carregar a página do produto:", erro);
            mostrarErro({
                titulo: "Não foi possível carregar o produto",
                mensagem: "Confira sua conexão e tente novamente."
            });
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
