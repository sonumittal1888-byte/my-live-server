const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

// Ye line batati hai ki design 'public' folder mein hai
app.use(express.static(path.join(__dirname, 'public')));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'YOUR_MONGODB_URL_HERE')
    .then(() => console.log("DB Connected Successfully"))
    .catch(err => console.log("DB Error: ", err));

// User Schema
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}));

// Home page par design dikhao
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SIGN UP KA KAAM ---
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = new User({ name, email, password });
        await user.save();
        res.status(201).send({ message: "Account Created Successfully!" });
    } catch (e) {
        res.status(400).send({ message: "Email already exists or invalid data" });
    }
});

// --- SIGN IN KA KAAM (Ye missing tha) ---
app.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        
        if (user) {
            res.status(200).send({ message: "Login Successful!", user: { name: user.name, email: user.email } });
        } else {
            res.status(401).send({ message: "Invalid email or password" });
        }
    } catch (e) {
        res.status(500).send({ message: "Server Error" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
