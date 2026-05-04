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
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("DB Connected"))
  .catch(err => console.log("DB Error:", err));

const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true },
  password: String
}));

// Home page par design dikhao
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sign Up ka kaam
app.post('/signup', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send({ message: "Account Ban Gaya!" });
  } catch (e) { 
    res.status(400).send({ error: "Email pehle se hai!" }); 
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server Running on " + PORT));
