class Client::FavoritesController < ApplicationController
	layout 'client'
	def create
		if current_user.present?
			favorite_object = Product.find(params[:favorite_id]) if params[:favorite_type]=="product"
			favorite_object = Event.find(params[:favorite_id]) if params[:favorite_type]=="event"
			favorite_object = Store.find(params[:favorite_id]) if params[:favorite_type]=="store"
			current_user.favorite favorite_object
		else
			@notice = "Debes iniciar sesion antes agregar a favoritos"
		end

	end

	def destroy
			current_user.favorites.where(favoritable_id: params[:product_id]).first.destroy if params[:product_id].present?
			current_user.favorites.where(favoritable_id: params[:event_id]).first.destroy if params[:event_id].present?
			current_user.favorites.where(favoritable_id: params[:store_id]).first.destroy if params[:store_id].present?

			redirect_to favoritos_path		
	end

	def index
		@favorited_products = current_user.favorited_products
		@favorited_events = current_user.favorited_events
		@favorited_stores = current_user.favorited_stores
	end
end
