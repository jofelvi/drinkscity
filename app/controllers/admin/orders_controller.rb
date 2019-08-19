class Admin::OrdersController < ApplicationController

  def index

  	if params[:store].present?
  		@orders = Store.find_by(name: params[:store]).orders
  	else
  		@orders = Order.all
  	end

  	@orders = params[:status].present? ? @orders.where(order_status_id: params[:status]) : @orders

    @stores_availables = Store.all.map { |e| e.name  }
    
    @orders = @orders.where('created_at >= ?', params[:from].to_datetime) if params[:from].present?
    @orders = @orders.where('created_at < ?', params[:to].to_datetime) if params[:to].present?
    @status = params[:status]
    @store = params[:store]
    @from = params[:from]
    @to = params[:to]

  end

  def show

  end

end