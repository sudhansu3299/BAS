var express = require('express');
var router = express.Router();
var Cart = require('../models/cart');
var Product = require('../models/product');
var Order = require('../models/order');


/* GET home page. */
router.get('/', function(req, res, next) {
	var successMsg = req.flash('success')[0];
	var products = Product.find(function(err, docs) {
		var productChunk =[];
		var chunkSize = 3;
		for (var i = 0; i < docs.length; i+= chunkSize) {
			productChunk.push(docs.slice(i, i+chunkSize));
		}
		res.render('shop/index', { title: 'Shopping Cart', products: productChunk, successMsg: successMsg, noMessage: !successMsg });
	});
});

// router.post('/',isLoggedIn, async function(req,res){
// 	var book = new Product({
// 		imagePath: '/images/book2.jpg',
// 		title: 'Harry Potter Book: Goblet of Fire',
// 		description: 'Lorem ipsum dolor sit amet, consectetur adipisicing elit. Cupiditate voluptatibus quia nobis, perspiciatis sequi tenetur repudiandae dicta iure.',
// 		price: 360
// 	})
// 	await book.save().then(item => {
// 		res.send("item saved to database");
// 		res.redirect('/');
// 	  })
// 	  .catch(err => {
// 		res.status(400).send("unable to save to database");
// 	  });
// 	console.log('hello!')
// })

router.get('/add-to-cart/:id', function(req, res, next) {
	var productId = req.params.id;
	var cart = new Cart(req.session.cart ? req.session.cart : {});

	Product.findById(productId, function(err, product){
		if(err){
			return res.redirect('/');
		}
		cart.add(product, product.id);
		req.session.cart = cart;
		res.redirect('/');
	});
});

router.get('/reduce/:id', function(req, res, next) {
	var productId = req.params.id;
	var cart = new Cart(req.session.cart ? req.session.cart : {});

	cart.reduceByOne(productId);
	req.session.cart = cart;
	res.redirect('/shopping-cart');
});

router.get('/remove/:id', function(req, res, next) {
	var productId = req.params.id;
	var cart = new Cart(req.session.cart ? req.session.cart : {});

	cart.removeItem(productId);
	req.session.cart = cart;
	res.redirect('/shopping-cart');
});

router.get('/shopping-cart', function(req, res, next) {
	if(!req.session.cart){
		return res.render('shop/shopping-cart', {products: null});
	}
	var cart = new Cart(req.session.cart);
	res.render('shop/shopping-cart', {products: cart.generateArray(), totalPrice: cart.totalPrice});
});

router.get('/checkout', isLoggedIn, function(req, res, next) {
	if(!req.session.cart){
		return res.render('shop/shopping-cart', {products: null});
	}
	var cart = new Cart(req.session.cart);
	var errMsg = req.flash('error')[0];
	res.render('shop/checkout', {total: cart.totalPrice, errMsg: errMsg, noError: !errMsg});
});

router.post('/checkout', isLoggedIn, function(req, res, next) {
	if(!req.session.cart){
		return res.render('shop/shopping-cart', {products: null});
	}
	var cart = new Cart(req.session.cart);
	var stripe = require("stripe")("sk_test_R4l9MJQPv20S0xBex5YaBTYC");

	stripe.charges.create({
		amount: cart.totalPrice * 100,
		currency: "usd",
		source: req.body.stripeToken,
		description: "Charge for Testing"

	}, function(err, charge) {
		 	if(err){
		 		req.flash('error', err.message);
		 		return res.redirect('/checkout');
		 	}
		 	var order = new Order({
		 		user: req.user,
		 		cart: cart,
		 		address: req.body.address,
		 		name: req.body.name,
		 		paymentId: charge.id
		 	});
		 	order.save(function(err, result){
		 		req.flash('success', 'Payment Successful!');
		 		req.session.cart = null;
		 		res.redirect('/');
		 	});
		});
	});

module.exports = router;

function isLoggedIn(req, res, next){
	if(req.isAuthenticated()) {
		return next();
	}
	req.session.oldUrl = req.url;
	res.redirect('/user/signin');
}