const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const raiz = path.join(__dirname, "..");
const cadastroHtml = fs.readFileSync(path.join(raiz, "cadastrar-loja.html"), "utf8");
const cadastroJs = fs.readFileSync(path.join(raiz, "js", "cadastrar-loja.js"), "utf8");
const adminJs = fs.readFileSync(path.join(raiz, "js", "admin-dashboard.js"), "utf8");
const lojaHtml = fs.readFileSync(path.join(raiz, "loja.html"), "utf8");
const lojaJs = fs.readFileSync(path.join(raiz, "js", "loja.js"), "utf8");
const migration = fs.readFileSync(path.join(raiz, "supabase", "migrations", "20260910173000_documentos_lojas.sql"), "utf8");

test("cadastro exige banner, CPF/CNPJ e os dois documentos", () => {
    for (const id of ["banner", "tipo-pessoa", "numero-fiscal", "documento-fiscal", "comprovante-endereco"]) {
        assert.match(cadastroHtml, new RegExp(`id=["']${id}["']`));
    }
    assert.match(cadastroHtml, /id="banner"[^>]*required/);
    assert.match(cadastroHtml, /id="documento-fiscal"[^>]*required/);
    assert.match(cadastroHtml, /id="comprovante-endereco"[^>]*required/);
});

test("frontend valida e envia documentação para bucket privado", () => {
    assert.match(cadastroJs, /documentoFiscalValido/);
    assert.match(cadastroJs, /enviarArquivo\("documentos-lojas"/);
    assert.match(cadastroJs, /from\("documentos_loja"\)\.insert/);
    assert.match(cadastroJs, /banner_url/);
});

test("migração protege documentos e bloqueia aprovação incompleta", () => {
    assert.match(migration, /create table if not exists public\.documentos_loja/i);
    assert.match(migration, /alter table public\.documentos_loja enable row level security/i);
    assert.match(migration, /'documentos-lojas',[\s\S]*?false/i);
    assert.match(migration, /documentos_loja_select_owner_admin/i);
    assert.match(migration, /Aprove o documento fiscal e o comprovante de endereço antes de aprovar a loja/i);
    assert.match(migration, /private\.salvar_notificacao/i);
    assert.match(migration, /cancelar_cadastro_loja_incompleto/i);
});

test("administrador visualiza, aprova e rejeita documentos", () => {
    assert.match(adminJs, /listar_documentos_loja_admin/);
    assert.match(adminJs, /createSignedUrl\(caminho, 120\)/);
    assert.match(adminJs, /analisar_documento_loja_admin/);
    assert.match(adminJs, /p_status: status/);
});

test("banner cadastrado aparece na página pública da loja", () => {
    assert.match(lojaHtml, /id="bannerLoja"/);
    assert.match(lojaJs, /data\.banner_url/);
    assert.match(lojaJs, /bannerLoja\.src = data\.banner_url/);
});
