const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const codigo = fs.readFileSync(
    path.join(__dirname, "..", "js", "admin-usuarios.js"),
    "utf8"
);

function carregarUtilitarios() {
    const window = {};
    const document = {
        addEventListener() {}
    };

    vm.runInNewContext(codigo, {
        window,
        document,
        console,
        clearTimeout,
        setTimeout,
        Intl,
        URLSearchParams
    }, { filename: "admin-usuarios.js" });

    return window.AdminUsuariosTestes;
}

const utilitarios = carregarUtilitarios();

test("apresenta os três papéis administrativos permitidos", () => {
    assert.equal(utilitarios.obterPapelUsuario("cliente").rotulo, "Cliente");
    assert.equal(utilitarios.obterPapelUsuario("lojista").rotulo, "Lojista");
    assert.equal(utilitarios.obterPapelUsuario("admin").rotulo, "Administrador");
    assert.equal(utilitarios.obterPapelUsuario("desconhecido").rotulo, "Cliente");
});

test("apresenta os estados de conta com classes distintas", () => {
    assert.equal(utilitarios.obterStatusUsuario("ativo").rotulo, "Ativa");
    assert.equal(utilitarios.obterStatusUsuario("bloqueado").classe, "status-usuario-bloqueado");
    assert.equal(utilitarios.obterStatusUsuario("excluido").rotulo, "Excluída");
});

test("gera iniciais sem expor outros dados do usuário", () => {
    assert.equal(utilitarios.obterIniciaisUsuario("Maria da Silva"), "MS");
    assert.equal(utilitarios.obterIniciaisUsuario("João"), "JO");
    assert.equal(utilitarios.obterIniciaisUsuario(""), "US");
});

test("escapa dados do perfil antes de montar cartões", () => {
    assert.equal(
        utilitarios.escaparHTMLUsuario('<img src=x onerror="alert(1)">'),
        "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"
    );
});
