const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("DB Connected"))
  .catch(err => console.log("DB Error:", err));

const User = mongoose.model('User', new mongoose.Schema({
  email: { type: String, unique: true },
  password: String
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/signup', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).send({ message: "Account Ban Gaya!" });
  } catch (e) { res.status(400).send({ error: "Email already exists" }); }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password });
  if (user) res.send({ message: "Welcome!" });
  else res.status(400).send({ error: "Details Galat Hain!" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
