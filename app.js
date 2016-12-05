
/**
 * Module dependencies.
 */
var Prismic = require('prismic-nodejs');
var app = require('./config');
var PORT = app.get('port');
var PConfig = require('./prismic-configuration');

function render404(req, res) {
  res.status(404);
  res.render('404');
}

app.listen(PORT, function() {
  console.log('Point your browser to http://localhost:' + PORT);
});

app.use((req, res, next) => {
  Prismic.api(PConfig.apiEndpoint,{accessToken: PConfig.accessToken, req: req})
  .then((api) => {
    req.prismic = {api: api};
    res.locals.ctx = {
      endpoint: PConfig.apiEndpoint,
      snipcartKey: PConfig.snipcartKey,
      linkResolver: PConfig.linkResolver
    };
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


// For the preview functionality of prismic.io
app.route('/preview').get(function(req, res) {
  return Prismic.preview(req.prismic.api, PConfig.linkResolver, req, res);
});


// Route for the product pages
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
    var relatedProducts = productContent.getGroup('product.relatedProducts');
    var relatedArray = relatedProducts ? relatedProducts.toArray() : [];
    var relatedIDs = relatedArray.map((relatedProduct) => {
      var link = relatedProduct.getLink('link');
      return link ? link.id : null;
    }).filter((id) => id != null);
    
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

