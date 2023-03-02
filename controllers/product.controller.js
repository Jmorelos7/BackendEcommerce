const Product = require('../models/product.model');
const catchAsync = require('../utils/catchAsync');
const { ref, uploadBytes } = require('firebase/storage');
const { storage } = require('../utils/firebase');
const ProductImgs = require('../models/productImgs.model');


exports.findProducts = catchAsync(async (req, res, next) => {
  const products = await Product.findAll({
    where: {
      status: true,
    },
    include: [
      {
        model: ProductImgs,
      },
    ],
  });

  const productPromises = products.map(async product => {
    const productImgsPromises = product.productImgs.map(async productImg => {
      const imgRef = ref(storage, productImg.imgUrl);
      const url = await getDownloadURL(imgRef);

      productImg.imgUrl = url;
      return productImg;
    });
    await Promise.all(productImgsPromises);
  });

  await Promise.all(productPromises);

  res.status(200).json({
    status: 'success',
    message: 'The products found were successfully',
    products,
  });
});

exports.findProduct = catchAsync(async (req, res, next) => {
  const { product } = req;

  const productImgsPromises = product.productImgs.map(async productImg => {
    const imgRef = ref(storage, productImg.imgUrl);
    const url = await getDownloadURL(imgRef);

    productImg.imgUrl = url;
    return productImg;
  });

  // console.log(productImgsPromises);

  await Promise.all(productImgsPromises);

  return res.status(200).json({
    status: 'success',
    message: 'The product was found successfully',
    product,
  });
});


exports.createProduct = catchAsync(async (req, res, next) => {
  // 1. OBTENER LA INFORMACION A GUARDAR DE LA REQ.BODY
  const { title, description, quantity, price, categoryId, userId } = req.body;

  console.log(req.files)
  const newProduct = await Product.create({
    title: title.toLowerCase(),
    description: description.toLowerCase(),
    quantity,
    price,
    categoryId,
    userId,
  });

  const productImgsPromises = req.files.map(async file => {
    const imgRef = ref(storage, `products/${Date.now()}-${file.originalname}`);
    const imgUploaded = await uploadBytes(imgRef, file.buffer);

    return await ProductImgs.create({
      imgUrl: imgUploaded.metadata.fullPath,
      productId: newProduct.id,
    })
  })

  await Promise.all(productImgsPromises);

  res.status(201).json({
    status: 'success',
    message: 'The product was created successfully',
    newProduct,
  });
});


exports.updateProduct = catchAsync(async (req, res, next) => {
  //1. OBTENGO MI ID DE LA REQ.PARAMS
  const { product } = req.params;
  //2. OBTENER LA INFORMACION A ACTUALIZAR DE LA REQ.BODY
  const { title, description, quantity, price } = req.body;

  //5. SI TODO SALIO BIEN, ACTUALIZAMOS EL PRODUCTO ENCONTRADO
  const updatedProduct = await product.update({

    title,
    description,
    quantity,
    price,
  });
  //6. ENVIO LA RESPUESTA AL CLIENTE
  res.status(200).json({
    status: 'success',
    message: 'Then product has been updated successfully',
    updatedProduct,
  });
});

exports.deleteProduct = catchAsync(async (req, res, next) => {
  const { product } = req


  //4. ACTUALIZAR EL ESTADO DEL PRODUCTO A FALSE
  await product.update({ status: false });
  //await product.destroy();

  //5. ENVIAR LA RESPUESTA AL CLIENTE

  res.status(200).json({
    status: 'success',
    message: 'The product has been deleted successfully',
  });
});
