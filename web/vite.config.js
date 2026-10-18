import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/v1':'http://localhost:8080','/health':'http://localhost:8080','/client-config':'http://localhost:8080'}}});
