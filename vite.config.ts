import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
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
})
