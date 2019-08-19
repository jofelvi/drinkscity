module Api
	module V1
		class OrdersController < ApplicationController

		  before_action :set_order, only: [:show, :update, :destroy, :validate_order]

		  def validate_order
				if @order.order_status_id == 3
					@order.update(order_status_id: 4)
					validator = User.find(params[:validator_id])
					@order.validator << validator
					@order.save
					render json: @order, status: :ok
				else
					json_response(status: :unprocessable_entity)
				end
		  end

			# GET /orders
			def index
				@orders = Order.all
				json_response(@orders)
			end

			# GET /orders/1
			def show
				render json: @order
			end

			# POST /orders
			def create
				@order = order.new(order_params)

				if @order.save
					render json: @order, status: :created
				else
					render json: @order.errors, status: :unprocessable_entity
				end
			end

			# PATCH/PUT /orders/1
			def update
				if @order.update(order_params)
					render json: @order
				else
					render json: @order.errors, status: :unprocessable_entity
				end
			end

			# DELETE /orders/1
			def destroy
				@order.destroy
			end

			private
				# Use callbacks to share common setup or constraints between actions.
				def set_order
					@order = Order.find(params[:id])
				end

				# Only allow a trusted parameter "white list" through.
				def order_params
					params.require(:order).permit(:id )
				end
		end
	end
end
