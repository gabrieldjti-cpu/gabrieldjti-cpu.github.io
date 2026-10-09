// ==========================================
// LOJA-PAUSADA.JS
// Na página pública da loja, avisa quando a assinatura terminou e a
// loja está pausada. Os anúncios seguem no ar por 15 dias; depois disso
// a loja some do site sozinha (regra no banco).
// ==========================================

(() => {
    "use strict";

    async function verificar() {
        const lojaId = new URLSearchParams(window.location.search).get("id");
        if (!lojaId || !window.db) return;

        try {
            const { data: pausada, error } = await window.db.rpc("loja_pausada", {
                p_loja_id: lojaId
            });
            if (error || pausada !== true) return;

            if (document.getElementById("aviso-loja-pausada")) return;

            const aviso = document.createElement("div");
            aviso.id = "aviso-loja-pausada";
            aviso.className = "aviso-loja-pausada";
            aviso.setAttribute("role", "status");
            aviso.innerHTML = '<i class="fa-solid fa-circle-pause" aria-hidden="true"></i>';

            const texto = document.createElement("span");
            texto.textContent = "Esta loja está pausada no momento. Os anúncios abaixo ainda podem ser vistos, mas a loja não está publicando novidades.";
            aviso.append(texto);

            const hero = document.querySelector(".loja-hero");
            if (hero?.parentNode) {
                hero.parentNode.insertBefore(aviso, hero);
            } else {
                document.querySelector("main")?.prepend(aviso);
            }
        } catch (erro) {
            console.warn("Não foi possível verificar se a loja está pausada:", erro);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", verificar, { once: true });
    } else {
        verificar();
    }
})();
