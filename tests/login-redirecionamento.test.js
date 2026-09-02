const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const codigo = fs.readFileSync(
    path.join(__dirname, "..", "js", "login.js"),
    "utf8"
);

function carregarUtilitarios() {
    const window = {
        location: {
            origin: "https://gabrieldjti-cpu.github.io",
            pathname: "/login.html",
            search: ""
        }
    };
    const document = {
        getElementById() { return null; },
        querySelector() { return null; }
    };

    vm.runInNewContext(codigo, {
        window,
        document,
        console: { error() {}, warn() {}, log() {} },
        clearTimeout,
        setTimeout,
        URL,
        URLSearchParams
    }, { filename: "login.js" });

    return window.LoginTestes;
}

const utilitarios = carregarUtilitarios();

test("administrador sempre segue para o dashboard", () => {
    assert.equal(
        utilitarios.resolverDestinoAposLogin(
            "admin-dashboard.html",
            "favoritos.html"
        ),
        "admin-dashboard.html"
    );
});

test("lojista sempre segue para o painel da loja", () => {
    assert.equal(
        utilitarios.resolverDestinoAposLogin(
            "painel-loja.html",
            "index.html?produto=123"
        ),
        "painel-loja.html"
    );
});

test("somente cliente pode retornar ao destino salvo", () => {
    assert.equal(
        utilitarios.resolverDestinoAposLogin(
            "perfil.html",
            "favoritos.html"
        ),
        "favoritos.html"
    );
    assert.equal(
        utilitarios.resolverDestinoAposLogin("perfil.html", null),
        "perfil.html"
    );
});
