const cors = require('cors');

app.use(cors({
    origin: '*', // Iska matlab hai ki koi bhi frontend isse connect ho sakta hai
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
