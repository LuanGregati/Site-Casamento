# Site de Casamento • 08/05/2027

Site mobile para confirmar presença e dar presentes simbólicos via Pix.

- Convidado: `/convite` — entra só com o celular, confirma (Vou / Não vou), escolhe presente, paga no Pix e clica em Enviar presente.
- Noivos: `/admin` — vê confirmados, define papel (convidado, padrinho, pais...), cadastra presentes e acompanha quem deu o quê.

## Rodar local

```bash
npm install
npm run dev
```

Abra http://localhost:3000/convite e http://localhost:3000/admin.

## Configurar (`.env.local`)

Copie `.env.example` para `.env.local` e preencha:

| Variável         | O que é                                     |
| ---------------- | ------------------------------------------- |
| `PIX_KEY`        | Sua chave Pix (CPF, celular, e-mail ou aleatória) |
| `PIX_NAME`       | Nome do titular (até 25 letras, sem acento) |
| `PIX_CITY`       | Cidade do titular (até 15 letras)           |
| `ADMIN_PASSWORD` | Senha do painel `/admin`                    |

`.env.local` (não vai para o git) já está preenchido com a chave Pix e a senha do admin.

## Banco de dados

SQLite local em `data/wedding.db` (criado sozinho, já com 6 presentes de exemplo).
Para produção na Vercel, use um Postgres (ex: Neon) — o acesso SQL está isolado em `src/lib/db.ts` para facilitar a troca.
