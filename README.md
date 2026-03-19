# Invoice Query Application

This project is a simple application that allows users to query invoice data. It consists of a backend built with Node.js and Express, and a frontend built with React.

## Project Structure

```
invoice-query-app
├── backend
│   ├── src
│   │   ├── controllers
│   │   │   └── invoiceController.js
│   │   ├── db
│   │   │   └── connection.js
│   │   ├── routes
│   │   │   └── invoiceRoutes.js
│   │   └── index.js
│   ├── package.json
│   └── .env
├── frontend
│   ├── public
│   │   └── index.html
│   ├── src
│   │   ├── components
│   │   │   └── InvoiceQuery.jsx
│   │   ├── App.jsx
│   │   └── index.js
│   └── package.json
└── README.md
```

## Backend Setup

1. Navigate to the `backend` directory:
   ```
   cd backend
   ```

2. Install the necessary dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the `backend` directory with the following variables:
   ```
   SQL_USER=your_username
   SQL_PASSWORD=your_password
   SQL_SERVER=your_server
   SQL_PORT=your_port
   SQL_DATABASE=your_database
   ```

4. Start the backend server:
   ```
   npm start
   ```

## Frontend Setup

1. Navigate to the `frontend` directory:
   ```
   cd frontend
   ```

2. Install the necessary dependencies:
   ```
   npm install
   ```

3. Start the frontend application:
   ```
   npm start
   ```

## Usage

- Open your browser and navigate to `http://localhost:3000` to access the application.
- Enter the invoice number in the input field and click the submit button to query the invoice data.

## License

This project is licensed under the MIT License.# buscador_fac_not_cot
