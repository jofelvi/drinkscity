module Api
	module V1
		class ProductsController < ApplicationController

		  before_action :set_product, only: [:show, :update, :destroy]

			# GET /products
			def index
				@products = Product.all
				render json: @products
			end

			# GET /products/1
			def show
				render json: @product
			end

			# POST /products
			def create
				@product = Product.new(product_params)

				if @product.save
					render json: @product, status: :created
				else
					render json: @product.errors, status: :unprocessable_entity
				end
			rescue StandardError => e
				Airbrake.notify(e)
			end

			# PATCH/PUT /products/1
			def update
				if @product.update(product_params)
					render json: @product
				else
					render json: @product.errors, status: :unprocessable_entity
				end
			rescue StandardError => e
				Airbrake.notify(e)
			end

			# DELETE /products/1
			def destroy
				@product.destroy
			rescue StandardError => e
				Airbrake.notify(e)
			end

			private
				# Use callbacks to share common setup or constraints between actions.
				def set_product
					@product = Product.find(params[:id])
				end

				# Only allow a trusted parameter "white list" through.
				def product_params
					params.require(:product).permit(:item_id, :image, :item_type, :user_id, :name, :price, :active, :category, :priority, :description, :start_datetime, :end_datetime, :stock)
				end
		end
	end
end
