module Api
	module V1
		class ImagesController < ApplicationController

			# GET /orderitems
			def index
				@images = Image.all
				render json: @images
			end
			# DELETE /images/1
			def destroy
				@image = Image.find(params[:id])
				@image.destroy
				json_response(status: :ok)
			end

		 private

		 	def images_params
    		params.require(:image).permit( )
  		end

		end
	end
end
