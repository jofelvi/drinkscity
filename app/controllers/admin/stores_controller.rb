class Admin::StoresController < ApplicationController
	#layout 'client'
	before_action :set_store, only: [:show, :edit, :update, :destroy, :accept_store, :delete_store]
	before_action :check_permission
	layout 'client', only: [:show]

	# GET /stores
	# GET /stores.json
	def index

		if current_user.has_role? :admin
			if params[:id]
				u = User.find_by(id: params[:id])
				@stores = u.stores
			else
				@stores = Store.all
			end
			if params[:status]
				@stores=Store.where(status: params[:status])
			else
				@stores = @stores.where(status: 1)
			end
			#@stores = params[:id] ? Store.includes(:users).where(users: {id: params[:id]}) : Store.all
			#@stores = params[:status] ? Store.where(status: params[:status]) : @stores.where(status: 1)
		else
			@stores = current_user.stores.where(status: 1)
		end

		if params[:status] == "2"
			redirect_to admin_stores_path
		end
	end

	# GET /stores/1
	# GET /stores/1.json
	def show
		
	end

	def accept_store
		@store.accept_store
		redirect_to admin_stores_path, notice: 'Store was successfully accepted.'
	end

	def delete_store
		@store.delete_store
		redirect_to admin_stores_path, notice: 'Store was successfully destroy'
	end

	# GET /stores/new
	def new
		@store = Store.new
	end

	# GET /stores/1/edit
	def edit
	end

	# POST /stores
	# POST /stores.json
	def create
		@store = Store.new(store_params)
		@store.status = 0

		if @store.save
			if params[:store][:user_id]
				@store.users << User.find(params[:store][:user_id])
			end	
			add_images
			redirect_to admin_stores_path, notice: "Store was successfully created."
		else
			render :new, alert: "Store no created!"
		end
	end

	# PATCH/PUT /stores/1
	# PATCH/PUT /stores/1.json
	def update
		respond_to do |format|
			if @store.update(store_params)
				if params[:store][:user_id]
					@store.users << User.find(params[:store][:user_id])
				end	
				add_images
				format.html { redirect_to admin_stores_path, notice: 'Store was successfully updated.' }
				format.json { render :show, status: :ok, location: @store }
			else
				format.html { render :edit }
				format.json { render json: @store.errors, status: :unprocessable_entity }
			end
		end
	end

	# DELETE /stores/1
	# DELETE /stores/1.json
	def destroy
		@store.destroy
		respond_to do |format|
			format.html { redirect_to admin_stores_path, notice: 'Store was successfully destroyed.' }
			format.json { head :no_content }
		end
	end


	private
		# Use callbacks to share common setup or constraints between actions.
		def set_store
			@store = Store.find(params[:id])
		end

		# Never trust parameters from the scary internet, only allow the white list through.
		def store_params
			params.require(:store).permit(:longitude, :latitude, :address, :description,
				:kind,:status, :delivery, :name, :description, :rut, :phone, :email,
				:region, :days_opened, :time_opened, :legal_agent, :legal_agent_rut, :legal_agent_phone,
				:legal_agent_email, :user_id, schedules_attributes: [:id, :day_of_week, :opens, :closes,:_destroy])
		end

		def add_schedules
			week_days = Store.convert_weekdays(params[:store][:days_opened])
			opens = params[:store][:time_opened].to_s.split("-").first
			closes = params[:store][:time_opened].to_s.split("-").last
			week_days.split("-").each do |week_day|
				@store.schedules.create(day_of_week: week_day, opens: opens, closes: closes )
			end

		end

		def add_images
			if params[:store][:images].present?
				params[:store][:images].each { |cover|
					@store.images.create(cover: cover)
				}
			end
		end
end
