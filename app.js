"use strict";

/**
 * Module dependencies.
 */
const Prismic = require('prismic-javascript');
const PrismicDOM = require('prismic-dom');
const app = require('./config');
const Cookies = require('cookies');
const PrismicConfig = require('./prismic-configuration');
const PORT = app.get('port');

function render404(req, res) {
  res.status(404);
  res.render('404');
}

app.listen(PORT, () => {
  process.stdout.write(`Point your browser to: http://localhost:${PORT}\n`);
});

// Middleware to inject prismic context
app.use((req, res, next) => {
  res.locals.ctx = {
    endpoint: PrismicConfig.apiEndpoint,
    snipcartKey: PrismicConfig.snipcartKey,
    linkResolver: PrismicConfig.linkResolver
  };
  // add PrismicDOM in locals to access them in templates.
  res.locals.PrismicDOM = PrismicDOM;
  Prismic.api(PrismicConfig.apiEndpoint,{ accessToken: PrismicConfig.accessToken, req: req })
  .then((api) => {
    req.prismic = { api };
    next();
  }).catch(function(err) {
    if (err.status == 404) {
      res.status(404).send('There was a problem connecting to your API, please check your configuration file for errors.');
    } else {
      res.status(500).send('Error 500: ' + err.message);
    }
  });
});


// Query the site layout with every route 
app.route('*').get((req, res, next) => {
  req.prismic.api.getSingle('layout').then(function(layoutContent){
    
    // Give an error if no layout custom type is found
    if (!layoutContent) {
      res.status(500).send('No Layout document was found.');
    }
    
    // Define the layout content
    res.locals.layoutContent = layoutContent;
    next();
  });
});


/*
 * -------------- Routes --------------
 */

/*
 * Preconfigured prismic preview
 */
app.get('/preview', (req, res) => {
  const token = req.query.token;
  if (token) {
    req.prismic.api.previewSession(token, PrismicConfig.linkResolver, '/')
    .then((url) => {
      const cookies = new Cookies(req, res);
      cookies.set(Prismic.previewCookie, token, { maxAge: 30 * 60 * 1000, path: '/', httpOnly: false });
      res.redirect(302, url);
    }).catch((err) => {
      res.status(500).send(`Error 500 in preview: ${err.message}`);
    });
  } else {
    res.send(400, 'Missing token from querystring');
  }
});

/*
 * Route for the product pages
 */
app.route('/product/:uid').get(function(req, res) {
  
  // Get the page url needed for snipcart
  var pageUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  
  // Define the UID from the url
  var uid = req.params.uid;
  
  // Query the product by its UID
  req.prismic.api.getByUID('product', uid).then(function(productContent) {
    
    // Render the 404 page if this uid is found
    if (!productContent) {
      render404(req, res);
    }
    
    // Collect all the related product IDs for this product
    var relatedProducts = productContent.data.relatedProducts;
    var relatedIDs = relatedProducts.map((relatedProduct) => {
      var link = relatedProduct.link;
      return link ? link.id : null;
    }).filter((id) => id !== null);
    
    //Query the related products by their IDs
    req.prismic.api.getByIDs(relatedIDs).then(function(relatedProducts) {
      
      // Render the product page
      res.render('product', {
        productContent: productContent,
        relatedProducts: relatedProducts,
        pageUrl: pageUrl
      });
    });
  });
});


// Route for categories
app.route('/category/:uid').get(function(req, res) {
  
  // Define the UID from the url
  var uid = req.params.uid;
  
  // Query the category by its UID
  req.prismic.api.getByUID('category', uid).then(function(category) {
    
    // Render the 404 page if this uid is found
    if (!category) {
      render404(req, res);
    }
    
    // Define the category ID 
    var categoryID = category.id;
    
    // Query all the products linked to the given category ID
    req.prismic.api.query([
        Prismic.Predicates.at('document.type', 'product'),
        Prismic.Predicates.at('my.product.categories.link', categoryID)
      ], { orderings : '[my.product.date desc]'}
    ).then(function(products) {
      
      // Render the listing page
      res.render('listing', {products: products.results});
    });
  });
});


// Route for the homepage
app.route('/').get(function(req, res) {
  
  // Query all the products and order by their dates
  req.prismic.api.query(
    Prismic.Predicates.at('document.type', 'product'),
    { orderings : '[my.product.date desc]'}
  ).then(function(products) {

    // Render the listing page
    res.render('listing', {products: products.results});
  });
});


// Route that catches any other url and renders the 404 page
app.route('/:url').get(function(req, res) {
  render404(req, res);
});

