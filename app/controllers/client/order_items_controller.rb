class Client::OrderItemsController < ApplicationController
  before_action :set_order
  before_action :set_order_item, only: [:update, :destroy]

  def create
    if current_order.order_items.any?
			if current_order.order_items.first.item_type == 'Product'
				if current_order.order_items.first.item.item == Product.find(params[:order_item][:item_id]).item
					create_order_item
				else
					@error_in_order = true
				end
			elsif current_order.order_items.first.item_type == 'Ticket'
				if current_order.order_items.first.item.event.store == Product.find(params[:order_item][:item_id]).item
					create_order_item
				else
					@error_in_order = true
				end
			end
		else
			create_order_item
		end
	end

	def update
		@order_item.update_attributes(order_item_params)
		@order_items = @order.order_items
	end

      #if current_order.order_items.first.item_type == 'Product'
      #  if current_order.order_items.first.item.item == Product.find(params[:order_item][:item_id]).item
      #    create_order_item
      #  else
      #    @error_in_order = true
      #  end
      #elsif current_order.order_items.first.item_type == 'Ticket'
      #  if current_order.order_items.first.item.event.store == Product.find(params[:order_item][:item_id]).item
      #    create_order_item
      #  else
      #    @error_in_order = true
      #  end
      #end
    #else
    #  create_order_item
    #end
  #end

  def update
    @order_item.update_attributes(order_item_params)
    @order_items = @order.order_items
  end

  def destroy
    @order_item.destroy
    @order_items = @order.order_items
  end

  def modify_quantity
    @order_item = OrderItem.find(params[:order_item][:id])
    if params[:add]
      @order_item.quantity = @order_item.quantity + 1
    else
      @order_item.quantity = @order_item.quantity - 1
    end
    @order_item.save
    redirect_to cart_index_path
  end

  private
    def order_item_params
      params.require(:order_item).permit(:quantity, :item_id, :item_type)
    end

    def set_order_item
      @order_item = @order.order_items.find(params[:id])
    end

    def set_order
      @order = current_order
    end

    def create_order_item
      @order_item = @order.order_items.build(order_item_params)
      update_quantity
      session[:order_id] = @order.id
    end

    def update_quantity
      item = @order.order_items.where(item_id: @order_item.item_id).first
      if !item.nil?
        item.increment(:quantity, by = 1)
        item.save
      else
        @order.user = current_user if current_user
        @order.save
      end
    end
end
