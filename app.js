
/**
 * Module dependencies.
 */
var prismic = require('prismic-nodejs');
var app = require('./config');
var configuration = require('./prismic-configuration');
var PORT = app.get('port');

// Returns a Promise
function api(req, res) {
  // So we can use this information in the views
  res.locals.ctx = {
    endpoint: configuration.apiEndpoint,
    snipcartKey: configuration.snipcartKey,
    linkResolver: configuration.linkResolver
  };
  return prismic.api(configuration.apiEndpoint, {
    accessToken: configuration.accessToken,
    req: req
  });
}

function handleError(err, req, res) {
  if (err.status == 404) {
    res.status(404).send("404 not found");
  } else {
    res.status(500).send("Error 500: " + err.message);
  }
}

app.listen(PORT, function() {
  console.log('Express server listening on port ' + PORT);
});


// For the preview functionality of prismic.io
app.route('/preview').get(function(req, res) {
  api(req, res).then(function(api) {
    return prismic.preview(api, configuration.linkResolver, req, res);
  }).catch(function(err) {
    handleError(err, req, res);
  });
});


// Route for the product pages
app.route('/product/:uid').get(function(req, res) {
  
  // Get the page url needed for snipcart
  var pageUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  
  // Define the UID from the url
  var uid = req.params.uid;
  api(req, res).then(function(api) {
    
    // Query the layout
    api.getSingle("layout").then(function(layoutContent) {
      
      // Query the product by its UID
      api.getByUID('product', uid).then(function(productContent) {
        
        // Collect all the related product IDs for this product
        var relatedIDs = Array();
        var relatedProducts = productContent.getGroup('product.relatedProducts');
        var relatedArray = relatedProducts ? relatedProducts.toArray() : null
        if (relatedArray) {
          relatedArray.forEach(function(relatedProduct){
            relatedIDs.push( relatedProduct.getLink('link').id );
          })
        }
        
        //Query the related products by their IDs
        api.getByIDs(relatedIDs).then(function(relatedProducts) {
          
          // Render the product page
          res.render('product', {
            layoutContent: layoutContent,
            productContent: productContent,
            relatedProducts: relatedProducts,
            pageUrl: pageUrl
          });
          
        // Catch and handle query errors
        }).catch(function(err) {
          handleError(err, req, res);
        });
      }).catch(function(err) {
        handleError(err, req, res);
      });
    }).catch(function(err) {
      handleError(err, req, res);
    });
  });
});


// Route for categories
app.route('/category/:uid').get(function(req, res) {
  
  // Define the UID from the url
  var uid = req.params.uid;
  api(req, res).then(function(api) {
    
    // Query the layout
    api.getSingle("layout").then(function(layoutContent) {
      
      // Query the category by its UID
      api.getByUID('category', uid).then(function(category) {
        
        // Collect all the product IDs in the category
        var productIDs = Array();
        var products = category.getGroup('category.products').toArray();
        products.forEach(function(product){
          if ( product.getLink('link') ) {
            productIDs.push( product.getLink('link').id );
          }
        })
        
        //Query the products by their IDs
        api.getByIDs( productIDs, { orderings : '[my.product.date desc]' } ).then(function(products) {
          
          // Render the listing page
          res.render('listing', {
            layoutContent: layoutContent,
            products: products.results
          });
          
        // Catch and handle query errors
        }).catch(function(err) {
          handleError(err, req, res);
        });
      }).catch(function(err) {
        handleError(err, req, res);
      });
    }).catch(function(err) {
      handleError(err, req, res);
    });
  });
});


// Route for the homepage
app.route('/').get(function(req, res) {
  api(req, res).then(function(api) {
    
    // Query the layout
    api.getSingle("layout").then(function(layoutContent) {
      
      // Query all the products and order by their dates
      api.query(
        prismic.Predicates.at("document.type", "product"),
        { orderings : '[my.product.date desc]'}
      ).then(function(products) {
        
        // Render the listing page
        res.render('listing', {
          layoutContent: layoutContent,
          products: products.results
        });
        
      // Catch and handle query errors
      }).catch(function(err) {
        handleError(err, req, res);
      });
    }).catch(function(err) {
      handleError(err, req, res);
    });
  });
});


