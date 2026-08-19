// ==========================================
// AVALIACOES-LOJA.JS
// Comércio da Cidade
// ==========================================

let usuario = null;
let avaliacoes = [];
let filtroAtual = "todas";
let pesquisaAtual = "";

document.addEventListener("DOMContentLoaded", iniciarPagina);

async function iniciarPagina() {
    if (!window.db) {
        mostrarEstado(
            "fa-triangle-exclamation",
            "Erro de conexão",
            "Não foi possível conectar ao sistema."
        );

        notificar(
            "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
            "erro",
            "Erro de conexão",
            6000
        );
        return;
    }

    configurarEventos();

    const autenticado = await verificarUsuario();
    if (!autenticado) return;

    await carregarAvaliacoes();
}

async function verificarUsuario() {
    try {
        const { data: sessaoData, error: sessaoError } =
            await window.db.auth.getSession();

        if (sessaoError) {
            throw sessaoError;
        }

        if (!sessaoData.session) {
            notificar(
                "Entre na sua conta para acessar as avaliações da loja.",
                "info",
                "Login necessário"
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 900);

            return false;
        }

        const { data, error } = await window.db.auth.getUser();

        if (error || !data.user) {
            throw error || new Error("Usuário não encontrado.");
        }

        usuario = data.user;
        return true;

    } catch (erro) {
        console.error("Erro ao verificar usuário:", erro);

        mostrarEstado(
            "fa-user-lock",
            "Sessão inválida",
            "Entre novamente para acessar as avaliações."
        );

        notificar(
            "Não foi possível verificar sua sessão.",
            "erro",
            "Erro de autenticação"
        );

        return false;
    }
}

async function carregarAvaliacoes() {
    mostrarEstado(
        "fa-spinner fa-spin",
        "Carregando avaliações...",
        "Aguarde um momento."
    );

    try {
        const { data, error } = await window.db.rpc(
            "listar_avaliacoes_loja"
        );

        if (error) {
            throw error;
        }

        avaliacoes = Array.isArray(data) ? data : [];

        atualizarResumo();
        renderizarAvaliacoes();

    } catch (erro) {
        console.error("Erro ao carregar avaliações:", erro);

        mostrarEstado(
            "fa-triangle-exclamation",
            "Não foi possível carregar as avaliações",
            "Tente atualizar a página em alguns instantes."
        );

        notificar(
            tratarErro(erro),
            "erro",
            "Erro ao carregar avaliações",
            5500
        );
    }
}

function renderizarAvaliacoes() {
    const lista = document.getElementById("lista-avaliacoes-loja");
    if (!lista) return;

    const filtradas = avaliacoes.filter(avaliacaoPassaNosFiltros);

    if (filtradas.length === 0) {
        const possuiAvaliacoes = avaliacoes.length > 0;

        mostrarEstado(
            possuiAvaliacoes ? "fa-magnifying-glass" : "fa-star",
            possuiAvaliacoes
                ? "Nenhuma avaliação encontrada"
                : "Sua loja ainda não possui avaliações",
            possuiAvaliacoes
                ? "Tente alterar os filtros ou a pesquisa."
                : "Quando clientes avaliarem produtos entregues, as avaliações aparecerão aqui."
        );
        return;
    }

    lista.innerHTML = filtradas
        .map(criarCardAvaliacao)
        .join("");

    configurarEventosRespostas();
}

function avaliacaoPassaNosFiltros(avaliacao) {
    const possuiResposta = Boolean(
        String(avaliacao.resposta_loja || "").trim()
    );

    if (filtroAtual === "pendentes" && possuiResposta) {
        return false;
    }

    if (filtroAtual === "respondidas" && !possuiResposta) {
        return false;
    }

    if (!pesquisaAtual) {
        return true;
    }

    const texto = normalizarTexto([
        avaliacao.produto_nome,
        avaliacao.loja_nome,
        avaliacao.comentario,
        avaliacao.resposta_loja
    ].filter(Boolean).join(" "));

    return texto.includes(normalizarTexto(pesquisaAtual));
}

