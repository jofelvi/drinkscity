module Api
	module V1
		class OrderItemsController < ApplicationController

			# GET /orderitems
			def index
				@order_items = OrderItem.all
				render json: @order_items
			end


		 private
		 	def order_item_params
    		params.require(:order_item).permit( )
  		end

		end
	end
end