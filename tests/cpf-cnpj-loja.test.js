const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const ler = arquivo => fs.readFileSync(path.join(raiz, arquivo), "utf8");

const migration = ler("supabase/migrations/20261008230000_cpf_cnpj_sem_documentos.sql");

test("o cadastro pede só o CPF ou CNPJ, sem foto de documento", () => {
    const html = ler("cadastrar-loja.html");
    const codigo = ler("js/cadastrar-loja.js");

    assert.match(html, /id=["']tipo-pessoa["']/);
    assert.match(html, /id=["']numero-fiscal["']/);
    assert.doesNotMatch(html, /id=["'](documento-fiscal|comprovante-endereco)["']/);
    assert.match(codigo, /rpc\("salvar_dados_fiscais_loja"/);
    assert.doesNotMatch(codigo, /documentos-lojas/);
});

test("o painel do lojista mostra e salva o CPF ou CNPJ", () => {
    const html = ler("painel-loja.html");
    assert.match(html, /id="form-fiscal-loja"/);
    assert.match(html, /js\/painel-loja-fiscal\.js/);
    assert.doesNotMatch(html, /id="lista-documentos-loja"/);
    assert.match(ler("js/painel-loja-fiscal.js"), /rpc\("salvar_dados_fiscais_loja"/);
});

test("o número fica numa tabela privada, fora da tabela pública de lojas", () => {
    assert.match(migration, /create table public\.dados_fiscais_loja/);
    assert.match(migration, /alter table public\.dados_fiscais_loja enable row level security/);
    assert.match(migration, /revoke all on table public\.dados_fiscais_loja from anon, authenticated/);
    assert.match(migration, /\(select public\.sou_admin\(\)\)/);
    assert.doesNotMatch(migration, /alter table public\.lojas/);
    assert.doesNotMatch(migration, /grant (insert|update|delete|all)[^;]*dados_fiscais_loja/i);
});

test("aprovar a loja não exige mais documentos", () => {
    const inicio = migration.indexOf("function public.alterar_status_loja_admin");
    const corpo = migration.slice(inicio);
    assert.match(corpo, /_usuario_e_admin/);
    assert.doesNotMatch(corpo, /documentos_loja/);
});

test("o admin vê o CPF ou CNPJ nos detalhes da loja", () => {
    const codigo = ler("js/admin-dashboard.js");
    assert.match(codigo, /from\("dados_fiscais_loja"\)/);
    assert.doesNotMatch(codigo, /rpc\("listar_documentos_loja_admin"/);
});
