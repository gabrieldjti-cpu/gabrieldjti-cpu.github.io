// ==========================================
// INTERESSE-ANUNCIO.JS
// Na página do anúncio:
//  * "Tenho interesse" avisa o vendedor;
//  * enquanto o vendedor não confirma a venda, o comprador pode pedir a
//    confirmação (uma vez a cada 24 horas) ou denunciar o anúncio;
//  * com a venda confirmada, o comprador avalia o vendedor.
// As regras ficam no banco; aqui só se mostra o passo certo.
// ==========================================

(() => {
    "use strict";

    let produtoId = "";
    let situacao = null;
    let notaEscolhida = 0;

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

    function avisar(mensagem, tipo = "info", titulo = "Anúncio") {
        if (typeof window.notificar === "function") {
            window.notificar(mensagem, tipo, titulo, 5000);
        } else if (typeof window.mostrarAlerta === "function") {
            window.mostrarAlerta(mensagem, tipo, titulo, 5000);
        }
    }

    function caixa() {
        let elemento = $("interesseAnuncio");
        if (elemento) return elemento;

        const ancora = document.querySelector(".produto-acoes-secundarias");
        if (!ancora) return null;

        elemento = document.createElement("section");
        elemento.id = "interesseAnuncio";
        elemento.className = "interesse-anuncio";
        elemento.setAttribute("aria-live", "polite");
        ancora.parentNode.insertBefore(elemento, ancora);
        return elemento;
    }

    function estrelasEscolha() {
        return [1, 2, 3, 4, 5].map(n => `
            <button type="button" class="interesse-estrela${n <= notaEscolhida ? " ativa" : ""}" data-nota="${n}" aria-label="${n} ${n === 1 ? "estrela" : "estrelas"}" aria-pressed="${n === notaEscolhida}">
                <i class="fa-${n <= notaEscolhida ? "solid" : "regular"} fa-star" aria-hidden="true"></i>
            </button>
        `).join("");
    }

    function renderizar() {
        const alvo = caixa();
        if (!alvo) return;

        const s = situacao || {};

        if (s.dono) {
            alvo.innerHTML = `
                <p class="interesse-texto"><i class="fa-solid fa-user-check" aria-hidden="true"></i>
                Este anúncio é seu. Veja quem tem interesse e confirme as vendas em <a href="interessados.html">Interessados</a>.</p>
            `;
            return;
        }

        if (!s.interesse) {
            alvo.innerHTML = `
                <button type="button" class="interesse-btn" data-acao="interesse">
                    <i class="fa-regular fa-hand" aria-hidden="true"></i> Tenho interesse
                </button>
                <p class="interesse-texto">O vendedor é avisado. Depois que ele confirmar a venda, você pode avaliá-lo.</p>
            `;
            return;
        }

        if (!s.venda_id) {
            alvo.innerHTML = `
                <p class="interesse-texto"><i class="fa-solid fa-circle-check" aria-hidden="true"></i>
                Você demonstrou interesse em ${escapar(data(s.interesse_em))}. Combine com o vendedor; quando ele confirmar a venda, você poderá avaliá-lo.</p>
                <div class="interesse-acoes">
                    <button type="button" class="interesse-btn secundario" data-acao="pedir" ${s.pode_pedir_confirmacao ? "" : "disabled"}>
                        <i class="fa-solid fa-bell" aria-hidden="true"></i> Pedir confirmação da venda
                    </button>
                    <button type="button" class="interesse-btn perigo" data-acao="denunciar">
                        <i class="fa-regular fa-flag" aria-hidden="true"></i> Denunciar
                    </button>
                </div>
                ${s.confirmacao_pedida_em
                    ? `<small class="interesse-dica">Você pediu a confirmação em ${escapar(data(s.confirmacao_pedida_em))}.${s.pode_pedir_confirmacao ? "" : " Dá para pedir de novo 24 horas depois."}</small>`
                    : ""}
            `;
            return;
        }

        if (s.avaliado) {
            const nota = Number(s.nota) || 0;
            alvo.innerHTML = `
                <p class="interesse-texto"><i class="fa-solid fa-star" aria-hidden="true"></i>
                Obrigado! Você avaliou este vendedor com ${nota} ${nota === 1 ? "estrela" : "estrelas"}.</p>
            `;
            return;
        }

        alvo.innerHTML = `
            <form class="interesse-avaliar" data-acao="avaliar" novalidate>
                <p class="interesse-texto"><i class="fa-solid fa-handshake" aria-hidden="true"></i>
                O vendedor confirmou a venda em ${escapar(data(s.venda_em))}. Como foi?</p>
                <div class="interesse-estrelas" role="group" aria-label="Nota de 1 a 5">${estrelasEscolha()}</div>
                <label for="comentarioAvaliacaoVendedor" class="interesse-label">Comentário (opcional)</label>
                <textarea id="comentarioAvaliacaoVendedor" maxlength="1000" rows="3" placeholder="Conte como foi a negociação"></textarea>
                <button type="submit" class="interesse-btn">Enviar avaliação</button>
            </form>
        `;
    }

    async function consultar() {
        const { data: sessao } = await window.db.auth.getSession();
        if (!sessao?.session) {
            situacao = { logado: false };
            renderizar();
            return;
        }

        const { data: resposta, error } = await window.db.rpc("meu_interesse_anuncio", {
            p_produto_id: produtoId
        });
        if (error) throw error;
        situacao = resposta || {};
        renderizar();
    }

    async function chamar(funcao, parametros, sucesso) {
        try {
            const { data: resposta, error } = await window.db.rpc(funcao, parametros);
            if (error) throw error;
            if (resposta && typeof resposta === "object" && "logado" in resposta) {
                situacao = resposta;
            } else {
                await consultar();
            }
            renderizar();
            if (sucesso) avisar(sucesso, "sucesso");
        } catch (erro) {
            console.error(`Erro em ${funcao}:`, erro);
            avisar(erro?.message || "Não foi possível concluir. Tente de novo.", "erro", "Erro");
            renderizar();
        }
    }

    function aoClicar(evento) {
        const estrela = evento.target.closest("[data-nota]");
        if (estrela) {
            notaEscolhida = Number(estrela.dataset.nota) || 0;
            const comentario = $("comentarioAvaliacaoVendedor")?.value || "";
            renderizar();
            const campo = $("comentarioAvaliacaoVendedor");
            if (campo) campo.value = comentario;
            return;
        }

        const botao = evento.target.closest("button[data-acao]");
        if (!botao) return;
        const acao = botao.dataset.acao;

        if (acao === "interesse") {
            if (!situacao?.logado) {
                try {
                    sessionStorage.setItem("destino_apos_login_favoritos", window.location.pathname.split("/").pop() + window.location.search);
                } catch (_) { /* sem armazenamento: só segue para o login */ }
                avisar("Entre na sua conta para demonstrar interesse.", "info", "Entrar");
                setTimeout(() => { window.location.href = "login.html"; }, 1200);
                return;
            }
            botao.disabled = true;
            chamar("registrar_interesse_anuncio", { p_produto_id: produtoId },
                "Pronto! O vendedor foi avisado do seu interesse.");
            return;
        }

        if (acao === "pedir") {
            botao.disabled = true;
            chamar("pedir_confirmacao_venda", { p_produto_id: produtoId },
                "Pedido enviado. O vendedor foi avisado para confirmar a venda.");
            return;
        }

        if (acao === "denunciar") {
            $("denunciarProduto")?.click();
        }
    }

    function aoEnviar(evento) {
        const form = evento.target.closest("form[data-acao='avaliar']");
        if (!form) return;
        evento.preventDefault();

        if (!notaEscolhida) {
            avisar("Escolha de 1 a 5 estrelas.", "aviso", "Falta a nota");
            return;
        }

        const botao = form.querySelector("button[type='submit']");
        if (botao) botao.disabled = true;

        chamar("avaliar_vendedor", {
            p_venda_id: situacao?.venda_id,
            p_nota: notaEscolhida,
            p_comentario: $("comentarioAvaliacaoVendedor")?.value || null
        }, "Avaliação enviada. Obrigado!").then(() => {
            window.dispatchEvent(new CustomEvent("comercio:avaliacao-vendedor-enviada"));
        });
    }

    async function iniciar() {
        produtoId = new URLSearchParams(window.location.search).get("id") || "";
        if (!window.db || !/^[0-9a-f-]{36}$/i.test(produtoId)) return;

        document.addEventListener("click", evento => {
            if (evento.target.closest("#interesseAnuncio")) aoClicar(evento);
        });
        document.addEventListener("submit", evento => {
            if (evento.target.closest("#interesseAnuncio")) aoEnviar(evento);
        });

        try {
            await consultar();
        } catch (erro) {
            // Anúncio fora do ar ou não encontrado: a página já mostra o aviso.
            console.warn("Não foi possível carregar o interesse:", erro);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", iniciar, { once: true });
    } else {
        iniciar();
    }
})();
