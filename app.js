
/**
 * Module dependencies.
 */
var prismic = require('prismic-nodejs');
var app = require('./config');
var configuration = require('./prismic-configuration');
var PORT = app.get('port');

function handleError(err, req, res) {
  if (err.status == 404) {
    res.status(404).send("404 not found");
  } else {
    res.status(500).send("Error 500: " + err.message);
  }
}

function render404(req, res) {
  res.status(404);
  res.render('404', {
    layoutContent: req.prismic.layoutContent
  });
}

app.listen(PORT, function() {
  console.log('Point your browser to http://localhost:' + PORT);
});

app.use((req, res, next) => {
  prismic.api(configuration.apiEndpoint,{accessToken: configuration.accessToken, req: req})
    .then((api) => {
      req.prismic = {api: api}
      res.locals.ctx = {
      endpoint: configuration.apiEndpoint,
      snipcartKey: configuration.snipcartKey,
      linkResolver: configuration.linkResolver
    }
    next()
  }).catch(function(err) {
    if (err.status == 404) {
      res.status(404).send("There was a problem connecting to your API, please check your configuration file for errors.");
    } else {
      res.status(500).send("Error 500: " + err.message);
    }
  });
})


// Query the site layout with every route 
app.route('*').get((req, res, next) => {
  req.prismic.api.getSingle("layout").then(function(layoutContent){
    
    // Give an error if no layout custom type is found
    if (!layoutContent) {
      handleError({status: 500, message: "No Layout document was found."}, req, res);
    }
    
    // Define the layout content
    req.prismic.layoutContent = layoutContent
    next()
  })
});


// For the preview functionality of prismic.io
app.route('/preview').get(function(req, res) {
  return prismic.preview(req.prismic.api, configuration.linkResolver, req, res);
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
    var relatedArray = relatedProducts ? relatedProducts.toArray() : []
    var relatedIDs = relatedArray.map((relatedProduct) => relatedProduct.getLink('link').id);
    
    //Query the related products by their IDs
    req.prismic.api.getByIDs(relatedIDs).then(function(relatedProducts) {
      
      // Render the product page
      res.render('product', {
        layoutContent: req.prismic.layoutContent,
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
      prismic.Predicates.at("document.type", "product"),
      prismic.Predicates.at("my.product.categories.link", categoryID)
      ], { orderings : '[my.product.date desc]'}
    ).then(function(products) {
      
      // Render the listing page
      res.render('listing', {
        layoutContent: req.prismic.layoutContent,
        products: products.results
      });
    });
  });
});


// Route for the homepage
app.route('/').get(function(req, res) {
  
  // Query all the products and order by their dates
  req.prismic.api.query(
    prismic.Predicates.at("document.type", "product"),
    { orderings : '[my.product.date desc]'}
  ).then(function(products) {

    // Render the listing page
    res.render('listing', {
      layoutContent: req.prismic.layoutContent,
      products: products.results
    });
  });
});


// Route that catches any other url and renders the 404 page
app.route('/:url').get(function(req, res) {
  render404(req, res);
});

