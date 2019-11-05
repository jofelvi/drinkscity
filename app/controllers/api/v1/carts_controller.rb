module Api
	module V1
		class CartsController < ApplicationController
		  def show
		  	@order_items = current_order&.order_items
		    json_response(@order_items)
		  end
		end
	end
end
