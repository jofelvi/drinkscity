module Api
	module V1
		class StoresController < ApplicationController
			before_action :set_store, only: [:show, :update, :destroy]

			# GET /stores
			def index
				@stores = Store.all

				render json: @stores
			end

			# GET /stores/1
			def show
				render json: @store
			end

			# POST /stores
			def create
				@store = Store.new(store_params)
				@store.users << User.find(params[:store][:user_id])

				if @store.save
					add_images
					render json: @store, status: :created
				else
					render json: @store.errors, status: :unprocessable_entity
				end
			end

			# PATCH/PUT /stores/1
			def update
				if @store.update(store_params)
					add_images
					render json: @store
				else
					render json: @store.errors, status: :unprocessable_entity
				end
			end

			# DELETE /stores/1
			def destroy
				@store.destroy
			end

			private
				# Use callbacks to share common setup or constraints between actions.
				def set_store
					@store = Store.find(params[:id])
				end

				# Only allow a trusted parameter "white list" through.
				def store_params
					params.require(:store).permit(:longitude, :latitude, :address, :description,
		        :kind,:status, :delivery, :name, :description, :rut, :phone, :email,
		        :region, :days_opened, :time_opened, :legal_agent, :legal_agent_rut, :legal_agent_phone,
		        :legal_agent_email , :logo )
				end

				def add_images
					if params[:store][:images].present?
						images = params[:store][:images]
						images.each { |cover|
							@store.images.create(cover: (cover))
						}
					end
				end
		end
	end
end
