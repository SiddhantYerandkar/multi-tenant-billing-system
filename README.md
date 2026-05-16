# Multi-Tenant Billing Platform

A comprehensive, feature-rich desktop billing and accounting application built for album design companies and small-to-medium businesses. This enterprise-grade platform provides complete financial management capabilities with an intuitive user interface.

## 🌟 Key Features

### 📊 Financial Management
- **Invoicing System**: Create, manage, and track professional invoices with PDF export
- **Payment Tracking**: Record and monitor all payments with comprehensive payment history
- **Expense Management**: Track business expenses with detailed categorization
- **Profit & Loss Reports**: Real-time P&L analysis with visual insights
- **Ledger Management**: Maintain complete financial ledgers for parties and suppliers
- **Outstanding Reports**: Track pending payments and outstanding balances

### 💼 Business Operations
- **Job Management**: Create and track jobs with detailed job specifications and timelines
- **Order Management**: Manage customer orders through complete order lifecycle
- **Purchase Orders**: Handle supplier purchases and track order status
- **Product Inventory**: Manage products and dynamic pricing strategies
- **Party Management**: Comprehensive customer/party database with import capabilities
- **Supplier Management**: Track suppliers and maintain supplier relationships

### 📈 Advanced Features
- **Dynamic Pricing**: Configure and apply dynamic pricing based on rules and conditions
- **Receipt Generation**: Generate professional receipts with customizable templates
- **Multi-Tenant Support**: Isolated company instances with company-specific data
- **Authentication**: Secure user authentication and authorization
- **Data Import/Export**: Bulk import parties from Excel, export reports to Excel
- **PDF Export**: Generate PDF invoices and receipts directly from the application

### 🎨 User Interface
- **Responsive Dashboard**: Clean, modern interface with Tailwind CSS
- **Modal-Based Workflows**: Intuitive modal dialogs for all operations
- **Real-time Summary Views**: Quick overview of payments, ledgers, and reports
- **Professional Templates**: Customizable invoice and receipt templates
- **Dark Mode Ready**: Tailwind CSS foundation supports theme customization

## 🛠️ Tech Stack

### Frontend
- **React 19.2**: Modern JavaScript UI library
- **Vite 7.2**: Lightning-fast build tool and dev server
- **Tailwind CSS 4.1**: Utility-first CSS framework
- **JavaScript (JSX)**: Modern JavaScript with JSX syntax

### Desktop
- **Electron**: Cross-platform desktop application framework
- **PDF Generation**: Native PDF generation through Electron's webContents API

### Backend
- **Node.js**: JavaScript runtime for server-side development
- **Express.js**: Fast, unopinionated web framework
- **PostgreSQL**: Relational database (via Docker)
- **Cloudinary**: Image storage and management

### Development Tools
- **ESLint**: Code quality and linting
- **PostCSS**: CSS transformation and optimization
- **html2pdf.js**: HTML to PDF conversion library
- **XLSX**: Excel file reading/writing support

## 📁 Project Structure

