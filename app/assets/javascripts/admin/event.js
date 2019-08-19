$( document ).ready(function() {

  $('#user_select').change(function(){
    $.ajax({
      url: '/admin/stores_list',
      type: 'GET',
      data: { user_id: $(this).val() }
    });
  });

  $('#store_id').change(function(){
    console.log($(this).val());
    $.ajax({
      url: '/admin/products_list',
      type: 'GET',
      data: { store_id: $(this).val() }
    });
  });

  $("#checkTodos").change(function () {
    $("input:checkbox").prop('checked', $(this).prop("checked"));
  });

  $("#save_event").click(function(){
    var chkArray = [];
    var stkArray = [];
    $(".chk:checked").each(function(){
      chkArray.push($(this).val());
      stkArray.push($(this).closest('tr').find('#stock_event').val());
    });

    $("#product_ids").val(chkArray);
    $("#product_stk").val(stkArray);
  });
  
});