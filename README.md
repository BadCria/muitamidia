# Muita Midia Bios Platform

Sistema profissional de bios com tema preto/vermelho.

## Rodar no Render
Build Command:
```txt
npm install
```
Start Command:
```txt
npm start
```

## Admin padrão
Login: `badcria` ou `admin@muitamidia.gg`
Senha: `mtm123`

## Rotas
- `/` home
- `/register` criar conta com email
- `/login` login
- `/dashboard` editar perfil
- `/explore` perfis
- `/admin` dar/remover coroa, verificado e destaque
- `/:username` perfil público

## Importante
No Render grátis, banco JSON pode resetar quando redeployar. Para produção real, depois use PostgreSQL/Supabase.
