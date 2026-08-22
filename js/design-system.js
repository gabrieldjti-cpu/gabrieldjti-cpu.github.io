// ==========================================
// DESIGN-SYSTEM.JS
// Identidade visual global - Comércio da Cidade
// ==========================================

(() => {
    "use strict";

    const pagina = (
        window.location.pathname
            .split("/")
            .pop()
        || "index.html"
    ).toLowerCase();

    const slug = pagina
        .replace(/\.html$/i, "")
        .replace(/[^a-z0-9-]/g, "-")
        || "index";

    const grupos = {
        auth: new Set([
            "login.html",
            "cadastro.html",
            "recuperar-senha.html",
            "nova-senha.html"
        ]),
        cliente: new Set([
            "perfil.html",
            "carrinho.html",
            "checkout.html",
            "meus-pedidos.html",
            "historico-compras.html"
        ]),
        lojista: new Set([
            "cadastrar-loja.html",
            "editar-loja.html",
            "editar-produto.html",
            "novo-produto.html",
            "produtos.html",
            "painel-loja.html",
            "pedidos-loja.html",
            "avaliacoes-loja.html"
        ]),
        admin: new Set([
            "admin-dashboard.html"
        ]),
        publico: new Set([
            "index.html",
            "loja.html"
        ])
    };

    function obterGrupo() {
        for (const [grupo, paginas] of Object.entries(grupos)) {
            if (paginas.has(pagina)) {
                return grupo;
            }
        }

        return "geral";
    }

    function aplicarClasses() {
        if (!document.body) return;

        const grupo = obterGrupo();

        document.documentElement.classList.add("theme-comercio");
        document.body.classList.add(
            "app-theme",
            `page-${slug}`,
            `theme-${grupo}`
        );

        document.body.dataset.page = slug;
        document.body.dataset.themeGroup = grupo;

        if (grupo === "auth") {
            adicionarMarcaAuth();
        }

        melhorarAcessibilidadeVisual();
    }

    function adicionarMarcaAuth() {
        if (document.querySelector(".theme-auth-brand")) return;

        const marca = document.createElement("a");
        marca.className = "theme-auth-brand";
        marca.href = "index.html";
        marca.setAttribute("aria-label", "Voltar para Comércio da Cidade");
        marca.innerHTML = `
            <span class="theme-auth-brand-icon">
                <i class="fa-solid fa-store" aria-hidden="true"></i>
            </span>
            <span>
                <strong>Comércio da Cidade</strong>
                <small>Marketplace local</small>
            </span>
        `;

        document.body.prepend(marca);
    }

    function melhorarAcessibilidadeVisual() {
        document
            .querySelectorAll("input, select, textarea")
            .forEach(campo => {
                if (!campo.hasAttribute("autocomplete")) {
                    campo.dataset.themeControl = "true";
                }
            });

        document
            .querySelectorAll("button, .btn, [class*='btn-']")
            .forEach(botao => {
                if (botao instanceof HTMLElement) {
                    botao.classList.add("theme-control");
                }
            });
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            aplicarClasses,
            { once: true }
        );
    } else {
        aplicarClasses();
    }
})();
