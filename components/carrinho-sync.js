// ==========================================
// CARRINHO-SYNC.JS
// Persistência do carrinho por usuário - RF-08
// ==========================================

(() => {
    "use strict";

    const CHAVE_CARRINHO = "carrinho";
    const CHAVE_DONO = "carrinho_usuario_id";
    const CHAVE_PENDENTE = "carrinho_sincronizacao_pendente";
    const LIMITE_ITENS = 200;
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    let usuarioId = null;
    let iniciando = null;
    let filaSincronizacao = Promise.resolve();
    let temporizador = null;
    let avisoErroMostrado = false;
    let versaoAlteracao = 0;

    function notificar(mensagem, tipo = "info", titulo = null) {
        if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo);
        }
    }

    function lerCarrinhoLocal() {
        try {
            const dados = JSON.parse(localStorage.getItem(CHAVE_CARRINHO));
            return Array.isArray(dados) ? dados : [];
        } catch (erro) {
            console.warn("Carrinho local inválido; um novo carrinho será iniciado:", erro);
            localStorage.removeItem(CHAVE_CARRINHO);
            return [];
        }
    }

    function normalizarQuantidade(valor, estoque = null) {
        const valorNumerico = Number(valor);
        const quantidade = Number.isFinite(valorNumerico) && valorNumerico > 0
            ? Math.floor(valorNumerico)
            : 1;
        const limiteEstoque = Number(estoque);

        if (Number.isFinite(limiteEstoque) && limiteEstoque > 0) {
            return Math.min(quantidade, Math.floor(limiteEstoque), 1000);
        }

        return Math.min(quantidade, 1000);
    }

    function normalizarItens(itens) {
        const mapa = new Map();

        (Array.isArray(itens) ? itens : []).slice(0, LIMITE_ITENS).forEach(item => {
            const id = String(item?.id || item?.produto_id || "").trim();
            if (!UUID.test(id)) return;

            mapa.set(id, {
                ...item,
                id,
                produto_id: undefined,
                quantidade: normalizarQuantidade(item.quantidade, item.estoque)
            });
        });

        return [...mapa.values()];
    }

    function gravarCarrinhoLocal(itens, dono = usuarioId) {
        const normalizados = normalizarItens(itens);
        localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(normalizados));

        if (dono) {
            localStorage.setItem(CHAVE_DONO, String(dono));
        } else {
            localStorage.removeItem(CHAVE_DONO);
        }

        window.atualizarContadorCarrinho?.();
        return normalizados;
    }

    function limparCacheLocal() {
        localStorage.removeItem(CHAVE_CARRINHO);
        localStorage.removeItem(CHAVE_DONO);
        localStorage.removeItem(CHAVE_PENDENTE);
        window.atualizarContadorCarrinho?.();
    }

    function obterRelacao(valor) {
        return Array.isArray(valor) ? valor[0] || null : valor || null;
    }

    function transformarCarrinhoRemoto(registros) {
        return (Array.isArray(registros) ? registros : []).map(registro => {
            const produto = obterRelacao(registro.produto) || {};
            const loja = obterRelacao(produto.loja) || {};
            const estoque = Math.max(0, Math.floor(Number(produto.estoque || 0)));

            if (!produto.id || estoque <= 0) return null;

            return {
                id: produto.id,
                loja_id: produto.loja_id,
                nome_loja: loja.nome || "Loja",
                nome: produto.nome || "Produto",
                descricao: produto.descricao || "",
                preco: Number(produto.preco || 0),
                preco_promocional: produto.preco_promocional
                    ? Number(produto.preco_promocional)
                    : null,
                imagem_url: produto.imagem_url || null,
                estoque,
                quantidade: normalizarQuantidade(registro.quantidade, estoque)
            };
        }).filter(Boolean);
    }

    async function carregarCarrinhoRemoto() {
        const { data, error } = await window.db
            .from("carrinho")
            .select(`
                produto_id,
                quantidade,
                adicionado_em,
                produto:produtos!inner(
                    id,
                    loja_id,
                    nome,
                    descricao,
                    preco,
                    preco_promocional,
                    imagem_url,
                    estoque,
                    ativo,
                    loja:lojas!produtos_loja_id_fkey(id, nome)
                )
            `)
            .eq("cliente_id", usuarioId)
            .eq("produto.ativo", true)
            .order("adicionado_em", { ascending: true });

        if (error) throw error;
        return transformarCarrinhoRemoto(data);
    }

    function mesclarCarrinhos(remoto, visitante) {
        const mapa = new Map();

        normalizarItens(remoto).forEach(item => mapa.set(item.id, item));
        normalizarItens(visitante).forEach(item => {
            const existente = mapa.get(item.id);
            if (!existente) {
                mapa.set(item.id, item);
                return;
            }

            mapa.set(item.id, {
                ...existente,
                ...item,
                quantidade: normalizarQuantidade(
                    Math.max(existente.quantidade || 1, item.quantidade || 1),
                    item.estoque ?? existente.estoque
                )
            });
        });

        return [...mapa.values()].slice(0, LIMITE_ITENS);
    }

    function criarPayload(itens) {
        return normalizarItens(itens).map(item => ({
            produto_id: item.id,
            quantidade: item.quantidade
        }));
    }

    function executarSincronizacao(itens = lerCarrinhoLocal()) {
        const payload = criarPayload(itens);
        const versaoAoAgendar = versaoAlteracao;
        const tarefa = async () => {
            if (!usuarioId || !window.db) return false;

            const { error } = await window.db.rpc("sincronizar_carrinho_usuario", {
                p_itens: payload
            });

            if (error) throw error;

            if (versaoAoAgendar === versaoAlteracao) {
                localStorage.removeItem(CHAVE_PENDENTE);
            }

            avisoErroMostrado = false;
            return true;
        };

        filaSincronizacao = filaSincronizacao.then(tarefa, tarefa).catch(erro => {
            console.error("Não foi possível sincronizar o carrinho:", erro);

            if (!avisoErroMostrado) {
                avisoErroMostrado = true;
                notificar(
                    "O carrinho continua salvo neste aparelho, mas não foi sincronizado com sua conta.",
                    "aviso",
                    "Sincronização pendente"
                );
            }

            return false;
        });

        return filaSincronizacao;
    }

    async function iniciar() {
        if (iniciando) return iniciando;

        iniciando = (async () => {
            if (!window.db) return false;

            try {
                const { data: sessaoData, error: sessaoError } =
                    await window.db.auth.getSession();

                if (sessaoError) throw sessaoError;

                const sessaoUsuarioId = sessaoData?.session?.user?.id || null;
                const donoLocal = localStorage.getItem(CHAVE_DONO);
                const sincronizacaoPendente =
                    localStorage.getItem(CHAVE_PENDENTE) === "1";
                const carrinhoLocal = lerCarrinhoLocal();

                if (!sessaoUsuarioId) {
                    usuarioId = null;

                    if (donoLocal) {
                        limparCacheLocal();
                    } else if (!carrinhoLocal.length) {
                        localStorage.removeItem(CHAVE_PENDENTE);
                    }

                    document.dispatchEvent(new CustomEvent("carrinho:sincronizado", {
                        detail: { autenticado: false, itens: lerCarrinhoLocal().length }
                    }));
                    return true;
                }

                usuarioId = sessaoUsuarioId;
                const carrinhoRemoto = await carregarCarrinhoRemoto();
                const veioDeVisitante = !donoLocal;
                const pertenceAoUsuario = donoLocal === usuarioId;
                let carrinhoFinal = carrinhoRemoto;

                if (veioDeVisitante && carrinhoLocal.length) {
                    carrinhoFinal = mesclarCarrinhos(carrinhoRemoto, carrinhoLocal);
                    const sincronizou = await executarSincronizacao(carrinhoFinal);

                    if (sincronizou) {
                        carrinhoFinal = await carregarCarrinhoRemoto();
                    }
                } else if (pertenceAoUsuario && sincronizacaoPendente) {
                    carrinhoFinal = carrinhoLocal;
                    const sincronizou = await executarSincronizacao(carrinhoFinal);

                    if (sincronizou) {
                        carrinhoFinal = await carregarCarrinhoRemoto();
                    }
                } else if (!pertenceAoUsuario && donoLocal) {
                    carrinhoFinal = carrinhoRemoto;
                }

                const deveManterPendente =
                    localStorage.getItem(CHAVE_PENDENTE) === "1" &&
                    (
                        (veioDeVisitante && carrinhoLocal.length > 0) ||
                        (pertenceAoUsuario && sincronizacaoPendente)
                    );

                if (!deveManterPendente) {
                    localStorage.removeItem(CHAVE_PENDENTE);
                }

                gravarCarrinhoLocal(carrinhoFinal, usuarioId);

                document.dispatchEvent(new CustomEvent("carrinho:sincronizado", {
                    detail: {
                        autenticado: true,
                        usuarioId,
                        itens: carrinhoFinal.length
                    }
                }));

                return true;
            } catch (erro) {
                console.error("Erro ao carregar o carrinho da conta:", erro);
                notificar(
                    "Seu carrinho local foi mantido, mas não foi possível carregar o carrinho da conta.",
                    "aviso",
                    "Carrinho local"
                );
                return false;
            }
        })();

        return iniciando;
    }

    async function sincronizarAgora() {
        await iniciar();
        if (!usuarioId) return false;
        versaoAlteracao += 1;
        localStorage.setItem(CHAVE_DONO, usuarioId);
        localStorage.setItem(CHAVE_PENDENTE, "1");
        return executarSincronizacao();
    }

    function notificarAlteracao({ imediato = false } = {}) {
        versaoAlteracao += 1;
        localStorage.setItem(CHAVE_PENDENTE, "1");

        const agendar = async () => {
            await iniciar();

            if (!usuarioId) {
                localStorage.removeItem(CHAVE_DONO);
                return false;
            }

            localStorage.setItem(CHAVE_DONO, usuarioId);
            return executarSincronizacao();
        };

        if (imediato) return agendar();

        clearTimeout(temporizador);
        temporizador = setTimeout(agendar, 300);
        return Promise.resolve(true);
    }

    async function prepararLogout() {
        clearTimeout(temporizador);
        await iniciar();

        if (usuarioId) {
            await executarSincronizacao();
        }

        usuarioId = null;
        limparCacheLocal();
        return true;
    }

    window.addEventListener("storage", event => {
        if (event.key === CHAVE_CARRINHO) {
            notificarAlteracao();
        }
    });

    window.db?.auth?.onAuthStateChange?.((evento) => {
        if (evento === "SIGNED_OUT") {
            setTimeout(() => {
                usuarioId = null;
                limparCacheLocal();
            }, 0);
        }
    });

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }

    window.CarrinhoSync = Object.freeze({
        iniciar,
        sincronizarAgora,
        notificarAlteracao,
        prepararLogout,
        limparCacheLocal,
        lerCarrinhoLocal,
        estaAutenticado: () => Boolean(usuarioId)
    });
})();
