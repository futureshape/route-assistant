import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default {
  plugins: [
    tailwindcss({ config: join(__dirname, 'tailwind.config.js') }),
    autoprefixer,
  ],
}
