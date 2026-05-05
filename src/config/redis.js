const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

// YEH CODE ADD KIYA HAI: Isse connection fail hone par bhi server crash nahi hoga
redis.on('error', (err) => {
    console.log('Redis connection error ignored:', err.message);
});

redis.on('connect', () => {
    console.log('Redis connected successfully!');
});

module.exports = redis;