```
raspberrypi/
├── backend/                     # Node.js/Express backend
│   ├── Dockerfile              # Docker configuration for backend
│   ├── init.sql                # Database schema initialization
│   ├── package.json            # Backend dependencies
│   └── src/
│   │   ├── server.js           # Express server entry point
│   │   ├── config/
│   │   │   ├── db.js           # Database configuration
│   │   │   └── cloudinary.js   # Cloudinary configuration
│   │   ├── middlewares/
│   │   │   ├── auth.js         # Authentication middleware
│   │   │   └── upload.js       # File upload middleware
│   │   ├── modules/            # Feature modules (MVC pattern)
│   │   │   ├── auth/           # Authentication
│   │   │   │   ├── auth.controller.js
│   │   │   │   ├── auth.route.js
│   │   │   │   └── auth.service.js
│   │   │   ├── companies/      # Company management
│   │   │   ├── designers/      # Designer management
│   │   │   ├── designingJobs/  # Design job management
│   │   │   ├── dynamicpricing/ # Dynamic pricing
│   │   │   ├── orders/         # Order management
│   │   │   ├── parties/        # Customer/party management
│   │   │   └── products/       # Product inventory
│   │   └── utils/
│   │       └── generateToken.js # JWT token generation
│   └── [more backend files]
├── frontend/                    # Frontend application
│   ├── electron/               # Electron main process
│   │   ├── main.js            # Electron entry point
│   │   └── preload.js         # Preload scripts for IPC
│   ├── frontend/              # React application
│   │   ├── src/
│   │   │   ├── components/    # Reusable React components
│   │   │   │   ├── AddPartyModal.jsx
│   │   │   │   ├── CreateOrderModal.jsx
│   │   │   │   ├── CreateProductModal.jsx
│   │   │   │   ├── DesignerModal.jsx
│   │   │   │   ├── InvoiceModal.jsx
│   │   │   │   └── [more components]
│   │   │   ├── pages/         # Page components
│   │   │   │   ├── CompanySetup.jsx
│   │   │   │   ├── Designer.jsx
│   │   │   │   ├── Designing.jsx
│   │   │   │   ├── DynamicPricing.jsx
│   │   │   │   ├── Invoices.jsx
│   │   │   │   ├── Orders.jsx
│   │   │   │   ├── Parties.jsx
│   │   │   │   ├── Products.jsx
│   │   │   │   ├── Settings.jsx
│   │   │   │   └── [more pages]
│   │   │   ├── services/      # API services & business logic
│   │   │   │   ├── authService.js
│   │   │   │   ├── companyService.js
│   │   │   │   ├── dbService.js
│   │   │   │   └── [more services]
│   │   │   ├── assets/        # Static assets
│   │   │   │   ├── invoice-template.html
│   │   │   │   └── old-invoice-template.html
│   │   │   ├── template/      # Template files
│   │   │   ├── utils/         # Utility functions
│   │   │   ├── App.jsx        # Root component
│   │   │   ├── App.css        # App styles
│   │   │   ├── main.jsx       # React entry point
│   │   │   └── index.css      # Global styles
│   │   ├── public/            # Static files
│   │   ├── package.json
│   │   ├── vite.config.js     # Vite configuration
│   │   ├── tailwind.config.js # Tailwind CSS configuration
│   │   ├── postcss.config.js  # PostCSS configuration
│   │   ├── eslint.config.js   # ESLint configuration
│   │   └── index.html         # HTML entry point
│   └── package.json           # Frontend root dependencies
├── docker-compose.yml         # Docker Compose configuration
├── README.md                  # This file
└── [other config files]
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 16.x or higher
- **npm** or **yarn** package manager
- **Git** for version control

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd billing-software
```

2. **Install root dependencies**
```bash
npm install
```

3. **Install frontend dependencies**
```bash
npm install --prefix frontend
```

4. **Set up environment variables**

Create a `.env` file in the backend directory with your database and service configuration:
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=billing_db
JWT_SECRET=your-secret-key
CLOUDINARY_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Development

**Start the development environment** (Backend + Frontend + Electron):
```bash
# Start the backend server (from backend directory)
cd backend
npm install
npm start

# In another terminal, start the frontend (Electron + Vite dev server)
npm run dev
```

This will:
- Start the Node.js backend server on `http://localhost:3000` (or configured port)
- Start the Vite dev server on `http://localhost:5173`
- Automatically launch the Electron app
- Open DevTools for debugging

**Development on frontend only** (React with Vite):
```bash
npm run dev --prefix frontend
```

The app will be available at `http://localhost:5173`

### Building

**Build the application** (Windows):
```bash
npm run build:win
```

**Build without signing**:
```bash
npm run build:no-sign
```

**Build as directory** (for testing):
```bash
npm run build:dir
```

**Clean build** (remove previous build artifacts):
```bash
npm run build:clean
```

The built application will be in the `release/` directory.

### Linting

Check code quality:
```bash
npm run lint --prefix frontend
```

## 🔑 Core Features Explained

### Authentication & Multi-Tenancy
- Users create an account and log in via the authentication service
- Upon login, the application checks for associated companies
- New users complete company setup before accessing the dashboard
- Each company maintains isolated data and financial records

