# Sistema de Validação PIX Inteligente

## Arquitetura

O sistema funciona em 3 etapas:

### 1. **Checkout (Frontend)**
- Usuário seleciona PIX como método de pagamento
- Digita o nome de quem está fazendo o PIX (validação automática)
- Visualiza o QR code e copia o código PIX
- Clica em "Gerar Código PIX"

### 2. **Criação de Compra (Backend)**
- API `/api/comprar` recebe:
  - `items`: Lista de rifas a comprar
  - `email`: Email do comprador
  - `phone`: Telefone do comprador
  - `paymentMethod`: "pix"
  - `pixPayerName`: Nome de quem fará o PIX
  
- Salva a compra com status `"pending"` no Firestore

### 3. **Validação do PIX (Webhook)**
- PicPay envia webhook com dados do PIX recebido
- Sistema valida:
  - ✓ Email do PIX = Email do comprador
  - ✓ Valor recebido = Valor da compra
  - ✓ Nome do pagador = Nome registrado
- Se válido: Muda status para `"confirmado"` e distribui números
- Se inválido: Muda status para `"validacao_falhou"` com detalhes dos erros

## Endpoints da API

### POST `/api/webhook/pix-validation`
**Recebe:** Webhook do PicPay
```json
{
  "purchaseId": "abc123",
  "pixPayerEmail": "joao@email.com",
  "pixPayerName": "João Silva",
  "amount": 50.00
}
```

**Resposta (Sucesso):**
```json
{
  "success": true,
  "message": "PIX validado com sucesso!",
  "validations": {
    "emailValid": true,
    "amountValid": true,
    "payerNameValid": true,
    "allValid": true
  }
}
```

**Resposta (Erro):**
```json
{
  "success": false,
  "message": "Validação do PIX falhou",
  "validations": {
    "emailValid": false,
    "amountValid": true,
    "payerNameValid": true,
    "allValid": false
  },
  "details": {
    "expectedEmail": "user@email.com",
    "receivedEmail": "joao@email.com",
    "expectedAmount": 50.00,
    "receivedAmount": 50.00,
    "expectedPayerName": "João",
    "receivedPayerName": "Maria"
  }
}
```

### GET `/api/webhook/pix-validation?purchaseId=abc123`
**Obtém status de validação de uma compra**

**Resposta:**
```json
{
  "purchaseId": "abc123",
  "status": "confirmado",
  "email": "user@email.com",
  "pixPayerName": "João Silva",
  "amount": 50.00,
  "validatedAt": "2024-01-02T10:30:00Z"
}
```

## Fluxo Completo

```
1. Usuário escolhe PIX no checkout
   ↓
2. Sistema gera código PIX e mostra QR code
   ↓
3. Usuário faz o PIX no seu banco
   ↓
4. PicPay recebe o PIX e envia webhook
   ↓
5. Webhook chega em /api/webhook/pix-validation
   ↓
6. Sistema valida email, valor e nome
   ↓
7a. Se válido → Muda status para "confirmado" + distribui números
7b. Se inválido → Muda status para "validacao_falhou" + avisa ao usuário
```

## Configuração do PicPay Webhook

1. Ir para Dashboard do PicPay
2. Configurar webhook para: `https://seu-site.com/api/webhook/pix-validation`
3. Selecionar eventos: "Pagamento recebido"
4. Nos settings, garantir que envia: email do pagador, nome e valor

## Banco de Dados (Firestore)

Estrutura da compra:
```
compras/{purchaseId}
├── id
├── rifaId
├── userId
├── quantidade
├── numeros[]
├── valorPago
├── pagamentoStatus: "pending" | "confirmado" | "validacao_falhou"
├── paymentMethod: "pix" | "stripe"
├── email: "comprador@email.com"
├── phone: "(11) 99999-9999"
├── pixPayerName: "João Silva"
├── createdAt
├── pixValidatedAt (quando validado)
└── pixValidationErrors (se falhou)
    ├── emailValid
    ├── amountValid
    ├── payerNameValid
    ├── expectedEmail
    ├── receivedEmail
    ├── expectedAmount
    ├── receivedAmount
    ├── expectedPayerName
    └── receivedPayerName
```

## Testes Locais

Para testar sem PicPay real, use:

```bash
curl -X POST http://localhost:3000/api/webhook/pix-validation \
  -H "Content-Type: application/json" \
  -d '{
    "purchaseId": "seu_purchase_id",
    "pixPayerEmail": "joao@email.com",
    "pixPayerName": "João Silva",
    "amount": 50.00
  }'
```

## Próximos Passos

1. Configurar webhook do PicPay
2. Testar validação com dados reais
3. Adicionar notificações por email ao usuário
4. Criar página para acompanhar status do PIX
5. Implementar retry automático em caso de falha
