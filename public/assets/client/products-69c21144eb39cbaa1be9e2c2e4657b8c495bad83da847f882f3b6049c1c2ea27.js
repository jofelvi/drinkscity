(function() {
  $(function() {
    return $(document).on('click', '.item-product', function(evt) {
      return $(this).next().find('.btn-submit-product').trigger('click');
    });
  });

}).call(this);
