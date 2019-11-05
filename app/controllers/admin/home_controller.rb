class Admin::HomeController < ApplicationController
  before_action :check_permission

  def index
  	if current_user.role = "admin"
  		@orders = Order&.all
  		@stores = Store&.all
  		@products = Product&.all
  		@users = User&.all
  		@events = Event&.all
  		@products_quantity = Order&.joins(:order_items)&.where(order_status_id: 4)&.sum("order_items.quantity" )

      @array = @stores&.map { |e| [e&.name, e&.products&.count]}
      @array2 = @users&.where(role: "store_admin")&.map { |e| [e&.email, e&.orders&.count]}

	 	end
  end


end
