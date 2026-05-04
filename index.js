const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

// Aapki HTML files 'public' folder mein hain, ye line unhe connect karti hai
app.use(express.static(path.join(__dirname, 'public')));

// --- DATABASE CONNECTION ---
// Maine saksham123 password yahan daal diya hai
const dbURI = "mongodb+srv://TaraJain:saksham123@testing.hkwgfv3.mongodb.net/?appName=Testing";

mongoose.connect(dbURI)
    .then(() => console.log("MongoDB Connected Successfully!"))
    .catch(err => console.log("DB Connection Error: ", err));

// User Data structure
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}));

// Home page load karne ke liye
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- SIGN UP API (Naya account banane ke liye) ---
app.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = new User({ name, email, password });
        await user.save();
        res.status(201).send({ message: "Account Created!" });
    } catch (e) {
        res.status(400).send({ message: "Email already exists!" });
    }
});

// --- SIGN IN API (Login karne ke liye) ---
app.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        
        if (user) {
            res.status(200).send({ message: "Welcome back!", user: { name: user.name } });
        } else {
            res.status(401).send({ message: "Invalid email or password" });
        }
    } catch (e) {
        res.status(500).send({ message: "Server Error" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
