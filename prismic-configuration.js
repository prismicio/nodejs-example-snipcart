module.exports = {

  apiEndpoint: 'https://your-repo-name.prismic.io/api/v2',

  // -- Access token if the Master is not open
  // accessToken: 'xxxxxx',

  // OAuth
  // clientId: 'xxxxxx',
  // clientSecret: 'xxxxxx',
  
  snipcartKey: 'your-snipcart-api-key',
  
  // -- Links resolution rules
  // This function will be used to generate links to Prismic.io documents
  // As your project grows, you should update this function according to your routes
  linkResolver: function (doc) {
    if (doc.type == 'category') {
      return '/category/' + doc.uid;
    }
    if (doc.type == 'product') {
      return '/product/' + doc.uid;
    }
    return '/';
  }
};