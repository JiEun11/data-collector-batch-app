export default () => ({
  api: {
    port4001: {
      url: process.env.API_PORT_4001_URL || 'http://localhost:4001',
    },
    port4002: {
      url: process.env.API_PORT_4002_URL || 'http://localhost:4002',
    },
    port4003: {
      url: process.env.API_PORT_4003_URL || 'http://localhost:4003',
    },
    port4596: {
      url: process.env.API_PORT_4596_URL || 'http://localhost:4596',
    },
    timeout: parseInt(process.env.API_TIMEOUT || '5000', 10),
  },
  csv: {
    transactionPath: process.env.CSV_TRANSACTION_PATH || 'data-source/transaction.csv',
  },
});