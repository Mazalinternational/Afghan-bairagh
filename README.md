# Afghan Flag Management System

![Backend CI](https://github.com/Mazalinternational/AfghanFlag/workflows/Backend%20CI/badge.svg)
![Frontend CI](https://github.com/Mazalinternational/AfghanFlag/workflows/Frontend%20CI/badge.svg)

A comprehensive management system for Afghan flag printing business with inventory, orders, employees, expenses, and financial tracking.

## Features

### Core Modules
- **Inventory Management** - Track raw materials and finished products with dual stock system (Press/Home)
- **Order Management** - Create and manage customer orders with payment tracking
- **Customer Management** - Maintain customer database with ledger tracking
- **Employee Management** - Handle employee records, salaries, and advances
- **Expense Tracking** - Log and categorize business expenses
- **Purchase Management** - Track supplier purchases and payments
- **Reports & Analytics** - Generate comprehensive business reports

### Key Capabilities
- ✅ Dual stock system (Press Stock & Home Stock)
- ✅ Automatic inventory updates on orders/purchases
- ✅ Payment tracking with due/balance management
- ✅ Employee salary with advance deduction
- ✅ Bill/Invoice generation with Quality/Design Type
- ✅ Multi-language support (English/Dari)
- ✅ Role-based access control

## Tech Stack

### Backend
- Django 4.2.7
- Django REST Framework
- SQLite (Development) / PostgreSQL (Production ready)
- JWT Authentication

### Frontend
- React 18
- Tailwind CSS
- Axios
- React Router

## Quick Start

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## CI/CD

This project uses GitHub Actions for automated testing and deployment.

### Workflows
- **Backend CI** - Runs tests on every push/PR
- **Frontend CI** - Builds frontend on every push/PR
- **Deploy** - Auto-deploys to production on main branch

See [CI_CD_SETUP.md](CI_CD_SETUP.md) for detailed setup instructions.

## API Documentation

Base URL: `http://localhost:8000/api/`

### Main Endpoints
- `/api/inventory/` - Inventory management
- `/api/orders/` - Order management
- `/api/customers/` - Customer management
- `/api/employees/` - Employee management
- `/api/expenses/` - Expense tracking
- `/api/purchases/` - Purchase management

See [backend/API_REFERENCE.md](backend/API_REFERENCE.md) for complete API documentation.

## Project Structure

```
Afghan-Flag/
├── backend/              # Django backend
│   ├── core/            # Authentication & users
│   ├── inventory/       # Inventory management
│   ├── orders/          # Order management
│   ├── customers/       # Customer management
│   ├── employees/       # Employee management
│   ├── expenses/        # Expense tracking
│   └── purchases/       # Purchase management
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── context/     # React context
└── .github/             # CI/CD workflows
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

This project is proprietary software for Mazal International.

## Contact

For support or inquiries, contact the development team.
