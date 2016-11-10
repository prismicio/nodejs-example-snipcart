// On document load
$( document ).ready(function() {
  
  // Function to remove the cart count and reset the cart color
  function defaultCart() {
    $('.shopping-cart').css('background-image', 'url("../images/cart-icon.png")');
    $('.cart-count').hide();
  }
  
  // Function to show the cart count and change the color of the cart to green
  function highlightedCart() {
    $('.cart-count').show();
    $('.shopping-cart').css('background-image', 'url("../images/cart-icon-active.png")');
  }
  
  // Display custom text in the snipcart shopping cart
  Snipcart.execute('bind', 'cart.opened', function() {
    Snipcart.execute('unbind', 'cart.opened');
    
    var html = $("#cart-content-text").html();
    $(html).insertBefore($("#snipcart-footer"));
  });
  
  // If there is nothing in the cart on page load, don't display a number
  Snipcart.subscribe('cart.ready', function (data) {
    var cartCount = data.order ? data.order.items.length : 0;
    if (cartCount > 0) {
      $('.cart-count').show();
      $('.shopping-cart').css('background-image', 'url("../images/cart-icon-active.png")');
    } else {
      $('.shopping-cart').css('background-image', 'url("../images/cart-icon.png")');
    }
  });
  
  // If an item is added to the cart, set to highlighted cart
  Snipcart.subscribe('item.added', function (ev, item, items) {
    highlightedCart();
    $("html, body").animate({ scrollTop: 0 }, "slow");
    $('.added-to-cart').stop(true, false).slideDown('slow').delay(2000).slideUp('slow');
    return false;
  });
  
  // If all items are removed, set to default cart
  Snipcart.subscribe('item.removed', function (ev, item, items) {
    var cartCount = Snipcart.api.items.count();
    if (cartCount == 0) {
      defaultCart()
    }
  });
  
  // If an order is completed, set to default cart
  Snipcart.subscribe('order.completed', function (data) {
    defaultCart()
  });
});