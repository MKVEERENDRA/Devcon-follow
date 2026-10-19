import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],build:{rollupOptions:{input:{app:'index.html',install:'install.html'}}},server:{proxy:{'/v1':'http://localhost:8080','/health':'http://localhost:8080','/client-config':'http://localhost:8080'}}});
