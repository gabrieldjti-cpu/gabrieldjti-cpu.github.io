// ===============================
// ELEMENTOS
// ===============================

const form = document.getElementById("cadastroForm");

const nome = document.getElementById("nome");
const email = document.getElementById("email");
const telefone = document.getElementById("telefone");
const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");

const mensagem = document.getElementById("mensagem");

// Verifica se o Supabase foi inicializado
if (!window.db) {
    console.error("Supabase não foi inicializado.");
    mensagem.textContent = "Erro interno do sistema.";
    throw new Error("window.db não encontrado.");
}

// ===============================
// MOSTRAR / ESCONDER SENHAS
// ===============================

function configurarMostrarSenha(botaoId, inputId) {

    const botao = document.getElementById(botaoId);
    const input = document.getElementById(inputId);

    if (!botao || !input) return;

    botao.addEventListener("click", () => {

        const icone = botao.querySelector("i");

        if (input.type === "password") {

            input.type = "text";
            icone.classList.replace("fa-eye", "fa-eye-slash");

        } else {

            input.type = "password";
            icone.classList.replace("fa-eye-slash", "fa-eye");

        }

    });

}

configurarMostrarSenha("toggleSenha", "senha");
configurarMostrarSenha("toggleConfirmarSenha", "confirmarSenha");

// ===============================
// CADASTRO
// ===============================

form.addEventListener("submit", async (e) => {

    e.preventDefault();

    mensagem.textContent = "";
    mensagem.style.color = "red";

    if (senha.value !== confirmarSenha.value) {
        mensagem.textContent = "As senhas não coincidem.";
        return;
    }

    if (senha.value.length < 6) {
        mensagem.textContent = "A senha deve possuir no mínimo 6 caracteres.";
        return;
    }

    const botao = document.querySelector(".btn-cadastro");

    botao.disabled = true;
    botao.textContent = "Criando conta...";

    try {

        // Cadastro no Auth
        const { data, error } = await window.db.auth.signUp({

            email: email.value.trim(),

            password: senha.value,

            options: {

                data: {

                    nome: nome.value,
                    telefone: telefone.value

                }

            }

        });

        if (error) throw error;

        // Atualiza o perfil criado pelo trigger
        if (data.user) {

            const { error: profileError } = await window.db
                .from("profiles")
                .update({

                    nome: nome.value,
                    telefone: telefone.value

                })
                .eq("id", data.user.id);

            if (profileError) {
                console.warn("Erro ao atualizar profile:", profileError.message);
            }

        }

        mensagem.style.color = "green";
        mensagem.textContent = "Conta criada com sucesso!";

        form.reset();

        setTimeout(() => {

            window.location.href = "login.html";

        }, 2000);

    } catch (erro) {

        console.error(erro);

        mensagem.style.color = "red";
        mensagem.textContent = traduzirErro(erro.message);

    } finally {

        botao.disabled = false;
        botao.textContent = "Criar Conta";

    }

});

// ===============================
// TRADUZIR ERROS
// ===============================

function traduzirErro(erro) {

    switch (erro) {

        case "User already registered":
            return "Este e-mail já está cadastrado.";

        case "Password should be at least 6 characters":
            return "A senha deve possuir no mínimo 6 caracteres.";

        case "Invalid email":
            return "Digite um e-mail válido.";

        case "Email rate limit exceeded":
            return "Muitas tentativas. Aguarde alguns minutos.";

        default:
            return erro;

    }

}