# Deploy na VPS do CRM

O Meu Ateliê Digital é servido como aplicação estática pelo Nginx, sem compartilhar porta, processo ou diretório com o CRM.

## Endereços

- VPS: `2.25.131.229`
- Slug pública estável: `https://www.appateliedigital.com.br/agentes-artesaos/`
- Alias preparado: `https://appateliedigital.com.br/agentes-artesaos/`
- Diretório: `/var/www/meu-atelie-digital`
- Configuração Nginx: `/etc/nginx/sites-available/meu-atelie-digital`

## Publicação

1. Gere o build da escola:

   ```powershell
   npm run build:escola
   ```

2. Crie um diretório em `/var/www/meu-atelie-digital/releases/<data-hora>`.
3. Envie o conteúdo de `dist/` para a pasta `agentes-artesaos/` desse diretório.
4. Aponte o link `/var/www/meu-atelie-digital/current` para o novo release.
5. Copie `deploy/nginx/meu-atelie-digital.conf` para `/etc/nginx/sites-available/meu-atelie-digital`.
6. Habilite o site, valide com `nginx -t` e recarregue o Nginx.
7. Teste a slug usando o cabeçalho `Host: appateliedigital.com.br` contra `127.0.0.1` na VPS.

O CRM continua em sua configuração e porta atuais. O deploy não deve editar `crmcreator.online` nem interromper o processo da porta `4177`.

O workflow antigo do GitHub está limitado à execução manual até que uma chave exclusiva de deploy seja autorizada na nova VPS. Isso evita publicação acidental na hospedagem anterior.

## Integração com o domínio existente

Não é necessário mudar DNS para a rota com `www`. O servidor que já atende o domínio deve encaminhar somente a slug para a VPS do CRM:

```nginx
location = /agentes-artesaos {
    return 308 /agentes-artesaos/;
}

location = /agentes-artesãos {
    return 308 /agentes-artesaos/;
}

location ^~ /agentes-artesaos/ {
    proxy_pass http://2.25.131.229;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

O HTTPS continua terminado no servidor atual do domínio. A VPS do CRM recebe somente o tráfego encaminhado para a slug.

O DNS atual do host sem `www` possui dois registros `A`, `2.57.91.91` e `72.60.137.128`. Enquanto ambos existirem, esse alias pode chegar a servidores diferentes. Isso não é causado pela nova aplicação; a URL com `www`, que aponta somente para `72.60.137.128`, permanece a rota estável sem mudança de DNS.

## Verificação

- `/agentes-artesaos/` redireciona internamente para a lista de agentes.
- `/agentes-artesaos/auth` abre login, cadastro e recuperação de senha.
- Usuária sem assinatura vê o bloqueio de acesso.
- Usuária com assinatura ativa abre os nove agentes.
- O chat recebe resposta em streaming e salva a conversa.
- Pesquisa pública mostra links das fontes utilizadas.
- Layout não cria rolagem horizontal em tela móvel.

## Rollback

Liste os releases em `/var/www/meu-atelie-digital/releases`, aponte `current` para o release anterior e recarregue o Nginx. O rollback do frontend não altera banco, autenticação nem Edge Functions.
