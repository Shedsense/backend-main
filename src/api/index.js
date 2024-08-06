const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const connectDB = require('./db');
const dotenv = require('dotenv');
const zetdcRoutes = require('./routes/zetdcRoutes');
const suburbRoutes = require('./routes/suburbRoutes');
const areasNearbyRoutes = require('./routes/areasNearbyRoutes');
const loadsheddingStatusRoutes = require('./routes/loadsheddingStatusRouter');
const areaStatusRoutes = require('./routes/areaStatusRoutes');
const userRoutes = require('./routes/userRoutes');
const faultRoutes = require('./routes/faultRoutes');
const { swaggerUi, specs } = require('./swagger');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

connectDB();
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(bodyParser.json());
app.use(cors());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(
  async (username, password, done) => {
    try {
      const user = users.find(u => u.username === username);
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = users.find(u => u.id === id);
  done(null, user);
});

app.use('/api', zetdcRoutes, suburbRoutes, areasNearbyRoutes, loadsheddingStatusRoutes, faultRoutes, userRoutes, areaStatusRoutes);

const secretKey = process.env.SECRET_KEY || '95e9c82b2525897a0a707fc3b1459f002bc1e171b45372dfa60cd24fbec0d8f8';

const users = [
  {
    id: 1,
    username: 'user1',
    password: bcrypt.hashSync('password123', 10)
  }
];

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  bcrypt.compare(password, user.password, (err, isMatch) => {
    if (err || !isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, secretKey, { expiresIn: '1h' });

    console.log('Generated token:', token);

    res.json({ token });
  });
});

const waterRoutes = require('./routes/WaterRoute');

app.use('/api/water', waterRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

module.exports = app;