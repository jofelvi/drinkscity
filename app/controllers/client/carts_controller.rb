class Client::CartsController < ApplicationController
	layout 'client'
	def index
		@order_items = []
		if Order.count > 0
			@order_items = current_order.order_items
		end
	end

	def show
		@order_items = current_order.order_items
	end
end
