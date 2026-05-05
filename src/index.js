const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 10000;

// VIP Settings (Middleware)
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => console.log("VIP Database Connected! ✅"))
.catch(err => console.log("DB Connection Error: ❌", err));

// Routes (Login/Signup check)
app.post('/signup', async (req, res) => {
    try {
        console.log("Signup Request Received:", req.body);
        res.status(201).json({ message: "User created successfully (VIP)" });
    } catch (err) {
        res.status(500).json({ message: "Signup Error" });
    }
});

app.post('/signin', async (req, res) => {
    try {
        console.log("Signin Request Received:", req.body);
        res.status(200).json({ message: "Login Successful (VIP)" });
    } catch (err) {
        res.status(500).json({ message: "Signin Error" });
    }
});

// Display Home Page
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running on port ${port} 🚀`);
});
