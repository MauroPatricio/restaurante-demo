import axios from 'axios';

// Cria uma instância do axios que será usada em toda a aplicação
const api = axios.create({
  // A URL base da sua API. Use uma variável de ambiente para produção.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Interceptor: Adiciona o token de autenticação a cada requisição
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Ou de onde quer que você armazene o token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;