import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Um build de producao sem VITE_API_URL geraria um bundle apontando para a maquina de
  // quem compilou (127.0.0.1) e o sistema nao carregaria para ninguem. Falhar aqui pega o
  // erro antes do deploy, em vez de so no navegador do usuario final.
  if (command === 'build' && mode === 'production' && !process.env.VITE_API_URL) {
    throw new Error(
      'VITE_API_URL nao definida. Configure a URL publica da API (ex.: ' +
        'https://acpb-api.onrender.com) nas variaveis de ambiente da plataforma de deploy. ' +
        'Ver backend/DEPLOY.md.'
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // Porta fixa e propria deste projeto, para conviver com outros na mesma maquina.
      // strictPort evita o pior caso: sem ele o Vite escolheria outra porta em silencio,
      // e o backend recusaria a origem por CORS com um erro que nao explica a causa.
      port: 5174,
      strictPort: true,
      watch: {
        // Sem isso o watcher do dev server vigia as copias do repositorio em
        // .claude/worktrees e mantem handles abertos nelas, o que impede remove-las.
        ignored: ['**/.claude/**'],
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      // O padrao do vitest e 5s. Os testes de tela levam entre 1s e 4s cada -- eles montam a
      // arvore React no jsdom e simulam digitacao tecla a tecla --, entao encostavam no
      // limite quando a maquina estava ocupada e falhavam por lentidao, nao por defeito. As
      // falhas mudavam de arquivo a cada execucao, que e a assinatura desse problema. Com
      // 20s um teste realmente travado ainda falha, so que sem arrastar os saudaveis junto.
      testTimeout: 20000,
      // Registra os matchers do jest-dom e limpa o DOM entre testes.
      setupFiles: ['./src/test/setup.ts'],
      // .claude/worktrees guarda copias completas do repositorio; sem excluir,
      // o vitest roda a suite duplicada (uma vez no projeto, outra em cada worktree).
      exclude: [...configDefaults.exclude, '**/.claude/**'],
    },
  }
})