### Invoicing Workflow
1. Create products and define pricing
2. Create jobs or orders for customers
3. Generate invoices from jobs/orders
4. Customize invoice templates
5. Export invoices as PDF
6. Track payment status

### Payment Management
1. Record customer payments against invoices
2. Adjust or reverse payments if needed
3. Track payment history and reconciliation
4. Monitor outstanding balances
5. Generate payment reports

### Financial Reporting
- **Ledger Reports**: Daily, monthly transactions for parties and suppliers
- **Profit & Loss**: Revenue vs. expenses analysis
- **Outstanding Report**: Pending customer and supplier payments
- **Expense Tracking**: Categorized business expenses
- **Excel Export**: All reports exportable to Excel for further analysis

### Dynamic Pricing
Configure pricing rules based on:
- Product categories
- Customer types
- Order volume
- Custom conditions

## 📊 Database Schema (PostgreSQL)

The application uses PostgreSQL with the following main tables:
- **companies**: Company/tenant information
- **users**: User accounts and authentication
- **invoices**: Invoice records
- **payments**: Payment transactions
- **jobs**: Job records
- **orders**: Customer orders
- **products**: Product inventory
- **parties**: Customers/clients
- **designers**: Designer information
- **expenses**: Business expenses
- **dynamic_pricing**: Pricing rules and configurations

The database is initialized via `backend/init.sql` during Docker setup.

## 🔐 Security

- **Authentication**: JWT-based authentication with secure token generation
- **Context Isolation**: Electron context isolation enabled for safety
- **Environment Variables**: Sensitive credentials stored in `.env`
- **IPC Security**: Secure Inter-Process Communication in Electron
- **Data Isolation**: Multi-tenant data isolation at the database level

## 📦 Version

Current Version: **1.0.0**

The application is built as:
- **App ID**: `com.billing.software`
- **Product Name**: Billing Software
- **Target Platform**: Windows (x64)

## 🐛 Troubleshooting

### Dev Server Won't Start
```bash
# Clear cache and reinstall
rm -r node_modules frontend/node_modules
npm install
npm install --prefix frontend
npm run dev
```

### Electron Window Won't Open
- Ensure port 5173 is available (Vite dev server)
- Check that the Vite dev server started successfully
- Verify `wait-on` package is installed

### PDF Generation Fails
- Ensure html2pdf.js is properly configured
- Check that the template HTML is valid
- Verify file write permissions to Documents folder

### Build Issues
- Use `npm run build:no-sign` if code signing fails
- Clear the release directory before rebuilding
- Verify all environment variables are set

## 📝 Docker Setup

The application uses Docker Compose to run the PostgreSQL database and backend service:

```bash
# Start services with Docker Compose
docker-compose up -d

# This will:
# - Start PostgreSQL database
# - Initialize the database schema from init.sql
# - Make the database available on localhost:5432
```

## 📝 Backend API

The backend provides RESTful API endpoints for:
- Authentication (login, registration)
- Company management
- Invoice operations
- Payment tracking
- Order management
- Product inventory
- Party/customer management
- Designer management
- Expense tracking
- Dynamic pricing

API documentation available at `http://localhost:3000/api/docs` (when backend is running)

## 📝 PDF Export

- PDFs are saved to user's Documents folder
- Can be customized in `electron/main.js`

## 🎯 Future Enhancements

Potential features for future releases:
- Multi-language support
- Cloud sync capabilities
- Mobile app companion
- Advanced analytics dashboard
- Automated invoice reminders
- Email integration for invoices
- Multi-platform builds (macOS, Linux)
- Dark mode theme
- Batch operations and bulk imports
- Workflow automation

## 📄 License

This project is licensed under the ISC License. See the LICENSE file for details.

## 👨‍💼 Support

For issues, questions, or feature requests, please:
1. Check the troubleshooting section
2. Review the code documentation
3. Contact the development team

## 📞 Project Information

- **Built for**: Album Designer Companies & Small Business Accounting
- **Type**: Desktop Application (Electron)
- **Architecture**: Desktop (Electron) + React Frontend + Node.js/Express Backend + PostgreSQL
- **Status**: Production Ready (v1.0.0)

---

**Last Updated**: March 2026  
**Maintained By**: Development Team
