// ===============================
// VARIÁVEL GLOBAL
// ===============================

let usuario = null;

// ===============================
// VERIFICA LOGIN
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

    if (!window.db) {
        alert("Erro ao conectar com o banco.");
        return;
    }

    const { data, error } = await window.db.auth.getUser();

    if (error || !data.user) {
        window.location.href = "login.html";
        return;
    }

    usuario = data.user;

    console.log("Usuário logado:", usuario);

    await carregarPerfil();

});

// ===============================
// CARREGAR PERFIL
// ===============================

async function carregarPerfil() {

    const { data, error } = await window.db
        .from("profiles")
        .select("*")
        .eq("id", usuario.id)
        .single();

    console.log("Perfil:", data);
    console.log("Erro perfil:", error);

    if (error) {
        console.error(error);
        return;
    }

    document.getElementById("perf-nome").textContent =
        data.nome || "Sem nome";

    document.getElementById("perf-email").textContent =
        usuario.email;

    document.getElementById("perf-telefone").textContent =
        data.telefone || "Não informado";

    const endereco = document.getElementById("perf-endereco-resumo");

    if (data.rua) {

        endereco.innerHTML = `
            ${data.rua}, ${data.numero}<br>
            ${data.bairro}<br>
            ${data.cidade}
        `;

    } else {

        endereco.innerHTML = "Não informado";

    }

    await carregarMinhaLoja();

}

// ===============================
// CARREGAR LOJA
// ===============================

async function carregarMinhaLoja() {

    console.log("ID do usuário:", usuario.id);

    const { data: loja, error } = await window.db
        .from("lojas")
        .select("*")
        .eq("proprietario_id", usuario.id)
        .maybeSingle();

    console.log("Loja:", loja);
    console.log("Erro loja:", error);

    if (error) {
        console.error(error);
        return;
    }

    const div = document.getElementById("minha-loja");

    if (!loja) {

        div.innerHTML = `
            <div class="sem-loja">

                <i class="fa-solid fa-store-slash"></i>

                <h3>Você ainda não possui uma loja.</h3>

                <p>
                    Cadastre sua loja gratuitamente e comece a vender seus produtos.
                </p>

                <a href="cadastrar-loja.html" class="btn verde">
                    <i class="fa-solid fa-plus"></i>
                    Cadastrar Loja
                </a>

            </div>
        `;

        return;

    }

    div.innerHTML = `

        <div class="loja-card">

            <h3>${loja.nome}</h3>

            <p><strong>Descrição:</strong> ${loja.descricao ?? "-"}</p>

            <p><strong>Telefone:</strong> ${loja.telefone ?? "-"}</p>

            <p><strong>Cidade:</strong> ${loja.cidade ?? "-"}</p>

            <p><strong>Status:</strong> ${loja.ativa ? "🟢 Ativa" : "🔴 Inativa"}</p>

            <br>

            <a href="painel-loja.html" class="btn verde">
                Entrar no Painel
            </a>

        </div>

    `;

}

// ===============================
// ABRIR MODAL
// ===============================

async function abrirModalEditar() {

    document.getElementById("modal-editar-perfil").style.display = "flex";

    const { data } = await window.db
        .from("profiles")
        .select("*")
        .eq("id", usuario.id)
        .single();

    document.getElementById("edit-nome").value =
        data.nome || "";

    document.getElementById("edit-telefone").value =
        data.telefone || "";

    document.getElementById("edit-rua").value =
        data.rua || "";

    document.getElementById("edit-numero").value =
        data.numero || "";

    document.getElementById("edit-bairro").value =
        data.bairro || "";

    document.getElementById("edit-cidade").value =
        data.cidade || "";

}

function fecharModalEditar() {

    document.getElementById("modal-editar-perfil").style.display = "none";

}

// ===============================
// SALVAR PERFIL
// ===============================

async function salvarEdicaoPerfil() {

    const nome = document.getElementById("edit-nome").value.trim();
    const telefone = document.getElementById("edit-telefone").value.trim();
    const rua = document.getElementById("edit-rua").value.trim();
    const numero = document.getElementById("edit-numero").value.trim();
    const bairro = document.getElementById("edit-bairro").value.trim();
    const cidade = document.getElementById("edit-cidade").value.trim();

    const { error } = await window.db
        .from("profiles")
        .update({
            nome,
            telefone,
            rua,
            numero,
            bairro,
            cidade
        })
        .eq("id", usuario.id);

    if (error) {
        console.error(error);
        alert("Erro ao salvar.");
        return;
    }

    alert("Perfil atualizado com sucesso!");

    fecharModalEditar();

    await carregarPerfil();

}

// ===============================
// LOGOUT
// ===============================

async function fazerLogout() {

    if (!confirm("Deseja realmente sair?")) return;

    await window.db.auth.signOut();

    window.location.href = "login.html";

}