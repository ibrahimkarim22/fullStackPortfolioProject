const express = require('express');
const mongoose = require('mongoose');
const createError = require('http-errors');
const path = require('path');
const logger = require('morgan');
const passport = require('passport');
const config = require('./config');

// const welcomeRouter = require('./screens/WelcomeScreen');
const userRouter = require('./routes/users');
const locationRouter = require('./routes/locations');
const communicationRouter = require('./routes/communication');

const url = config.MONGO_KEY;
const connect = mongoose.connect(url, {});

connect.then(
  () => console.log("Connected correctly to server"),
  (err) => console.log(err)
);

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(session({
  secret: config.SECRET_KEY,
  resave: false,
  saveUninitialized: false,
 cookie: {maxAge: 1000} 
}))

app.use(passport.initialize());

// app.use("/", welcomeRouter);
app.use('/users', userRouter);


app.use(express.static(path.join(__dirname + '/public')));

app.use('/locations', locationRouter);
app.use('/communication', communicationRouter);

app.use((req, res, next) => {
  next(createError(404));
});


// error handler
app.use((err, req, res, next) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const port = process.env.PORT || 8081;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
