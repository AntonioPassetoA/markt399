# 🚀 Deploy do Painel de Clientes — Hostinger VPS

Guia completo para colocar o sistema no ar em um VPS da Hostinger (Ubuntu),
usando **GitHub + Node.js + PM2 + Nginx + SSL** no seu domínio.

> Substitua ao longo do guia:
> - `SEU_DOMINIO.com.br` → seu domínio real
> - `SEU_IP_DO_VPS` → o IP do seu VPS
> - `SEU_USUARIO/painel-de-clientes` → seu repositório no GitHub

---

## Parte A — Subir o código pro GitHub (no seu PC)

1. Crie um repositório **privado** em https://github.com/new (nome sugerido: `painel-de-clientes`). Não marque "Add README".
2. No terminal, dentro da pasta do projeto, rode os comandos que eu te passo (a gente faz isso junto).

> ⚠️ O arquivo `.env.local` **NÃO** vai pro GitHub (está no `.gitignore`). Os segredos serão criados direto no servidor.

---

## Parte B — Preparar o VPS (via SSH)

Conecte no VPS:
```bash
ssh root@SEU_IP_DO_VPS
```

Instale Node.js 20 LTS, Git e o PM2:
```bash
# Atualiza o sistema
apt update && apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs git

# Confirma versões (Node deve ser v20.x)
node -v && npm -v

# PM2 (gerenciador de processos)
npm install -g pm2
```

---

## Parte C — Clonar, configurar e buildar

```bash
# Clona o projeto (o GitHub vai pedir login/token na primeira vez)
cd /var/www 2>/dev/null || mkdir -p /var/www && cd /var/www
git clone https://github.com/SEU_USUARIO/painel-de-clientes.git
cd painel-de-clientes

# Cria o arquivo de variáveis de ambiente (conteúdo eu te passo pronto)
nano .env.local
# → cole o conteúdo, salve com CTRL+O, Enter, e saia com CTRL+X

# Instala dependências
npm install

# Build de produção (IMPORTANTE: o .env.local precisa existir ANTES do build,
# porque as variáveis NEXT_PUBLIC_* são embutidas aqui)
npm run build

# Sobe com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # rode o comando que ele imprimir, pra subir sozinho após reboot
```

Teste local no servidor:
```bash
curl -I http://localhost:3000
# deve responder HTTP/1.1 200 OK
```

---

## Parte D — Nginx (proxy reverso) + domínio

Instale o Nginx:
```bash
apt install -y nginx
```

Crie a configuração do site:
```bash
nano /etc/nginx/sites-available/painel
```

Cole (troque `SEU_DOMINIO.com.br`):
```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com.br www.SEU_DOMINIO.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ative e recarregue:
```bash
ln -s /etc/nginx/sites-available/painel /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t          # testa a config
systemctl reload nginx
```

### Apontar o domínio (DNS)
No painel onde seu domínio está (hPanel da Hostinger, em **Domínios → DNS/Zona DNS**), crie/edite:
- Registro **A** → `@`  → `SEU_IP_DO_VPS`
- Registro **A** → `www` → `SEU_IP_DO_VPS`

A propagação leva de alguns minutos a algumas horas.

---

## Parte E — HTTPS / SSL grátis (Let's Encrypt)

Assim que o domínio já apontar pro IP:
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d SEU_DOMINIO.com.br -d www.SEU_DOMINIO.com.br
# escolha redirecionar HTTP -> HTTPS quando perguntar
```
O Certbot renova sozinho. Pronto: `https://SEU_DOMINIO.com.br` no ar. 🔒

---

## Parte F — Ajustes no Supabase (produção)

No painel do Supabase → **Authentication → URL Configuration**:
- **Site URL:** `https://SEU_DOMINIO.com.br`

---

## 🔄 Atualizar o sistema depois (deploy de novas versões)

No seu PC: `git push`. No VPS:
```bash
cd /var/www/painel-de-clientes
git pull
npm install
npm run build
pm2 restart painel-clientes
```

---

## 🆘 Comandos úteis (VPS)

```bash
pm2 status                 # ver se está rodando
pm2 logs painel-clientes   # ver logs em tempo real
pm2 restart painel-clientes
systemctl reload nginx     # recarregar nginx
```
