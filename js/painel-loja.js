// ==========================================
// PAINEL-LOJA.JS
// Comércio da Cidade
// ==========================================

let usuario = null;
let loja = null;

// ==========================================
// INICIAR
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Painel da loja iniciado.");

    if (!window.db) {
        console.error("Supabase não encontrado.");
        notificar(
            "Não foi possível conectar ao sistema. Atualize a página e tente novamente.",
            "erro",
            "Erro de conexão",
            6000
        );
        return;
    }

    const autenticado = await verificarUsuario();
    if (!autenticado) return;

    await carregarLoja();
});

// ==========================================
// VERIFICAR USUÁRIO
// ==========================================

async function verificarUsuario() {
    try {
        const {
            data: sessaoData,
            error: sessaoError
        } = await window.db.auth.getSession();

        if (sessaoError) {
            console.error("Erro ao verificar sessão:", sessaoError);
            notificar(
                "Não foi possível verificar sua sessão.",
                "erro",
                "Erro de autenticação"
            );
            return false;
        }

        if (!sessaoData.session) {
            notificar(
                "Entre na sua conta para acessar o painel da loja.",
                "info",
                "Login necessário",
                2500
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 900);

            return false;
        }

        const { data, error } = await window.db.auth.getUser();

        if (error || !data.user) {
            console.error("Erro ao verificar usuário:", error);
            notificar(
                "Sua sessão não pôde ser validada. Entre novamente.",
                "erro",
                "Sessão inválida"
            );

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1000);

            return false;
        }

        usuario = data.user;
        console.log("Usuário conectado:", usuario.id);
        return true;

    } catch (erro) {
        console.error("Erro ao verificar usuário:", erro);
        notificar(
            "Ocorreu um erro ao verificar sua conta.",
            "erro",
            "Erro de autenticação"
        );
        return false;
    }
}

// ==========================================
// CARREGAR LOJA
// ==========================================

async function carregarLoja() {
    try {
        console.log("Buscando loja do usuário...");

        const { data, error } = await window.db
            .from("lojas")
            .select(`
                *,
                categorias!categoria_id(
                    nome
                )
            `)
            .eq("proprietario_id", usuario.id)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            localStorage.removeItem("loja_id");
            localStorage.removeItem("nome_loja");

            notificar(
                "Você ainda não possui uma loja cadastrada.",
                "info",
                "Crie sua loja",
                2500
            );

            setTimeout(() => {
                window.location.href = "cadastrar-loja.html";
            }, 900);

            return;
        }

        loja = data;

        localStorage.setItem("loja_id", loja.id);
        localStorage.setItem("nome_loja", loja.nome || "");

        carregarLogoLoja();

        definirTexto("nome-loja", loja.nome || "-");
        definirTexto(
            "categoria-loja",
            loja.categorias?.nome || "Sem categoria"
        );
        definirTexto("cidade-loja", loja.cidade || "-");
        definirTexto(
            "telefone-loja",
            loja.telefone || loja.whatsapp || "-"
        );

        const statusLoja = document.getElementById("status-loja");
        if (statusLoja) {
            statusLoja.textContent = loja.ativa
                ? "🟢 Ativa"
                : "🔴 Inativa";
        }

        configurarBotaoEditar();


        await carregarProdutos();

        await Promise.all([
            carregarEstatisticas()
        ]);

    } catch (erro) {
        console.error("Erro ao carregar loja:", erro);
        notificar(
            tratarErroPainel(erro),
            "erro",
            "Não foi possível carregar a loja",
            5500
        );
    }
}

// ==========================================
// DEFINIR TEXTO
// ==========================================

function definirTexto(id, texto) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = texto;
}

// ==========================================
// LOGO DA LOJA
// ==========================================

function carregarLogoLoja() {
    const imagem = document.getElementById("logo-loja");
    const placeholder = document.getElementById("logo-loja-placeholder");

    if (!imagem || !placeholder) {
        console.warn("Elementos da logo não encontrados.");
        return;
    }

    if (loja?.logo_url) {
        imagem.src = loja.logo_url;
        imagem.hidden = false;
        imagem.style.display = "block";
        placeholder.style.display = "none";

        imagem.onerror = () => {
            console.warn("Erro ao carregar logo da loja.");
            imagem.hidden = true;
            imagem.style.display = "none";
            imagem.removeAttribute("src");
            placeholder.style.display = "flex";
        };

        return;
    }

    imagem.hidden = true;
    imagem.style.display = "none";
    imagem.removeAttribute("src");
    placeholder.style.display = "flex";
}

// ==========================================
// BOTÃO EDITAR LOJA
// ==========================================

function configurarBotaoEditar() {
    const botao = document.getElementById("btnEditarLoja");

    if (!botao || !loja?.id) return;

    botao.onclick = () => {
        window.location.href = `editar-loja.html?id=${encodeURIComponent(loja.id)}`;
    };
}

// ==========================================
// CARREGAR PRODUTOS
// ==========================================

