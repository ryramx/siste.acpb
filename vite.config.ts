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
      watch: {
        // Sem isso o watcher do dev server vigia as copias do repositorio em
        // .claude/worktrees e mantem handles abertos nelas, o que impede remove-las.
        ignored: ['**/.claude/**'],
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      // .claude/worktrees guarda copias completas do repositorio; sem excluir,
      // o vitest roda a suite duplicada (uma vez no projeto, outra em cada worktree).
      exclude: [...configDefaults.exclude, '**/.claude/**'],
    },
  }
})
