# P331 Platform API Documentation

## Base URL

- Development: `http://localhost:3001/api`
- Production: `https://telegram-platform.eventyr.cloud/api`

## Authentication

All protected endpoints require a Telegram WebApp init data header:

```
X-Telegram-Init-Data: <initData from Telegram.WebApp>
```

## Endpoints

### Health Check

```
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T10:00:00.000Z"
}
```

### Games

#### List All Games

```
GET /games
```

Response:
```json
{
  "games": [
    {
      "id": "cuid",
      "slug": "mahjong-dash",
      "title": "Mahjong Dash",
      "description": "Match tiles...",
      "thumbnail": "/games/mahjong3/...",
      "category": "Puzzle",
      "featured": true
    }
  ]
}
```

#### Get Featured Game

```
GET /games/featured
```

#### Get Game by Slug

```
GET /games/:slug
```

### Users (Protected)

#### Get Balance

```
GET /users/me/balance
```

Response:
```json
{
  "telegramId": 123456789,
  "walletAddress": "UQ...",
  "balance": 100
}
```

#### Add Coins

```
POST /users/me/add-coins
Content-Type: application/json

{
  "amount": 100,
  "transactionHash": "optional-ton-tx-hash"
}
```

#### Deduct Coins

```
POST /users/me/deduct-coins
Content-Type: application/json

{
  "amount": 10
}
```

## Error Responses

```json
{
  "error": "Error message",
  "details": [...]  // Optional validation details
}
```

### Status Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