function criarCardAvaliacao(avaliacao) {
    const id = escaparHTML(avaliacao.id || "");
    const produto = escaparHTML(avaliacao.produto_nome || "Produto");
    const loja = escaparHTML(avaliacao.loja_nome || "Loja");
    const nota = Math.max(1, Math.min(5, Number(avaliacao.nota || 0)));
    const comentario = String(avaliacao.comentario || "").trim();
    const resposta = String(avaliacao.resposta_loja || "").trim();

    return `
        <article class="avaliacao-card" data-avaliacao-id="${id}">
            <div class="avaliacao-topo">
                <div class="avaliacao-identificacao">
                    <h2>${produto}</h2>
                    <span>
                        <i class="fa-solid fa-store"></i>
                        ${loja}
                    </span>

                    <div class="estrelas" aria-label="Nota ${nota} de 5">
                        ${criarEstrelas(nota)}
                    </div>
                </div>

                <span class="avaliacao-data">
                    ${formatarData(avaliacao.criado_em)}
                </span>
            </div>

            <div class="comentario-cliente">
                <strong>Comentário do cliente</strong>
                <div>
                    ${comentario
                        ? formatarTextoMultilinha(comentario)
                        : "O cliente deixou apenas a nota, sem comentário."}
                </div>
            </div>

            ${resposta
                ? `
                    <div class="resposta-publicada">
                        <strong>Sua resposta pública</strong>
                        <div>${formatarTextoMultilinha(resposta)}</div>
                    </div>
                `
                : ""}

            <div class="form-resposta">
                <label for="resposta-${id}">
                    ${resposta ? "Editar resposta" : "Responder avaliação"}
                </label>

                <textarea
                    id="resposta-${id}"
                    data-campo-resposta
                    data-id="${id}"
                    maxlength="1000"
                    placeholder="Escreva uma resposta profissional e respeitosa..."
                >${escaparHTML(resposta)}</textarea>

                <div class="resposta-rodape">
                    <span class="contador-resposta" data-contador-resposta="${id}">
                        ${resposta.length}/1000
                    </span>

                    <button
                        type="button"
                        class="btn-responder"
                        data-responder-avaliacao
                        data-id="${id}"
                    >
                        <i class="fa-solid fa-reply"></i>
                        ${resposta ? "Atualizar resposta" : "Publicar resposta"}
                    </button>
                </div>
            </div>
        </article>
    `;
}

function configurarEventosRespostas() {
    document
        .querySelectorAll("[data-campo-resposta]")
        .forEach(campo => {
            campo.addEventListener("input", () => {
                const contador = document.querySelector(
                    `[data-contador-resposta="${cssEscape(campo.dataset.id)}"]`
                );

                if (contador) {
                    contador.textContent = `${campo.value.length}/1000`;
                }
            });
        });

    document
        .querySelectorAll("[data-responder-avaliacao]")
        .forEach(botao => {
            botao.addEventListener("click", () => {
                responderAvaliacao(botao.dataset.id, botao);
            });
        });
}

