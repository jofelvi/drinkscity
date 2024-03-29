module Api
	module V1
		class TicketsController < ApplicationController

		  before_action :set_ticket, only: [:show, :update, :destroy]

			# GET /tickets
			def index
				@tickets = Ticket.all
				render json: @tickets
			end

			# GET /tickets/1
			def show
				render json: @ticket
			end

			# POST /tickets
			def create
				@ticket = Ticket.new(ticket_params)
				@ticket.users << User.where(id: params[:ticket][:users]) if params[:ticket][:users]
				if @ticket.save!
					render json: @ticket, status: :created
				else
					render json: @ticket.errors, status: :unprocessable_entity
				end
			end

			# PATCH/PUT /tickets/1
			def update
				if @ticket.update(ticket_params)
					render json: @ticket
				else
					render json: @ticket.errors, status: :unprocessable_entity
				end
			end

			# DELETE /tickets/1
			def destroy
				@ticket.destroy
			end

			private
				# Use callbacks to share common setup or constraints between actions.
				def set_ticket
					@ticket = Ticket.find(params[:id])
				end

				# Only allow a trusted parameter "white list" through.
				def ticket_params
					params.require(:ticket).permit(:name, :event_id, :image, :price, :stock, :active, :start_date, :end_date)
				end
		end
	end
end
