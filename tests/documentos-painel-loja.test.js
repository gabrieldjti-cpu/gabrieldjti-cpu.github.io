const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const raiz = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(raiz, "painel-loja.html"), "utf8");
const codigo = fs.readFileSync(path.join(raiz, "js", "painel-loja.js"), "utf8");
const migration = fs.readFileSync(path.join(raiz, "supabase", "migrations", "20260911224500_reenvio_documentos_loja.sql"), "utf8");

test("painel apresenta progresso e os dois documentos obrigatórios", () => {
    assert.match(html, /id="lista-documentos-loja"/);
    assert.match(html, /id="progresso-documentos-loja"/);
    assert.match(codigo, /documento_fiscal/);
    assert.match(codigo, /comprovante_endereco/);
    assert.match(codigo, /motivo_rejeicao/);
});

test("lojista pode enviar ausente e reenviar somente rejeitado", () => {
    assert.match(codigo, /status === "rejeitado" \|\| status === "nao_enviado"/);
    assert.match(codigo, /rpc\("enviar_documento_loja"/);
    assert.match(migration, /documento\.status = 'rejeitado'/);
    assert.match(migration, /loja\.proprietario_id = v_uid/);
    assert.match(migration, /revoke all[\s\S]*from public, anon, authenticated/i);
});

test("novo arquivo permanece privado e respeita limite de 10 MB", () => {
    assert.match(codigo, /from\("documentos-lojas"\)\.upload/);
    assert.match(codigo, /10 \* 1024 \* 1024/);
    assert.match(migration, /10485760/);
});
