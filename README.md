# 🏠 EasySale - Tokenized Real Estate Platform

A complete blockchain-powered real estate tokenization platform with DAO governance, rent distribution, and secondary marketplace.

## ✨ Features

- 🏢 **Property Tokenization**: Fractional ownership of real estate properties
- 💰 **Investment System**: Users invest with USD and receive ERC-1155 tokens
- 🗳️ **DAO Governance**: Token-weighted voting on property decisions
- 💵 **Rent Distribution**: Automated on-chain rent payments in USDC
- 🏪 **Secondary Marketplace**: Trade property tokens with other users
- 🔐 **Blockchain Integration**: Each user gets their own blockchain wallet
- 📊 **Portfolio Management**: Track investments and rental income

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- Node.js 16+
- Git

### One-Command Setup (Windows)

```bash
start.bat
```

### One-Command Setup (Linux/Mac)

```bash
chmod +x start.sh
./start.sh
```

This will:
1. ✅ Install all dependencies
2. ✅ Start blockchain node
3. ✅ Deploy smart contracts
4. ✅ Configure backend
5. ✅ Start API server

### Access the Platform

- **API Documentation**: http://localhost:8000/docs
- **Backend API**: http://localhost:8000
- **Blockchain RPC**: http://localhost:8545

## 📖 API Usage

### 1. Create a User

```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","full_name":"John Doe"}'
```

### 2. Create a Property

```bash
curl -X POST http://localhost:8000/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Luxury Apartment",
    "description": "Beautiful 2BR apartment",
    "location": "New York",
    "price_usd": 500000,
    "expected_annual_yield_percent": 8.5
  }'
```

### 3. Invest in Property

```bash
curl -X POST http://localhost:8000/api/investments/buy \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "property_id": 1,
    "tokens": 10000
  }'
```

### 4. View Portfolio

```bash
curl http://localhost:8000/api/portfolio/1
```

### 5. Create DAO Proposal

```bash
curl -X POST http://localhost:8000/api/dao/proposals \
  -H "Content-Type: application/json" \
  -d '{
    "property_id": 1,
    "title": "Install Solar Panels",
    "description": "Reduce energy costs by 30%",
    "proposal_type": "property_upgrade",
    "options": ["Yes", "No", "Abstain"],
    "min_quorum_percent": 10.0,
    "created_by_user_id": 1,
    "start_at": "2025-11-01T00:00:00Z",
    "end_at": "2025-12-31T23:59:59Z"
  }'
```

### 6. Vote on Proposal

```bash
curl -X POST http://localhost:8000/api/dao/proposals/1/vote \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "selected_option_index": 0
  }'
```

## 🏗️ Architecture

### Backend (FastAPI + SQLite)
- **Users**: Auto-generated blockchain wallets
- **Properties**: Each property has its own smart contract
- **Investments**: Off-chain payments, on-chain token minting
- **DAO**: Off-chain voting with on-chain token weights
- **Portfolio**: Real-time balance tracking

### Blockchain (Solidity + Hardhat)
- **PropertyFactory**: Deploys individual property contracts
- **RealEstate1155**: ERC-1155 tokens for each property
- **Marketplace**: Secondary trading with USDC
- **Rent Distribution**: Cumulative rent model in USDC

## 📁 Project Structure

```
easysale/
├── app/                      # FastAPI backend
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── services.py          # Business logic
│   ├── dao_services.py      # DAO logic
│   ├── routers/             # API endpoints
│   └── blockchain/          # Web3 integration
├── blockchain/              # Smart contracts
│   ├── contracts/          # Solidity contracts
│   ├── scripts/            # Deployment scripts
│   └── test/               # Contract tests
├── data/                   # Property data
├── start.bat              # Windows startup script
├── start.sh               # Linux/Mac startup script
├── stop.bat               # Windows stop script
└── stop.sh                # Linux/Mac stop script
```

## 🧪 Testing

### Test Marketplace (Secondary Trading)

```bash
cd blockchain
npx hardhat run scripts/test_marketplace_real_users.ts --network localhost
```

### Test Rent Distribution

```bash
cd blockchain
npx hardhat run scripts/test_rent_distribution.ts --network localhost
```

## 🛑 Stop Services

### Windows
```bash
stop.bat
```

### Linux/Mac
```bash
./stop.sh
```

## 🔧 Manual Setup

If you prefer manual setup:

### 1. Install Python Dependencies

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install Blockchain Dependencies

```bash
cd blockchain
npm install
```

### 3. Start Blockchain Node

```bash
npx hardhat node
```

### 4. Deploy Contracts (in new terminal)

```bash
cd blockchain
npx hardhat run scripts/deploy_all.ts --network localhost
```

### 5. Update .env

Copy the contract addresses from deployment output to `.env`:

```env
PROPERTY_FACTORY_ADDRESS=0x...
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
OWNER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CHAIN_ID=1337
```

### 6. Start Backend

```bash
uvicorn app.main:app --reload
```

## 🌐 Deployment

### Deploy to Base Mainnet

1. Update `hardhat.config.ts` with your private key
2. Get Base ETH for gas fees
3. Deploy:

```bash
cd blockchain
npx hardhat run scripts/deploy_all.ts --network base-mainnet
```

4. Update backend `.env` with mainnet addresses

## 📊 Key Concepts

### Tokenization
- 1 token = $1 USD at issuance
- Each property = separate ERC-1155 contract
- Users own tokens = fractional ownership

### DAO Governance
- Token-weighted voting
- Proposals for property decisions
- Quorum requirements

### Rent Distribution
- Property manager deposits USDC
- Distributed pro-rata to token holders
- Cumulative model (claim anytime)

### Secondary Marketplace
- Users list tokens for sale
- Buyers pay with USDC
- 2.5% platform fee

## 🔐 Security Notes

- **Development Only**: Default private keys are public
- **Production**: Use secure key management
- **Admin Key**: Change `ADMIN_API_KEY` in `.env`
- **User Wallets**: Stored in database (use encryption in production)

## 🤝 Contributing

This is a hackathon/demo project. Feel free to fork and extend!

## 📄 License

MIT License - See LICENSE file for details

## 🆘 Support

For issues or questions, check the API documentation at http://localhost:8000/docs

---

**Built with**: FastAPI • Solidity • Hardhat • SQLite • Web3.py • ERC-1155

**Inspired by**: Lofty.ai • RealT • Tokenized Real Estate Platforms
