// ==========================================
// INDEX-FILTROS.JS
// Complemento visual e filtros da página inicial
// ==========================================

(() => {
    let categoriaAtiva = "";

    function normalizar(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .trim();
    }

    function obterCategoriaDoCard(card) {
        const paragrafos = card?.querySelectorAll("p");
        if (!paragrafos?.length) return "";

        return normalizar(paragrafos[0].textContent);
    }

    function aplicarFiltrosHome() {
        const lista = document.getElementById("lista-lojas");
        const pesquisa = document.getElementById("pesquisa");
        const total = document.getElementById("total-lojas");

        if (!lista) return;

        const cards = Array.from(lista.querySelectorAll(".card"));
        if (!cards.length) return;

        const texto = normalizar(pesquisa?.value);
        const categoria = normalizar(categoriaAtiva);
        let visiveis = 0;

        cards.forEach(card => {
            const nome = normalizar(
                card.dataset.nome || card.querySelector("h3")?.textContent
            );
            const categoriaCard = obterCategoriaDoCard(card);

            const combinaTexto = !texto || nome.includes(texto);
            const combinaCategoria = !categoria || categoriaCard.includes(categoria);
            const mostrar = combinaTexto && combinaCategoria;

            card.style.display = mostrar ? "" : "none";
            if (mostrar) visiveis += 1;
        });

        const mensagemBusca = document.getElementById("nenhuma-loja-pesquisa");
        const mensagemFiltro = document.getElementById("nenhuma-loja-filtro");

        if (visiveis === 0 && !mensagemBusca) {
            if (!mensagemFiltro) {
                const mensagem = document.createElement("div");
                mensagem.id = "nenhuma-loja-filtro";
                mensagem.className = "sem-produtos";
                mensagem.innerHTML = `
                    <i class="fa-solid fa-store-slash"></i>
                    <h3>Nenhuma loja encontrada.</h3>
                    <p>Tente outra categoria ou altere sua pesquisa.</p>
                `;
                lista.appendChild(mensagem);
            }
        } else if (mensagemFiltro) {
            mensagemFiltro.remove();
        }

        if (total) {
            total.textContent = visiveis === 1
                ? "1 loja encontrada"
                : `${visiveis} lojas encontradas`;
        }
    }

    function configurarCategorias() {
        const botoes = document.querySelectorAll(".categoria[data-categoria]");

        botoes.forEach(botao => {
            botao.addEventListener("click", () => {
                categoriaAtiva = botao.dataset.categoria || "";

                botoes.forEach(item => {
                    const ativo = item === botao;
                    item.classList.toggle("ativo", ativo);
                    item.setAttribute("aria-pressed", ativo ? "true" : "false");
                });

                aplicarFiltrosHome();

                document.getElementById("lojas")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            });
        });
    }

    function configurarPesquisa() {
        const pesquisa = document.getElementById("pesquisa");
        const botao = document.getElementById("btnPesquisar");

        pesquisa?.addEventListener("input", () => {
            // index.js executa primeiro sua busca por nome; este complemento
            // aplica a categoria ativa em seguida.
            setTimeout(aplicarFiltrosHome, 0);
        });

        pesquisa?.addEventListener("keydown", event => {
            if (event.key === "Enter") {
                event.preventDefault();
                aplicarFiltrosHome();
                document.getElementById("lojas")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });

        botao?.addEventListener("click", () => {
            aplicarFiltrosHome();
            document.getElementById("lojas")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    }

    function observarLista() {
        const lista = document.getElementById("lista-lojas");
        if (!lista) return;

        const observer = new MutationObserver(() => {
            if (lista.querySelector(".card")) {
                aplicarFiltrosHome();
            }
        });

        observer.observe(lista, {
            childList: true
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        configurarCategorias();
        configurarPesquisa();
        observarLista();
    });
})();
