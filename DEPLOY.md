# Deploy — GitHub Actions → VPS (Hostinger)

O app **MoldePronto** é um SPA estático (Vite/React). O fluxo:

```
git push (branch main)  →  GitHub Actions builda dist/  →  rsync via SSH  →  VPS serve com nginx
```

As Edge Functions do Supabase (`chat-agente`, `gerar-arte`, etc.) rodam no Supabase,
não na VPS. Deploy delas é separado: `npx supabase functions deploy <nome>`.

---

## 1. Gerar chave SSH dedicada ao deploy (na sua máquina)

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/moldepronto_deploy -N ""
```

Isso gera:
- `~/.ssh/moldepronto_deploy`      → chave PRIVADA (vai nos secrets do GitHub)
- `~/.ssh/moldepronto_deploy.pub`  → chave PÚBLICA (vai na VPS)

## 2. Autorizar a chave pública na VPS

Conecte na VPS e adicione a pública ao usuário de deploy:

```bash
# na VPS, como o usuário que fará o deploy (ex: deploy ou root):
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "COLE_AQUI_O_CONTEUDO_DE_moldepronto_deploy.pub" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 3. Preparar nginx na VPS

```bash
# criar a pasta que receberá os arquivos buildados
sudo mkdir -p /var/www/moldepronto
sudo chown -R $USER:$USER /var/www/moldepronto

# config do nginx (SPA: todas as rotas caem no index.html)
sudo tee /etc/nginx/sites-available/moldepronto > /dev/null <<'NGINX'
server {
    listen 80;
    server_name SEU_DOMINIO_OU_IP;

    root /var/www/moldepronto;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/moldepronto /etc/nginx/sites-enabled/moldepronto
sudo nginx -t && sudo systemctl reload nginx
```

## 4. HTTPS (depois que o domínio apontar pra VPS)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_DOMINIO
```

## 5. Configurar os Secrets no GitHub

Repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret            | Valor                                                        |
|-------------------|--------------------------------------------------------------|
| `VPS_HOST`        | IP da VPS (ex: `72.60.x.x`)                                   |
| `VPS_USER`        | usuário SSH (ex: `deploy` ou `root`)                         |
| `VPS_SSH_KEY`     | conteúdo COMPLETO da chave privada `moldepronto_deploy`       |
| `VPS_TARGET_DIR`  | `/var/www/moldepronto/`  (com a barra final)                 |
| `VPS_PORT`        | (opcional) porta SSH, se não for 22                          |

## 6. Testar

- Faça um push na `main` (ou rode manualmente em Actions → Deploy to VPS → Run workflow)
- Acompanhe o log na aba **Actions** do GitHub
- Acesse `http://SEU_DOMINIO_OU_IP` — deve mostrar o app

---

## Observações

- O `.env` do repo só contém a URL do Supabase e a chave `anon` (públicas por design —
  protegidas por RLS). O build usa esse `.env` automaticamente. Se um dia quiser tirar do
  repo, mova para variáveis `vars`/`secrets` do GitHub e injete no passo de build.
- `--delete` no rsync remove da VPS arquivos que não existem mais no build (mantém sincronizado).
