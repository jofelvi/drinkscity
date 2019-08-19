module Api
	module V1
		class UsersController < ApplicationController
		  #skip_before_action :authenticate_request, only: [:create]
		  before_action :set_user, only: [:show, :update, :destroy, :products]

			# GET /users
			def index
				@users = User.all
				render json: @users
			end

			# GET /users/1
			def show
				render json: @user
			end

			def get_officials
				
			end

			# GET /users/1/products
			def products
				@products = @user.products
				render json: @products
			end

			# POST /users
			def create
				@user = User.new(user_params)
				@user.stores << Store.find(params[:user][:store_id]) if params[:user][:store_id]
				if @user.save
					render json: @user, status: :created
				else
					render json: @user.errors, status: :unprocessable_entity
				end
			end

			# PATCH/PUT /users/1
			def update
				if @user.update(user_params)
					render json: @user
				else
					render json: @user.errors, status: :unprocessable_entity
				end
			end

			# DELETE /users/1
			def destroy
				@user.destroy
				json_response(status: :ok)
			end

			private
				# Use callbacks to share common setup or constraints between actions.
				def set_user
					@user = User.find(params[:id])
				end

				# Only allow a trusted parameter "white list" through.
				def user_params
					params.require(:user).permit(:fullname, :email, :password,:phone, :rut, :address, :role)
				end
		end
	end
end
