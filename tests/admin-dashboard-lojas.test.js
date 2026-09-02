const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const raiz = path.join(__dirname, "..");
const codigo = fs.readFileSync(
    path.join(raiz, "js", "admin-dashboard.js"),
    "utf8"
);
const html = fs.readFileSync(
    path.join(raiz, "admin-dashboard.html"),
    "utf8"
);
const migration = fs.readFileSync(
    path.join(
        raiz,
        "supabase",
        "migrations",
        "20260902165653_rf23_edicao_lojas_admin.sql"
    ),
    "utf8"
);
const hardeningMigration = fs.readFileSync(
    path.join(
        raiz,
        "supabase",
        "migrations",
        "20260902170145_rf23_hardening_edicao_lojas_admin.sql"
    ),
    "utf8"
);
const edgeFunction = fs.readFileSync(
    path.join(raiz, "supabase", "functions", "admin-lojas", "index.ts"),
    "utf8"
);

function carregarUtilitarios() {
    const window = {};
    const document = {
        addEventListener() {},
        getElementById() { return null; },
        querySelectorAll() { return []; }
    };

    vm.runInNewContext(codigo, {
        window,
        document,
        console: { error() {}, warn() {}, log() {} },
        clearTimeout,
        setTimeout
    }, { filename: "admin-dashboard.js" });

    return window.AdminDashboardTestes;
}

const utilitarios = carregarUtilitarios();

function dadosValidos(sobrescritas = {}) {
    return {
        lojaId: "11111111-1111-4111-8111-111111111111",
        nome: "  Mercado Central  ",
        categoriaId: "2",
        descricao: "  Produtos locais  ",
        telefone: "(11) 3333-4444",
        whatsapp: "(11) 99999-8888",
        endereco: "  Rua Principal, 10  ",
        cidade: "  Jacinto  ",
        estado: "mg",
        abertura: "08:00",
        fechamento: "18:30",
        taxaEntrega: "7.999",
        motivo: "  Correção solicitada pelo lojista.  ",
        ...sobrescritas
    };
}

test("normaliza e valida os dados comerciais permitidos", () => {
    const resultado = utilitarios.validarDadosEdicaoLojaAdmin(dadosValidos());

    assert.equal(resultado.valido, true);
    assert.equal(resultado.dados.nome, "Mercado Central");
    assert.equal(resultado.dados.categoriaId, 2);
    assert.equal(resultado.dados.estado, "MG");
    assert.equal(resultado.dados.taxaEntrega, 8);
    assert.equal(resultado.dados.motivo, "Correção solicitada pelo lojista.");
});

test("recusa telefone, horários e justificativa inválidos", () => {
    const telefone = utilitarios.validarDadosEdicaoLojaAdmin(
        dadosValidos({ telefone: "123" })
    );
    const horarios = utilitarios.validarDadosEdicaoLojaAdmin(
        dadosValidos({ fechamento: "" })
    );
    const motivo = utilitarios.validarDadosEdicaoLojaAdmin(
        dadosValidos({ motivo: "não" })
    );

    assert.equal(telefone.valido, false);
    assert.equal(telefone.campo, "telefoneLojaEdicaoAdmin");
    assert.equal(horarios.valido, false);
    assert.equal(horarios.campo, "fechamentoLojaEdicaoAdmin");
    assert.equal(motivo.valido, false);
    assert.equal(motivo.campo, "motivoEdicaoLojaAdmin");
});

test("apresenta a auditoria de edição sem executar conteúdo do banco", () => {
    const conteudo = utilitarios.renderizarItemHistoricoAdmin({
        tipo_evento: "edicao",
        campos_alterados: ["Nome", "<img src=x onerror=alert(1)>"] ,
        criado_em: "2026-09-02T12:00:00Z",
        administrador_nome: "<script>alert(1)</script>",
        motivo: "<b>ajuste</b>"
    });

    assert.match(conteudo, /Dados editados/);
    assert.doesNotMatch(conteudo, /<script>|<img|<b>/);
    assert.match(conteudo, /&lt;script&gt;|&lt;img|&lt;b&gt;/);
});

test("o formulário administrativo contém os campos e controles do RF-23", () => {
    for (const id of [
        "modalEditarLoja",
        "formEditarLojaAdmin",
        "nomeLojaEdicaoAdmin",
        "categoriaLojaEdicaoAdmin",
        "motivoEdicaoLojaAdmin",
        "btnSalvarEdicaoLojaAdmin"
    ]) {
        assert.match(html, new RegExp(`id=["']${id}["']`));
    }
});

test("a RPC limita a edição ao administrador principal e preserva a propriedade", () => {
    assert.match(migration, /create or replace function public\.editar_loja_admin/i);
    assert.match(migration, /private\.admin_principal/);
    assert.match(migration, /Acesso restrito ao administrador principal/);
    assert.doesNotMatch(
        migration,
        /update public\.lojas[\s\S]*?set[\s\S]*?proprietario_id\s*=/i
    );
    assert.match(migration, /tipo_evento[\s\S]*?'edicao'/i);
    assert.match(hardeningMigration, /security invoker/i);
    assert.match(hardeningMigration, /grant execute[\s\S]*to service_role/i);
    assert.match(hardeningMigration, /from public, anon, authenticated, service_role/i);
    assert.match(edgeFunction, /auth\.getUser\(token\)/);
    assert.match(edgeFunction, /rpc\("sou_admin"\)/);
    assert.match(edgeFunction, /rpc\("editar_loja_admin_service"/);
    assert.doesNotMatch(
        codigo,
        /window\.db\.rpc\("editar_loja_admin"/
    );
});