async function carregarProdutos() {
    const lista = document.getElementById("lista-produtos");

    if (lista) {
        lista.innerHTML = `
            <div class="sem-produtos">
                <i class="fa-solid fa-spinner fa-spin"></i>
                <h3>Carregando produtos...</h3>
            </div>
        `;
    }

    try {
        if (!loja?.id) return;

        const { data, error } = await window.db
            .from("produtos")
            .select(`
                *,
                categorias_produtos!categoria_id(
                    nome,
                    categoria_pai:categorias_produtos!categoria_pai_id(
                        nome
                    )
                )
            `)
            .eq("loja_id", loja.id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        const produtos = Array.isArray(data) ? data : [];
        definirTexto("total-produtos", produtos.length);

        if (!lista) return;

        if (produtos.length === 0) {
            lista.innerHTML = `
                <div class="sem-produtos">
                    <i class="fa-solid fa-box-open"></i>
                    <h3>Nenhum produto cadastrado</h3>
                    <p>
                        Clique em <strong>Novo Produto</strong>
                        para cadastrar seu primeiro produto.
                    </p>
                    <a href="novo-produto.html" class="btn">
                        <i class="fa-solid fa-plus"></i>
                        Novo Produto
                    </a>
                </div>
            `;
            return;
        }

        lista.innerHTML = produtos
            .map(criarCardProduto)
            .join("");

        configurarImagensProdutos();

    } catch (erro) {
        console.error("Erro ao carregar produtos:", erro);

        if (lista) {
            lista.innerHTML = `
                <div class="sem-produtos">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <h3>Erro ao carregar produtos</h3>
                    <p>Tente novamente.</p>
                    <button type="button" class="btn" onclick="carregarProdutos()">
                        <i class="fa-solid fa-rotate-right"></i>
                        Tentar novamente
                    </button>
                </div>
            `;
        }

        notificar(
            "Não foi possível carregar os produtos da sua loja.",
            "erro",
            "Erro ao carregar produtos",
            5000
        );
    }
}

// ==========================================
// CARD DO PRODUTO
// ==========================================

function criarCardProduto(produto) {
    const id = escaparHTML(produto.id || "");
    const nome = escaparHTML(produto.nome || "Produto");
    const descricao = escaparHTML(
        produto.descricao || "Sem descrição."
    );
    const categoriaProduto = produto.categorias_produtos || {};
    const nomeCategoria = categoriaProduto.categoria_pai?.nome
        ? `${categoriaProduto.categoria_pai.nome} › ${categoriaProduto.nome || ""}`
        : categoriaProduto.nome;
    const categoria = escaparHTML(nomeCategoria || "Sem categoria");

    const preco = Number(produto.preco || 0);
    const promocional = Number(produto.preco_promocional || 0);
    const temPromocao = promocional > 0 && promocional < preco;
    const estoque = Math.max(0, Number(produto.estoque || 0));

    const imagemHTML = produto.imagem_url
        ? `
            <div class="area-foto-produto">
                <img
                    src="${escaparHTML(produto.imagem_url)}"
                    alt="${nome}"
                    class="foto-produto"
                    loading="lazy"
                >
                <div
                    class="foto-produto-placeholder"
                    style="display:none;"
                >
                    <i class="fa-solid fa-box"></i>
                </div>
            </div>
        `
        : `
            <div class="area-foto-produto">
                <div
                    class="foto-produto foto-produto-placeholder"
                    style="display:flex;align-items:center;justify-content:center;font-size:45px;color:#198754;"
                >
                    <i class="fa-solid fa-box"></i>
                </div>
            </div>
        `;

    const precoHTML = temPromocao
        ? `
            <span class="promo">
                De ${formatarMoeda(preco)}
            </span>
            <strong class="preco">
                ${formatarMoeda(promocional)}
            </strong>
        `
        : `
            <strong class="preco">
                ${formatarMoeda(preco)}
            </strong>
        `;

    return `
        <div class="produto-card">
            ${imagemHTML}

            <div class="produto-info">
                <span class="categoria">${categoria}</span>
                <h3>${nome}</h3>
                <p class="descricao">${descricao}</p>

                <div class="precos">
                    ${precoHTML}
                </div>

                <p>
                    <strong>Situação:</strong>
                    ${estoque > 0 ? "Disponível" : "Indisponível"}
                </p>

                <p>
                    ${produto.ativo
                        ? '<span class="status ativo">🟢 Ativo</span>'
                        : '<span class="status inativo">🔴 Inativo</span>'}
                </p>
            </div>

            <div class="acoes">
                <button
                    type="button"
                    class="btn-editar"
                    onclick="editarProduto('${id}')"
                >
                    <i class="fa-solid fa-pen"></i>
                    Editar
                </button>

                <button
                    type="button"
                    class="btn-excluir"
                    onclick="excluirProduto('${id}', '${escaparJS(produto.nome || "Produto")}')"
                    ${produto.ativo ? "" : "disabled"}
                >
                    <i class="fa-solid fa-eye-slash"></i>
                    ${produto.ativo ? "Desativar" : "Inativo"}
                </button>
            </div>
        </div>
    `;
}

// ==========================================
// IMAGENS DOS PRODUTOS
// ==========================================

function configurarImagensProdutos() {
    const imagens = document.querySelectorAll(
        "#lista-produtos .area-foto-produto img"
    );

    imagens.forEach(imagem => {
        imagem.addEventListener(
            "error",
            () => {
                const area = imagem.closest(".area-foto-produto");
                imagem.style.display = "none";
                imagem.removeAttribute("src");

                const placeholder = area?.querySelector(
                    ".foto-produto-placeholder"
                );

                if (placeholder) placeholder.style.display = "flex";
            },
            { once: true }
        );
    });
}

// ==========================================
// EDITAR PRODUTO
// ==========================================

function editarProduto(id) {
    if (!id) {
        notificar(
            "Não foi possível identificar este produto.",
            "erro",
            "Produto não encontrado"
        );
        return;
    }

    window.location.href = `editar-produto.html?id=${encodeURIComponent(id)}`;
}

// ==========================================
// DESATIVAR PRODUTO
// ==========================================

async function excluirProduto(id, nomeProduto = "Produto") {
    if (!id) {
        notificar(
            "Não foi possível identificar este produto.",
            "erro",
            "Produto não encontrado"
        );
        return;
    }

    if (!loja?.id) {
        notificar(
            "Não foi possível identificar sua loja.",
            "erro",
            "Loja não encontrada"
        );
        return;
    }

    if (typeof window.confirmarAcao !== "function") {
        console.error("Sistema de confirmação não carregado.");
        notificar(
            "Não foi possível abrir a confirmação.",
            "erro",
            "Erro no sistema"
        );
        return;
    }

    const confirmou = await window.confirmarAcao({
        titulo: "Desativar produto?",
        mensagem: `Deseja desativar "${nomeProduto}"? Ele sairá do site, mas continuará salvo para preservar o histórico de interessados e avaliações.`,
        textoConfirmar: "Sim, desativar",
        textoCancelar: "Cancelar",
        perigo: false
    });

    if (!confirmou) return;

    try {
        const { data, error } = await window.db
            .from("produtos")
            .update({ ativo: false })
            .eq("id", id)
            .eq("loja_id", loja.id)
            .select("id,ativo")
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            throw new Error(
                "Produto não encontrado ou sem permissão para alteração."
            );
        }

        notificar(
            `"${nomeProduto}" foi desativado e removido do catálogo público.`,
            "sucesso",
            "Produto desativado",
            3000
        );

        await carregarProdutos();
        await carregarEstatisticas();

    } catch (erro) {
        console.error("Erro ao desativar produto:", erro);
        notificar(
            tratarErroPainel(erro),
            "erro",
            "Não foi possível desativar",
            5000
        );
    }
}

