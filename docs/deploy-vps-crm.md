# Deploy na VPS do CRM

O Meu Ateliê Digital é servido como aplicação estática pelo Nginx, sem compartilhar porta, processo ou diretório com o CRM.

## Endereços

- VPS: `2.25.131.229`
- Domínio: `appateliedigital.com.br` e `www.appateliedigital.com.br`
- Diretório: `/var/www/meu-atelie-digital`
- Configuração Nginx: `/etc/nginx/sites-available/meu-atelie-digital`

## Publicação

1. Gere o build da escola:

   ```powershell
   npm run build:escola
   ```

2. Crie um diretório em `/var/www/meu-atelie-digital/releases/<data-hora>`.
3. Envie o conteúdo de `dist/` para esse diretório.
4. Aponte o link `/var/www/meu-atelie-digital/current` para o novo release.
5. Copie `deploy/nginx/meu-atelie-digital.conf` para `/etc/nginx/sites-available/meu-atelie-digital`.
6. Habilite o site, valide com `nginx -t` e recarregue o Nginx.
7. Teste antes do DNS usando o cabeçalho `Host: appateliedigital.com.br` contra `127.0.0.1` na VPS.

O CRM continua em sua configuração e porta atuais. O deploy não deve editar `crmcreator.online` nem interromper o processo da porta `4177`.

O workflow antigo do GitHub está limitado à execução manual até que uma chave exclusiva de deploy seja autorizada na nova VPS. Isso evita publicação acidental na hospedagem anterior.

## Troca do domínio

No provedor de DNS do domínio:

1. Altere o registro `A` de `@` para `2.25.131.229`.
2. Altere o registro `A` de `www` para `2.25.131.229`, ou use um `CNAME` de `www` para `appateliedigital.com.br`.
3. Remova o destino antigo `72.60.137.128` para esses dois nomes.
4. Use TTL de 300 segundos durante a migração.
5. Aguarde `appateliedigital.com.br` e `www.appateliedigital.com.br` resolverem para `2.25.131.229` em resolvedores públicos.

Depois da propagação, emita o certificado:

```bash
certbot --nginx \
  -d appateliedigital.com.br \
  -d www.appateliedigital.com.br \
  --redirect
```

Valide a renovação com `certbot renew --dry-run`.

## Verificação

- `/` redireciona para `/agentes` no modo escola.
- `/auth` abre login, cadastro e recuperação de senha.
- Usuária sem assinatura vê o bloqueio de acesso.
- Usuária com assinatura ativa abre os nove agentes.
- O chat recebe resposta em streaming e salva a conversa.
- Pesquisa pública mostra links das fontes utilizadas.
- Layout não cria rolagem horizontal em tela móvel.

## Rollback

Liste os releases em `/var/www/meu-atelie-digital/releases`, aponte `current` para o release anterior e recarregue o Nginx. O rollback do frontend não altera banco, autenticação nem Edge Functions.