async function responderAvaliacao(avaliacaoId, botao) {
    const avaliacao = avaliacoes.find(
        item => String(item.id) === String(avaliacaoId)
    );

    if (!avaliacao) {
        notificar(
            "Não foi possível localizar esta avaliação.",
            "erro",
            "Avaliação não encontrada"
        );
        return;
    }

    const campo = document.querySelector(
        `[data-campo-resposta][data-id="${cssEscape(avaliacaoId)}"]`
    );

    const resposta = String(campo?.value || "").trim();

    if (!resposta) {
        notificar(
            "Digite uma resposta antes de publicar.",
            "aviso",
            "Resposta obrigatória"
        );
        campo?.focus();
        return;
    }

    if (resposta.length > 1000) {
        notificar(
            "A resposta deve possuir no máximo 1000 caracteres.",
            "aviso",
            "Resposta muito grande"
        );
        campo?.focus();
        return;
    }

    const conteudoOriginal = botao?.innerHTML;

    if (botao) {
        botao.disabled = true;
        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Salvando...
        `;
    }

    try {
        const { error } = await window.db.rpc(
            "responder_avaliacao_loja",
            {
                p_avaliacao_id: avaliacao.id,
                p_resposta: resposta
            }
        );

        if (error) {
            throw error;
        }

        avaliacao.resposta_loja = resposta;

        atualizarResumo();
        renderizarAvaliacoes();

        notificar(
            "Sua resposta foi publicada e ficará visível na página pública do produto.",
            "sucesso",
            "Resposta publicada!",
            4200
        );

    } catch (erro) {
        console.error("Erro ao responder avaliação:", erro);

        notificar(
            tratarErro(erro),
            "erro",
            "Não foi possível publicar a resposta",
            5500
        );

        if (botao) {
            botao.disabled = false;
            botao.innerHTML = conteudoOriginal || "Publicar resposta";
        }
    }
}

function atualizarResumo() {
    const total = avaliacoes.length;
    const soma = avaliacoes.reduce(
        (valor, avaliacao) => valor + Number(avaliacao.nota || 0),
        0
    );
    const media = total > 0 ? soma / total : 0;
    const pendentes = avaliacoes.filter(
        avaliacao => !String(avaliacao.resposta_loja || "").trim()
    ).length;

    definirTexto("total-avaliacoes", total);
    definirTexto(
        "media-avaliacoes",
        media.toLocaleString("pt-BR", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1
        })
    );
    definirTexto("avaliacoes-pendentes", pendentes);
}

function configurarEventos() {
    document
        .querySelectorAll("[data-filtro]")
        .forEach(botao => {
            botao.addEventListener("click", () => {
                document
                    .querySelectorAll("[data-filtro]")
                    .forEach(item => item.classList.remove("ativo"));

                botao.classList.add("ativo");
                filtroAtual = botao.dataset.filtro || "todas";
                renderizarAvaliacoes();
            });
        });

    const pesquisa = document.getElementById("pesquisa-avaliacoes");
    pesquisa?.addEventListener("input", () => {
        pesquisaAtual = pesquisa.value.trim();
        renderizarAvaliacoes();
    });

    const atualizar = document.getElementById("btn-atualizar-avaliacoes");
    atualizar?.addEventListener("click", async () => {
        const conteudoOriginal = atualizar.innerHTML;
        atualizar.disabled = true;
        atualizar.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Atualizando...
        `;

        try {
            await carregarAvaliacoes();
        } finally {
            atualizar.disabled = false;
            atualizar.innerHTML = conteudoOriginal;
        }
    });
}

function mostrarEstado(icone, titulo, texto) {
    const lista = document.getElementById("lista-avaliacoes-loja");
    if (!lista) return;

    lista.innerHTML = `
        <div class="estado-avaliacoes">
            <i class="fa-solid ${icone}"></i>
            <h2>${escaparHTML(titulo)}</h2>
            <p>${escaparHTML(texto)}</p>
        </div>
    `;
}

function criarEstrelas(nota) {
    let html = "";

    for (let estrela = 1; estrela <= 5; estrela++) {
        html += `
            <i class="${estrela <= nota ? "fa-solid" : "fa-regular"} fa-star"></i>
        `;
    }

    return html;
}

function formatarData(valor) {
    if (!valor) return "";

    const data = new Date(valor);
    if (Number.isNaN(data.getTime())) return "";

    return data.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function definirTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor;
}

function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function formatarTextoMultilinha(valor) {
    return escaparHTML(valor).replace(/\r?\n/g, "<br>");
}

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function cssEscape(valor) {
    if (window.CSS?.escape) {
        return window.CSS.escape(String(valor ?? ""));
    }

    return String(valor ?? "").replace(/["\\]/g, "\\$&");
}

function tratarErro(erro) {
    const texto = String(erro?.message || "").toLowerCase();

    if (
        texto.includes("não possui permissão") ||
        texto.includes("nao possui permissao") ||
        texto.includes("permission")
    ) {
        return "Sua conta não possui permissão para acessar ou responder esta avaliação.";
    }

    if (
        texto.includes("1 e 1000") ||
        texto.includes("resposta")
    ) {
        return erro?.message || "Digite uma resposta válida.";
    }

    if (
        texto.includes("failed to fetch") ||
        texto.includes("network")
    ) {
        return "Não foi possível conectar ao servidor. Verifique sua internet.";
    }

    return erro?.message || "Ocorreu um erro. Tente novamente.";
}

function notificar(texto, tipo = "info", titulo = null, duracao = 4000) {
    if (typeof window.mostrarAlerta === "function") {
        window.mostrarAlerta(texto, tipo, titulo, duracao);
        return;
    }

    console.warn(`[${tipo}] ${titulo || ""}`, texto);
}