// ==========================================
// ESTATÍSTICAS
// ==========================================

async function carregarEstatisticas() {
    // Classificados: o resumo vem de resumo_painel_vendedor
    // (js/painel-loja-resumo.js), sem pedidos nem faturamento.
    if (typeof window.carregarResumoVendedor === "function") {
        await window.carregarResumoVendedor();
    }
}

// ==========================================
// TRATAR ERROS
// ==========================================

function tratarErroPainel(erro) {
    const texto = String(erro?.message || "").toLowerCase();

    if (
        texto.includes("row-level security") ||
        texto.includes("rls") ||
        texto.includes("permission denied")
    ) {
        return "Sua conta não possui permissão para realizar esta ação.";
    }

    if (
        texto.includes("foreign key") ||
        texto.includes("violates foreign key")
    ) {
        return "Este registro está relacionado a outros dados do sistema e não pode ser alterado dessa forma.";
    }

    if (
        texto.includes("failed to fetch") ||
        texto.includes("network")
    ) {
        return "Não foi possível conectar ao servidor. Verifique sua internet.";
    }

    return erro?.message || "Ocorreu um erro. Tente novamente.";
}

// ==========================================
// FORMATAR MOEDA
// ==========================================

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

// ==========================================
// ESCAPAR HTML
// ==========================================

function escaparHTML(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ==========================================
// ESCAPAR TEXTO PARA ONCLICK
// ==========================================

function escaparJS(valor) {
    return String(valor ?? "")
        .replaceAll("\\", "\\\\")
        .replaceAll("'", "\\'")
        .replaceAll("\n", " ")
        .replaceAll("\r", " ");
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
    if (typeof window.mostrarAlerta === "function") {
        window.mostrarAlerta(texto, tipo, titulo, duracao);
        return;
    }

    console.warn(`[${tipo}] ${titulo || ""}`, texto);
}

// ==========================================
// FUNÇÕES GLOBAIS
// ==========================================

window.editarProduto = editarProduto;
window.excluirProduto = excluirProduto;
window.carregarProdutos = carregarProdutos;
window.carregarEstatisticas = carregarEstatisticas;
