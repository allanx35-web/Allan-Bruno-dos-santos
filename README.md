# A. S. Conteúdo Digital 2.0

Aplicativo responsivo para uso pessoal, com CRM, briefing, roteiros, propostas e acompanhamento comercial.

## Publicação na Vercel

1. Crie um projeto Supabase. No SQL Editor execute `supabase.sql`.
2. Em Authentication > Providers, habilite Email (confirme o e-mail de cadastro, conforme configuração do projeto).
3. Copie a **Project URL** e a **anon/publishable key** do Supabase (nunca use a service_role key no navegador).
4. Em `public/config.js`, preencha os dois valores. Esses valores públicos são protegidos por autenticação e RLS; não são segredos.
5. Crie um repositório privado no GitHub e envie os arquivos desta pasta.
6. Importe o repositório na Vercel, com **Root Directory** na raiz do projeto e **Output Directory** `public`.
7. Adicione a variável de ambiente `OPENAI_API_KEY` no painel da Vercel. Opcionalmente, `OPENAI_MODEL`.
8. Faça deploy, abra o endereço HTTPS gerado, crie sua conta e entre. Clique em **Enviar dados para nuvem** para subir os dados locais. Use **Carregar da nuvem** em outro dispositivo.

## Segurança e limitações

- A chave OpenAI fica somente no servidor (`api/generate.js`). Nunca coloque essa chave no `config.js`.
- A sincronização é **manual**, não em tempo real. Se editar em dois aparelhos, o último envio sobrescreve o workspace anterior. Faça backups JSON.
- O app continua operando localmente se o Supabase não estiver configurado; a IA só funciona quando publicado com a variável OpenAI.
- Não existe isolamento por empresa/equipe, pois esta versão é de uso pessoal.
- Para evitar gastos inesperados, configure limites e monitoramento de uso na OpenAI e Vercel.
- A versão inicial usa armazenamento local do navegador como cópia de trabalho; para segurança, mantenha backups e sincronize após alterações.


Identidade visual: fotografia enviada pelo proprietário, utilizada na abertura do painel. Paleta grafite, off-white e cinza quente.
