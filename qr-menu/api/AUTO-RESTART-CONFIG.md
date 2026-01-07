# 🔄 Configuração de Auto-Restart da API

## ✅ Configuração Concluída

A API está agora configurada para fazer **restart automático** sempre que houver alterações nos arquivos.

## 📋 Como Usar

### Iniciar a API em Modo de Desenvolvimento (com auto-restart)

```powershell
cd d:\Projectos\restaurante-demo\qr-menu\api
npm run dev
```

ou

```powershell
npm start
```

## 🎯 O que está sendo monitorado

O `nodemon` está configurado para monitorar:

- ✅ Pasta `src/` - Todos os arquivos JavaScript
- ✅ Arquivo `index.js` - Arquivo principal
- ✅ Arquivo `.env` - Variáveis de ambiente

## 🚫 O que é ignorado

Para melhor performance, estes arquivos/pastas **não** disparam restart:

- `node_modules/`
- `tests/`
- `uploads/`
- Arquivos `*.log`
- Arquivos `*.test.js`

## ⚙️ Configurações do Nodemon

- **Delay**: 1 segundo após detectar alteração (evita múltiplos restarts)
- **Extensões monitoradas**: `.js`, `.json`
- **Modo verbose**: Ativado para ver detalhes das alterações

## 📝 Mensagens do Sistema

Quando você salvar um arquivo monitorado, verá:

```
🔄 API reiniciada devido a alterações nos arquivos...
```

Se a API crashar:

```
⚠️ API crashou - aguardando alterações...
```

## 🛠️ Personalização

Para modificar as configurações, edite o arquivo [`nodemon.json`](file:///d:/Projectos/restaurante-demo/qr-menu/api/nodemon.json):

- **watch**: Adicione mais pastas/arquivos para monitorar
- **ignore**: Adicione mais padrões para ignorar
- **delay**: Ajuste o tempo de delay (em milissegundos)
- **ext**: Adicione mais extensões de arquivo (ex: `ts`, `mjs`)

## 💡 Dicas

1. **Salve com frequência**: O nodemon detecta automaticamente salvamentos
2. **Veja os logs**: O modo verbose mostra quais arquivos mudaram
3. **Múltiplas alterações**: O delay de 1s agrupa alterações próximas
4. **Crash recovery**: Se a API crashar, corrige o erro e salva - o nodemon reinicia automaticamente

## 🚀 Exemplo de Uso

1. Inicie a API:
   ```powershell
   npm run dev
   ```

2. Faça alterações em qualquer arquivo em `src/`

3. Salve o arquivo (Ctrl+S)

4. A API reinicia automaticamente! 🎉

## 📦 Arquivo de Configuração

O arquivo [`nodemon.json`](file:///d:/Projectos/restaurante-demo/qr-menu/api/nodemon.json) foi criado na raiz da pasta `api` com todas as configurações otimizadas.
