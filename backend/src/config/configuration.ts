export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/langro',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000',
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  geminiApiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '',
  deepgramApiKey: process.env.DEEPGRAM_API_KEY || '',
  stun: {
    urls: (process.env.STUN_URLS || 'stun:stun.l.google.com:19302').split(',').map(s => s.trim()),
  },
}); 
