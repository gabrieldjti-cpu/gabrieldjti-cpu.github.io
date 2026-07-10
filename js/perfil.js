// ===============================
// VERIFICA LOGIN
// ===============================

let usuario = null;

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

    carregarPerfil();

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

    // endereço

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

}

// ===============================
// MODAL
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
// SALVAR
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

        alert("Erro ao salvar.");

        console.error(error);

        return;

    }

    alert("Perfil atualizado com sucesso!");

    fecharModalEditar();

    carregarPerfil();

}

// ===============================
// LOGOUT
// ===============================

async function fazerLogout() {

    const sair = confirm("Deseja realmente sair?");

    if (!sair) return;

    await window.db.auth.signOut();

    window.location.href = "login.html";

}