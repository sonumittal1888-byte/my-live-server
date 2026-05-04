const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

// Public folder se files dikhane ke liye
app.use(express.static(path.join(__dirname, '../public')));

// Main route par index.html dikhao
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
