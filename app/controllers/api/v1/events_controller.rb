module Api
	module V1
		class EventsController < ApplicationController

		  before_action :set_event, only: [:show, :update, :destroy]

			# GET /events
			def index
				@events = Event.all
				render json: @events
			end

			def eventforuser
				@user = User.find(params[:id])
				render json: @user.events
			end

			# GET /events/1
			def show
				render json: @event
			end

			# POST /events
			def create
				@event = Event.new(event_params)
				ticket = @event.tickets
				ticket.first.users << User.where(id: params[:event][:tickets_attributes][0][:users]) if params[:event][:tickets_attributes][0][:users]
				if @event.save
					add_images
					render json: @event, status: :created
				else
					render json: @event.errors, status: :unprocessable_entity
				end
			end

			# PATCH/PUT /events/1
			def update
				if @event.update(event_params)
					add_images
					render json: @event
				else
					render json: @event.errors, status: :unprocessable_entity
				end
			end

			# DELETE /events/1
			def destroy
				@event.destroy
			end

			def rrpp_events
				eventos = []
				user = User.find(params[:user_id])
				tickets = user.tickets
				tickets.each do |t|
					eventos.push(t.event)
				end
				render json: eventos
			end

			def upload_video
       	@video = Video.new({clip:params[:video], title: params[:filename], description: 'video uploaded'})
        if @video.save!
          render json: :ok
        else
          render json: {error: true}
        end
			end

			def get_videos
				@videos = Video.all
				render json: @videos
			end

			def event_products
				@store = Store.find(params[:id])
				@products = Product.where(item_id: @store.id)
				render json: @products
			end

			def add_products_event
        prod = Product.find(params[:product_id])
        event = Event.find(params[:event_id])
        prod.update(item_id: event.id, item_type: 'Event', stock_event: 0)
				render json: {product_id: prod.id}
			end

			private
				# Use callbacks to share common setup or constraints between actions.
				def set_event
					@event = Event.find(params[:id])
				end

				# Only allow a trusted parameter "white list" through.
				def event_params
					params.require(:event).permit(:store_id, :user_id, :priority, :name, :category, :description, :start_datetime, :end_datetime, :video_link, :address,
						products_attributes: [:id, :name, :price, :stock, :priority, :user_id, :_destroy, :description, :category, :start_datetime, :end_datetime, :image, :item_id, :item_type],
						tickets_attributes: [:id, :price, :name, :stock, :start_date, :end_date, :users, :_destroy]
					)
				end
				def add_images
		      params[:event][:images].each { |cover| @event.images.create(cover: cover)} if params[:event][:images].present?
		    end

		end
	end
end
