const User = require("../models/user.model");
const catchAsync = require("../utils/catchAsync");
const bcrypt = require('bcryptjs');
const generateJWT = require("../utils/jwt");
const AppError = require("../utils/appError");
const { ref, uploadBytes } = require('firebase/storage');
const { storage } = require('../utils/firebase');

/*A funtion that creates a user. */
exports.createUser = catchAsync(async (req, res, next) => {

  //1. OBTENER LA INFORMACION DE LA REQ.BODY
  const { username, email, password, role = 'user' } = req.body;

  const imgRef = ref(storage, `users/${Date.now()}-${req.file.originalname}`);
  const imgUploaded = await uploadBytes(imgRef, req.file.buffer);

  console.log(imgUploaded);
  //2. CREAR EL USUARIO CON LA INFORMACION DE LA REQ.BODY
  //1 crear una instancia de la clase user
  const user = new User({ username, email, password, role, profileImageUrl: imgUploaded.metadata.fullPath });
  console.log(user);

  //2 encriptar la contraseña
  const salt = await bcrypt.genSalt(10)
  user.password = await bcrypt.hash(password, salt);
  //3 guardar en la base de datos con las contraseñas encriptadas
  await user.save()
  //4 generar el token
  const token = await generateJWT(user.id);


  //3. ENVIAR UNA RESPUESTA AL USUARIO
  res.status(201).json({
    status: 'success',
    message: 'User created successfully',
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      pforfileImageUrl: user.profileImageUrl,
    }
  });
});

exports.login = catchAsync(async (req, res, next) => {

  const { email, password } = req.body;

  //1 verificar si existe el usuario y si el password es correcto
  const user = await User.findOne({
    where: {
      email: email.toLowerCase(),
      status: true,
    }
  })

  if (!user) {
    return new (new AppError('The user could no be found', 400))
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401))
  }

  //2 si todo está genera un token 
  const token = await generateJWT(user.id);

  res.status(200).json({
    status: 'success',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

exports.renewToken = catchAsync(async (req, res, next) => {
  const { id } = req.sessionUser;

  const token = await generateJWT(id);

  const user = await User.findOne({
    where: {
      status: true,
      id,
    }
  })

  return res.status(200).json({
    status: 'success',
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  })

})

