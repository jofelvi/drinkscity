$ ->
  $(document).on 'click', '.item-product', (evt) ->
    $(this).next().find('.btn-submit-product').trigger('click')