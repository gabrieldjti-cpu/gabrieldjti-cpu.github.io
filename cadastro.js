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

// ===============================
// MOSTRAR / ESCONDER SENHA
// ===============================

function configurarMostrarSenha(botaoId, inputId){

    const botao = document.getElementById(botaoId);
    const input = document.getElementById(inputId);

    botao.addEventListener("click", () =>{

        const icone = botao.querySelector("i");

        if(input.type === "password"){

            input.type = "text";

            icone.classList.replace("fa-eye", "fa-eye-slash");

        }else{

            input.type = "password";

            icone.classList.replace("fa-eye-slash", "fa-eye");

        }

    });

}

configurarMostrarSenha("toggleSenha","senha");
configurarMostrarSenha("toggleConfirmarSenha","confirmarSenha");

// ===============================
// CADASTRO
// ===============================

form.addEventListener("submit", async(e)=>{

    e.preventDefault();

    mensagem.textContent = "";
    mensagem.style.color = "red";

    if(senha.value !== confirmarSenha.value){

        mensagem.textContent = "As senhas não coincidem.";

        return;

    }

    const botao = document.querySelector(".btn-cadastro");

    botao.disabled = true;
    botao.textContent = "Criando conta...";

    // Cria o usuário

    const { data, error } = await supabase.auth.signUp({

        email: email.value.trim(),

        password: senha.value,

        options:{

            data:{

                nome: nome.value

            }

        }

    });

    if(error){

        mensagem.textContent = traduzirErro(error.message);

        botao.disabled = false;
        botao.textContent = "Criar Conta";

        return;

    }

    // Atualiza os dados da tabela profiles

    if(data.user){

        await supabase

        .from("profiles")

        .update({

            nome: nome.value,

            telefone: telefone.value

        })

        .eq("id", data.user.id);

    }

    mensagem.style.color = "green";

    mensagem.textContent = "Conta criada com sucesso!";

    setTimeout(()=>{

        window.location.href = "login.html";

    },2000);

});

// ===============================
// TRADUÇÃO DOS ERROS
// ===============================

function traduzirErro(erro){

    switch(erro){

        case "User already registered":
            return "Este e-mail já está cadastrado.";

        case "Password should be at least 6 characters":
            return "A senha deve ter no mínimo 6 caracteres.";

        case "Invalid email":
            return "Digite um e-mail válido.";

        default:
            return erro;

    }

}
