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

### Backend & Services
- **Appwrite**: Open-source backend-as-a-service for authentication and database
- **Supabase**: PostgreSQL-based database alternative

### Development Tools
- **ESLint**: Code quality and linting
- **PostCSS**: CSS transformation and optimization
- **html2pdf.js**: HTML to PDF conversion library
- **XLSX**: Excel file reading/writing support

## 📁 Project Structure

```
billing-software/
├── electron/                    # Electron main process
│   ├── main.js                 # Electron entry point
│   └── preload.js              # Preload scripts for IPC
├── frontend/                   # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable React components
│   │   │   ├── AddJobModal.jsx
│   │   │   ├── CreateInvoiceModal.jsx
│   │   │   ├── PaymentModal.jsx
│   │   │   ├── LedgerTable.jsx
│   │   │   └── [30+ more components]
│   │   ├── pages/              # Page components
│   │   │   ├── Invoices.jsx    # Invoice management
│   │   │   ├── Jobs.jsx        # Job management
│   │   │   ├── Parties.jsx     # Customer management
│   │   │   ├── Suppliers.jsx   # Supplier management
│   │   │   ├── Payments.jsx    # Payment tracking
│   │   │   ├── Orders.jsx      # Order management
│   │   │   ├── Products.jsx    # Product inventory
│   │   │   ├── Reports.jsx     # Financial reports
│   │   │   ├── ProfitLoss.jsx  # P&L analysis
│   │   │   ├── Expenses.jsx    # Expense tracking
│   │   │   └── [more pages]
│   │   ├── services/           # Business logic & API calls
│   │   │   ├── authService.js       # Authentication
│   │   │   ├── invoiceService.js    # Invoice operations
│   │   │   ├── paymentService.js    # Payment operations
│   │   │   ├── jobService.js        # Job management
│   │   │   ├── orderService.js      # Order management
│   │   │   ├── partyService.js      # Party/Customer management
│   │   │   ├── productService.js    # Product management
│   │   │   ├── expenseService.js    # Expense tracking
│   │   │   ├── ledgerService.js     # Ledger management
│   │   │   ├── profitLossService.js # P&L calculations
│   │   │   └── [more services]
│   │   ├── assets/             # Static assets
│   │   │   └── invoice-template.html
│   │   ├── App.jsx             # Root component
│   │   ├── main.jsx            # React entry point
│   │   └── index.css           # Global styles
│   ├── public/                 # Static files
│   ├── package.json
│   ├── vite.config.js          # Vite configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   ├── postcss.config.js       # PostCSS configuration
│   └── eslint.config.js        # ESLint configuration
├── release/                    # Built application releases
├── package.json               # Root package configuration
└── README.md                  # This file
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

Create a `.env` file in the frontend directory with your Appwrite configuration:
```env
VITE_APPWRITE_ENDPOINT=https://your-appwrite-endpoint
VITE_APPWRITE_PROJECT_ID=your-project-id
VITE_APPWRITE_API_KEY=your-api-key
```

### Development

**Start the development environment** (Electron + Vite dev server):
```bash
npm run dev
```

This command will:
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

## 📊 Database Schema (Appwrite)

The application uses Appwrite with the following main collections:
- **companies**: Company/tenant information
- **invoices**: Invoice records
- **payments**: Payment transactions
- **jobs**: Job records
- **orders**: Customer orders
- **products**: Product inventory
- **parties**: Customers/clients
- **suppliers**: Vendor information
- **expenses**: Business expenses
- **ledger**: Financial ledger entries

## 🔐 Security

- **Authentication**: Secure authentication via Appwrite
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

## 📝 Environment Configuration

### Appwrite Setup
1. Set up an Appwrite instance (self-hosted or cloud)
2. Create a new project
3. Create the required collections and indexes
4. Generate an API key for your application
5. Update `.env` with your credentials

### PDF Export Path
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
- **Architecture**: Desktop + React Frontend + Appwrite Backend
- **Status**: Production Ready (v1.0.0)

---

**Last Updated**: March 2026  
**Maintained By**: Development Team
