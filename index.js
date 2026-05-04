const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middlewares
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Ho Gaya!'))
  .catch(err => console.log('❌ DB Error:', err));

// Routes
app.use('/api/auth', require('./src/routes/auth'));

app.get('/', (req, res) => {
  res.send('<h1>Live Streaming Server Running...</h1>');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server chalu hai port ${PORT} par`);
});
