module Api
  module V1
    class GuestsController < ApplicationController

      before_action :set_guest, only: [:show, :update, :destroy]

      # GET /guests
      def index
        @event = Event.find(params[:event_id])
        @guests = @event.guests
        render json: @guests
      end

      # GET /guests/1
      def show
        render json: @guest
      end

      # POST /guests
      def create
        @event = Event.find(params[:guest][:event_id])
        @guests = @event.guests.length
        if @guests < @event.tickets.last.stock
          @guest = Guest.new(guest_params)
          if @guest.save
            render json: @guest, status: :created
          else
            render json: @guest.errors, status: :unprocessable_entity
          end
        else
          render json: { error: "Supera la cantidad de invitados otorgada"}, status: :unprocessable_entity
        end
      end

      # PATCH/PUT /guests/1
      def update
        if @guest.update(guest_params)
          render json: @guest
        else
          render json: @guest.errors, status: :unprocessable_entity
        end
      end

      # DELETE /guests/1
      def destroy
        @guest.destroy
      end

      private
        # Use callbacks to share common setup or constraints between actions.
        def set_guest
          @guest = Guest.find(params[:id])
        end

        # Only allow a trusted parameter "white list" through.
        def guest_params
          params.require(:guest).permit(:name, :event_id, :host_id, :email)
        end
    end
  end
end
